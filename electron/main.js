const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Ultra-fast rendering & low-latency flags used by pro gaming Electron clients
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-fast-unload');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');

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

// --- Bundled Backgrounds Initialization ---
function initBundledBackgrounds() {
    try {
        const userDataBgDir = path.join(app.getPath('userData'), 'backgrounds');
        if (!fs.existsSync(userDataBgDir)) {
            fs.mkdirSync(userDataBgDir, { recursive: true });
        }
        const sourceBgDir = path.join(__dirname, '../inject/backgrounds');
        if (fs.existsSync(sourceBgDir)) {
            const bgFiles = ['vexa-default.png', 'vexa-football-v1.png', 'vexa-football-v2.jpg'];
            for (const file of bgFiles) {
                const src = path.join(sourceBgDir, file);
                const dest = path.join(userDataBgDir, file);
                if (fs.existsSync(src)) {
                    if (!fs.existsSync(dest) || fs.statSync(src).size !== fs.statSync(dest).size) {
                        try {
                            fs.copyFileSync(src, dest);
                        } catch (e) {
                            console.warn('Could not copy background file:', file, e);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn('Background initialization warning:', err);
    }
}
initBundledBackgrounds();

// --- Live Active Users Heartbeat ---
const VERCEL_API_URL = process.env.VERCEL_API_URL || 'https://api.vexaclient.com';

// Oyna (Play) butonuna basılırken aktarılan gerçek hesap ID'si (Eğer giriş yapılmışsa)
let launcherUserId = null;
let launcherToken = null;
for (const arg of process.argv) {
    if (arg.startsWith('--user-id=')) {
        launcherUserId = arg.split('=')[1];
    } else if (arg.startsWith('--token=')) {
        launcherToken = arg.split('=')[1];
    }
}

function sendHeartbeat() {
    const axios = require('axios');
    
    // Eğer hesaba giriş yapılmışsa (launcherUserId varsa), asıl backend pingini at
    if (launcherUserId) {
        const headers = { 'Content-Type': 'application/json' };
        if (launcherToken) {
            headers['Authorization'] = `Bearer ${launcherToken}`;
        }
        axios.post(`${VERCEL_API_URL}/api/ping`, {
            userId: launcherUserId,
            activity: 'In Game',
            dot: 'online'
        }, { headers }).catch(() => {});
    }
    
    // Uygulama istatistikleri için anonim heartbeat'i de at
    axios.post(`${VERCEL_API_URL}/api/ping`, { userId: settings.clientId }, {
        headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
}

// Send heartbeat immediately on startup, and then every 30 seconds
sendHeartbeat();
setInterval(sendHeartbeat, 30000);

const candidateEnvPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(process.resourcesPath || '', '.env'),
    path.join(app.getAppPath(), '.env'),
    path.join(process.cwd(), '.env')
];
for (const p of candidateEnvPaths) {
    if (fs.existsSync(p)) {
        require('dotenv').config({ path: p });
        break;
    }
}
if (!process.env.DISCORD_CLIENT_ID) {
    require('dotenv').config();
}

// --- Discord RPC ---
const clientId = process.env.DISCORD_CLIENT_ID || '1472302829392629924';
if (clientId) {
    try {
        DiscordRPC.register(clientId);
    } catch (e) {}
}

let rpc = null;
let rpcConnected = false;
let rpcConnecting = false;
const appStartTime = Date.now();
let rpcEnabled = settings.rpcEnabled !== false;
let lastRpcActivity = { state: 'Ana Menüde', details: 'Vexa Client', nick: '' };
let nowPlayingData = { title: '', artist: '', thumbnail: '', appName: '', status: '' };

function setActivity(state, details, nick) {
    if (state !== undefined) lastRpcActivity.state = state;
    if (details !== undefined) lastRpcActivity.details = details;
    if (nick !== undefined) lastRpcActivity.nick = nick;

    if (!rpc || !rpcConnected || !rpcEnabled) {
        if (rpc && rpcConnected && !rpcEnabled) {
            rpc.clearActivity().catch(() => {});
        }
        return;
    }
    
    let currentDetails = lastRpcActivity.details || 'Vexa Client';
    let currentState = lastRpcActivity.state || 'Ana Menüde';

    // Eğer arka planda müzik/medya çalıyorsa Discord RPC'ye yansıt
    if (nowPlayingData && nowPlayingData.title && nowPlayingData.status === 'playing') {
        const songStr = `🎵 ${nowPlayingData.title}${nowPlayingData.artist ? ' - ' + nowPlayingData.artist : ''}`.slice(0, 120);
        if (!currentState || currentState === 'Ana Menüde') {
            currentState = songStr;
        } else {
            currentDetails = songStr;
        }
    }

    rpc.setActivity({
        details: currentDetails,
        state: currentState,
        startTimestamp: appStartTime,
        largeImageKey: 'logo', 
        largeImageText: 'Vexa Client',
        smallImageKey: (lastRpcActivity.nick && lastRpcActivity.nick.length >= 2) ? 'logo' : undefined,
        smallImageText: (lastRpcActivity.nick && lastRpcActivity.nick.length >= 2) ? `${lastRpcActivity.nick}` : undefined,
        instance: false,
        buttons: [
            { label: 'İndir', url: 'https://vexaclient.com' },
            { label: 'GitHub', url: 'https://github.com/vexa-client/vexa' }
        ]
    }).catch(err => {
        // Silently catch transient RPC send errors
    });
}

function connectDiscordRPC() {
    if (!rpcEnabled || rpcConnected || rpcConnecting) return;
    rpcConnecting = true;
    try {
        if (!rpc) {
            rpc = new DiscordRPC.Client({ transport: 'ipc' });
            rpc.on('ready', () => {
                rpcConnected = true;
                rpcConnecting = false;
                setActivity();
            });
            rpc.on('disconnected', () => {
                rpcConnected = false;
                rpcConnecting = false;
            });
        }
        rpc.login({ clientId }).then(() => {
            rpcConnected = true;
            rpcConnecting = false;
            setActivity();
        }).catch(err => {
            rpcConnected = false;
            rpcConnecting = false;
        });
    } catch (err) {
        rpcConnected = false;
        rpcConnecting = false;
    }
}

if (rpcEnabled) {
    setTimeout(connectDiscordRPC, 1500);
}

// Discord sonradan açılırsa veya bağlantı koparsa düzenli aralıklarla bağlanmayı dene
setInterval(() => {
    if (rpcEnabled && !rpcConnected && !rpcConnecting) {
        connectDiscordRPC();
    }
}, 15000);

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

ipcMain.handle('clear-cache', async () => {
    try {
        if (session && session.defaultSession) {
            await session.defaultSession.clearCache();
        }
        return { success: true };
    } catch (err) {
        console.error('Clear cache error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('factory-reset', async () => {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'config.json');
        if (fs.existsSync(settingsPath)) {
            try { fs.unlinkSync(settingsPath); } catch(e) {}
        }
        if (session && session.defaultSession) {
            await session.defaultSession.clearStorageData({
                storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
            });
            await session.defaultSession.clearCache();
        }
        const bgDir = path.join(app.getPath('userData'), 'backgrounds');
        if (fs.existsSync(bgDir)) {
            try { fs.rmSync(bgDir, { recursive: true, force: true }); } catch(e) {}
        }
        return { success: true };
    } catch (err) {
        console.error('Factory reset error:', err);
        return { success: false, error: err.message };
    }
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

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

// --- Now Playing (Müzik Widget & Media Activity) ---
const { execFile } = require('child_process');

function resolveMediaBackend() {
    if (process.env.WINDOWS_MEDIA_SESSIONS_BACKEND && fs.existsSync(process.env.WINDOWS_MEDIA_SESSIONS_BACKEND)) {
        return process.env.WINDOWS_MEDIA_SESSIONS_BACKEND;
    }
    const candidates = [
        process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'windows-media-sessions', 'bin', 'win-x64', 'windows-media-sessions-backend.exe') : null,
        path.join(__dirname, '..', 'node_modules', 'windows-media-sessions', 'bin', 'win-x64', 'windows-media-sessions-backend.exe'),
        path.join(app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked'), 'node_modules', 'windows-media-sessions', 'bin', 'win-x64', 'windows-media-sessions-backend.exe')
    ];
    for (const c of candidates) {
        if (c && fs.existsSync(c)) {
            process.env.WINDOWS_MEDIA_SESSIONS_BACKEND = c;
            console.log('[Media] Resolved media session backend:', c);
            return c;
        }
    }
    return null;
}

let nowPlayingEnabled = true;
let unsubSessions = null;
let mediaPollTimer = null;

function broadcastNowPlaying(data) {
    BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('now-playing-update', data);
        }
    });
}

async function syncMediaState() {
    try {
        resolveMediaBackend();
        const { getActiveSessions, getAllSessions } = require('windows-media-sessions');
        let sessions = await getActiveSessions().catch(() => []);
        if (!sessions || sessions.length === 0) {
            sessions = await getAllSessions().catch(() => []);
        }

        let active = sessions && sessions.find(s => s.playbackStatus === 'playing');
        if (!active && sessions) {
            active = sessions.find(s => s.playbackStatus === 'paused');
        }

        if (!active || !active.title) {
            if (nowPlayingData.title) {
                nowPlayingData = { title: '', artist: '', thumbnail: '', appName: '', status: '' };
                broadcastNowPlaying(nowPlayingData);
                setActivity();
            }
            return nowPlayingData;
        }

        const newData = {
            title:     active.title || '',
            artist:    active.artist || '',
            thumbnail: active.thumbnail || nowPlayingData.thumbnail || '',
            appName:   active.sourceAppDisplayName || '',
            status:    active.playbackStatus || 'playing',
        };

        if (newData.title !== nowPlayingData.title 
            || newData.artist !== nowPlayingData.artist 
            || newData.status !== nowPlayingData.status
            || (newData.thumbnail && newData.thumbnail !== nowPlayingData.thumbnail)) {
            nowPlayingData = newData;
            broadcastNowPlaying(nowPlayingData);
            setActivity();
        }
        return nowPlayingData;
    } catch (e) {
        return nowPlayingData;
    }
}

function startNowPlayingService() {
    resolveMediaBackend();

    if (!unsubSessions) {
        try {
            const { onSessionsChanged } = require('windows-media-sessions');

            unsubSessions = onSessionsChanged((sessions) => {
                let active = sessions.find(s => s.playbackStatus === 'playing');
                if (!active) active = sessions.find(s => s.playbackStatus === 'paused');

                if (!active || !active.title) {
                    if (nowPlayingData.title) {
                        nowPlayingData = { title: '', artist: '', thumbnail: '', appName: '', status: '' };
                        broadcastNowPlaying(nowPlayingData);
                        setActivity();
                    }
                    return;
                }

                const newData = {
                    title:     active.title || '',
                    artist:    active.artist || '',
                    thumbnail: active.thumbnail || nowPlayingData.thumbnail || '',
                    appName:   active.sourceAppDisplayName || '',
                    status:    active.playbackStatus || 'playing',
                };

                if (newData.title !== nowPlayingData.title 
                    || newData.artist !== nowPlayingData.artist 
                    || newData.status !== nowPlayingData.status
                    || (newData.thumbnail && newData.thumbnail !== nowPlayingData.thumbnail)) {
                    nowPlayingData = newData;
                    broadcastNowPlaying(nowPlayingData);
                    setActivity();
                }
            });
        } catch (e) {
            console.error('Failed to start media sessions listener:', e);
        }
    }

    // Anlık sorgula
    syncMediaState();

    // SMTC kaçırmalarına karşı her 2.5 saniyede bir senkronize et
    if (!mediaPollTimer) {
        mediaPollTimer = setInterval(syncMediaState, 2500);
    }
}

function stopNowPlayingService() {
    if (unsubSessions) {
        try { unsubSessions(); } catch (e) {}
        unsubSessions = null;
    }
    if (mediaPollTimer) {
        clearInterval(mediaPollTimer);
        mediaPollTimer = null;
    }
}

// Başlangıçta servisi başlat
startNowPlayingService();

ipcMain.on('toggle-now-playing', async (event, state) => {
    nowPlayingEnabled = !!state;
    if (nowPlayingEnabled) {
        startNowPlayingService();
        await syncMediaState();
    } else {
        stopNowPlayingService();
        nowPlayingData = { title: '', artist: '', thumbnail: '', appName: '', status: '' };
        broadcastNowPlaying(nowPlayingData);
        setActivity();
    }
});

// Renderer açıldığında veya widget aktifleştiğinde mevcut şarkı durumunu döndür
ipcMain.handle('get-now-playing', async () => {
    if (nowPlayingData.title) return nowPlayingData;
    return await syncMediaState();
});

// Medya kontrol tuşları (Play/Pause, Next, Prev)
ipcMain.on('media-control', (event, action) => {
    const keyMap = {
        'play-pause': '(New-Object -ComObject WScript.Shell).SendKeys([char]179)',
        'next':       '(New-Object -ComObject WScript.Shell).SendKeys([char]176)',
        'prev':       '(New-Object -ComObject WScript.Shell).SendKeys([char]177)'
    };
    const cmd = keyMap[action];
    if (!cmd) return;
    require('child_process').spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', cmd
    ], { windowsHide: true });
});

let currentRoomName = '';
ipcMain.on('set-room-name', (event, name) => {
    // Dosya adı için geçersiz karakterleri temizle
    currentRoomName = (name || '').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60);
});

ipcMain.on('update-rpc', (event, data) => {
    setActivity(data.state, data.details, data.nick);
});

ipcMain.on('toggle-discord-rpc', (event, state) => {
    rpcEnabled = !!state;
    saveSettings({ rpcEnabled });
    if (!rpcEnabled) {
        if (rpc && rpcConnected) {
            rpc.clearActivity().catch(() => {});
        }
    } else {
        if (!rpcConnected) {
            connectDiscordRPC();
        } else {
            setActivity();
        }
    }
});

function openReplayViewer(replayFilePath = null) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('https://www.haxball.com/replay?v=3');
        mainWindow.show();
        mainWindow.focus();

        if (replayFilePath) {
            mainWindow.webContents.once('did-finish-load', () => {
                setTimeout(() => {
                    try {
                        const fileData = fs.readFileSync(replayFilePath);
                        mainWindow.webContents.send('load-replay', fileData, path.basename(replayFilePath));
                    } catch (err) {}
                }, 1000);
            });
        }
    }
}

ipcMain.on('open-replay-viewer', (event, replayFilePath = null) => {
    openReplayViewer(replayFilePath);
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

// --- GPU Acceleration (Force for AMD/Older Drivers) ---
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-video-decode');

// --- FPS Unlock (Early Switches) ---
if (settings.fpsEnabled) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
}
if (settings.pingBoosterEnabled) {
    app.commandLine.appendSwitch('enable-webgl-draft-extensions');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('disable-ipc-flooding-protection');
    app.commandLine.appendSwitch('max-gum-fps', '150');
}
app.commandLine.appendSwitch('ignore-certificate-errors');
// -------------------

async function startGame(replayFilePath = null) {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.close();
    }

    // 1. Splash (Yükleniyor) Ekranını Aç
    splashWindow = new BrowserWindow({
        width: 460,
        height: 300,
        useContentSize: true,
        frame: false,
        backgroundColor: '#070707',
        show: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        center: true,
        focusable: false,
        webPreferences: { contextIsolation: true }
    });
    splashWindow.setAlwaysOnTop(true, 'screen-saver');
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));

    splashWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.show();
        }
    });

    // 2. Açılış Ekranında Otomatik Güncelleme Kontrolü & İndirme
    try {
        const updater = require('./updater');
        const updateResult = await updater.checkAndApplyUpdate(splashWindow);
        if (updateResult && updateResult.updated) {
            // Güncelleme indirildi ve kurulum exe'si başlatıldı; bu süreç sonlandırılıyor.
            return;
        }
    } catch (updateErr) {
        console.warn('[Main] Güncelleme denetimi atlandı:', updateErr.message);
    }

    // 3. Güncelleme yoksa: Ana Pencereyi (HaxBall) Arka Planda Yükle
    mainWindow = createWindow({
        title: 'Vexa HaxBall Client',
        width: 1280,
        height: 800,
        url: 'https://www.haxball.com/play',
        preload: path.join(__dirname, 'preload.js'),
        injectScripts: ['header.js', 'ui.js', 'client.js'],
        onReady: () => {
            const revealMainWindow = () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.maximize();
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
            };

            if (splashWindow && !splashWindow.isDestroyed()) {
                try {
                    splashWindow.webContents.executeJavaScript("window.postMessage('ready','*');");
                } catch (err) {}
                
                setTimeout(() => {
                    if (splashWindow && !splashWindow.isDestroyed()) {
                        splashWindow.close();
                    }
                    revealMainWindow();
                }, 350);
            } else {
                revealMainWindow();
            }
        }
    });
}

function handleArgs(argv) {
    const replayFile = argv.find(arg => arg.toLowerCase().endsWith('.hbr2'));
    if (replayFile) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            openReplayViewer(replayFile);
        } else {
            startGame(replayFile);
        }
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
        } else {
            handleArgs(commandLine);
        }
    });

    app.whenReady().then(async () => {
        const { session } = require('electron');

        // Load hxalltool natively as an extension. Electron cannot load unpacked
        // extensions from inside app.asar, so packaged builds use app.asar.unpacked.
        // NOTE: do not await loading here so splash screen can appear faster.
        try {
            const extPath = app.isPackaged
                ? path.join(process.resourcesPath, 'app.asar.unpacked', 'hxalltool')
                : path.join(__dirname, '../hxalltool');
            if (fs.existsSync(extPath)) {
                // Load extension asynchronously so it doesn't block UI startup
                session.defaultSession.loadExtension(extPath)
                    .then(() => console.log("Loaded hxalltool extension natively."))
                    .catch(err => console.error('Failed to load hxalltool extension:', err));
            } else {
                console.warn('hxalltool extension path not found:', extPath);
            }
        } catch (err) {
            console.error('Failed to check hxalltool extension path:', err);
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
            startGame(); // Doğrudan oyunu başlat
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) startGame();
        });
    });
}

ipcMain.on('start-game', () => {
    startGame();
});

app.on('window-all-closed', () => {
    // Kapanırken çevrimdışı yap ve temizce sonlandır
    if (launcherUserId) {
        const axios = require('axios');
        const headers = { 'Content-Type': 'application/json' };
        if (launcherToken) {
            headers['Authorization'] = `Bearer ${launcherToken}`;
        }
        axios.post(`${VERCEL_API_URL}/api/ping`, {
            userId: launcherUserId,
            activity: 'offline',
            dot: 'offline'
        }, { headers }).catch(() => {}).finally(() => {
            if (process.platform !== 'darwin') app.quit();
        });
    } else {
        if (process.platform !== 'darwin') app.quit();
    }
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

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
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

// window.js'nin erişebilmesi için currentRoomName'i export et
module.exports = { get currentRoomName() { return currentRoomName; } };