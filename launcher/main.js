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
const GITHUB_REPO = 'username/vexa-client'; // User should change this
let APP_DATA_PATH;
let VERSION_FILE;

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
    const clientPath = path.join(APP_DATA_PATH, 'game'); 
    const clientExe = path.join(clientPath, 'vexa-client.exe');
    const isInstalled = fs.existsSync(clientExe);
    console.log('[Launcher] Checking install at:', clientExe, 'Found:', isInstalled);

    return {
        updateAvailable: false,
        isInstalled: isInstalled,
        latestVersion: '1.0.0',
        localVersion: isInstalled ? '1.0.0' : 'Yüklü Değil',
        patchNotes: isInstalled 
            ? 'Vexa Launcher kullanımınıza hazır. Keyifli oyunlar!' 
            : 'Oyun dosyaları bulunamadı. Lütfen "İNDİR" butonuna basarak kurulumu yapın.',
        downloadUrl: 'https://github.com/mamixd/vexa/releases/download/Vexa/app.zip' // Central download URL
    };
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
