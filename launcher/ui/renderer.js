const statusText = document.getElementById('status-text');
const versionText = document.getElementById('version-text');
const patchNotes = document.getElementById('patch-notes');
const actionBtn = document.getElementById('action-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');

let updateInfo = null;

async function init() {
    try {
        updateInfo = await window.api.checkUpdate();
        
        if (updateInfo.error) {
            statusText.innerText = 'BAĞLANTI HATASI';
            statusText.style.color = 'var(--red)';
            patchNotes.innerText = 'GitHub API bağlantısı kurulamadı. Lütfen internetinizi kontrol edin.';
            return;
        }

        versionText.innerText = `Sürüm: ${updateInfo.localVersion} ${updateInfo.updateAvailable ? '(Güncelleme Mevcut)' : '(Güncel)'}`;
        patchNotes.innerHTML = formatPatchNotes(updateInfo.patchNotes || 'Herhangi bir yama notu bulunamadı.');

        if (!updateInfo.isInstalled) {
            statusText.innerText = 'KURULUM GEREKLİ';
            actionBtn.innerText = 'ŞİMDİ İNDİR';
            actionBtn.classList.remove('disabled');
            updateInfo.updateAvailable = true; // Fix: Set to true so first click triggers download flow
        } else if (updateInfo.updateAvailable) {
            statusText.innerText = 'GÜNCELLEME MEVCUT';
            actionBtn.innerText = 'ŞİMDİ GÜNCELLE';
            actionBtn.classList.remove('disabled');
        } else {
            statusText.innerText = 'VEZA İÇİN HAZIRMISIN?';
            actionBtn.innerText = 'OYNA';
            actionBtn.classList.remove('disabled');
        }
    } catch (err) {
        console.error(err);
    }
}

function formatPatchNotes(text) {
    // Basic markdown to HTML conversion for patch notes
    return text
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/### (.*)/g, '<h3 style="color:white; margin:15px 0 5px 0;">$1</h3>')
        .replace(/## (.*)/g, '<h2 style="color:var(--cyan); margin:20px 0 10px 0;">$1</h2>')
        .replace(/\* (.*)/g, '<li style="margin-left:15px; list-style:square;">$1</li>');
}

actionBtn.addEventListener('click', async () => {
    if (actionBtn.classList.contains('disabled')) return;

    if (updateInfo.updateAvailable) {
        // Start Update Flow
        actionBtn.classList.add('disabled');
        actionBtn.innerText = 'GÜNCELLENİYOR...';
        progressContainer.classList.remove('hidden');

        try {
            await window.api.startDownload(updateInfo.downloadUrl);
            statusText.innerText = 'AYIKLANIYOR...';
            await window.api.extractAndInstall(updateInfo.latestVersion);
            
            // Success
            statusText.innerText = 'GÜNCELLEME TAMAMLANDI';
            progressContainer.classList.add('hidden');
            setTimeout(() => {
                location.reload(); // Refresh to show Play button
            }, 1000);
        } catch (err) {
            statusText.innerText = 'GÜNCELLEME HATASI';
            statusText.style.color = 'var(--red)';
            console.error(err);
        }
    } else {
        // Launch Flow
        statusText.innerText = 'BAŞLATILIYOR...';
        const result = await window.api.launchGame();
        if (result && result.error) {
            if (result.needsDownload) {
                statusText.innerText = 'DOSYALAR EKSİK';
                statusText.style.color = 'var(--cyan)';
                actionBtn.innerText = 'ŞİMDİ İNDİR';
                actionBtn.classList.remove('disabled');
                
                // Set updateAvailable to true so next click triggers download
                updateInfo.updateAvailable = true; 
                if (!updateInfo.downloadUrl) {
                    updateInfo.downloadUrl = 'https://github.com/vexa-client/vexa/releases/latest';
                }
            } else {
                statusText.innerText = 'BAŞLATMA HATASI';
                statusText.style.color = 'var(--red)';
                patchNotes.innerHTML = `<div style="color:var(--red); font-weight:bold;">HATA: ${result.error}</div>`;
                setTimeout(() => {
                    location.reload();
                }, 3000);
            }
        }
    }
});

window.api.onDownloadProgress((progress) => {
    progressFill.style.width = `${progress}%`;
    progressLabel.innerText = `${progress}%`;
});

window.api.onInstallerStatus((data) => {
    statusText.innerText = data.status.toUpperCase();
    if (data.progress !== null) {
        progressFill.style.width = `${data.progress}%`;
        progressLabel.innerText = `${data.progress}%`;
        progressContainer.classList.remove('hidden');
    }
});

document.getElementById('close').addEventListener('click', () => window.api.close());
document.getElementById('minimize').addEventListener('click', () => window.api.minimize());

init();
