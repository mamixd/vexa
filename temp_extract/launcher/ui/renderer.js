const patchNotes = document.getElementById('patch-notes');
const actionBtn = document.getElementById('action-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const progressDetails = document.getElementById('progress-details');

const loginModal = document.getElementById('login-modal');
const loginInput = document.getElementById('login-input');
const loginBtn = document.getElementById('login-btn');
const userProfile = document.getElementById('user-profile');
const profileName = document.getElementById('profile-name');

const welcomeOverlay = document.getElementById('welcome-overlay');
const welcomeText = document.getElementById('welcome-text');

const loginAvatarFile = document.getElementById('login-avatar-file');
const loginAvatarPreview = document.getElementById('login-avatar-preview');
const loginAvatarPlaceholder = document.getElementById('login-avatar-placeholder');
let selectedAvatarBase64 = '';

const profileAvatar = document.getElementById('profile-avatar');
const profileIcon = document.getElementById('profile-icon');

/* ────────── SFX Engine ────────── */
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, type, duration, vol) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playHoverSound() {
    initAudio();
    playTone(800, 'sine', 0.1, 0.05);
}

function playClickSound() {
    initAudio();
    playTone(1200, 'square', 0.15, 0.1);
}

function playStartupSound() {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
}

// Bind hover/click sounds globally to buttons
document.addEventListener('mouseover', (e) => {
    if (e.target.closest('button') || e.target.closest('.user-profile')) {
        playHoverSound();
    }
});
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.user-profile')) {
        playClickSound();
    }
});

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
    let entryCount = 0;

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
            const cls = isFirst ? 'tl-entry animate-slide-in' : 'tl-entry old animate-slide-in';
            const delay = 0.1 + (entryCount * 0.15); // Stagger animation

            currentEntry = '<div class="' + cls + '" style="animation-delay: ' + delay + 's">'
                + '<div class="tl-dot"></div>'
                + '<div class="tl-date">' + dateStr + badge + '</div>'
                + '<div class="tl-body">';
            isFirst = false;
            entryCount++;
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

const linkDiscord = document.getElementById('link-discord');
if (linkDiscord) {
    linkDiscord.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.api.openExternal) window.api.openExternal('https://vexa-client.github.io/discord');
    });
}

const linkWeb = document.getElementById('link-web');
if (linkWeb) {
    linkWeb.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.api.openExternal) window.api.openExternal('https://vexa-client.github.io');
    });
}

/* ────────── Interactive Canvas Particles ────────── */
const canvas = document.getElementById('particle-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const mouse = { x: -1000, y: -1000 };

    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        particles = [];
        const numParticles = 60;
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 1.5 + 0.5
            });
        }
    }

    window.addEventListener('resize', initCanvas);
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    function animateParticles() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(60, 216, 155, 0.5)';

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Mouse interaction
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                p.x -= dx * 0.02;
                p.y -= dy * 0.02;
            }

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        requestAnimationFrame(animateParticles);
    }

    initCanvas();
    animateParticles();
}

/* ────────── Avatar Logic ────────── */
function setAvatar(url) {
    if (url) {
        profileAvatar.src = url;
        profileAvatar.classList.remove('hidden');
        profileIcon.classList.add('hidden');
    } else {
        profileAvatar.classList.add('hidden');
        profileIcon.classList.remove('hidden');
    }
}

/* ────────── Login Logic ────────── */
function showWelcome(name, isFirstBoot) {
    playStartupSound();
    welcomeText.innerHTML = `HOŞ GELDİN,<br><span>${name.toUpperCase()}</span>`;
    
    const savedAvatar = localStorage.getItem('vexaAvatar');
    const welcomeLogo = document.getElementById('welcome-logo');
    const welcomeAvatar = document.getElementById('welcome-avatar');
    
    if (savedAvatar) {
        welcomeAvatar.src = savedAvatar;
        welcomeAvatar.classList.remove('hidden');
        welcomeLogo.classList.add('hidden');
    } else {
        welcomeAvatar.classList.add('hidden');
        welcomeLogo.classList.remove('hidden');
    }
    
    welcomeOverlay.classList.remove('hidden');
    
    // Fade out after 800ms
    setTimeout(() => {
        welcomeOverlay.classList.add('hidden');
        if (isFirstBoot && !updateInfo) {
            init(); // Start launcher logic
        }
    }, 800);
}

function checkUserLogin() {
    const savedName = localStorage.getItem('vexaUsername');
    const savedAvatar = localStorage.getItem('vexaAvatar');
    if (savedName) {
        profileName.innerText = savedName;
        setAvatar(savedAvatar);
        loginModal.classList.add('hidden');
        showWelcome(savedName, true);
    } else {
        loginModal.classList.remove('hidden');
        loginInput.focus();
    }
}

function handleLogin() {
    const val = loginInput.value.trim();
    
    if (val.length >= 3) { // min 3 chars
        localStorage.setItem('vexaUsername', val);
        localStorage.setItem('vexaAvatar', selectedAvatarBase64);
        profileName.innerText = val;
        setAvatar(selectedAvatarBase64);
        
        loginModal.classList.add('hidden');
        showWelcome(val, true);
    } else {
        // slight shake animation or just alert
        loginInput.style.border = '1px solid var(--red)';
        setTimeout(() => loginInput.style.border = '', 1000);
    }
}

loginBtn.addEventListener('click', handleLogin);
loginInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

const cropModal = document.getElementById('crop-modal');
const cropCanvas = document.getElementById('crop-canvas');
const cropCtx = cropCanvas.getContext('2d');
const cropCancelBtn = document.getElementById('crop-cancel-btn');
const cropSaveBtn = document.getElementById('crop-save-btn');
let cropImg = new Image();
let cropX = 0, cropY = 0, cropScale = 1;
let isDragging = false, startX, startY;

function clampCrop() {
    const minScale = Math.max(200 / cropImg.width, 200 / cropImg.height);
    if (cropScale < minScale) cropScale = minScale;
    
    const maxCropX = 0;
    const minCropX = 200 - cropImg.width * cropScale;
    if (cropX > maxCropX) cropX = maxCropX;
    if (cropX < minCropX) cropX = minCropX;
    
    const maxCropY = 0;
    const minCropY = 200 - cropImg.height * cropScale;
    if (cropY > maxCropY) cropY = maxCropY;
    if (cropY < minCropY) cropY = minCropY;
}

function drawCrop() {
    clampCrop();
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    const w = cropImg.width * cropScale;
    const h = cropImg.height * cropScale;
    cropCtx.drawImage(cropImg, cropX, cropY, w, h);
}

loginAvatarFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            cropImg.onload = () => {
                cropScale = Math.max(200 / cropImg.width, 200 / cropImg.height);
                cropX = (200 - cropImg.width * cropScale) / 2;
                cropY = (200 - cropImg.height * cropScale) / 2;
                cropModal.classList.remove('hidden');
                drawCrop();
            };
            cropImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
});

cropCanvas.addEventListener('mousedown', (e) => {
    isDragging = true; startX = e.clientX - cropX; startY = e.clientY - cropY;
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    cropX = e.clientX - startX; cropY = e.clientY - startY;
    drawCrop();
});
cropCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.05 : 0.95;
    const oldScale = cropScale;
    cropScale *= zoom;
    
    const minScale = Math.max(200 / cropImg.width, 200 / cropImg.height);
    if (cropScale < minScale) cropScale = minScale;
    
    // zoom towards center
    cropX -= (100 - cropX) * (cropScale / oldScale - 1);
    cropY -= (100 - cropY) * (cropScale / oldScale - 1);
    drawCrop();
});

cropCancelBtn.addEventListener('click', () => {
    cropModal.classList.add('hidden');
});

cropSaveBtn.addEventListener('click', () => {
    selectedAvatarBase64 = cropCanvas.toDataURL('image/png');
    loginAvatarPreview.src = selectedAvatarBase64;
    loginAvatarPreview.classList.remove('hidden');
    loginAvatarPlaceholder.classList.add('hidden');
    cropModal.classList.add('hidden');
});

userProfile.addEventListener('click', () => {
    loginInput.value = localStorage.getItem('vexaUsername') || '';
    selectedAvatarBase64 = localStorage.getItem('vexaAvatar') || '';
    if (selectedAvatarBase64) {
        loginAvatarPreview.src = selectedAvatarBase64;
        loginAvatarPreview.classList.remove('hidden');
        loginAvatarPlaceholder.classList.add('hidden');
    } else {
        loginAvatarPreview.classList.add('hidden');
        loginAvatarPlaceholder.classList.remove('hidden');
    }
    loginModal.classList.remove('hidden');
    loginInput.focus();
});

// Boot
checkUserLogin();
