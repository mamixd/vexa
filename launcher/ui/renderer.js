const patchNotes = document.getElementById('patch-notes');
const actionBtn = document.getElementById('action-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const progressDetails = document.getElementById('progress-details');

let updateInfo = null;

/* ────────── init ────────── */
async function init() {
    try {
        updateInfo = await window.api.checkUpdate();
        patchNotes.innerHTML = parseMarkdown(updateInfo.patchNotes || 'Yama notları bulunamadı.');

        if (!updateInfo.isInstalled) {
            setStatus('ready', 'Kuruluma Hazır', 'Her şey hazır! Vexa Client\'ın en güncel sürümü indirilmeye hazır.', 'İNDİR', false, 'download');
            updateInfo.updateAvailable = true;
            updateInfo.updateType = 'client';
            updateInfo.downloadUrl = updateInfo.clientDownloadUrl || updateInfo.downloadUrl;
        } else if (updateInfo.updateAvailable) {
            if (updateInfo.updateType === 'launcher') {
                setStatus('ready', 'Launcher Güncellemesi', 'Yeni launcher sürümü indirilmeye hazır.', 'GÜNCELLE', false, 'download');
            } else {
                setStatus('ready', 'Oyun Güncellemesi', 'Her şey hazır! Vexa Client\'ın en güncel sürümü indirilmeye hazır.', 'İNDİR', false, 'download');
            }
        } else {
            setStatus('ready', 'Maceraya Hazır', 'Her şey hazır! Vexa Client en güncel sürümde.', 'OYNA', false, 'play');
        }
    } catch (err) {
        setStatus('error', 'Başlatma Hatası', err.message || String(err), 'HATA', true, 'none');
        console.error(err);
    }
}

/* ────────── markdown → timeline HTML ────────── */
function parseMarkdown(md) {
    if (!md) return '';

    const lines = md.split('\n');
    let html = '';
    let currentEntry = '';
    let isFirst = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('### ')) {
            // Close previous entry
            if (currentEntry) {
                html += currentEntry + '</div></div>';
            }
            const dateStr = line.replace('### ', '').trim();
            const badge = isFirst ? ' <span class="tl-badge">LATEST</span>' : '';
            const cls = isFirst ? 'tl-entry' : 'tl-entry old';

            currentEntry = '<div class="' + cls + '">'
                + '<div class="tl-dot"></div>'
                + '<div class="tl-date">' + dateStr + badge + '</div>'
                + '<div class="tl-body">';
            isFirst = false;
        } else if (line.startsWith('**') && line.endsWith('**')) {
            const title = line.replace(/\*\*/g, '').trim();
            currentEntry += '<div class="tl-title">' + title + '</div>';
        } else if (line.startsWith('- ')) {
            const text = line.substring(2).trim();
            currentEntry += '<p>' + text + '</p>';
        } else if (line.startsWith('#')) {
            continue;
        } else {
            currentEntry += '<p>' + line + '</p>';
        }
    }

    if (currentEntry) {
        html += currentEntry + '</div></div>';
    }

    return html || '<div class="timeline-loading">Yama notları bulunamadı.</div>';
}

/* ────────── setStatus ────────── */
function setStatus(type, title, desc, btnText, btnDisabled, btnIcon) {
    const statusTitle = document.getElementById('status-title');
    const statusDesc = document.getElementById('status-desc');
    const statusIcon = document.getElementById('status-icon');
    const btnTextEl = document.getElementById('btn-text');
    const btnIconEl = document.getElementById('btn-icon');

    statusTitle.innerText = title;
    statusDesc.innerText = desc;
    statusTitle.style.color = type === 'error' ? 'var(--red)' : (type === 'loading' ? 'var(--gray)' : 'var(--accent)');

    statusIcon.className = 'status-icon ' + type;

    if (type === 'success' || type === 'ready') {
        statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
        statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
        statusIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    }

    if (btnDisabled) {
        actionBtn.classList.add('disabled');
    } else {
        actionBtn.classList.remove('disabled');
    }

    btnTextEl.innerText = btnText;

    if (btnIcon === 'download') {
        btnIconEl.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>';
    } else if (btnIcon === 'play') {
        btnIconEl.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    } else {
        btnIconEl.innerHTML = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
    }
}

/* ────────── click handler ────────── */
actionBtn.addEventListener('click', async () => {
    if (actionBtn.classList.contains('disabled')) return;

    if (updateInfo.updateAvailable) {
        if (!updateInfo.downloadUrl) {
            setStatus('error', 'İndirme Linki Bulunamadı', 'GitHub release içinde gerekli dosya bulunamadı.', 'HATA', true, 'none');
            return;
        }

        setStatus('loading', 'İndiriliyor', 'Güncelleme dosyaları indiriliyor, lütfen bekleyin.', 'GÜNCELLENİYOR...', true, 'loading');
        progressContainer.classList.remove('hidden');

        try {
            if (updateInfo.updateType === 'launcher') {
                setStatus('loading', 'Launcher Güncelleniyor', 'Yeni launcher sürümü yükleniyor...', 'YÜKLENİYOR...', true, 'loading');
                const result = await window.api.startLauncherUpdate(updateInfo.downloadUrl);
                if (result && result.error) {
                    throw new Error(result.error);
                }
                return;
            }

            await window.api.startDownload(updateInfo.downloadUrl);
            setStatus('loading', 'Ayıklanıyor', 'Oyun dosyaları çıkartılıyor, az kaldı.', 'AYIKLANIYOR...', true, 'loading');
            await window.api.extractAndInstall(updateInfo.latestVersion);

            setStatus('success', 'Güncelleme Tamamlandı', 'Her şey başarıyla güncellendi.', 'YENİDEN BAŞLATILIYOR', true, 'loading');
            progressContainer.classList.add('hidden');
            setTimeout(() => { location.reload(); }, 1000);
        } catch (err) {
            setStatus('error', 'Güncelleme Hatası', err.message || String(err), 'TEKRAR DENE', false, 'loading');
            console.error(err);
        }
    } else {
        setStatus('loading', 'Başlatılıyor', 'Vexa Client başlatılıyor, lütfen bekle.', 'BAŞLATILIYOR...', true, 'loading');
        const result = await window.api.launchGame();
        if (result && result.error) {
            if (result.needsDownload) {
                setStatus('error', 'Dosyalar Eksik', 'Oyun dosyaları bulunamadı, yeniden indirilmesi gerekiyor.', 'ŞİMDİ İNDİR', false, 'download');
                updateInfo.updateAvailable = true;
                updateInfo.updateType = 'client';
                updateInfo.downloadUrl = updateInfo.clientDownloadUrl || 'https://github.com/vexa-client/vexa/releases/latest/download/app.zip';
            } else {
                setStatus('error', 'Başlatma Hatası', result.error, 'YENİDEN DENENİYOR...', true, 'none');
                setTimeout(() => { location.reload(); }, 3000);
            }
        }
    }
});

/* ────────── event listeners ────────── */
window.api.onDownloadProgress((progress) => {
    progressFill.style.width = progress + '%';
    progressLabel.innerText = progress + '%';
});

window.api.onInstallerStatus((data) => {
    const st = document.getElementById('status-title');
    if (st) st.innerText = data.status.toUpperCase();
    if (data.progress !== null) {
        progressFill.style.width = data.progress + '%';
        progressLabel.innerText = data.progress + '%';
        progressContainer.classList.remove('hidden');
    }
    if (data.details && data.details.text) {
        progressDetails.innerText = data.details.text;
    }
});

document.getElementById('close').addEventListener('click', () => window.api.close());
document.getElementById('minimize').addEventListener('click', () => window.api.minimize());

const helpCard = document.querySelector('.help-card');
if (helpCard) {
    helpCard.addEventListener('click', () => {
        if (window.api.openExternal) {
            window.api.openExternal('https://vexa-client.github.io/discord');
        }
    });
}

init();
