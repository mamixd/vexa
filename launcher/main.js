const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs-extra');
const { spawn } = require('child_process');

// Bypassing security checks for insecure downloads (HTTP) and certificate errors
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('disable-features', 'InsecureDownloadWarnings');

const InstallerManager = require('./installer');

let mainWindow;
let installer;
const GITHUB_REPO = 'vexa-client/vexa'; 
let APP_DATA_PATH;
let VERSION_FILE;

// --- Discord RPC (Launcher State) ---
const DiscordRPC = require('discord-rpc');
const clientId = '1472302829392629924';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const appStartTime = Date.now();

DiscordRPC.register(clientId);

rpc.on('ready', () => {
    rpc.setActivity({
        details: 'Launcher',
        state: 'Getting ready to play...',
        startTimestamp: appStartTime,
        largeImageKey: 'logo',
        largeImageText: 'Vexa Client',
        instance: false,
        buttons: [
            { label: 'Download', url: 'https://vexa-client.github.io' },
            { label: 'GitHub', url: 'https://github.com/vexa-client/vexa' }
        ]
    }).catch(console.error);
});

rpc.login({ clientId }).catch(err => {
    console.warn('Could not connect to Discord RPC from launcher:', err.message);
});
// ------------------------------------

function initializePaths() {
    // Oyun dosyaları artık her zaman Launcher'ın (.exe) yanına kurulacak.
    // AppData'ya kurulduğu için yazma izni sorunu yaşanmayacak.
    const exeDir = path.dirname(process.execPath);
    APP_DATA_PATH = app.isPackaged ? exeDir : app.getPath('userData'); 
    
    VERSION_FILE = path.join(APP_DATA_PATH, 'version.json');
    
    console.log('[Launcher] Yerel Mod Aktif (Launcher yanında).');
    console.log('[Launcher] Hedef Klasör:', APP_DATA_PATH);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 650,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0d1117',
        show: false
    });

    // Initialize the installer with the window and path
    installer = new InstallerManager(mainWindow, APP_DATA_PATH);

    mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

app.whenReady().then(() => {
    initializePaths();
    createWindow();
});

// IPC Handlers
ipcMain.handle('check-update', async () => {
    try {
        const clientPath = path.join(APP_DATA_PATH, 'game'); 
        const clientExe = path.join(clientPath, 'vexa-client.exe');
        const isInstalled = fs.existsSync(clientExe);
        
        let localVersion = 'Yüklü Değil';
        if (isInstalled && fs.existsSync(VERSION_FILE)) {
            const versionData = await fs.readJson(VERSION_FILE);
            localVersion = versionData.version || '0.0.0';
        }

        console.log(`[Launcher] Checking for updates on GitHub: ${GITHUB_REPO}...`);
        const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { 'User-Agent': 'VexaLauncher-AutoUpdate' }
        });

        const latestRelease = response.data;
        const latestVersion = latestRelease.tag_name || '0.0.0';

        const launcherAsset = latestRelease.assets.find(a => /^vexa-launcher-setup-.*\.exe$/i.test(a.name));
        const clientAsset = latestRelease.assets.find(a => a.name === 'app.zip');
        const launcherDownloadUrl = launcherAsset ? launcherAsset.browser_download_url : null;
        const clientDownloadUrl = clientAsset ? clientAsset.browser_download_url : null;

        const localLauncherVersion = app.getVersion();
        const launcherUpdateAvailable = launcherAsset && (latestVersion !== localLauncherVersion);
        const clientUpdateAvailable = isInstalled && clientAsset && (latestVersion !== localVersion);
        const updateAvailable = launcherUpdateAvailable || clientUpdateAvailable;

        return {
            updateAvailable: updateAvailable,
            updateType: launcherUpdateAvailable ? 'launcher' : (clientUpdateAvailable ? 'client' : 'none'),
            isInstalled: isInstalled,
            latestVersion: latestVersion,
            localVersion: localVersion,
            localLauncherVersion: localLauncherVersion,
            patchNotes: latestRelease.body || 'Yeni güncelleme mevcut!',
            downloadUrl: launcherUpdateAvailable ? launcherDownloadUrl : (clientDownloadUrl || (latestRelease.assets[0] ? latestRelease.assets[0].browser_download_url : ''))
        };
    } catch (error) {
        console.error('[Launcher] Update check failed:', error.message);
        return {
            updateAvailable: false,
            isInstalled: false, // Fallback to setup if API fails?
            latestVersion: 'N/A',
            localVersion: 'Hata',
            patchNotes: 'Güncelleme sunucusuna bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
            error: error.message
        };
    }
});

ipcMain.handle('start-download', async (event, url) => {
    try {
        await installer.download(url);
        return { success: true };
    } catch (error) {
        console.error('[Main] Download error:', error);
        throw error;
    }
});

ipcMain.handle('start-launcher-update', async (event, url) => {
    try {
        await installer.download(url, 'update.exe');
        const result = await installer.installLauncherUpdate();
        if (result.success) {
            app.quit();
        }
        return result;
    } catch (error) {
        console.error('[Main] Launcher update error:', error);
        return { error: error.message || String(error) };
    }
});

ipcMain.handle('extract-and-install', async (event, version) => {
    try {
        return await installer.install(version);
    } catch (error) {
        console.error('[Main] Install error:', error.message);
        return { error: error.message };
    }
});

ipcMain.handle('launch-game', async () => {
    const clientExe = path.join(APP_DATA_PATH, 'game', 'vexa-client.exe');
    const localDevPath = path.join(__dirname, '..');
    const isDev = !app.isPackaged;

    if (rpc) {
        try {
            await rpc.clearActivity();
            await rpc.destroy();
        } catch (e) {}
    }
    
    // Discord IPC'nin bağlantı kopmasını algılaması için kısa bir gecikme
    await new Promise(resolve => setTimeout(resolve, 500));

    if (fs.existsSync(clientExe)) {
        spawn(`"${clientExe}"`, [], { detached: true, stdio: 'ignore', shell: true });
        app.quit();
    } else if (isDev) {
        console.log('Dev mode: Launching local client...');
        const electronPath = process.execPath;
        const clientMainPath = path.join(localDevPath, 'electron', 'main.js');
        
        spawn(`"${electronPath}"`, [`"${clientMainPath}"`], { 
            detached: true, 
            stdio: 'ignore', 
            cwd: localDevPath,
            shell: true 
        });
        app.quit();
    } else {
        return { error: 'Oyun dosyaları bulunamadı!', needsDownload: true };
    }
});

ipcMain.on('close-app', () => app.quit());
ipcMain.on('minimize-app', () => mainWindow.minimize());
