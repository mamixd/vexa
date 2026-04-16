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

// --- Discord RPC ---
const clientId = '1472302829392629924';
DiscordRPC.register(clientId);
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
        details: details || 'Main Menu',
        state: state || 'Choosing a room...',
        startTimestamp: appStartTime,
        largeImageKey: 'logo', 
        largeImageText: 'Vexa Client',
        smallImageKey: nick ? 'logo' : undefined,
        smallImageText: nick ? `${nick}` : undefined,
        instance: false,
        buttons: [
            { label: 'Discord', url: 'https://vexaclient.rf.gd/discord' },
            { label: 'GitHub', url: 'https://github.com/vexa-client/vexa' }
        ]
    }).catch(err => console.error('Discord RPC Error:', err));
}

rpc.on('ready', () => {
    if (rpcEnabled) {
        setActivity('Ba\u015flat\u0131c\u0131da', 'Ana Men\u00fc');
    }
});

if (rpcEnabled) {
    rpc.login({ clientId }).catch(err => {
        console.warn('Could not connect to Discord RPC:', err.message);
    });
}

// --- Settings IPC ---
ipcRenderer = null; // Just for context, we are in main.js

ipcMain.on('save-settings', (event, newSettings) => {
    saveSettings(newSettings);
});

ipcMain.handle('get-settings', () => {
    return loadSettings();
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
             rpc.login({ clientId }).catch(() => {});
        }
        setActivity(); 
    }
});

// --- FPS Unlock (Early Switches) ---
if (settings.fpsEnabled) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
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

    app.whenReady().then(() => {
        const { session } = require('electron');

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
