const { app, BrowserWindow, ipcMain } = require('electron');
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
const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const PATCH_NOTES_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/launcher/patch-notes.md`;
const FALLBACK_CLIENT_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/app.zip`;
const FALLBACK_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
let APP_DATA_PATH;
let VERSION_FILE;

function normalizeVersion(version) {
    return String(version || '0.0.0').trim().replace(/^v/i, '');
}

function isSameVersion(left, right) {
    return normalizeVersion(left) === normalizeVersion(right);
}

async function readLocalInstallState() {
    const clientPath = path.join(APP_DATA_PATH, 'game');
    const clientExe = path.join(clientPath, 'vexa-client.exe');
    const isInstalled = fs.existsSync(clientExe);
    let localVersion = 'Yüklü Değil';

    if (isInstalled && fs.existsSync(VERSION_FILE)) {
        try {
            const versionData = await fs.readJson(VERSION_FILE);
            localVersion = normalizeVersion(versionData.version || '0.0.0');
        } catch (error) {
            console.warn('[Launcher] Local version file unreadable:', error.message);
            localVersion = '0.0.0';
        }
    }

    return { isInstalled, localVersion };
}

async function getPatchNotes(fallbackText) {
    try {
        const notesResponse = await axios.get(PATCH_NOTES_RAW_URL, {
            timeout: 10000,
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
            { label: 'GitHub', url: `https://github.com/${GITHUB_REPO}` }
        ]
    }).catch(console.error);
});

rpc.login({ clientId }).catch(err => {
    console.warn('Could not connect to Discord RPC from launcher:', err.message);
});

function initializePaths() {
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
        console.log(`[Launcher] Checking for updates on GitHub: ${GITHUB_REPO}...`);

        let response;
        const maxRetries = 3;
        const timeouts = [15000, 25000, 35000];

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`[Launcher] API attempt ${attempt + 1}/${maxRetries} (timeout: ${timeouts[attempt]}ms)...`);
                response = await axios.get(RELEASE_API_URL, {
                    timeout: timeouts[attempt],
                    headers: { 'User-Agent': 'VexaLauncher-AutoUpdate' }
                });
                break;
            } catch (retryError) {
                console.warn(`[Launcher] Attempt ${attempt + 1} failed: ${retryError.message}`);
                if (attempt === maxRetries - 1) throw retryError;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const latestRelease = response.data;
        const latestTag = latestRelease.tag_name || '0.0.0';
        const latestVersion = normalizeVersion(latestTag);
        const assets = Array.isArray(latestRelease.assets) ? latestRelease.assets : [];
        const launcherAsset = assets.find(asset => /^vexa-launcher-setup-.*\.exe$/i.test(asset.name));
        const clientAsset = assets.find(asset => asset.name === 'app.zip');
        const launcherDownloadUrl = launcherAsset ? launcherAsset.browser_download_url : FALLBACK_RELEASE_URL;
        const clientDownloadUrl = clientAsset ? clientAsset.browser_download_url : FALLBACK_CLIENT_DOWNLOAD_URL;

        const localLauncherVersion = normalizeVersion(app.getVersion());
        const initialInstallRequired = !installState.isInstalled;
        const launcherUpdateAvailable = installState.isInstalled && launcherAsset && !isSameVersion(latestVersion, localLauncherVersion);
        const clientUpdateAvailable = installState.isInstalled && clientAsset && !isSameVersion(latestVersion, installState.localVersion);
        const updateType = initialInstallRequired ? 'client' : (launcherUpdateAvailable ? 'launcher' : (clientUpdateAvailable ? 'client' : 'none'));
        const updateAvailable = initialInstallRequired || launcherUpdateAvailable || clientUpdateAvailable;
        const patchNotes = await getPatchNotes(latestRelease.body || 'Yeni güncelleme mevcut!');

        return {
            updateAvailable,
            updateType,
            isInstalled: installState.isInstalled,
            latestVersion,
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
    const clientExe = path.join(APP_DATA_PATH, 'game', 'vexa-client.exe');
    const localDevPath = path.join(__dirname, '..');
    const isDev = !app.isPackaged;

    if (rpc) {
        try {
            await rpc.clearActivity();
            await rpc.destroy();
        } catch (error) {}
    }

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
