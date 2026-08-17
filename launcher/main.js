const hasClientFlag = process.argv.includes('--client-mode');
const hasReplayFile = process.argv.some(arg => arg.toLowerCase().endsWith('.hbr2'));

if (hasClientFlag || hasReplayFile) {
    require('../electron/main.js');
    return;
}
const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs-extra');
const { spawn } = require('child_process');

app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('disable-features', 'InsecureDownloadWarnings');

const InstallerManager = require('./installer');

let mainWindow;
let installer;
const GITHUB_REPO = 'vexa-client/vexa';
const VERSIONS_RAW_URL = `https://api.vexaclient.com/api/updates/versions.json?t=${Date.now()}`;
const PATCH_NOTES_RAW_URL = `https://api.vexaclient.com/api/updates/patch-notes?t=${Date.now()}`;
const FALLBACK_CLIENT_DOWNLOAD_URL = `https://cdn.vexaclient.com/downloads/vexa-launcher-setup.exe`;
const FALLBACK_RELEASE_URL = `https://cdn.vexaclient.com/downloads/`;
let APP_DATA_PATH;
let VERSION_FILE;

function normalizeVersion(version) {
    return String(version || '0.0.0').trim().replace(/^v/i, '');
}

function isSameVersion(left, right) {
    return normalizeVersion(left) === normalizeVersion(right);
}

async function readLocalInstallState() {
    try {
        if (VERSION_FILE && fs.existsSync(VERSION_FILE)) {
            const data = await fs.readJson(VERSION_FILE);
            if (data && data.version) {
                return { isInstalled: true, localVersion: normalizeVersion(data.version) };
            }
        }
    } catch (e) {
        console.warn('[Launcher] version.json okunamadı:', e.message);
    }
    return { isInstalled: false, localVersion: 'Yüklü Değil' };
}

async function getPatchNotes(fallbackText) {
    try {
        const notesResponse = await axios.get(PATCH_NOTES_RAW_URL, {
            timeout: 3000,
            headers: { 'User-Agent': 'VexaLauncher-PatchNotes' }
        });

        if (typeof notesResponse.data === 'string' && notesResponse.data.trim()) {
            return notesResponse.data;
        }
    } catch (error) {
        console.warn('[Launcher] Raw patch notes unavailable:', error.message);
    }

    return fallbackText || 'Yeni güncelleme mevcut!';
}

function createFallbackUpdateInfo(error, installState) {
    const localLauncherVersion = normalizeVersion(app.getVersion());
    const canInstallClient = !installState.isInstalled;
    const patchNotes = [
        '# Bağlantı Modu',
        '',
        'GitHub API şu an cevap vermedi, ama launcher kilitlenmedi.',
        '',
        '## Kullanılabilir işlemler',
        '- Oyun kuruluysa **OYNA** butonu çalışır.',
        '- Oyun dosyası yoksa doğrudan `app.zip` fallback bağlantısı denenir.',
        '- İnternet bağlantın düzeldikten sonra sürüm kontrolü tekrar normal çalışır.',
        '',
        `## Detay`,
        `- Hata: \`${error.message || error}\``
    ].join('\n');

    return {
        updateAvailable: canInstallClient,
        updateType: canInstallClient ? 'client' : 'none',
        isInstalled: installState.isInstalled,
        latestVersion: installState.localVersion === 'Yüklü Değil' ? localLauncherVersion : installState.localVersion,
        localVersion: installState.localVersion,
        localLauncherVersion,
        patchNotes,
        downloadUrl: canInstallClient ? FALLBACK_CLIENT_DOWNLOAD_URL : null,
        launcherDownloadUrl: FALLBACK_RELEASE_URL,
        clientDownloadUrl: FALLBACK_CLIENT_DOWNLOAD_URL,
        connectionWarning: error.message || String(error)
    };
}

const DiscordRPC = require('discord-rpc');
require('dotenv').config();
const clientId = process.env.DISCORD_CLIENT_ID;
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const appStartTime = Date.now();

if (clientId) {
    DiscordRPC.register(clientId);
}

rpc.on('ready', () => {
    rpc.setActivity({
        details: 'Vexa Client',
        state: 'Başlatıcıda',
        startTimestamp: appStartTime,
        largeImageKey: 'logo',
        largeImageText: 'Vexa Client',
        instance: false,
        buttons: [
            { label: 'İndir', url: 'https://vexaclient.com' },
            { label: 'GitHub', url: `https://github.com/${GITHUB_REPO}` }
        ]
    }).catch(console.error);
});

if (clientId) {
    rpc.login({ clientId }).catch(err => {
        console.warn('Could not connect to Discord RPC from launcher:', err.message);
    });
}

function initializePaths() {
    const exeDir = path.dirname(process.execPath);
    APP_DATA_PATH = app.isPackaged ? exeDir : app.getPath('userData');
    VERSION_FILE = path.join(APP_DATA_PATH, 'version.json');

    console.log('[Launcher] Yerel Mod Aktif (Launcher yanında).');
    console.log('[Launcher] Hedef Klasör:', APP_DATA_PATH);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 820,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#050a0e',
        show: false
    });

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

ipcMain.handle('check-update', async () => {
    const installState = await readLocalInstallState();

    try {
        console.log(`[Launcher] Checking for updates via versions.json...`);

        let versions = { launcher: '0.0.0', client: '0.0.0' };
        let patchNotesRaw = 'Yeni güncelleme mevcut!';
        
        // İkisini aynı anda çek — birini beklemeden diğeri başlasın
        const [vResult, pResult] = await Promise.allSettled([
            axios.get(VERSIONS_RAW_URL, {
                headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'VexaLauncher-AutoUpdate' },
                timeout: 3000
            }),
            axios.get(PATCH_NOTES_RAW_URL, {
                timeout: 3000,
                headers: { 'User-Agent': 'VexaLauncher-PatchNotes' }
            })
        ]);

        if (vResult.status === 'fulfilled' && vResult.value.data && vResult.value.data.launcher) {
            versions = vResult.value.data;
        } else {
            console.warn('[Launcher] Failed to fetch versions.json');
        }

        let patchNotes = patchNotesRaw;
        if (pResult.status === 'fulfilled' && typeof pResult.value.data === 'string' && pResult.value.data.trim()) {
            patchNotes = pResult.value.data;
        } else {
            console.warn('[Launcher] Failed to fetch patch-notes');
        }

        const latestLauncherVersion = normalizeVersion(versions.launcher);
        const latestClientVersion = normalizeVersion(versions.client);

        const launcherDownloadUrl = latestLauncherVersion !== '0.0.0' 
            ? `https://cdn.vexaclient.com/downloads/vexa-launcher-setup-${latestLauncherVersion}.exe`
            : FALLBACK_RELEASE_URL;
            
        const clientDownloadUrl = latestClientVersion !== '0.0.0'
            ? `https://cdn.vexaclient.com/downloads/app.zip`
            : FALLBACK_CLIENT_DOWNLOAD_URL;

        const localLauncherVersion = normalizeVersion(app.getVersion());
        const initialInstallRequired = !installState.isInstalled;
        
        const launcherUpdateAvailable = installState.isInstalled && latestLauncherVersion !== '0.0.0' && !isSameVersion(latestLauncherVersion, localLauncherVersion);
        const clientUpdateAvailable = installState.isInstalled && latestClientVersion !== '0.0.0' && !isSameVersion(latestClientVersion, installState.localVersion);
        
        const updateType = initialInstallRequired ? 'client' : (launcherUpdateAvailable ? 'launcher' : (clientUpdateAvailable ? 'client' : 'none'));
        const updateAvailable = initialInstallRequired || launcherUpdateAvailable || clientUpdateAvailable;
        return {
            updateAvailable,
            updateType,
            isInstalled: installState.isInstalled,
            latestVersion: updateType === 'launcher' ? latestLauncherVersion : latestClientVersion,
            localVersion: installState.localVersion,
            localLauncherVersion,
            patchNotes,
            downloadUrl: updateType === 'launcher' ? launcherDownloadUrl : clientDownloadUrl,
            launcherDownloadUrl,
            clientDownloadUrl
        };
    } catch (error) {
        console.error('[Launcher] Update check failed:', error.message);
        return createFallbackUpdateInfo(error, installState);
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
    if (rpc) {
        try {
            await rpc.clearActivity();
            await rpc.destroy();
        } catch (error) {}
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const child = spawn(process.execPath, ['--client-mode'], {
            detached: true,
            stdio: 'ignore',
            cwd: path.dirname(process.execPath),
            windowsHide: false
        });
        child.unref();
        if (mainWindow) mainWindow.minimize();
        if (Notification.isSupported()) {
            new Notification({
                title: 'Vexa Başlatılıyor',
                body: 'Oyun açılıyor, Launcher arka planda çalışmaya devam edecek.'
            }).show();
        }
        return { success: true };
    } catch (error) {
        return { error: `Client baslatilamadi: ${error.message || error}` };
    }
});

ipcMain.on('close-app', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.on('set-offline', async (event, data) => {
    try {
        await axios.post('http://api.vexaclient.com/api/ping', {
            userId: data.userId,
            activity: 'offline',
            dot: 'offline',
            playTime: data.playTime
        }, { timeout: 3000 });
    } catch (err) {
        console.warn('Set offline failed:', err.message);
    }
});

ipcMain.on('minimize-app', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('get-config', () => {
    return {};
});

ipcMain.handle('set-config', (event, newConfig) => {
    return { success: true };
});

ipcMain.handle('open-external', async (event, url) => {
    if (url) {
        await shell.openExternal(url);
    }
});
