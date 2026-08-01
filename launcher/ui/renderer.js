const API_URL = 'http://193.164.4.245:5000/api';
let currentUser = null;
let friendsList = [];
let pendingRequests = [];
let currentChatFriendId = null;
let currentChatFriendName = '';

// Auto-login handled after apiCall is defined below

/* =====================================================
   ELECTRON WINDOW CONTROLS
===================================================== */
document.getElementById('win-minimize')?.addEventListener('click', () => {
    if (window.api && window.api.minimize) window.api.minimize();
});
document.getElementById('win-close')?.addEventListener('click', () => {
    if (window.api && window.api.close) window.api.close();
});

/* =====================================================
   TOASTS
===================================================== */
function showToast(msg) {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="dot"></div>${msg}`;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 250);
    }, 2600);
}

/* =====================================================
   AUTH SCREEN & GUEST LOCK
===================================================== */
const authScreen = document.getElementById('authScreen');
const authTitle = document.getElementById('authTitle');
const authSub = document.getElementById('authSub');

function isGuest() { return currentUser === null; }

function openAuthScreen(tab) {
    document.querySelector(`.auth-tab[data-auth-tab="${tab}"]`)?.click();
    authScreen.classList.remove('hide');
}

function requireAccount(message) {
    if (!isGuest()) return false;
    showToast(message);
    openAuthScreen('register');
    return true;
}

function updateGuestLocks() {
    const guest = isGuest();
    document.getElementById('friendsLock')?.classList.toggle('show', guest);
    document.getElementById('profileLock')?.classList.toggle('show', guest);
    document.getElementById('friendsColHomeLock')?.classList.toggle('show', guest);
}

function updateOwnAvatar() {
    const btn = document.getElementById('ownProfileBtn');
    if (!btn) return;
    const customAvatar = (currentUser && currentUser.avatar) || localStorage.getItem('vexa_avatar');
    if (customAvatar) {
        btn.style.backgroundImage = `url("${customAvatar}")`;
        btn.style.backgroundSize = 'cover';
        btn.style.backgroundPosition = 'center';
        btn.innerHTML = `<div class="status-dot"></div>`;
    } else {
        btn.style.backgroundImage = '';
        const initial = isGuest() ? 'G' : (currentUser ? currentUser.username.substring(0, 2).toUpperCase() : 'O');
        btn.innerHTML = `${initial}<div class="status-dot"></div>`;
    }
}

document.getElementById('friendsLockBtn')?.addEventListener('click', () => openAuthScreen('register'));
document.getElementById('profileLockBtn')?.addEventListener('click', () => openAuthScreen('register'));
document.getElementById('friendsColHomeLockBtn')?.addEventListener('click', () => openAuthScreen('register'));
document.getElementById('ownProfileBtn')?.addEventListener('click', () => {
    if (isGuest()) return;
    openProfilePanel('own');
});

document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.authTab;
        document.getElementById('loginForm').classList.toggle('active', target === 'login');
        document.getElementById('registerForm').classList.toggle('active', target === 'register');
        if (target === 'login') {
            authTitle.textContent = 'Tekrar hoş geldin';
            authSub.textContent = 'Vexa LAUNCHER\'a devam etmek için giriş yap';
        } else {
            authTitle.textContent = 'Hesabını oluştur';
            authSub.textContent = "Henüz hesabın yok mu? Saniyeler içinde kur";
        }
    });
});

async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: {} };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_URL}${endpoint}`, opts);
    return res.json();
}

// Instant synchronous auto-login from localStorage
(function initAutoLogin() {
    const savedId = localStorage.getItem('vexa_user_id');
    const savedName = localStorage.getItem('vexa_username');
    if (savedId) {
        currentUser = {
            id: savedId,
            username: savedName || 'Oyuncu',
            dot: 'online',
            activity: 'Idle'
        };
        authScreen.classList.add('hide');
        updateGuestLocks();
        updateOwnAvatar();
        const sName = document.getElementById('sidebarProfileName');
        const sStatus = document.getElementById('sidebarProfileStatus');
        if (sName) sName.textContent = currentUser.username;
        if (sStatus) sStatus.textContent = 'Çevrimiçi';

        // Fetch fresh profile in background
        apiCall(`/user/profile?userId=${savedId}`).then(data => {
            if (data && data.success && data.profile) {
                currentUser = data.profile;
                if (currentUser.username) {
                    localStorage.setItem('vexa_username', currentUser.username);
                    if (sName) sName.textContent = currentUser.username;
                    updateOwnAvatar();
                }
            }
        }).catch(() => {});

        loadFriends();
        loadNotifications();
    } else {
        updateGuestLocks();
        updateOwnAvatar();
    }
})();

document.getElementById('guestBtn').addEventListener('click', () => {
    currentUser = null;
    updateGuestLocks();
    updateOwnAvatar();
    document.getElementById('sidebarProfileName').textContent = 'Misafir';
    document.getElementById('sidebarProfileStatus').textContent = 'Çevrimdışı';
    authScreen.classList.add('hide');
    showToast('Misafir olarak geziniyorsun.');
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('vexa_user_id');
    currentUser = null;
    document.getElementById('sidebarProfileName').textContent = 'Misafir';
    document.getElementById('sidebarProfileStatus').textContent = 'Çevrimdışı';
    authScreen.classList.remove('hide');
    showToast('Çıkış yapıldı.');
});

document.getElementById('loginSubmit').addEventListener('click', async function() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginError');
    if (!user || !pass) return;

    const originalText = this.textContent;
    this.textContent = 'Yükleniyor...';
    this.style.opacity = '0.7';
    this.style.pointerEvents = 'none';

    try {
        const data = await apiCall('/auth/login', 'POST', { username: user, password: pass });
        if (data.error) {
            errorEl.textContent = data.error;
            errorEl.classList.add('show');
        } else {
            errorEl.classList.remove('show');
            currentUser = data.user;
            localStorage.setItem('vexa_user_id', currentUser.id);
            localStorage.setItem('vexa_username', currentUser.username);
            // Sync profile data from backend
            if (currentUser.bio) localStorage.setItem('vexa_bio', currentUser.bio);
            if (currentUser.avatar) localStorage.setItem('vexa_avatar', currentUser.avatar);
            if (currentUser.banner) localStorage.setItem('vexa_banner', currentUser.banner);
            if (currentUser.playTime) localStorage.setItem('vexa_play_time', String(currentUser.playTime));
            updateGuestLocks();
            updateOwnAvatar();
            document.getElementById('sidebarProfileName').textContent = currentUser.username;
            document.getElementById('sidebarProfileStatus').textContent = 'Çevrimiçi';
            authScreen.classList.add('hide');
            showToast(`${currentUser.username} olarak giriş yapıldı`);
            loadFriends();
        }
    } catch (e) {
        errorEl.textContent = 'Sunucuya bağlanılamadı.';
        errorEl.classList.add('show');
    } finally {
        this.textContent = originalText;
        this.style.opacity = '1';
        this.style.pointerEvents = 'auto';
    }
});

document.getElementById('regSubmit').addEventListener('click', async function() {
    const user = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const errorEl = document.getElementById('regError');
    if (!user || !email || !pass) return;

    const originalText = this.textContent;
    this.textContent = 'Yükleniyor...';
    this.style.opacity = '0.7';
    this.style.pointerEvents = 'none';

    try {
        const data = await apiCall('/auth/register', 'POST', { username: user, email, password: pass });
        if (data.error) {
            errorEl.textContent = data.error;
            errorEl.classList.add('show');
        } else {
            errorEl.classList.remove('show');
            currentUser = { id: data.userId, username: data.username, email: email, dot: 'online', activity: 'Idle' };
            localStorage.setItem('vexa_user_id', currentUser.id);
            localStorage.setItem('vexa_username', currentUser.username);
            updateGuestLocks();
            updateOwnAvatar();
            document.getElementById('sidebarProfileName').textContent = currentUser.username;
            document.getElementById('sidebarProfileStatus').textContent = 'Çevrimiçi';
            authScreen.classList.add('hide');
            showToast(`Hesap oluşturuldu, hoş geldin ${currentUser.username}`);
            loadFriends();
        }
    } catch (e) {
        errorEl.textContent = 'Sunucuya bağlanılamadı.';
        errorEl.classList.add('show');
    } finally {
        this.textContent = originalText;
        this.style.opacity = '1';
        this.style.pointerEvents = 'auto';
    }
});

/* =====================================================
   FRIENDS SYSTEM
===================================================== */
async function loadFriends() {
    if (isGuest()) return;
    const list = document.getElementById('fpList');
    
    const cached = localStorage.getItem('vexa_cached_friends');
    if (cached) {
        try {
            friendsList = JSON.parse(cached);
            buildFriendsColumn();
            const activeTab = document.querySelector('.fp-tab.active');
            if (!activeTab || activeTab.dataset.tab !== 'pending') renderFpList(activeTab ? activeTab.dataset.tab : 'online');
        } catch(e) {}
    } else {
        if (list && friendsList.length === 0) list.innerHTML = `<div class="fp-empty">Yükleniyor...</div>`;
    }

    try {
        const data = await apiCall(`/friends/list?userId=${currentUser.id}`);
        if (data.friends) {
            friendsList = data.friends;
            localStorage.setItem('vexa_cached_friends', JSON.stringify(friendsList));
            buildFriendsColumn();
            const activeTab = document.querySelector('.fp-tab.active');
            if (!activeTab || activeTab.dataset.tab !== 'pending') renderFpList(activeTab ? activeTab.dataset.tab : 'online');
        }
    } catch (e) { console.error('Failed to load friends', e); }
}

const arrowSvg = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;
const joinSvg  = `<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;

function buildFriendsColumn() {
    const online = friendsList.filter(f => f.dot === 'online');
    const away = friendsList.filter(f => f.dot === 'away');
    const offline = friendsList.filter(f => f.dot === 'offline');

    function row(f) {
        const avatarContent = f.avatar ? `<div class="fdot ${f.dot}"></div>` : `${f.name[0].toUpperCase()}<div class="fdot ${f.dot}"></div>`;
        const avatarStyle = f.avatar ? `style="background-image:url('${f.avatar}');background-size:cover;background-position:center;"` : '';
        return `
        <div class="friend-item ${f.dot==='offline'?'offline':''}" data-id="${f.id}">
          <div class="friend-avatar" ${avatarStyle}>${avatarContent}</div>
          <div class="friend-info">
            <div class="friend-name">${f.name}</div>
            <div class="friend-activity">${f.activity}</div>
          </div>
          <div class="friend-actions">
            <div class="fa-btn" data-action="message" data-id="${f.id}">${arrowSvg}</div>
            <div class="fa-btn" data-action="join" data-id="${f.id}">${joinSvg}</div>
          </div>
        </div>`;
    }

    const html = `
        <div class="search" style="margin: 0 auto 16px auto; width: 100%;">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="searchInput" placeholder="Arkadaş ara...">
        </div>
        <div class="friends-header">
          <h3>Arkadaşlar</h3>
          <div class="sub">${online.length} çevrimiçi &middot; ${friendsList.length} toplam</div>
        </div>
        <div class="friends-list">
          <div class="friend-group">
            <div class="friend-group-label"><span class="dot-online"></span>ÇEVRİMİÇİ <span class="count">${online.length}</span></div>
            ${online.map(row).join('')}
          </div>
          <div class="friend-group">
            <div class="friend-group-label"><span class="dot-away"></span>UZAKTA <span class="count">${away.length}</span></div>
            ${away.map(row).join('')}
          </div>
          <div class="friend-group">
            <div class="friend-group-label"><span class="dot-offline"></span>ÇEVRİMDIŞI <span class="count">${offline.length}</span></div>
            ${offline.map(row).join('')}
          </div>
        </div>
    `;

    const hc = document.getElementById('friendsColHome');
    const fc = document.getElementById('friendsColFriendsPage');
    if (hc) hc.innerHTML = html;
    if (fc) fc.innerHTML = html;
}

function buildFpRow(f, mode) {
    let actions = '';
    if (mode === 'pending') {
        actions = `
          <div class="fp-btn accept-btn" data-action="accept" data-id="${f.id}">Kabul Et</div>
          <div class="fp-btn" data-action="reject" data-id="${f.id}">Reddet</div>`;
    } else {
        actions = `
          <div class="fp-btn" data-action="message" data-id="${f.id}">${arrowSvg}Mesaj</div>
          <div class="fp-btn" data-action="invite" data-id="${f.id}">Davet Et</div>`;
    }
    const dotClass = f.dot || 'offline';
    const avatarContent = f.avatar ? `<div class="fdot ${dotClass}"></div>` : `${f.name[0].toUpperCase()}<div class="fdot ${dotClass}"></div>`;
    const avatarStyle = f.avatar ? `style="background-image:url('${f.avatar}');background-size:cover;background-position:center;"` : '';
    return `
      <div class="fp-row" data-id="${f.id}">
        <div class="friend-avatar" ${avatarStyle}>${avatarContent}</div>
        <div class="fp-row-info">
          <div class="fp-row-name">${f.name}</div>
          <div class="fp-row-sub">${f.activity || ''}</div>
        </div>
        <div class="fp-row-actions">${actions}</div>
      </div>`;
}

async function renderFpList(tab) {
    const list = document.getElementById('fpList');
    if (!list) return;
    let html = '';
    
    if (tab === 'pending') {
        const cached = localStorage.getItem('vexa_cached_pending');
        if (cached) {
            try {
                pendingRequests = JSON.parse(cached);
                html = pendingRequests.length ? pendingRequests.map(f => buildFpRow(f, 'pending')).join('') : `<div class="fp-empty">Bekleyen arkadaşlık isteği yok.</div>`;
                document.querySelector('.fp-tab[data-tab="pending"]').innerHTML = pendingRequests.length ? `Bekleyenler <span style="background:var(--accent);color:#000;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:4px;">${pendingRequests.length}</span>` : `Bekleyenler`;
                list.innerHTML = html;
            } catch(e) {}
        } else {
            list.innerHTML = `<div class="fp-empty">Yükleniyor...</div>`;
        }

        document.getElementById('sidebarProfileName').textContent = currentUser.username;
        document.getElementById('sidebarProfileStatus').textContent = 'Çevrimiçi';
        try {
            const data = await apiCall(`/friends/requests?userId=${currentUser.id}`);
            if (data.requests) {
                pendingRequests = data.requests;
                localStorage.setItem('vexa_cached_pending', JSON.stringify(pendingRequests));
                html = pendingRequests.length ? pendingRequests.map(f => buildFpRow(f, 'pending')).join('') : `<div class="fp-empty">Bekleyen arkadaşlık isteği yok.</div>`;
                document.querySelector('.fp-tab[data-tab="pending"]').innerHTML = pendingRequests.length ? `Bekleyenler <span style="background:var(--accent);color:#000;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:4px;">${pendingRequests.length}</span>` : `Bekleyenler`;
            }
        } catch(e) {
            if (!cached) html = `<div class="fp-empty">Bir hata oluştu.</div>`;
        }
        list.innerHTML = html;
    } else if (tab === 'online') {
        const online = friendsList.filter(f => f.dot === 'online');
        html = online.length ? online.map(f => buildFpRow(f, 'friend')).join('') : `<div class="fp-empty">Şu an çevrimiçi arkadaşın yok.</div>`;
        list.innerHTML = html;
    } else if (tab === 'all') {
        html = friendsList.length ? friendsList.map(f => buildFpRow(f, 'friend')).join('') : `<div class="fp-empty">Henüz arkadaş eklemedin.</div>`;
        list.innerHTML = html;
    }
}

document.querySelectorAll('.fp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.fp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderFpList(tab.dataset.tab);
    });
});

document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('.fa-btn') || e.target.closest('.fp-btn');
    if (actionBtn) {
        const action = actionBtn.dataset.action;
        const id = actionBtn.dataset.id;
        const f = friendsList.find(x => x.id === id);
        if (action === 'message' && f) {
            if (requireAccount('Mesaj göndermek için giriş yapmalısın')) return;
            openChat(f.id, f.name);
        } else if (action === 'accept') {
            apiCall('/friends/accept', 'POST', { userId: currentUser.id, friendId: id }).then(()=>{
                renderFpList('pending');
                loadFriends();
            });
        } else if (action === 'reject') {
            renderFpList('pending');
        }
        return;
    }

    const friendRow = e.target.closest('.friend-item') || e.target.closest('.fp-row');
    if (friendRow && !e.target.closest('.fa-btn') && !e.target.closest('.fp-btn')) {
        const id = friendRow.dataset.id; // wait fp-row doesn't have dataset.id, let's fix that too
        if (id) {
            openProfilePanel(id);
        }
    }
});

function openProfilePanel(friendId) {
    let f;
    let isOwn = false;

    if (friendId === 'own' && currentUser) {
        f = { 
            id: currentUser.id, 
            name: currentUser.username, 
            dot: currentUser.dot, 
            activity: currentUser.activity,
            bio: currentUser.bio || localStorage.getItem('vexa_bio'),
            avatar: currentUser.avatar || localStorage.getItem('vexa_avatar'),
            banner: currentUser.banner || localStorage.getItem('vexa_banner')
        };
        isOwn = true;
    } else {
        f = friendsList.find(x => x.id === friendId);
    }
    
    if (!f) return;
    
    document.getElementById('ppName').textContent = f.name;
    
    const avEl = document.getElementById('ppAvatarLetter');
    if (avEl) {
        if (f.avatar) {
            avEl.style.backgroundImage = `url("${f.avatar}")`;
            avEl.style.backgroundSize = 'cover';
            avEl.style.backgroundPosition = 'center';
            avEl.innerHTML = `<div class="pdot ${f.dot || 'offline'}"></div>`;
        } else {
            avEl.style.backgroundImage = '';
            avEl.innerHTML = `${f.name[0].toUpperCase()}<div class="pdot ${f.dot || 'offline'}"></div>`;
        }
    }

    const bannerEl = document.getElementById('ppBanner');
    if (bannerEl) {
        if (f.banner) {
            bannerEl.style.backgroundImage = `url("${f.banner}")`;
        } else {
            bannerEl.style.backgroundImage = 'linear-gradient(135deg, #2c3e50, #3498db)';
        }
    }

    const bioEl = document.getElementById('ppBio');
    if (bioEl) {
        bioEl.textContent = f.bio || '';
    }

    document.getElementById('ppStatus').textContent = f.activity || 'Idle';

    // Play time
    const ppTimeEl = document.getElementById('ppTime');
    if (ppTimeEl) {
        if (isOwn) {
            let totalSec = getPlayTimeSeconds();
            if (_playSessionStart) totalSec += Math.floor((Date.now() - _playSessionStart) / 1000);
            ppTimeEl.textContent = formatPlayTime(totalSec);
        } else {
            ppTimeEl.textContent = formatPlayTime(f.playTime || 0);
        }
    }
    
    const msgBtn = document.getElementById('ppMsgBtn');
    const editBtn = document.getElementById('ppEditProfileBtn');
    
    if (isOwn) {
        if (msgBtn) msgBtn.style.display = 'none';
        if (editBtn) {
            editBtn.style.display = 'flex';
            editBtn.onclick = () => { 
                document.getElementById('ppClose')?.click();
                goToPage('profile'); 
            };
        }
    } else {
        if (msgBtn) msgBtn.style.display = 'flex';
        if (editBtn) editBtn.style.display = 'none';
    }
    
    document.getElementById('profilePanel').style.transform = 'translateX(0)';
    document.getElementById('overlay').classList.add('show');
}

document.getElementById('ppClose')?.addEventListener('click', () => {
    document.getElementById('profilePanel').style.transform = 'translateX(100%)';
    document.getElementById('overlay').classList.remove('show');
});

document.getElementById('overlay')?.addEventListener('click', () => {
    document.getElementById('profilePanel').style.transform = 'translateX(100%)';
    document.getElementById('overlay').classList.remove('show');
});

// Add Friend Modal
function createAddFriendModal() {
    const existing = document.getElementById('addFriendModal');
    if (existing) { existing.classList.toggle('hide'); return; }
    
    const modal = document.createElement('div');
    modal.id = 'addFriendModal';
    modal.className = 'add-friend-modal';
    modal.innerHTML = `
        <div class="afm-overlay"></div>
        <div class="afm-box">
            <div class="afm-header">
                <h3>Arkadaş Ekle</h3>
                <div class="afm-close" id="afmClose">&times;</div>
            </div>
            <p class="afm-desc">Kullanıcı adını girerek arkadaşlık isteği gönderebilirsin.</p>
            <div class="afm-input-row">
                <input type="text" id="afmInput" placeholder="Kullanıcı adı gir..." autocomplete="off">
                <button id="afmSend">Gönder</button>
            </div>
            <div class="afm-status" id="afmStatus"></div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('afmClose').addEventListener('click', () => modal.remove());
    modal.querySelector('.afm-overlay').addEventListener('click', () => modal.remove());

    document.getElementById('afmSend').addEventListener('click', async () => {
        const input = document.getElementById('afmInput');
        const status = document.getElementById('afmStatus');
        const val = input.value.trim();
        if (!val) { status.textContent = 'Kullanıcı adı boş olamaz.'; status.style.color = '#ff6b6b'; return; }
        try {
            const data = await apiCall('/friends/add', 'POST', { userId: currentUser.id, targetUsername: val });
            if (data.error) { status.textContent = data.error; status.style.color = '#ff6b6b'; }
            else { status.textContent = data.message || 'İstek gönderildi!'; status.style.color = 'var(--accent)'; input.value = ''; }
        } catch(e) { status.textContent = 'Sunucuya bağlanılamadı.'; status.style.color = '#ff6b6b'; }
    });

    document.getElementById('afmInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('afmSend').click();
    });
}

document.getElementById('addFriendBtn')?.addEventListener('click', () => {
    if (requireAccount('Arkadaş eklemek için giriş yapmalısın.')) return;
    createAddFriendModal();
});

/* =====================================================
   CHAT SYSTEM
===================================================== */
const chatModal = document.getElementById('chatModal');
const chatTitle = document.getElementById('chatTitle');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

function openChat(friendId, friendName) {
    currentChatFriendId = friendId;
    currentChatFriendName = friendName;
    chatTitle.textContent = friendName;
    chatModal.classList.add('show');
    loadChatHistory();
}

document.getElementById('chatClose')?.addEventListener('click', () => {
    chatModal.classList.remove('show');
    currentChatFriendId = null;
});

function getChatCacheKey(friendId) {
    return `vexa_chat_${currentUser ? currentUser.id : 'guest'}_${friendId}`;
}

function loadLocalChatMessages(friendId) {
    try {
        const raw = localStorage.getItem(getChatCacheKey(friendId));
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
}

function saveLocalChatMessage(friendId, msgObj) {
    try {
        const key = getChatCacheKey(friendId);
        const msgs = loadLocalChatMessages(friendId);
        msgs.push(msgObj);
        localStorage.setItem(key, JSON.stringify(msgs));
    } catch(e) {}
}

function saveFullLocalChat(friendId, messages) {
    try {
        const key = getChatCacheKey(friendId);
        localStorage.setItem(key, JSON.stringify(messages));
    } catch(e) {}
}

function renderChatMessages(messages) {
    chatMessages.innerHTML = messages.map(m => {
        const isMe = m.senderId === (currentUser ? currentUser.id : '');
        return `<div class="chat-msg ${isMe ? 'me' : 'them'}">${m.message}</div>`;
    }).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadChatHistory() {
    if (!currentChatFriendId || isGuest()) return;
    
    // 1. Instantly render from local cache
    const localMsgs = loadLocalChatMessages(currentChatFriendId);
    if (localMsgs && localMsgs.length > 0) {
        renderChatMessages(localMsgs);
    } else {
        chatMessages.innerHTML = '<div style="color:var(--text-secondary);font-size:12px;text-align:center;padding:12px;">Yükleniyor...</div>';
    }

    // 2. Fetch fresh history from API in background
    try {
        const data = await apiCall(`/chat/history?userId=${currentUser.id}&friendId=${currentChatFriendId}`);
        if (data.messages) {
            saveFullLocalChat(currentChatFriendId, data.messages);
            renderChatMessages(data.messages);
        }
    } catch (e) { console.error('Failed to load chat', e); }
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentChatFriendId || isGuest()) return;
    chatInput.value = '';
    
    const newMsg = { senderId: currentUser.id, message: text };
    
    // 1. Instantly update UI and local cache (0ms delay!)
    saveLocalChatMessage(currentChatFriendId, newMsg);
    const localMsgs = loadLocalChatMessages(currentChatFriendId);
    renderChatMessages(localMsgs);

    // 2. Send to API in background
    try {
        await apiCall('/chat/send', 'POST', {
            senderId: currentUser.id,
            receiverId: currentChatFriendId,
            message: text
        });
    } catch (e) { showToast('Mesaj gönderilemedi'); }
}

document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);
chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

/* =====================================================
   NOTIFICATIONS
===================================================== */
const notifBtn = document.getElementById('notifBtn');
const notifDropdown = document.getElementById('notifDropdown');
const notifDot = document.getElementById('notifDot');
const notifList = document.getElementById('notifList');

notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('show');
    notifDot.classList.add('hidden');
});

document.addEventListener('click', (e) => {
    if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBtn) {
        notifDropdown.classList.remove('show');
    }
});

async function loadNotifications() {
    if (isGuest()) return;
    try {
        const data = await apiCall(`/notifications/list?userId=${currentUser.id}`);
        if (data.notifications && data.notifications.length > 0) {
            notifDot.classList.remove('hidden');
            notifList.innerHTML = data.notifications.map(n => {
                let timeStr = new Date(n.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                return `
                <div class="notif-dd-item">
                    <div class="ic"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" fill="none"/></svg></div>
                    <div class="txt"><div class="t1">${n.title}</div><div class="t2">${n.message} &middot; ${timeStr}</div></div>
                </div>`;
            }).join('');
        } else {
            notifList.innerHTML = `<div class="notif-dd-empty">Yeni bildirim yok.</div>`;
        }
    } catch (e) {}
}

document.getElementById('clearAll')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (isGuest()) return;
    try {
        await apiCall('/notifications/clear', 'POST', { userId: currentUser.id });
        notifList.innerHTML = `<div class="notif-dd-empty">Yeni bildirim yok.</div>`;
        notifDot.classList.add('hidden');
    } catch (e) {}
});

/* =====================================================
   POLLING (Ping, Chat, Notifications)
===================================================== */
setInterval(() => {
    if (!isGuest()) {
        const totalPlaySec = getPlayTimeSeconds() + (_playSessionStart ? Math.floor((Date.now() - _playSessionStart) / 1000) : 0);
        apiCall('/ping', 'POST', { userId: currentUser.id, activity: 'In Launcher', dot: 'online', playTime: totalPlaySec }).catch(()=>{});
        loadFriends();
        loadNotifications();
        const activeTab = document.querySelector('.fp-tab.active');
        if (activeTab && activeTab.dataset.tab === 'pending') {
            renderFpList('pending');
        }
    }
}, 5000);

setInterval(() => {
    if (currentChatFriendId) loadChatHistory();
}, 5000);


/* =====================================================
   NAVIGATION
===================================================== */
const pageLabels = { home:'Ana Sayfa', friends:'Arkadaşlar', settings:'Ayarlar', profile:'Profil' };
function goToPage(pageId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`)?.classList.add('active');
    document.getElementById('crumbCurrent').textContent = pageLabels[pageId] || pageId;

    if (pageId === 'profile' && !isGuest() && currentUser) {
        updateProfileEditorUI();
    }
    updateGuestLocks();
}
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => goToPage(item.dataset.page));
});


/* =====================================================
   GITHUB NEWS / PATCH NOTES
===================================================== */
async function fetchGithubNews() {
    try {
        const res = await fetch('https://api.github.com/repos/vexa-client/vexa/releases');
        const releases = await res.json();
        
        const newsList = document.querySelector('.news-list');
        if (releases && releases.length > 0) {
            // Update the version badge with the latest GitHub tag
            const statusVer = document.querySelector('.status-version');
            if (statusVer) statusVer.textContent = releases[0].tag_name || 'v1.0.0';

            if (newsList) {
                newsList.innerHTML = releases.slice(0, 4).map(release => {
                    const date = new Date(release.published_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    let desc = release.body ? release.body.replace(/[#*`_]/g, '').substring(0, 100) + '...' : 'Detaylar için tıklayın.';
                    return `
                    <div class="news-card" onclick="if(window.api && window.api.openExternal) window.api.openExternal('${release.html_url}')">
                      <div class="news-thumb" style="display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--accent);">${release.tag_name}</div>
                      <div class="news-body">
                        <div class="news-title">${release.name || release.tag_name}</div>
                        <div class="news-desc">${desc}</div>
                        <div class="news-meta"><span class="news-date">${date}</span><span class="news-read">Devamını oku</span></div>
                      </div>
                    </div>`;
                }).join('');
            }
        }
    } catch(e) {
        console.error('Github news error', e);
    }
}
fetchGithubNews();


/* =====================================================
   PLAY TIME TRACKING
===================================================== */
let _playSessionStart = null;
let _playTimeInterval = null;

function getPlayTimeSeconds() {
    return parseInt(localStorage.getItem('vexa_play_time') || '0', 10);
}

function savePlayTime() {
    if (!_playSessionStart) return;
    const elapsed = Math.floor((Date.now() - _playSessionStart) / 1000);
    const total = getPlayTimeSeconds() + elapsed;
    localStorage.setItem('vexa_play_time', String(total));
    _playSessionStart = Date.now(); // reset anchor so we don't double-count
}

function startPlayTimeTracking() {
    if (_playSessionStart) return; // already tracking
    _playSessionStart = Date.now();
    // save every 10 seconds so nothing is lost on crash
    _playTimeInterval = setInterval(savePlayTime, 10000);
}

function stopPlayTimeTracking() {
    if (!_playSessionStart) return;
    savePlayTime();
    _playSessionStart = null;
    if (_playTimeInterval) { clearInterval(_playTimeInterval); _playTimeInterval = null; }
}

function formatPlayTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours >= 1) {
        return minutes > 0 ? `${hours}s ${minutes}dk` : `${hours}s`;
    }
    if (minutes >= 1) return `${minutes}dk`;
    return `${totalSeconds}sn`;
}

// Save play time if user closes the window mid-session
window.addEventListener('beforeunload', () => { savePlayTime(); });

/* =====================================================
   ELECTRON / PLAY BUTTON LOGIC
===================================================== */
const playBtn = document.getElementById('playBtn');
const playBar = document.getElementById('playBar');
const playLabel = document.getElementById('playLabel');
const statusTitle = document.querySelector('.status-text .title');
const statusSub = document.querySelector('.status-text .sub');
const statusIcon = document.querySelector('.status-icon svg');
let launching = false;
let currentUpdateInfo = null;

function setStatusUI(title, sub, btnText, btnIcon) {
    if (statusTitle) statusTitle.textContent = title;
    if (statusSub) statusSub.textContent = sub;
    if (playLabel) playLabel.innerHTML = `${btnIcon} ${btnText}`;
}

const ICON_PLAY = `<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>`;
const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;

// 1. Initial State Check
async function checkUpdates() {
    if (!window.api || !window.api.checkUpdate) return;
    try {
        currentUpdateInfo = await window.api.checkUpdate();
        
        if (currentUpdateInfo.updateAvailable && currentUpdateInfo.updateType === 'launcher') {
            setStatusUI('Launcher Güncellemesi', 'Yeni launcher sürümü mevcut! Güncellemek için tıklayın.', 'GÜNCELLE', ICON_DOWNLOAD);
        } else {
            setStatusUI('Maceraya Hazır', 'Her şey hazır! Vexa Client en güncel sürümde.', 'OYNA', ICON_PLAY);
        }
    } catch(err) {
        // Hata olsa bile oyun oynansın
        setStatusUI('Maceraya Hazır', 'Bağlantı kontrolü yapılamadı ama oyun hazır.', 'OYNA', ICON_PLAY);
    }
}
checkUpdates();

// IPC Listeners mapped to new UI
if (window.api && window.api.onDownloadProgress) {
    window.api.onDownloadProgress((progress) => {
        if (playBar) playBar.style.width = progress.percentage + '%';
        if (playLabel) playLabel.innerHTML = `İNDİRİLİYOR %${progress.percentage.toFixed(0)}`;
    });
}

// Emulate their old checkUpdate wait logic if they had onUpdateStatus
if (window.api && window.api.onUpdateStatus) {
    window.api.onUpdateStatus((status) => {
        if (status.status === 'ready') {
            checkUpdates(); // re-check when download finishes
            if (playBtn) playBtn.classList.remove('launching');
            launching = false;
        }
    });
}

playBtn?.addEventListener('click', () => {
    if (launching) return;
    launching = true;
    playBtn.classList.add('launching');
    
    const isUpdate = playLabel.textContent.includes('GÜNCELLE');
    
    if (isUpdate && currentUpdateInfo && currentUpdateInfo.launcherDownloadUrl && window.api && window.api.openExternal) {
        // Launcher güncellemesi: tarayıcıda indirme linkini aç
        window.api.openExternal(currentUpdateInfo.launcherDownloadUrl);
        showToast('Güncelleme indirme sayfası açıldı!');
        setTimeout(() => {
            playBtn.classList.remove('launching');
            launching = false;
        }, 2000);
    } else if (window.api && window.api.launchGame) {
        playLabel.innerHTML = 'BAŞLATILIYOR...';
        playBar.style.width = '100%';
        window.api.launchGame();
        startPlayTimeTracking();
        setTimeout(() => {
            playBar.style.width = '0%';
            playLabel.innerHTML = `${ICON_PLAY} OYNA`;
            playBtn.classList.remove('launching');
            launching = false;
        }, 3000);
    } else {
        playLabel.innerHTML = 'BAŞLATILIYOR...';
        let pct = 0;
        const iv = setInterval(() => {
            pct += 4;
            playBar.style.width = pct + '%';
            if(pct >= 100){
                clearInterval(iv);
                playLabel.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" fill="none"/></svg> ÇALIŞIYOR`;
                startPlayTimeTracking();
                showToast('Vexa LAUNCHER başlatıldı');
                setTimeout(() => {
                    playBar.style.width = '0%';
                    playLabel.innerHTML = `${ICON_PLAY} OYNA`;
                    playBtn.classList.remove('launching');
                    launching = false;
                }, 1800);
            }
        }, 60);
    }
});



function updateOnlineStatusUI(isVisible) {
    const statusText = document.getElementById('sidebarProfileStatus');
    const dot = document.querySelector('#ownProfileBtn .status-dot');
    if (!statusText || !dot) return;
    
    if (isVisible) {
        statusText.textContent = 'Çevrimiçi';
        dot.classList.remove('offline');
    } else {
        statusText.textContent = 'Görünmez';
        dot.classList.add('offline');
    }
}

// ---- Settings Button in Profile Area ----
document.getElementById('profileSettingsBtn')?.addEventListener('click', () => {
    goToPage('settings');
});

// ---- Settings Config Backend Integration ----
(function initSettings() {
    // Always attach toggle click handlers regardless of API availability
    document.querySelectorAll('.settings-page .toggle').forEach(el => {
        el.addEventListener('click', async function(e) {
            e.stopPropagation();
            const key = this.dataset.setting;
            const isNowOn = !this.classList.contains('on');
            this.classList.toggle('on', isNowOn);
            try {
                if (window.api && window.api.setConfig) {
                    await window.api.setConfig({ [key]: isNowOn });
                    if (key === 'show-status') {
                        updateOnlineStatusUI(isNowOn);
                    }
                }
            } catch(err) { console.error('Config save error:', err); }
            showToast('Ayar kaydedildi.');
        });
    });

    const langSelect = document.querySelector('.settings-select');
    if (langSelect) {
        langSelect.addEventListener('change', async () => {
            try {
                if (window.api && window.api.setConfig) {
                    await window.api.setConfig({ language: langSelect.value });
                }
            } catch(err) { console.error('Config save error:', err); }
            showToast('Dil değiştirildi.');
        });
    }

    // Load saved config if API is available
    setTimeout(async () => {
        try {
            if (window.api && window.api.getConfig) {
                const config = await window.api.getConfig();
                document.querySelectorAll('.settings-page .toggle').forEach(el => {
                    const key = el.dataset.setting;
                    if (key && config[key] !== undefined) {
                        el.classList.toggle('on', !!config[key]);
                    }
                });
                if (langSelect && config.language) {
                    langSelect.value = config.language;
                }
                if (config['show-status'] !== undefined) {
                    updateOnlineStatusUI(config['show-status']);
                }
            }
        } catch(e) { console.error('Config load error:', e); }
    }, 300);
})();

// ---- Notifications ----
function isDesktopNotifsEnabled() {
    const toggle = document.querySelector('.toggle[data-setting="desktop-notifs"]');
    return toggle ? toggle.classList.contains('on') : true;
}

window.testNotification = function() {
    if (!isDesktopNotifsEnabled()) {
        showToast('Masaüstü bildirimleri ayarlardan kapalı.');
        return;
    }
    if (window.api && window.api.showNotification) {
        window.api.showNotification('Vexa Launcher', 'Test bildirimi başarıyla alındı!');
        showToast('Test bildirimi gönderildi.');
    } else {
        showToast('Bildirim API\'si bulunamadı.');
    }
};

/* =====================================================
   PROFILE EDITOR & LIVE PREVIEW
===================================================== */
let tempAvatarData = null;
let tempBannerData = null;

/* =====================================================
   CROPPER LOGIC
===================================================== */
let cropperImg = null;
let cropperMode = 'avatar';
let cropX = 0, cropY = 0, cropZoom = 1;
let _isDragging = false, _startX, _startY;

const cropperOverlay = document.getElementById('cropperOverlay');
const cropperCanvas = document.getElementById('cropperCanvas');
const cropperZoomSlider = document.getElementById('cropperZoom');
const ctxCrop = cropperCanvas?.getContext('2d');
const AVATAR_SIZE = 370;
const BANNER_W = 370;
const BANNER_H = 140;

function openCropper(file, mode) {
    cropperMode = mode;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            cropperImg = img;
            cropX = 0; cropY = 0;

            if (mode === 'avatar') {
                cropperCanvas.width = AVATAR_SIZE;
                cropperCanvas.height = AVATAR_SIZE;
                // Fit: cover the square
                cropZoom = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
            } else {
                cropperCanvas.width = BANNER_W;
                cropperCanvas.height = BANNER_H;
                // Fit: cover the rectangle
                cropZoom = Math.max(BANNER_W / img.width, BANNER_H / img.height);
            }

            const minZoom = cropZoom; // Minimum zoom is exact cover
            const maxZoom = cropZoom * 5;
            if (cropperZoomSlider) {
                cropperZoomSlider.min = minZoom.toFixed(3);
                cropperZoomSlider.max = maxZoom.toFixed(3);
                cropperZoomSlider.value = cropZoom.toFixed(3);
            }

            // Show/hide SVG masks
            const circleMask = document.getElementById('cropperCircleMask');
            const rectMask = document.getElementById('cropperRectMask');
            if (mode === 'avatar') {
                if (circleMask) { circleMask.style.display = 'block'; }
                if (rectMask) { rectMask.style.display = 'none'; }
                // Position circle mask in center
                const r = AVATAR_SIZE * 0.45;
                const mcx = AVATAR_SIZE / 2;
                const mcy = AVATAR_SIZE / 2;
                document.getElementById('cropperMaskCircle')?.setAttribute('cx', mcx);
                document.getElementById('cropperMaskCircle')?.setAttribute('cy', mcy);
                document.getElementById('cropperMaskCircle')?.setAttribute('r', r);
                document.getElementById('cropperMaskBorder')?.setAttribute('cx', mcx);
                document.getElementById('cropperMaskBorder')?.setAttribute('cy', mcy);
                document.getElementById('cropperMaskBorder')?.setAttribute('r', r);
            } else {
                if (circleMask) { circleMask.style.display = 'none'; }
                if (rectMask) { rectMask.style.display = 'block'; }
                // Position rect mask with padding
                const pad = 10;
                const rw = BANNER_W - pad * 2;
                const rh = BANNER_H - pad * 2;
                ['cropperMaskRect', 'cropperMaskRectBorder'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { el.setAttribute('x', pad); el.setAttribute('y', pad); el.setAttribute('width', rw); el.setAttribute('height', rh); }
                });
            }

            document.getElementById('cropperTitle').textContent = mode === 'avatar' ? 'Profil Resmini Düzenle' : 'Afişi Düzenle';
            cropperOverlay.style.display = 'flex';
            drawCropper();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawCropper() {
    if (!cropperImg || !ctxCrop) return;
    
    // Clamp zoom to minimum
    const minZoom = Math.max(cropperCanvas.width / cropperImg.width, cropperCanvas.height / cropperImg.height);
    if (cropZoom < minZoom) cropZoom = minZoom;
    
    const w = cropperImg.width * cropZoom;
    const h = cropperImg.height * cropZoom;
    
    // Clamp X and Y to prevent showing background
    const limitX = Math.max(0, (w - cropperCanvas.width) / 2);
    const limitY = Math.max(0, (h - cropperCanvas.height) / 2);
    
    if (cropX > limitX) cropX = limitX;
    if (cropX < -limitX) cropX = -limitX;
    if (cropY > limitY) cropY = limitY;
    if (cropY < -limitY) cropY = -limitY;
    
    ctxCrop.clearRect(0, 0, cropperCanvas.width, cropperCanvas.height);
    const cx = (cropperCanvas.width - w) / 2 + cropX;
    const cy = (cropperCanvas.height - h) / 2 + cropY;
    ctxCrop.drawImage(cropperImg, cx, cy, w, h);
}

if (cropperCanvas) {
    cropperCanvas.parentElement.addEventListener('mousedown', (e) => {
        _isDragging = true;
        _startX = e.clientX - cropX;
        _startY = e.clientY - cropY;
        cropperCanvas.parentElement.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!_isDragging) return;
        cropX = e.clientX - _startX;
        cropY = e.clientY - _startY;
        drawCropper();
    });
    window.addEventListener('mouseup', () => {
        _isDragging = false;
        if (cropperCanvas) cropperCanvas.parentElement.style.cursor = 'grab';
    });
    cropperZoomSlider?.addEventListener('input', (e) => {
        cropZoom = parseFloat(e.target.value);
        drawCropper();
    });
}

document.getElementById('cropperCancelBtn')?.addEventListener('click', () => {
    cropperOverlay.style.display = 'none'; cropperImg = null;
    document.getElementById('avatarFileInput').value = '';
    document.getElementById('bannerFileInput').value = '';
});

document.getElementById('cropperApplyBtn')?.addEventListener('click', () => {
    if (!cropperImg) return;
    const finalCanvas = document.createElement('canvas');
    if (cropperMode === 'avatar') { finalCanvas.width = 250; finalCanvas.height = 250; }
    else { finalCanvas.width = 800; finalCanvas.height = 300; }
    const fCtx = finalCanvas.getContext('2d');
    const scaleX = finalCanvas.width / cropperCanvas.width;
    const scaleY = finalCanvas.height / cropperCanvas.height;
    const w = cropperImg.width * cropZoom * scaleX;
    const h = cropperImg.height * cropZoom * scaleY;
    const cx = (finalCanvas.width - w) / 2 + (cropX * scaleX);
    const cy = (finalCanvas.height - h) / 2 + (cropY * scaleY);
    fCtx.drawImage(cropperImg, cx, cy, w, h);
    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.85);
    if (cropperMode === 'avatar') { tempAvatarData = dataUrl; showToast('Profil resmi seçildi (Kaydetmeyi unutmayın).'); }
    else { tempBannerData = dataUrl; showToast('Afiş resmi seçildi (Kaydetmeyi unutmayın).'); }
    updateProfileEditorUI();
    cropperOverlay.style.display = 'none'; cropperImg = null;
    document.getElementById('avatarFileInput').value = '';
    document.getElementById('bannerFileInput').value = '';
});

function updateProfileEditorUI() {
    if (isGuest()) return;
    
    const bioTextarea = document.getElementById('editBioTextarea');
    const pName = document.getElementById('previewName');
    const pStatus = document.getElementById('previewStatus');
    const pBio = document.getElementById('previewBio');
    const pAvatar = document.getElementById('previewAvatar');
    const pBanner = document.getElementById('previewBanner');

    const currentBio = (currentUser && currentUser.bio) || '';
    const currentAvatar = (currentUser && currentUser.avatar) || '';
    const currentBanner = (currentUser && currentUser.banner) || '';

    if (bioTextarea) bioTextarea.value = currentBio;
    if (pName) pName.textContent = currentUser ? currentUser.username : 'Oyuncu';
    if (pStatus) pStatus.textContent = 'Çevrimiçi';
    if (pBio) pBio.textContent = currentBio;

    // Avatar preview
    const activeAvatar = tempAvatarData !== null ? tempAvatarData : currentAvatar;
    if (pAvatar) {
        if (activeAvatar) {
            pAvatar.style.backgroundImage = `url("${activeAvatar}")`;
            pAvatar.textContent = '';
        } else {
            pAvatar.style.backgroundImage = '';
            pAvatar.textContent = currentUser ? currentUser.username[0].toUpperCase() : 'O';
        }
    }

    // Banner preview
    const activeBanner = tempBannerData !== null ? tempBannerData : currentBanner;
    if (pBanner) {
        if (activeBanner) {
            pBanner.style.backgroundImage = `url("${activeBanner}")`;
        } else {
            pBanner.style.backgroundImage = 'linear-gradient(135deg, #2c3e50, #3498db)';
        }
    }
}

// Event listeners for profile editing
document.getElementById('editBioTextarea')?.addEventListener('input', (e) => {
    const pBio = document.getElementById('previewBio');
    if (pBio) pBio.textContent = e.target.value || 'Kendinizden bahsedin...';
});

document.getElementById('avatarFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) openCropper(file, 'avatar');
});

document.getElementById('bannerFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) openCropper(file, 'banner');
});

document.getElementById('removeAvatarBtn')?.addEventListener('click', () => {
    tempAvatarData = '';
    updateProfileEditorUI();
    showToast('Profil resmi kaldırıldı.');
});

document.getElementById('removeBannerBtn')?.addEventListener('click', () => {
    tempBannerData = '';
    updateProfileEditorUI();
    showToast('Afiş kaldırıldı.');
});

document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    if (isGuest()) return;
    const bioText = document.getElementById('editBioTextarea')?.value.trim() || '';
    
    if (tempAvatarData !== null) {
        if (tempAvatarData) {
            localStorage.setItem('vexa_avatar', tempAvatarData);
            if (currentUser) currentUser.avatar = tempAvatarData;
        } else {
            localStorage.removeItem('vexa_avatar');
            if (currentUser) delete currentUser.avatar;
        }
    }

    if (tempBannerData !== null) {
        if (tempBannerData) {
            localStorage.setItem('vexa_banner', tempBannerData);
            if (currentUser) currentUser.banner = tempBannerData;
        } else {
            localStorage.removeItem('vexa_banner');
            if (currentUser) delete currentUser.banner;
        }
    }

    localStorage.setItem('vexa_bio', bioText);
    if (currentUser) currentUser.bio = bioText;

    tempAvatarData = null;
    tempBannerData = null;

    updateOwnAvatar();
    updateProfileEditorUI();

    try {
        await apiCall('/user/profile', 'POST', {
            userId: currentUser.id,
            updates: {
                bio: bioText,
                avatar: (currentUser && currentUser.avatar) || '',
                banner: (currentUser && currentUser.banner) || ''
            }
        });
    } catch(e) {}

    showToast('Profilin başarıyla güncellendi!');
});
