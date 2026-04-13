const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const extract = require('extract-zip');
const { spawn } = require('child_process');

class InstallerManager {
    constructor(mainWindow, appDataPath) {
        this.mainWindow = mainWindow;
        this.appDataPath = appDataPath;
        this.gamePath = path.join(appDataPath, 'game');
        this.zipPath = path.join(appDataPath, 'update.zip');
    }

    notify(status, progress = null) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('installer-status', { status, progress });
        }
    }

    async killProcess(exeName = 'vexa-client.exe') {
        this.notify(`Eski süreçler kontrol ediliyor: ${exeName}...`);
        return new Promise((resolve) => {
            // Windows'ta süreci zorla kapatır, bulunamazsa hata vermez
            const cmd = `taskkill /F /IM ${exeName} /T`;
            spawn(cmd, { shell: true }).on('close', () => {
                setTimeout(resolve, 1500); // İşletim sisteminin dosya kilitlerini bırakması için bekle
            });
        });
    }

    async download(url) {
        this.notify('Sunucuya bağlanılıyor...');
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'VexaLauncher/Pro-Install-System',
                'Accept': '*/*'
            }
        });

        const totalLength = parseInt(response.headers['content-length'], 10);
        let downloadedLength = 0;
        const writer = fs.createWriteStream(this.zipPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                const progress = totalLength > 0 ? Math.round((downloadedLength / totalLength) * 100) : 0;
                this.notify('Oyun indiriliyor...', progress);
            });

            writer.on('finish', async () => {
                // DOĞRULAMA: İndirilen dosyanın boyutu doğru mu?
                const stats = await fs.stat(this.zipPath);
                if (totalLength > 0 && stats.size !== totalLength) {
                    reject(new Error(`İndirme eksik tamamlandı! (Beklenen: ${totalLength}, İnen: ${stats.size} bayt)`));
                } else {
                    console.log(`[Installer] Download verified: ${stats.size} bytes`);
                    resolve();
                }
            });

            writer.on('error', reject);
            response.data.on('error', reject);
        });
    }

    async install(version) {
        const originalNoAsar = process.noAsar;
        try {
            // ASAR desteğini geçici olarak kapat (Ayıklama sırasında "Invalid Package" hatasını önler)
            process.noAsar = true; 

            await this.killProcess();

            const stagingPath = path.join(this.appDataPath, 'staging');
            
            this.notify('Ön temizlik yapılıyor...');
            await fs.remove(stagingPath);
            await fs.ensureDir(stagingPath);

            this.notify('Dosyalar ayıklanıyor (200MB+ Optimize)...');
            await extract(this.zipPath, { dir: stagingPath });

            this.notify('Dosya yapısı taranıyor ve izole ediliyor...');
            await this.robustFlattenStructure(stagingPath);
            
            this.notify('Kurulum tamamlanıyor...');
            // Mevcut oyunu tamamen kaldır ve staging içeriğini oraya TAŞI
            await fs.remove(this.gamePath);
            await fs.move(stagingPath, this.gamePath, { overwrite: true });

            this.notify('Geçici dosyalar temizleniyor...');
            await fs.remove(this.zipPath);
            await fs.remove(stagingPath).catch(() => {}); // Ekstra temizlik
            
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

    /**
     * Recursive Flattening: Find the primary application folder and promote it within STAGING.
     */
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
            
            // appRoot'u temp_flat'e taşı
            await fs.move(appRoot, tempFlat);
            
            // stagingPath'i temizle ve temp_flat'i oraya kopyala
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
