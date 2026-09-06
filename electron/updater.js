const { app, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const axios = require('axios');
const { spawn } = require('child_process');

const clientArch = process.arch === 'ia32' ? 'ia32' : 'x64';
const VERSIONS_URL = `https://api.vexaclient.com/api/updates/versions.json?arch=${clientArch}&t=${Date.now()}`;
const FALLBACK_SETUP_URL = `https://cdn.vexaclient.com/downloads/vexa-setup-${clientArch}.exe`;

function normalizeVersion(version) {
    return String(version || '0.0.0').trim().replace(/^v/i, '');
}

function isNewerVersion(remote, local) {
    const r = normalizeVersion(remote).split('.').map(n => parseInt(n, 10) || 0);
    const l = normalizeVersion(local).split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        const rVal = r[i] || 0;
        const lVal = l[i] || 0;
        if (rVal > lVal) return true;
        if (rVal < lVal) return false;
    }
    return false;
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function sendSplashUpdate(splashWin, status, percent = null, details = null) {
    if (!splashWin || splashWin.isDestroyed()) return;

    try {
        splashWin.webContents.send('splash-update', { status, percent, details });
    } catch (e) {}

    try {
        const payload = JSON.stringify({ status, percent, details });
        splashWin.webContents.executeJavaScript(`
            if (typeof window.setSplashStatus === 'function') {
                window.setSplashStatus(${payload});
            }
        `).catch(() => {});
    } catch (e) {}
}

async function checkAndApplyUpdate(splashWin) {
    const localVersion = normalizeVersion(app.getVersion());
    console.log(`[Updater] Yerel Sürüm: ${localVersion}. Güncellemeler kontrol ediliyor...`);

    sendSplashUpdate(splashWin, 'GÜNCELLEMELER KONTROL EDİLİYOR...', null, 'Sürüm sorgulanıyor...');

    let remoteVersion = null;
    let downloadUrl = FALLBACK_SETUP_URL;

    try {
        const resp = await axios.get(VERSIONS_URL, {
            timeout: 3500,
            headers: { 'User-Agent': 'VexaClient-AutoUpdater', 'Cache-Control': 'no-cache' }
        });

        if (resp.data) {
            remoteVersion = resp.data.client || resp.data.launcher || null;
            if (resp.data.downloads && resp.data.downloads[clientArch]) {
                downloadUrl = resp.data.downloads[clientArch];
            } else if (resp.data.downloadUrl) {
                downloadUrl = resp.data.downloadUrl;
            } else {
                downloadUrl = `https://cdn.vexaclient.com/downloads/vexa-setup-${clientArch}.exe`;
            }
        }
    } catch (err) {
        console.warn('[Updater] API sürüm kontrolü başarısız oldu:', err.message);
    }

    // Güncelleme var mı kontrolü
    if (!remoteVersion || !isNewerVersion(remoteVersion, localVersion)) {
        console.log('[Updater] İstemci güncel. Oyuna geçiliyor.');
        sendSplashUpdate(splashWin, 'YÜKLENİYOR', null);
        return { updated: false };
    }

    console.log(`[Updater] Yeni sürüm bulundu: v${remoteVersion} (Mevcut: v${localVersion}). Zorunlu güncelleme onayı bekleniyor...`);

    function showPrompt(version) {
        if (splashWin && !splashWin.isDestroyed()) {
            try {
                splashWin.webContents.send('show-update-prompt', {
                    version: version,
                    currentVersion: localVersion
                });
                splashWin.webContents.executeJavaScript(`
                    if (typeof window.showUpdatePrompt === 'function') {
                        window.showUpdatePrompt(${JSON.stringify({ version, currentVersion: localVersion })});
                    }
                `).catch(() => {});
            } catch (e) {}
        }
    }

    showPrompt(remoteVersion);

    // Zorunlu güncelleme döngüsü: Güncelleme yapılmadan oyuna geçilmez.
    while (true) {
        if (!splashWin || splashWin.isDestroyed()) {
            console.log('[Updater] Pencere kapalı. Uygulama sonlandırılıyor.');
            app.quit();
            return { updated: true };
        }

        const userAction = await new Promise((resolve) => {
            const onDownload = () => {
                cleanup();
                resolve('download');
            };
            const onClose = () => {
                cleanup();
                resolve('close');
            };

            const cleanup = () => {
                ipcMain.removeListener('start-update-download', onDownload);
                if (splashWin && !splashWin.isDestroyed()) {
                    splashWin.removeListener('closed', onClose);
                }
            };

            ipcMain.once('start-update-download', onDownload);
            if (splashWin && !splashWin.isDestroyed()) {
                splashWin.once('closed', onClose);
            }
        });

        if (userAction === 'close') {
            console.log('[Updater] Güncelleme penceresi kapatıldı. Zorunlu güncelleme nedeniyle çıkılıyor.');
            app.quit();
            return { updated: true };
        }

        console.log('[Updater] Kullanıcı onayladı. İndirme başlıyor...');
        sendSplashUpdate(splashWin, `GÜNCELLEME İNDİRİLİYOR: v${remoteVersion}`, 0, 'İndirme hazırlanıyor...');

        const tempDir = os.tmpdir();
        const setupFilePath = path.join(tempDir, `vexa-setup-${Date.now()}.exe`);

        try {
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                headers: { 'User-Agent': 'VexaClient-AutoUpdater' },
                timeout: 60000
            });

            const totalLength = parseInt(response.headers['content-length'], 10) || 0;
            let downloadedLength = 0;
            const startTime = Date.now();
            let lastReport = 0;

            const writer = fs.createWriteStream(setupFilePath);

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                const now = Date.now();

                if (now - lastReport >= 200 || downloadedLength === totalLength) {
                    lastReport = now;
                    const percent = totalLength > 0 ? Math.min(100, Math.round((downloadedLength / totalLength) * 100)) : 0;
                    const elapsedSec = Math.max((now - startTime) / 1000, 0.1);
                    const bytesPerSec = downloadedLength / elapsedSec;
                    const speedText = `${formatBytes(bytesPerSec)}/sn`;
                    const sizeText = totalLength > 0 
                        ? `${formatBytes(downloadedLength)} / ${formatBytes(totalLength)}`
                        : formatBytes(downloadedLength);

                    const detailText = `${sizeText} • ${speedText}`;
                    sendSplashUpdate(splashWin, `GÜNCELLEME İNDİRİLİYOR (%${percent})`, percent, detailText);
                }
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('close', resolve);
                writer.on('finish', () => {
                    writer.close();
                });
                writer.on('error', reject);
                response.data.on('error', reject);
            });

            console.log('[Updater] İndirme tamamlandı. Kurulum başlatılıyor...');
            sendSplashUpdate(splashWin, 'KURULUM BAŞLATILIYOR...', 100, 'Lütfen bekleyin, yeni sürüm açılıyor...');

            await new Promise(r => setTimeout(r, 800));

            // Kurulum exe'sini bağımsız Windows süreci olarak başlat
            console.log('[Updater] Setup dosyası bağımsız süreç olarak çalıştırılıyor:', setupFilePath);

            try {
                const child = spawn(setupFilePath, [], {
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: true
                });
                child.unref();
                console.log('[Updater] spawn ile setup süreci tetiklendi.');
            } catch (spawnErr) {
                console.warn('[Updater] spawn hatası, shell.openPath deneniyor:', spawnErr);
                try {
                    const { shell } = require('electron');
                    shell.openPath(setupFilePath).catch(() => {});
                } catch (e) {}
            }

            setTimeout(() => {
                app.exit(0);
            }, 1800);

            return { updated: true };
        } catch (downloadErr) {
            console.error('[Updater] Güncelleme indirme hatası:', downloadErr.message);
            if (splashWin && !splashWin.isDestroyed()) {
                try {
                    splashWin.webContents.send('update-failed', {
                        message: 'İndirme başarısız oldu. Lütfen tekrar deneyin.'
                    });
                    splashWin.webContents.executeJavaScript(`
                        if (typeof window.showUpdateFailed === 'function') {
                            window.showUpdateFailed('İndirme başarısız oldu. Lütfen tekrar deneyin.');
                        }
                    `).catch(() => {});
                } catch (e) {}
            }
            // Hata durumunda döngü başa döner, kullanıcı "TEKRAR DENE"ye basınca yeniden dener
        }
    }
}

module.exports = {
    checkAndApplyUpdate
};
