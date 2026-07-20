const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { createWindow } = require('./window');
const DiscordRPC = require('discord-rpc');
const { loadSettings, saveSettings } = require('./settings');

let mainWindow;
let panelWindow;
let launcherWindow;
let splashWindow;

// --- Load Settings ---
const settings = loadSettings();
const crypto = require('crypto');

// Generate a unique ID for this client if it doesn't exist to track active users
if (!settings.clientId) {
    settings.clientId = crypto.randomUUID();
    saveSettings({ clientId: settings.clientId });
}

// --- Live Active Users Heartbeat ---
const VERCEL_API_URL = process.env.VERCEL_API_URL || 'https://vexa-vercel-api.vercel.app';

function sendHeartbeat() {
    fetch(`${VERCEL_API_URL}/api/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: settings.clientId })
    }).catch(err => {
        // Silently ignore ping errors so it doesn't spam the console if offline
    });
}

// Send heartbeat immediately on startup, and then every 30 seconds
sendHeartbeat();
setInterval(sendHeartbeat, 30000);

require('dotenv').config();

// --- Discord RPC ---
const clientId = process.env.DISCORD_CLIENT_ID;
if (clientId) {
    DiscordRPC.register(clientId);
}
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const appStartTime = Date.now();
let rpcEnabled = settings.rpcEnabled;

function setActivity(state, details, nick) {
    if (!rpc || !rpcEnabled) {
        if (rpc && !rpcEnabled) {
            rpc.clearActivity().catch(() => {});
        }
        return;
    }
    
    rpc.setActivity({
        details: details || 'Vexa Client',
        state: state || 'Ana Menüde',
        startTimestamp: appStartTime,
        largeImageKey: 'logo', 
        largeImageText: 'Vexa Client',
        smallImageKey: (nick && nick.length >= 2) ? 'logo' : undefined,
        smallImageText: (nick && nick.length >= 2) ? `${nick}` : undefined,
        instance: false,
        buttons: [
            { label: 'İndir', url: 'https://vexa-client.github.io' },
            { label: 'GitHub', url: 'https://github.com/vexa-client/vexa' }
        ]
    }).catch(err => console.error('Discord RPC Error:', err));
}

rpc.on('ready', () => {
    if (rpcEnabled) {
        setActivity();
    }
});

if (rpcEnabled) {
    // Discord'un Launcher bağlantısını tam olarak kopardığından emin olmak için 1.5 saniye bekleyip bağlanıyoruz
    setTimeout(() => {
        if (clientId) {
            rpc.login({ clientId }).catch(err => {
                console.warn('Could not connect to Discord RPC:', err.message);
            });
        }
    }, 1500);
}

// --- Settings IPC ---
ipcRenderer = null; // Just for context, we are in main.js

ipcMain.on('save-settings', (event, newSettings) => {
    saveSettings(newSettings);
});

ipcMain.handle('get-settings', () => {
    return loadSettings();
});

ipcMain.handle('set-setting', (event, key, value) => {
    return saveSettings({ [key]: value });
});

ipcMain.on('restart-app', () => {
    try {
        app.relaunch({ args: process.argv.slice(1).filter(arg => arg !== '--relaunch') });
    } catch (err) {
        console.error('Failed to relaunch with args, trying default relaunch:', err);
        try {
            app.relaunch();
        } catch (e) {
            console.error('Relaunch failed completely:', e);
        }
    }
    app.exit(0);
});

ipcMain.on('update-rpc', (event, data) => {
    setActivity(data.state, data.details, data.nick);
});

ipcMain.on('toggle-discord-rpc', (event, state) => {
    rpcEnabled = state;
    saveSettings({ rpcEnabled });
    if (!rpcEnabled && rpc) {
        rpc.clearActivity().catch(() => {});
    } else if (rpcEnabled && rpc) {
        if (!rpc.transport.socket) { // If not logged in yet
             if (clientId) { rpc.login({ clientId }).catch(() => {}); }
        }
        setActivity(); 
    }
});

ipcMain.on('window-control', (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    if (action === 'minimize') {
        win.minimize();
    } else if (action === 'maximize') {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    } else if (action === 'close') {
        win.close();
    }
});

// --- FPS Unlock (Early Switches) ---
if (settings.fpsEnabled) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
}
if (settings.pingBoosterEnabled) {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-webgl-draft-extensions');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('disable-ipc-flooding-protection');
    app.commandLine.appendSwitch('max-gum-fps', '150');
}
app.commandLine.appendSwitch('ignore-certificate-errors');
// -------------------

function showLauncher() {
    launcherWindow = new BrowserWindow({
        width: 600,
        height: 450,
        frame: false,
        center: true,
        resizable: false,
        backgroundColor: '#0f0f11',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    launcherWindow.loadFile(path.join(__dirname, 'launcher.html'));
}

const fs = require('fs');

function startGame(replayFilePath = null) {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.hide();
    }
    // 1. Splash (Yükleniyor) Ekranını Aç
    splashWindow = new BrowserWindow({
        width: 420,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        center: true,
        focusable: false,
        webPreferences: { contextIsolation: true }
    });
    splashWindow.setAlwaysOnTop(true, 'screen-saver');
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));

    // 2. Ana Pencereyi Arka Planda Gizli Yükle
    mainWindow = createWindow({
        title: 'Vexa HaxBall Client',
        width: 1280,
        height: 800,
        url: 'https://www.haxball.com/play',
        preload: path.join(__dirname, 'preload.js'),
        injectScripts: ['header.js', 'ui.js', 'client.js'],
        onReady: () => {
            // 3. Her şey yüklenince: Splash'i kapat, Ana pencereyi göster
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            if (launcherWindow && !launcherWindow.isDestroyed()) {
                launcherWindow.close();
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                if (replayFilePath) {
                    setTimeout(() => {
                        try {
                            const fileData = fs.readFileSync(replayFilePath);
                            mainWindow.webContents.send('load-replay', fileData, path.basename(replayFilePath));
                        } catch (err) {
                            console.error('Failed to read replay file:', err);
                        }
                    }, 1500);
                }
            }
        }
    });
}

function handleArgs(argv) {
    const replayFile = argv.find(arg => arg.toLowerCase().endsWith('.hbr2'));
    if (replayFile) {
        startGame(replayFile);
        return true;
    }
    return false;
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            
            const replayFile = commandLine.find(arg => arg.toLowerCase().endsWith('.hbr2'));
            // If already open and they double click a new replay, we might need to recreate main window
            // Since haxball replay is stateful, easiest is to restart the window.
            if (replayFile) {
                mainWindow.close();
                startGame(replayFile);
            }
        } else if (launcherWindow && !launcherWindow.isDestroyed()) {
            launcherWindow.focus();
            handleArgs(commandLine);
        }
    });

    app.whenReady().then(async () => {
        const { session } = require('electron');

        // Load hxalltool natively as an extension
        try {
            const extPath = path.join(__dirname, '../hxalltool');
            if (fs.existsSync(extPath)) {
                await session.defaultSession.loadExtension(extPath);
                console.log("Loaded hxalltool extension natively.");
            }
        } catch (err) {
            console.error('Failed to load hxalltool extension:', err);
        }

        // Reklam Engelleyici
        const filter = {
            urls: [
                '*://*.cpmstar.com/*',
                '*://*.doubleclick.net/*'
            ]
        };
        session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
            callback({ cancel: true });
        });

        if (!handleArgs(process.argv)) {
            startGame(); // Eski launcher yerine doğrudan oyunu başlat
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) showLauncher();
        });
    });
}

ipcMain.on('start-game', () => {
    startGame();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Communications

// Forward chat/room commands from Frontend Panel to HaxBall DOM
ipcMain.handle('send-haxball-command', (event, command) => {
    // Sent via webContents to the preloaded script in Haxball
    mainWindow.webContents.send('execute-command', command);
    return { success: true };
});

// Forward data from HaxBall DOM to Node.js / Python
ipcMain.handle('log-haxball-event', (event, data) => {
    console.log('[HaxBall Data]:', data);
    // You can route this data natively to the started Node servers here
    return { success: true };
});

ipcMain.handle('save-custom-bg', async (event, filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File does not exist' };
        }
        const ext = path.extname(filePath);
        const userDataPath = app.getPath('userData');
        const destPath = path.join(userDataPath, `custom_bg_${Date.now()}${ext}`);
        fs.copyFileSync(filePath, destPath);
        
        // Format as a file:// URL
        const fileUrl = 'file:///' + destPath.replace(/\\/g, '/');
        return { success: true, path: fileUrl };
    } catch (err) {
        console.error('Error saving custom background:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-custom-bg', async (event, fileUrl) => {
    try {
        if (!fileUrl) return { success: false, error: 'No file URL provided' };
        let filePath = fileUrl;
        if (fileUrl.startsWith('file:///')) {
            filePath = fileUrl.substring(8);
        }
        filePath = path.normalize(filePath);
        
        if (fs.existsSync(filePath)) {
            const fileName = path.basename(filePath);
            const userDataPath = app.getPath('userData');
            // Security check: ensure file is inside userData and starts with custom_bg_
            const isInsideUserData = filePath.startsWith(userDataPath);
            const isCustomBgFile = fileName.startsWith('custom_bg_') || fileName.startsWith('custom_bg.');
            
            if (isInsideUserData && isCustomBgFile) {
                fs.unlinkSync(filePath);
                return { success: true };
            }
        }
        return { success: false, error: 'File not found or not eligible for deletion' };
    } catch (err) {
        console.error('Error deleting custom background:', err);
        return { success: false, error: err.message };
    }
});

