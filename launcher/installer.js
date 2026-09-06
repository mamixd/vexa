const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const axios = require('axios');
const extract = require('extract-zip');
const { spawn } = require('child_process');

const PARALLEL_DOWNLOAD_PARTS = 8;
const PARALLEL_DOWNLOAD_MIN_SIZE = 4 * 1024 * 1024;

class InstallerManager {
    constructor(mainWindow, appDataPath) {
        this.mainWindow = mainWindow;
        this.appDataPath = appDataPath;
        this.gamePath = path.join(appDataPath, 'game');
        this.zipPath = path.join(appDataPath, 'update.zip');
    }

    notify(status, progress = null, details = null) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('installer-status', { status, progress, details });
        }
    }

    formatBytes(bytes) {
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

    formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return '--';
        const rounded = Math.ceil(seconds);
        const minutes = Math.floor(rounded / 60);
        const rest = rounded % 60;

        if (minutes <= 0) return `${rest} sn`;
        return `${minutes} dk ${rest.toString().padStart(2, '0')} sn`;
    }

    requestHeaders(extra = {}) {
        return {
            'User-Agent': 'VexaLauncher/Pro-Install-System',
            'Accept': '*/*',
            ...extra
        };
    }

    createProgressReporter(totalLength) {
        const startedAt = Date.now();
        let lastNotifyAt = 0;

        return (downloadedLength, status = 'İndiriliyor...', mode = null, force = false) => {
            const progress = totalLength > 0 ? Math.min(100, Math.round((downloadedLength / totalLength) * 100)) : 0;
            const now = Date.now();

            if (!force && progress !== 100 && now - lastNotifyAt <= 350) return;

            const elapsedSeconds = Math.max((now - startedAt) / 1000, 0.001);
            const bytesPerSecond = downloadedLength / elapsedSeconds;
            const remainingBytes = totalLength > 0 ? Math.max(totalLength - downloadedLength, 0) : 0;
            const etaSeconds = bytesPerSecond > 0 && totalLength > 0 ? remainingBytes / bytesPerSecond : 0;
            const modeText = mode ? ` • ${mode}` : '';
            const details = {
                downloaded: downloadedLength,
                total: totalLength || null,
                speed: bytesPerSecond,
                eta: etaSeconds,
                text: totalLength > 0
                    ? `${this.formatBytes(downloadedLength)} / ${this.formatBytes(totalLength)} • ${this.formatBytes(bytesPerSecond)}/sn • ${this.formatDuration(etaSeconds)} kaldı${modeText}`
                    : `${this.formatBytes(downloadedLength)} • ${this.formatBytes(bytesPerSecond)}/sn${modeText}`
            };

            this.notify(status, progress, details);
            lastNotifyAt = now;
        };
    }

    async killProcess(exeName = 'vexa-client.exe') {
        this.notify(`Eski süreçler kontrol ediliyor: ${exeName}...`);
        const processes = [exeName, 'vexa-launcher.exe', 'Vexa Launcher.exe', 'vexa-haxball-client.exe'];

        for (const proc of processes) {
            await new Promise((resolve) => {
                const cmd = `taskkill /F /IM ${proc} /T 2>nul`;
                spawn(cmd, { shell: true, windowsHide: true }).on('close', () => {
                    setTimeout(resolve, 800);
                });
            });
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    async safeRemove(dirPath, maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await fs.remove(dirPath);
                return;
            } catch (err) {
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                } else {
                    throw err;
                }
            }
        }
    }

    async download(url, fileName = 'update.zip') {
        this.notify('Sunucuya bağlanılıyor...');
        const targetDir = fileName === 'update.exe' ? os.tmpdir() : this.appDataPath;
        const targetPath = path.join(targetDir, fileName);

        await fs.remove(targetPath).catch(() => {});

        console.log(`[Installer] Starting download: ${url}`);
        this.notify('İndirme başlatılıyor...');

        const response = await axios({
            method: 'get',
            url,
            responseType: 'stream',
            maxRedirects: 10,
            timeout: 60000,
            headers: this.requestHeaders()
        });

        const totalLength = parseInt(response.headers['content-length'], 10) || 0;
        const acceptRanges = String(response.headers['accept-ranges'] || '').toLowerCase().includes('bytes');
        const isGitHub = url.includes('github.com') || url.includes('githubusercontent.com');
        const canUseParallel = (acceptRanges || isGitHub) && totalLength >= PARALLEL_DOWNLOAD_MIN_SIZE;

        console.log(`[Installer] Response headers: size=${totalLength}, ranges=${acceptRanges}, github=${isGitHub}, parallel=${canUseParallel}`);

        if (canUseParallel) {
            response.data.destroy();
            console.log('[Installer] Stream aborted, switching to parallel download...');

            try {
                await this.downloadParallel(url, targetPath, totalLength);
                return;
            } catch (error) {
                console.warn('[Installer] Parallel download failed, falling back to stream:', error.message);
                await fs.remove(targetPath).catch(() => {});
                this.notify('Tek bağlantı ile deneniyor...', 0);
            }
        }

        await this.downloadStreamFromResponse(response, targetPath, totalLength);
    }

    async downloadStreamFromResponse(response, targetPath, totalLength) {
        let downloadedLength = 0;
        const reportProgress = this.createProgressReporter(totalLength);
        const writer = fs.createWriteStream(targetPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                reportProgress(downloadedLength, 'İndiriliyor...', 'tek bağlantı');
            });

            writer.on('finish', async () => {
                const stats = await fs.stat(targetPath);
                if (totalLength > 0 && stats.size !== totalLength) {
                    reject(new Error(`İndirme eksik tamamlandı! (Beklenen: ${totalLength}, İnen: ${stats.size} bayt)`));
                } else {
                    console.log(`[Installer] Download verified: ${stats.size} bytes`);
                    reportProgress(stats.size, 'İndiriliyor...', 'tek bağlantı', true);
                    resolve();
                }
            });

            writer.on('error', reject);
            response.data.on('error', reject);
        });
    }

    async downloadParallel(url, targetPath, totalLength) {
        const partCount = Math.min(PARALLEL_DOWNLOAD_PARTS, Math.ceil(totalLength / PARALLEL_DOWNLOAD_MIN_SIZE));
        const partSize = Math.ceil(totalLength / partCount);
        const partProgress = new Array(partCount).fill(0);
        const partPaths = [];
        const reportProgress = this.createProgressReporter(totalLength);

        this.notify('Hızlı indirme hazırlanıyor...', 0, {
            downloaded: 0,
            total: totalLength,
            speed: 0,
            eta: 0,
            text: `${partCount} paralel bağlantı hazırlanıyor`
        });

        const tasks = Array.from({ length: partCount }, async (_, index) => {
            const start = index * partSize;
            const end = Math.min(start + partSize - 1, totalLength - 1);
            const partPath = `${targetPath}.part${index}`;
            partPaths[index] = partPath;
            await fs.remove(partPath).catch(() => {});

            await this.downloadRange(url, partPath, start, end, (bytes) => {
                partProgress[index] = bytes;
                const downloadedLength = partProgress.reduce((sum, value) => sum + value, 0);
                reportProgress(downloadedLength, 'İndiriliyor...', `${partCount} paralel bağlantı`);
            });
        });

        try {
            await Promise.all(tasks);
            await this.mergeParts(partPaths, targetPath);

            const stats = await fs.stat(targetPath);
            if (stats.size !== totalLength) {
                throw new Error(`Parçalı indirme eksik tamamlandı! (Beklenen: ${totalLength}, İnen: ${stats.size} bayt)`);
            }

            reportProgress(stats.size, 'İndiriliyor...', `${partCount} paralel bağlantı`, true);
            await Promise.all(partPaths.map((partPath) => fs.remove(partPath).catch(() => {})));
        } catch (error) {
            await Promise.all(partPaths.map((partPath) => fs.remove(partPath).catch(() => {})));
            throw error;
        }
    }

    async downloadRange(url, partPath, start, end, onProgress) {
        const response = await axios({
            method: 'get',
            url,
            responseType: 'stream',
            maxRedirects: 10,
            timeout: 120000,
            headers: this.requestHeaders({
                Range: `bytes=${start}-${end}`,
                Connection: 'keep-alive'
            }),
            validateStatus: (status) => status === 206
        });

        let downloaded = 0;
        const expectedSize = end - start + 1;
        const writer = fs.createWriteStream(partPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloaded += chunk.length;
                onProgress(downloaded);
            });

            writer.on('finish', async () => {
                const stats = await fs.stat(partPath);
                if (stats.size !== expectedSize) {
                    reject(new Error(`Parça eksik indi: ${stats.size}/${expectedSize}`));
                    return;
                }

                resolve();
            });

            writer.on('error', reject);
            response.data.on('error', reject);
        });
    }

    async mergeParts(partPaths, targetPath) {
        await fs.remove(targetPath).catch(() => {});

        for (const partPath of partPaths) {
            await new Promise((resolve, reject) => {
                const reader = fs.createReadStream(partPath);
                const writer = fs.createWriteStream(targetPath, { flags: 'a' });

                reader.on('error', reject);
                writer.on('error', reject);
                writer.on('finish', resolve);
                reader.pipe(writer);
            });
        }
    }

    async installLauncherUpdate() {
        const tempDir = os.tmpdir();
        const launcherUpdatePath = path.join(tempDir, 'update.exe');
        if (!fs.existsSync(launcherUpdatePath)) {
            throw new Error('Kurulum dosyası bulunamadı.');
        }

        this.notify('Kurulum başlatılıyor...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Setup dosyasını doğrudan çalıştır (kullanıcıya pencere görünsün)
        const child = spawn(launcherUpdatePath, [], { 
            detached: true, 
            stdio: 'ignore'
        });
        child.unref();
        
        return { success: true };
    }

    async install(version) {
        const originalNoAsar = process.noAsar;
        try {
            process.noAsar = true;

            await this.killProcess();

            const stagingPath = path.join(this.appDataPath, 'staging');

            this.notify('Ön temizlik yapılıyor...');
            await this.safeRemove(stagingPath);
            await fs.ensureDir(stagingPath);

            this.notify('Dosyalar ayıklanıyor...');
            await extract(this.zipPath, { dir: stagingPath });

            this.notify('Dosya yapısı taranıyor ve izole ediliyor...');
            await this.robustFlattenStructure(stagingPath);

            this.notify('Kurulum tamamlanıyor...');
            await this.safeRemove(this.gamePath);
            await fs.move(stagingPath, this.gamePath, { overwrite: true });

            this.notify('Geçici dosyalar temizleniyor...');

            await this.safeRemove(this.zipPath).catch(() => {});
            await this.safeRemove(stagingPath).catch(() => {});
            const versionFile = path.join(this.appDataPath, 'version.json');
            await fs.writeJson(versionFile, { version });

            return { success: true };
        } catch (error) {
            console.error('[Installer] High-Reliability Installation Failed:', error);
            throw error;
        } finally {
            process.noAsar = originalNoAsar;
        }
    }

    async robustFlattenStructure(targetDir) {
        const findAppRoot = async (dir) => {
            const entries = await fs.readdir(dir);
            if (entries.includes('vexa-client.exe')) return dir;

            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const stats = await fs.stat(fullPath);
                if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                    const found = await findAppRoot(fullPath);
                    if (found) return found;
                }
            }
            return null;
        };

        const appRoot = await findAppRoot(targetDir);

        if (appRoot && appRoot !== targetDir) {
            console.log(`[Installer] Detected app root at: ${appRoot}. Normalizing staging area...`);

            const tempFlat = path.join(this.appDataPath, 'temp_flat');
            await fs.remove(tempFlat);

            await fs.move(appRoot, tempFlat);
            await fs.remove(targetDir);
            await fs.ensureDir(targetDir);
            await fs.copy(tempFlat, targetDir);
            await fs.remove(tempFlat);
        }

        const finalCheck = path.join(targetDir, 'vexa-client.exe');
        if (!fs.existsSync(finalCheck)) {
            throw new Error('Kritik Hata: Ayıklama ve Hizalama bitti ancak "vexa-client.exe" bulunamadı!');
        }
    }
}

module.exports = InstallerManager;
