const statusText = document.getElementById('status-text');
const versionText = document.getElementById('version-text');
const patchNotes = document.getElementById('patch-notes');
const actionBtn = document.getElementById('action-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const progressDetails = document.getElementById('progress-details');

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
            updateInfo.updateAvailable = true; // First install uses the same download flow.
            updateInfo.updateType = 'client';
            updateInfo.downloadUrl = updateInfo.clientDownloadUrl || updateInfo.downloadUrl;
        } else if (updateInfo.updateAvailable) {
            if (updateInfo.updateType === 'launcher') {
                statusText.innerText = 'LAUNCHER GÜNCELLEME MEVCUT';
                actionBtn.innerText = 'LAUNCHER GÜNCELLE';
            } else {
                statusText.innerText = 'OYUN GÜNCELLEMESİ MEVCUT';
                actionBtn.innerText = 'ŞİMDİ GÜNCELLE';
            }
            actionBtn.classList.remove('disabled');
        } else {
            statusText.innerText = 'VEXA İÇİN HAZIRMISIN?';
            actionBtn.innerText = 'OYNA';
            actionBtn.classList.remove('disabled');
        }
    } catch (err) {
        console.error(err);
    }
}

function formatPatchNotes(text) {
    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const inline = (value) => escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let listType = null;

    const closeList = () => {
        if (!listType) return;
        html.push(`</${listType}>`);
        listType = null;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            continue;
        }

        if (trimmed.startsWith('### ')) {
            closeList();
            html.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
        } else if (trimmed.startsWith('## ')) {
            closeList();
            html.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
        } else if (trimmed.startsWith('# ')) {
            closeList();
            html.push(`<h1>${inline(trimmed.slice(2))}</h1>`);
        } else if (/^[-*]\s+/.test(trimmed)) {
            if (listType !== 'ul') {
                closeList();
                html.push('<ul>');
                listType = 'ul';
            }
            html.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
        } else if (/^\d+\.\s+/.test(trimmed)) {
            if (listType !== 'ol') {
                closeList();
                html.push('<ol>');
                listType = 'ol';
            }
            html.push(`<li>${inline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
        } else {
            closeList();
            html.push(`<p>${inline(trimmed)}</p>`);
        }
    }

    closeList();
    return html.join('');
}

actionBtn.addEventListener('click', async () => {
    if (actionBtn.classList.contains('disabled')) return;

    if (updateInfo.updateAvailable) {
        if (!updateInfo.downloadUrl) {
            statusText.innerText = 'İNDİRME LİNKİ BULUNAMADI';
            statusText.style.color = 'var(--red)';
            patchNotes.innerText = 'GitHub release içinde app.zip dosyası bulunamadı. Lütfen son release dosyalarını kontrol edin.';
            return;
        }

        // Start Update Flow
        actionBtn.classList.add('disabled');
        actionBtn.innerText = 'GÜNCELLENİYOR...';
        progressContainer.classList.remove('hidden');

        try {
            if (updateInfo.updateType === 'launcher') {
                statusText.innerText = 'LAUNCHER GÜNCELLENİYOR...';
                await window.api.startLauncherUpdate(updateInfo.downloadUrl);
                return;
            }

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

    if (data.details && data.details.text) {
        progressDetails.innerText = data.details.text;
    }
});

document.getElementById('close').addEventListener('click', () => window.api.close());
document.getElementById('minimize').addEventListener('click', () => window.api.minimize());

init();
