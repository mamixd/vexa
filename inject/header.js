// OEM HaxBall Designed Header + LocalStorage Settings
(() => {
    let isFpsEnabled = localStorage.getItem('hax_fps_limit') !== 'false';
    let isFpsShow = localStorage.getItem('hax_fps_show') !== 'false';
    let isRpcEnabled = localStorage.getItem('hax_discord_rpc') !== 'false';
    let isPingBoosterEnabled = localStorage.getItem('hax_ping_booster') === 'true';
    let isNetGraphEnabled = localStorage.getItem('hax_net_graph') !== 'false';

    // Replay Page Logic
    if (window.location.pathname.includes('/replay')) {
        const style = document.createElement('style');
        style.innerHTML = `
            body { background-color: #111318 !important; color: #fff !important; overflow: hidden !important; }
            .header, .rightbar { display: none !important; }
            .container { width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
            .flexRow.flexGrow { height: 100vh !important; }
            iframe.gameframe { border: none !important; width: 100vw !important; height: 100vh !important; box-shadow: none !important; }
        `;
        document.head.appendChild(style);

        if (window.haxballAPI && window.haxballAPI.onLoadReplay) {
            window.haxballAPI.onLoadReplay((fileData, fileName) => {
                const checkIframe = setInterval(() => {
                    const iframe = document.getElementById('gameframe');
                    if (iframe && iframe.contentDocument && iframe.contentDocument.querySelector('input[type="file"]')) {
                        clearInterval(checkIframe);
                        try {
                            const file = new File([fileData], fileName, { type: 'application/octet-stream' });
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            const fileInput = iframe.contentDocument.querySelector('input[type="file"]');
                            fileInput.files = dataTransfer.files;
                            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        } catch(e) {}
                    }
                }, 500);
            });
        }
    }

    // Ayarları başlangıçta merkezi config'den yükle (Eğer varsa)
    if (window.launcherAPI) {
        window.launcherAPI.getSettings().then(settings => {
            if (settings) {
                isFpsEnabled = settings.fpsEnabled;
                isFpsShow = settings.fpsShow !== false;
                isRpcEnabled = settings.rpcEnabled;
                isPingBoosterEnabled = settings.pingBoosterEnabled === true;
                isNetGraphEnabled = settings.netGraphEnabled !== false;
                localStorage.setItem('hax_fps_limit', isFpsEnabled);
                localStorage.setItem('hax_fps_show', isFpsShow);
                localStorage.setItem('hax_discord_rpc', isRpcEnabled);
                localStorage.setItem('hax_ping_booster', isPingBoosterEnabled);
                localStorage.setItem('hax_net_graph', isNetGraphEnabled);
            }
        });
    }

    const tryInject = setInterval(() => {
        // If already injected, skip
        if (document.getElementById('vexa-hdr-right')) return;

        let nativeHeader = document.querySelector('.header') || document.querySelector('header') || document.querySelector('#header');
        if (nativeHeader) {
            hijackNativeHeader(nativeHeader);
        }
    }, 300);

    // Stop after 60 seconds
    setTimeout(() => { clearInterval(tryInject); }, 60000);

    function hijackNativeHeader(headerElement) {
        // Yüksekliği hemen sabitle - Ok butonunda küçülme önlenir
        headerElement.style.minHeight = '48px';
        headerElement.style.height = '48px';
        headerElement.innerHTML = '';
        
        // ==========================================
        // 1. Orijinal HaxBall Tasarımına Sadık Kalınan CSS
        // ==========================================
        Object.assign(headerElement.style, {
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            height: '48px',
            background: '#111214',
            borderBottom: '1px solid #222426',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            fontFamily: 'Tahoma, Arial, sans-serif',
            WebkitAppRegion: 'drag',
            userSelect: 'none',
            overflow: 'hidden'
        });

        // --- SOL: Orijinal Tarz Başlık ---
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; margin-right:10px; border-radius:8px; background:#1e2024; border:1px solid #2d3035; color:#c9d1d9; font-size:16px; font-weight:900;">V</span><span style="display:flex; flex-direction:column; line-height:1.05;"><span style="color:#e6eaf0; font-size:16px; font-weight:800;">Vexa</span><span style="color:#5c6370; font-size:10px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase;">Client</span></span>';
        titleDiv.style.cssText = 'cursor:pointer; white-space:nowrap; flex-shrink:0; display:flex; align-items:center; min-width:245px; -webkit-app-region:no-drag;';
        titleDiv.onclick = () => window.location.href = 'https://www.haxball.com/play'; 

        // --- ORTA: Oda Linki Yapıştırma Alanı ---
        const centerWrapper = document.createElement('div');
        centerWrapper.style.cssText = "position:absolute; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:6px; background:#0d0f11; border:1px solid #232529; border-radius:8px; padding:5px; width:100%; max-width:610px; box-sizing:border-box; -webkit-app-region:no-drag;";

        const linkIcon = document.createElement('span');
        linkIcon.innerText = '⌁';
        linkIcon.style.cssText = "display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; background:#1a1c20; color:#5c6370; font-size:15px; font-weight:900; flex-shrink:0;";
        
        const linkInput = document.createElement('input');
        linkInput.type = 'text';
        linkInput.placeholder = 'Oda linkini buraya yapıştırın...';
        linkInput.placeholder = 'Oda linkini buraya yapıştırın...';
        linkInput.style.cssText = "flex:1; background:transparent; border:none; color:#e5e7eb; font-size:12px; padding:8px 4px; outline:none; min-width:0;";

        const pasteBtn = document.createElement('button');
        pasteBtn.innerText = 'Yapıştır';
        pasteBtn.style.cssText = "background:#1a1c20 !important; color:#8b949e !important; border:1px solid #2d3035 !important; border-radius:6px; padding:8px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:background 0.15s, color 0.15s;";
        pasteBtn.onmouseover = () => { pasteBtn.style.background = '#22252b'; pasteBtn.style.color = '#c9d1d9'; pasteBtn.style.borderColor = '#3d4149'; };
        pasteBtn.onmouseout = () => { pasteBtn.style.background = '#1a1c20'; pasteBtn.style.color = '#8b949e'; pasteBtn.style.borderColor = '#2d3035'; };
        pasteBtn.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    linkInput.value = text.trim();
                    linkInput.focus();
                }
            } catch(e) {
                linkInput.focus();
            }
        };
        
        const joinBtn = document.createElement('button');
        joinBtn.innerText = "GİRİŞ";
        joinBtn.innerText = "GİRİŞ";
        joinBtn.style.cssText = "background:#2d3035 !important; color:#e6eaf0 !important; border:1px solid #3d4149 !important; border-radius:6px; padding:8px 18px; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; transition:background 0.15s, color 0.15s;";
        joinBtn.onmouseover = () => { joinBtn.style.background = '#383d45'; joinBtn.style.color = '#fff'; };
        joinBtn.onmouseout = () => { joinBtn.style.background = '#2d3035'; joinBtn.style.color = '#e6eaf0'; };
        
        joinBtn.onclick = () => {
            const url = linkInput.value.trim();
            if(url) window.location.href = url;
        };

        linkInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') joinBtn.click();
        });

        centerWrapper.appendChild(linkIcon);
        centerWrapper.appendChild(linkInput);
        centerWrapper.appendChild(pasteBtn);
        centerWrapper.appendChild(joinBtn);

        // --- SAĞ: Ayarlar ve Profil ---
        const rightWrapper = document.createElement('div');
        rightWrapper.id = "vexa-hdr-right";
        rightWrapper.style.cssText = "display:flex; align-items:center; gap:8px; flex-shrink:0; min-width:300px; justify-content:flex-end; -webkit-app-region:no-drag;";

        const replayBtn = document.createElement('button');
        replayBtn.innerHTML = '🎬 <span style="margin-left:3px;">Replays</span>';
        replayBtn.id = "vexa-replay-btn";
        replayBtn.style.cssText = "background:#1a1c20 !important; color:#8b949e !important; border:1px solid #2d3035 !important; border-radius:6px; padding:8px 13px; font-size:12px; font-weight:700; cursor:pointer; transition:color 0.15s, background 0.15s; white-space:nowrap; margin-right:4px; display:flex; align-items:center;";
        replayBtn.onmouseover = () => { replayBtn.style.color = '#c9d1d9'; replayBtn.style.background = '#22252b'; replayBtn.style.borderColor = '#3d4149'; };
        replayBtn.onmouseout = () => { replayBtn.style.color = '#8b949e'; replayBtn.style.background = '#1a1c20'; replayBtn.style.borderColor = '#2d3035'; };
        replayBtn.onclick = () => {
            if (window.electronAPI && window.electronAPI.openReplayViewer) {
                window.electronAPI.openReplayViewer();
            }
        };

        const settingsBtn = document.createElement('button');
        settingsBtn.innerText = '⚙ Ayarlar';
        settingsBtn.id = "vexa-settings-btn";
        settingsBtn.style.cssText = "background:#1a1c20 !important; color:#8b949e !important; border:1px solid #2d3035 !important; border-radius:6px; padding:8px 13px; font-size:12px; font-weight:700; cursor:pointer; transition:color 0.15s, background 0.15s; white-space:nowrap;";
        settingsBtn.onmouseover = () => { settingsBtn.style.color = '#c9d1d9'; settingsBtn.style.background = '#22252b'; settingsBtn.style.borderColor = '#3d4149'; settingsBtn.style.transform = 'translateY(0)'; };
        settingsBtn.onmouseout = () => { settingsBtn.style.color = '#8b949e'; settingsBtn.style.background = '#1a1c20'; settingsBtn.style.borderColor = '#2d3035'; settingsBtn.style.transform = 'translateY(0)'; };
        settingsBtn.onclick = openSettingsModal;

        rightWrapper.appendChild(replayBtn);
        rightWrapper.appendChild(settingsBtn);

        // Pencere kontrolleri kaldırıldı - Windows'un kendi native kontrolleri kullanılıyor

        headerElement.appendChild(titleDiv);
        headerElement.appendChild(centerWrapper);
        headerElement.appendChild(rightWrapper);
        
        // --- API: Menüden barı kontrol etmek için ---
        window.vexaHeader = {
            toggleSearchBar: (visible) => {
                centerWrapper.style.display = visible ? 'flex' : 'none';
            }
        };

        // Reklam Saklayıcı
        const style = document.createElement('style');
        style.innerHTML = "iframe[src*='cpmstar'] { display: none !important; opacity: 0 !important; } div[id*='ad'] { display: none !important; opacity: 0 !important; }";
        document.head.appendChild(style);
    }

    // Expose openVexaSettings globally
    window.openVexaSettings = (tab) => openSettingsModal(tab);

    // ==========================================
    // 2. Ayarlar Modal'ı ve Aç-Kapa (Toggle) Sistemi
    // ==========================================
    function openSettingsModal(defaultTab = 'general') {
        if (document.getElementById('haxclient-settings-modal')) return;

        let animConfig = {
            enabled: false,
            preset: 'moon',
            customFrames: '',
            speed: 1000
        };
        try {
            const stored = localStorage.getItem("animatedAvatar");
            if (stored) {
                const avatarConfig = JSON.parse(stored);
                animConfig.enabled = avatarConfig.animEnabled || false;
                animConfig.preset = avatarConfig.preset || 'moon';
                animConfig.customFrames = avatarConfig.customFrames || '';
                animConfig.speed = avatarConfig.speed || 1000;
            }
        } catch (e) {}

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'haxclient-settings-modal';
        Object.assign(modalOverlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(3,7,18,0.68)', backdropFilter: 'blur(6px)',
            zIndex: '999999', display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontFamily: 'Tahoma, Arial, sans-serif',
            opacity: '0', transition: 'opacity 0.2s ease'
        });

        const modalBox = document.createElement('div');
        Object.assign(modalBox.style, {
            width: '420px', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
            background: 'linear-gradient(180deg, #202124 0%, #17181b 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.55)', padding: '18px', color: '#d1d5db', borderRadius: '8px',
            transform: 'scale(0.94)', transition: 'transform 0.2s ease, opacity 0.2s ease', opacity: '0'
        });

        modalBox.innerHTML = `
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px; margin-bottom:14px;">
                <h2 style="margin:0; font-size:17px; color:#fff; font-weight:800;">İstemci Ayarları</h2>
                <button id="close-modal-btn" style="background:#111318; border:1px solid rgba(255,255,255,0.08); border-radius:7px; color:#9ca3af; cursor:pointer; font-size:18px; line-height:1; width:32px; height:32px;">✕</button>
            </div>

            <!-- Tab Menu -->
            <div style="display:flex; background:#111318; border:1px solid rgba(255,255,255,0.07); border-radius:8px; margin-bottom:18px; gap:4px; padding:4px;">
                <button id="set-tab-general-btn" style="flex:1; background:#10b981; border:1px solid #17d59a; border-radius:6px; color:#06110d; padding:9px 0; cursor:pointer; font-weight:800; font-size:12px; transition:0.2s; outline:none;">Genel</button>
                <button id="set-tab-avatar-btn" style="flex:1; background:transparent; border:1px solid transparent; border-radius:6px; color:#8b949e; padding:9px 0; cursor:pointer; font-weight:800; font-size:12px; transition:0.2s; outline:none;">Avatar</button>
                <button id="set-tab-shortcuts-btn" style="flex:1; background:transparent; border:1px solid transparent; border-radius:6px; color:#8b949e; padding:9px 0; cursor:pointer; font-weight:800; font-size:12px; transition:0.2s; outline:none;">Kısayollar</button>
                <button id="set-tab-bg-btn" style="flex:1; background:transparent; border:1px solid transparent; border-radius:6px; color:#8b949e; padding:9px 0; cursor:pointer; font-weight:800; font-size:12px; transition:0.2s; outline:none;">Arka Plan</button>
            </div>

            <!-- TAB 1: GENERAL SETTINGS -->
            <div id="set-tab-general-content" style="display:block;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;">
                    <div>
                        <div style="color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;">FPS Unlocker</div>
                        <div style="color:#777; font-size:11px; line-height:1.3;">Sınırsız FPS hızını açar. (Yenileme Gerektirir)</div>
                    </div>
                    <div style="position:relative; width:44px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-fps-wrapper">
                        <div id="fps-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${isFpsEnabled ? '#10b981' : '#444'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="fps-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${isFpsEnabled ? 'translateX(22px)' : 'translateX(0)'};"></div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;">
                    <div>
                        <div style="color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;">FPS Göstergesi</div>
                        <div style="color:#777; font-size:11px; line-height:1.3;">Ekranda FPS sayacını gösterir.</div>
                    </div>
                    <div style="position:relative; width:44px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-fps-show-wrapper">
                        <div id="fps-show-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${isFpsShow ? '#10b981' : '#444'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="fps-show-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${isFpsShow ? 'translateX(22px)' : 'translateX(0)'};"></div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;">
                    <div>
                        <div style="color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;">Discord RPC</div>
                        <div style="color:#777; font-size:11px; line-height:1.3;">Discord'daki durum bilgisini açar/kapatır.</div>
                    </div>
                    <div style="position:relative; width:44px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-rpc-wrapper">
                        <div id="rpc-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${isRpcEnabled ? '#10b981' : '#444'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="rpc-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${isRpcEnabled ? 'translateX(22px)' : 'translateX(0)'};"></div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;">
                    <div>
                        <div style="color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;">Ping Booster & Girdi Gecikmesi</div>
                        <div style="color:#777; font-size:11px; line-height:1.3;">Girdi gecikmesini azaltır ve WebGL donanım hızlandırmasını optimize eder. (Yenileme Gerektirir)</div>
                    </div>
                    <div style="position:relative; width:44px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-ping-wrapper">
                        <div id="ping-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${isPingBoosterEnabled ? '#10b981' : '#444'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="ping-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${isPingBoosterEnabled ? 'translateX(22px)' : 'translateX(0)'};"></div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;">
                    <div>
                        <div style="color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;">Canlı Ağ İzleyici (NetGraph)</div>
                        <div style="color:#777; font-size:11px; line-height:1.3;">Ekranda detaylı ping, jitter ve paket kaybı grafiği gösterir.</div>
                    </div>
                    <div style="position:relative; width:44px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-netgraph-wrapper">
                        <div id="netgraph-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${isNetGraphEnabled ? '#10b981' : '#444'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="netgraph-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${isNetGraphEnabled ? 'translateX(22px)' : 'translateX(0)'};"></div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: AVATAR SETTINGS -->
            <div id="set-tab-avatar-content" style="display:none;">
                <!-- Döngü Animasyonu Toggle -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;">
                    <div>
                        <div style="color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;">Döngü Animasyonu</div>
                        <div style="color:#777; font-size:11px; line-height:1.3;">Belirli kareleri sırayla oynatır.</div>
                    </div>
                    <div style="position:relative; width:44px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-anim-wrapper">
                        <div id="anim-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${animConfig.enabled ? '#10b981' : '#444'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="anim-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${animConfig.enabled ? 'translateX(22px)' : 'translateX(0)'};"></div>
                    </div>
                </div>

                <!-- Hazır Şablonlar -->
                <div style="background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828; margin-bottom:15px;">
                    <div style="color:#eee; font-size:14px; margin-bottom:10px; font-weight:bold;">Hazır Şablonlar</div>
                    <select id="inp-preset" style="width:100%; padding:10px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; font-size:13px; outline:none; cursor:pointer; box-sizing:border-box;">
                        <option value="moon" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'moon' ? 'selected' : ''}>Ay Evreleri ( 🌑 🌒 🌓 ... )</option>
                        <option value="clock" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'clock' ? 'selected' : ''}>Saat Döngüsü ( 🕐 🕑 🕒 ... )</option>
                        <option value="hearts" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'hearts' ? 'selected' : ''}>Kalp Atışı ( ❤️ 💖 💗 ... )</option>
                        <option value="loading" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'loading' ? 'selected' : ''}>Yükleniyor Efekti ( | / - ... )</option>
                        <option value="vexa" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'vexa' ? 'selected' : ''}>Vexa Yazısı ( V VX X ... )</option>
                        <option value="arrows" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'arrows' ? 'selected' : ''}>Dönen Oklar ( ↑ ↗ → ... )</option>
                        <option value="police" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'police' ? 'selected' : ''}>Polis Sireni ( 🔴 🔵 🔴 ... )</option>
                        <option value="sayan" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'sayan' ? 'selected' : ''}>Süper Güç ( ⚡ 🔥 ⚡ ... )</option>
                        <option value="matrix" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'matrix' ? 'selected' : ''}>Matrix Dalga ( ░ ▒ ▓ ... )</option>
                        <option value="faces" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'faces' ? 'selected' : ''}>İfadeler ( ☺ ☻ ☺ ... )</option>
                        <option value="ball" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'ball' ? 'selected' : ''}>Futbol Aşkı ( ⚽ 🥅 ⚽ ... )</option>
                        <option value="custom" style="background:#1c1c1e; color:#fff;" ${animConfig.preset === 'custom' ? 'selected' : ''}>Özel Liste...</option>
                    </select>
                </div>

                <!-- Özel Kareler -->
                <div id="custom-frames-wrapper" style="background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828; margin-bottom:15px; display:${animConfig.preset === 'custom' ? 'block' : 'none'};">
                    <div style="color:#eee; font-size:14px; margin-bottom:10px; font-weight:bold;">Özel Kareler (Maks. 10 Kare)</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-start;">
                        <input type="text" class="custom-frame-input" id="cf-1" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-2" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-3" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-4" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-5" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-6" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-7" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-8" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-9" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                        <input type="text" class="custom-frame-input" id="cf-10" maxlength="2" style="width:48px; height:48px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; text-align:center; font-size:16px; outline:none; box-sizing:border-box;">
                    </div>
                    <div style="font-size:10px; color:#f59e0b; margin-top:8px; line-height:1.3; display:flex; gap:4px; align-items:flex-start;">
                        <span style="font-weight:bold;">⚠️</span>
                        <span>HaxBall avatarları en fazla 2 karakter/harf destekler.</span>
                    </div>
                </div>

                <!-- Geçiş Hızı -->
                <div style="background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="color:#eee; font-size:14px; font-weight:bold;">Geçiş Hızı (Kare Süresi)</div>
                        <span id="speed-val" style="font-size:14px; font-weight:bold; color:#10b981;">${animConfig.speed} ms</span>
                    </div>
                    <input type="range" id="inp-speed" min="250" max="5000" step="50" value="${animConfig.speed}" style="width:100%; accent-color:#10b981; cursor:pointer; margin-bottom:8px;">
                    <div style="font-size:10px; color:#f59e0b; line-height:1.4; display:flex; gap:4px; align-items:flex-start;">
                        <span style="font-weight:bold;">⚠️</span>
                        <span>Engellemeye (flood) takılmamak için 1000ms ve üzeri hızlar önerilir. Minimum: 250ms.</span>
                    </div>
                </div>
            </div>

            <!-- TAB 3: SHORTCUTS -->
            <div id="set-tab-shortcuts-content" style="display:none; max-height:280px; overflow-y:auto; padding-right:5px;">
                <div style="font-size:11px; color:#aaa; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
                    <span>Boşluk veya Enter'a bastığınızda otomatik genişletilir.</span>
                    <span id="shortcuts-count-badge" style="font-size:10px; color:#10b981; font-weight:bold; background:rgba(16,185,129,0.1); padding:2px 6px; border-radius:10px;">0 / 20</span>
                </div>
                <!-- Dynamic container -->
                <div id="shortcuts-list-container" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
                    <!-- Rows injected here -->
                </div>
                <!-- Add Button -->
                <div style="text-align:left;">
                    <button id="add-shortcut-btn" style="background:#222; color:#10b981; border:1px solid #10b981; padding:6px 14px; font-size:12px; font-weight:bold; cursor:pointer; border-radius:3px; transition:0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.1)'" onmouseout="this.style.background='#222'">+ Ekle</button>
                </div>
            </div>

            <!-- TAB 4: BACKGROUNDS -->
            <div id="set-tab-bg-content" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div>
                        <div style="color:#eee; font-size:14px; font-weight:bold; margin-bottom:4px;">Özel Arka Plan</div>
                        <div id="hax-bg-tab-status" style="color:#666; font-size:11px; font-style:italic;">Pasif (Varsayılan)</div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="file" id="hax-bg-tab-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;">
                        <button id="hax-bg-tab-upload-btn" style="background:#10b981; color:#fff; border:none; padding:7px 14px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">+ Yükle</button>
                        <button id="hax-bg-tab-reset-btn" style="background:#ef4444; color:#fff; border:none; padding:7px 14px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; transition:0.2s; display:none;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">Sıfırla</button>
                    </div>
                </div>
                <div style="color:#555; font-size:10px; margin-bottom:10px;">Sadece statik resim (.png, .jpg, .webp) yükleyebilirsiniz (Hareketli arkaplanlar geçici olarak devre dışı).</div>
                <div style="color:#eee; font-size:13px; font-weight:bold; margin-bottom:8px;">Hazır Arka Planlar</div>
                <div id="hax-bg-system-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; min-height:74px; margin-bottom:14px;"></div>
                <div style="color:#eee; font-size:13px; font-weight:bold; margin-bottom:8px;">Yüklenenler</div>
                <div id="hax-bg-history-grid" style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; min-height:60px;"></div>
            </div>

            <!-- Save Button -->
            <div style="text-align:right;">
                <button id="save-modal-btn" style="background:#10b981; color:#fff; border:1px solid #059669; padding:8px 24px; font-size:13px; font-weight:bold; cursor:pointer; border-radius:3px; transition:0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Kaydet</button>
            </div>
        `;

        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        modalBox.querySelectorAll('#set-tab-general-content > div, #set-tab-avatar-content > div').forEach((panel) => {
            panel.style.background = '#111318';
            panel.style.border = '1px solid rgba(255,255,255,0.07)';
            panel.style.borderRadius = '8px';
            panel.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03)';
        });
        modalBox.querySelectorAll('input, select').forEach((field) => {
            field.style.borderRadius = field.style.borderRadius || '6px';
        });

        const saveBtn = document.getElementById('save-modal-btn');
        if (saveBtn) {
            saveBtn.style.borderRadius = '7px';
            saveBtn.style.padding = '10px 28px';
            saveBtn.style.fontWeight = '800';
            saveBtn.style.boxShadow = '0 10px 24px rgba(16,185,129,0.18)';
        }

        // Load custom frames into inputs
        const customFrames = animConfig.customFrames.split(',');
        for (let i = 1; i <= 10; i++) {
            const val = customFrames[i - 1] || '';
            const el = document.getElementById('cf-' + i);
            if (el) el.value = val;
        }

        // Shortcuts list DOM references
        const shortcutsContainer = document.getElementById('shortcuts-list-container');
        const addShortcutBtn = document.getElementById('add-shortcut-btn');
        const countBadge = document.getElementById('shortcuts-count-badge');

        const updateShortcutCount = () => {
            const count = shortcutsContainer.children.length;
            countBadge.innerText = `${count} / 20`;
            if (count >= 20) {
                addShortcutBtn.style.opacity = '0.5';
                addShortcutBtn.style.cursor = 'not-allowed';
                addShortcutBtn.disabled = true;
            } else {
                addShortcutBtn.style.opacity = '1';
                addShortcutBtn.style.cursor = 'pointer';
                addShortcutBtn.disabled = false;
            }
        };

        const createShortcutRow = (key = '', val = '') => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'center';
            row.className = 'shortcut-row';

            row.innerHTML = `
                <input type="text" placeholder="sa" value="${key}" style="width:70px; padding:8px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; font-size:12px; outline:none; box-sizing:border-box;" class="sh-key-input">
                <span style="color:#666;">→</span>
                <input type="text" placeholder="Selamın Aleykum" value="${val}" style="flex:1; padding:8px; background:#18181c; border:1px solid #28282c; border-radius:4px; color:#fff; font-size:12px; outline:none; box-sizing:border-box;" class="sh-val-input">
                <button class="delete-shortcut-row" style="background:none; border:none; color:#555; cursor:pointer; font-size:14px; padding:4px 8px; transition:0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#555'">✕</button>
            `;

            row.querySelector('.delete-shortcut-row').onclick = () => {
                row.remove();
                updateShortcutCount();
            };

            return row;
        };

        addShortcutBtn.onclick = () => {
            if (shortcutsContainer.children.length >= 20) return;
            const newRow = createShortcutRow();
            shortcutsContainer.appendChild(newRow);
            updateShortcutCount();
            newRow.querySelector('.sh-key-input').focus();
        };

        // Load shortcuts
        let shortcuts = {};
        try {
            const stored = localStorage.getItem('hax_chat_shortcuts');
            if (stored) {
                shortcuts = JSON.parse(stored);
            } else {
                // Initialize default shortcuts (without yt and dc)
                shortcuts = {
                    "sa": "Selamın Aleykum",
                    "as": "Aleykum Selam",
                    "hb": "Hoşbulduk"
                };
                localStorage.setItem('hax_chat_shortcuts', JSON.stringify(shortcuts));
            }
        } catch(e){}

        // Populate shortcuts
        shortcutsContainer.innerHTML = '';
        Object.entries(shortcuts).forEach(([k, v]) => {
            const row = createShortcutRow(k, v);
            shortcutsContainer.appendChild(row);
        });
        updateShortcutCount();

        requestAnimationFrame(() => {
            modalOverlay.style.opacity = '1';
            modalBox.style.opacity = '1';
            modalBox.style.transform = 'scale(1)';
        });

        const closeModal = () => {
            modalOverlay.style.opacity = '0';
            modalBox.style.transform = 'scale(0.8)';
            setTimeout(() => modalOverlay.remove(), 200);
        };

        // Interaction Codes
        document.getElementById('close-modal-btn').onclick = closeModal;
        
        let switchFps = isFpsEnabled;
        let switchFpsShow = isFpsShow;
        let switchRpc = isRpcEnabled;
        let switchPing = isPingBoosterEnabled;
        let switchNetGraph = isNetGraphEnabled;
        let switchAnim = animConfig.enabled;

        // Tab selection logic
        const tabGenBtn = document.getElementById('set-tab-general-btn');
        const tabAvBtn = document.getElementById('set-tab-avatar-btn');
        const tabShortcutsBtn = document.getElementById('set-tab-shortcuts-btn');
        const tabBgBtn = document.getElementById('set-tab-bg-btn');
        const tabGenContent = document.getElementById('set-tab-general-content');
        const tabAvContent = document.getElementById('set-tab-avatar-content');
        const tabShortcutsContent = document.getElementById('set-tab-shortcuts-content');
        const tabBgContent = document.getElementById('set-tab-bg-content');

        const allTabBtns = [tabGenBtn, tabAvBtn, tabShortcutsBtn, tabBgBtn];
        const allTabContents = [tabGenContent, tabAvContent, tabShortcutsContent, tabBgContent];

        function activateTab(activeBtn, activeContent) {
            allTabBtns.forEach(b => {
                b.style.background = 'transparent';
                b.style.borderColor = 'transparent';
                b.style.color = '#8b949e';
            });
            allTabContents.forEach(c => { c.style.display = 'none'; });
            activeBtn.style.background = '#10b981';
            activeBtn.style.borderColor = '#17d59a';
            activeBtn.style.color = '#06110d';
            activeContent.style.display = 'block';
        }

        tabGenBtn.onclick = () => activateTab(tabGenBtn, tabGenContent);
        tabAvBtn.onclick = () => activateTab(tabAvBtn, tabAvContent);
        tabShortcutsBtn.onclick = () => { activateTab(tabShortcutsBtn, tabShortcutsContent); tabShortcutsContent.scrollTop = 0; };
        tabBgBtn.onclick = () => { activateTab(tabBgBtn, tabBgContent); renderBgSystemPresets(); renderBgHistory(); };

        // Activate default tab
        if (defaultTab === 'avatar') {
            tabAvBtn.click();
        } else if (defaultTab === 'shortcuts') {
            tabShortcutsBtn.click();
        } else if (defaultTab === 'backgrounds') {
            tabBgBtn.click();
        } else {
            tabGenBtn.click();
        }

        // FPS Toggle
        const fpsSlider = document.getElementById('fps-slider');
        const fpsKnob = document.getElementById('fps-knob');
        document.getElementById('toggle-fps-wrapper').onclick = () => {
            switchFps = !switchFps;
            fpsSlider.style.backgroundColor = switchFps ? '#10b981' : '#444';
            fpsKnob.style.transform = switchFps ? 'translateX(22px)' : 'translateX(0)';
        };

        // FPS Show Toggle
        const fpsShowSlider = document.getElementById('fps-show-slider');
        const fpsShowKnob = document.getElementById('fps-show-knob');
        document.getElementById('toggle-fps-show-wrapper').onclick = () => {
            switchFpsShow = !switchFpsShow;
            fpsShowSlider.style.backgroundColor = switchFpsShow ? '#10b981' : '#444';
            fpsShowKnob.style.transform = switchFpsShow ? 'translateX(22px)' : 'translateX(0)';
        };

        // RPC Toggle
        const rpcSlider = document.getElementById('rpc-slider');
        const rpcKnob = document.getElementById('rpc-knob');
        document.getElementById('toggle-rpc-wrapper').onclick = () => {
            switchRpc = !switchRpc;
            rpcSlider.style.backgroundColor = switchRpc ? '#10b981' : '#444';
            rpcKnob.style.transform = switchRpc ? 'translateX(22px)' : 'translateX(0)';
        };

        // Ping Booster Toggle
        const pingSlider = document.getElementById('ping-slider');
        const pingKnob = document.getElementById('ping-knob');
        document.getElementById('toggle-ping-wrapper').onclick = () => {
            switchPing = !switchPing;
            pingSlider.style.backgroundColor = switchPing ? '#10b981' : '#444';
            pingKnob.style.transform = switchPing ? 'translateX(22px)' : 'translateX(0)';
        };

        // NetGraph Toggle
        const netGraphSlider = document.getElementById('netgraph-slider');
        const netGraphKnob = document.getElementById('netgraph-knob');
        document.getElementById('toggle-netgraph-wrapper').onclick = () => {
            switchNetGraph = !switchNetGraph;
            netGraphSlider.style.backgroundColor = switchNetGraph ? '#10b981' : '#444';
            netGraphKnob.style.transform = switchNetGraph ? 'translateX(22px)' : 'translateX(0)';
        };

        // --- Background Tab Logic ---
        const bgTabFileInput = document.getElementById('hax-bg-tab-file-input');
        const bgTabUploadBtn = document.getElementById('hax-bg-tab-upload-btn');
        const bgTabResetBtn = document.getElementById('hax-bg-tab-reset-btn');
        const bgSystemGrid = document.getElementById('hax-bg-system-grid');
        const bgHistoryGrid = document.getElementById('hax-bg-history-grid');
        const bgTabStatus = document.getElementById('hax-bg-tab-status');
        const injectBaseUrl = (window.VEXA_INJECT_BASE_URL || 'file:///c:/Vexa/inject').replace(/\/$/, '');
        const systemBackgrounds = [];

        function getBgHistory() {
            try {
                const raw = localStorage.getItem('hax_bg_history');
                if (raw) return JSON.parse(raw);
            } catch(e) {}
            return [];
        }

        function saveBgHistory(history) {
            localStorage.setItem('hax_bg_history', JSON.stringify(history));
        }

        function renderBgSystemPresets() {
            if (!bgSystemGrid) return;
            bgSystemGrid.innerHTML = '';
            const activeBg = localStorage.getItem('hax_custom_bg');

            systemBackgrounds.forEach((item) => {
                const card = document.createElement('div');
                const isActive = activeBg === item.path;
                Object.assign(card.style, {
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '62%',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isActive ? '2px solid #10b981' : '2px solid #333',
                    boxShadow: isActive ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                    transition: 'border 0.2s, box-shadow 0.2s',
                    background: '#0a0a0a'
                });

                const inner = document.createElement('div');
                Object.assign(inner.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%'
                });

                const isVideo = item.type === 'video' || item.path.match(/\.(mp4|webm|mkv|mov|avi)(\?|$)/i);
                if (isVideo) {
                    const vid = document.createElement('video');
                    vid.src = item.path;
                    vid.muted = true;
                    vid.loop = true;
                    vid.autoplay = true;
                    vid.playsInline = true;
                    Object.assign(vid.style, { width: '100%', height: '100%', objectFit: 'cover' });
                    inner.appendChild(vid);
                    vid.play().catch(() => {});
                } else {
                    const img = document.createElement('img');
                    img.src = item.path;
                    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' });
                    inner.appendChild(img);
                }

                const label = document.createElement('div');
                label.innerText = item.name;
                Object.assign(label.style, {
                    position: 'absolute',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    padding: '5px 6px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    lineHeight: '1.2',
                    textShadow: '0 1px 2px #000',
                    zIndex: '2'
                });
                inner.appendChild(label);

                if (isActive) {
                    const badge = document.createElement('div');
                    badge.innerText = '✓';
                    Object.assign(badge.style, {
                        position: 'absolute', top: '4px', left: '4px',
                        background: '#10b981', color: '#fff', borderRadius: '50%',
                        width: '18px', height: '18px', fontSize: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', zIndex: '3'
                    });
                    inner.appendChild(badge);
                }

                card.appendChild(inner);
                card.onclick = () => {
                    localStorage.setItem('hax_custom_bg', item.path);
                    localStorage.setItem('hax_custom_bg_name', item.name);
                    updateBgTabStatus();
                    window.dispatchEvent(new CustomEvent('hax-custom-bg-changed', { detail: { path: item.path } }));
                    renderBgSystemPresets();
                    renderBgHistory();
                };

                card.onmouseover = () => { if (!isActive) card.style.border = '2px solid #555'; };
                card.onmouseout = () => { if (!isActive) card.style.border = '2px solid #333'; };

                bgSystemGrid.appendChild(card);
            });
        }

        function renderBgHistory() {
            if (!bgHistoryGrid) return;
            bgHistoryGrid.innerHTML = '';
            const history = getBgHistory();
            const activeBg = localStorage.getItem('hax_custom_bg');

            if (history.length === 0) {
                bgHistoryGrid.innerHTML = '<div style="color:#555; font-size:11px; text-align:center; padding:20px 0; grid-column: 1 / -1;">Henüz arka plan yüklenmedi.</div>';
            }

            history.forEach((item, index) => {
                const card = document.createElement('div');
                const isActive = activeBg === item.path;
                Object.assign(card.style, {
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '100%',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isActive ? '2px solid #10b981' : '2px solid #333',
                    boxShadow: isActive ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                    transition: 'border 0.2s, box-shadow 0.2s',
                    background: '#0a0a0a'
                });

                const inner = document.createElement('div');
                Object.assign(inner.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%'
                });

                const isVideo = item.path.match(/\.(mp4|webm|mkv|mov|avi)(\?|$)/i);
                if (isVideo) {
                    const vid = document.createElement('video');
                    vid.src = item.path;
                    vid.muted = true;
                    vid.loop = true;
                    vid.autoplay = true;
                    vid.playsInline = true;
                    Object.assign(vid.style, { width: '100%', height: '100%', objectFit: 'cover' });
                    inner.appendChild(vid);
                    vid.play().catch(() => {});
                } else {
                    const img = document.createElement('img');
                    img.src = item.path;
                    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' });
                    inner.appendChild(img);
                }

                // Delete button
                const delBtn = document.createElement('button');
                delBtn.innerText = '✕';
                Object.assign(delBtn.style, {
                    position: 'absolute', top: '3px', right: '3px',
                    background: 'rgba(0,0,0,0.7)', color: '#888', border: 'none',
                    borderRadius: '50%', width: '20px', height: '20px',
                    fontSize: '11px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'color 0.2s, background 0.2s', zIndex: '2',
                    padding: '0', lineHeight: '1'
                });
                delBtn.onmouseover = () => { delBtn.style.color = '#fff'; delBtn.style.background = 'rgba(239,68,68,0.9)'; };
                delBtn.onmouseout = () => { delBtn.style.color = '#888'; delBtn.style.background = 'rgba(0,0,0,0.7)'; };
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (window.electronAPI && typeof window.electronAPI.deleteCustomBackground === 'function') {
                        try { await window.electronAPI.deleteCustomBackground(item.path); } catch(err) {}
                    }
                    let hist = getBgHistory();
                    hist = hist.filter(h => h.path !== item.path);
                    saveBgHistory(hist);
                    if (activeBg === item.path) {
                        localStorage.removeItem('hax_custom_bg');
                        localStorage.removeItem('hax_custom_bg_name');
                        updateBgTabStatus();
                        window.dispatchEvent(new CustomEvent('hax-custom-bg-changed', { detail: { path: null } }));
                    }
                    renderBgSystemPresets();
                    renderBgHistory();
                };

                // Active badge
                if (isActive) {
                    const badge = document.createElement('div');
                    badge.innerText = '✓';
                    Object.assign(badge.style, {
                        position: 'absolute', bottom: '3px', left: '3px',
                        background: '#10b981', color: '#fff', borderRadius: '50%',
                        width: '18px', height: '18px', fontSize: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', zIndex: '2'
                    });
                    inner.appendChild(badge);
                }

                inner.appendChild(delBtn);
                card.appendChild(inner);

                card.onclick = () => {
                    localStorage.setItem('hax_custom_bg', item.path);
                    localStorage.setItem('hax_custom_bg_name', item.name);
                    updateBgTabStatus();
                    window.dispatchEvent(new CustomEvent('hax-custom-bg-changed', { detail: { path: item.path } }));
                    renderBgSystemPresets();
                    renderBgHistory();
                };

                card.onmouseover = () => { if (!isActive) card.style.border = '2px solid #555'; };
                card.onmouseout = () => { if (!isActive) card.style.border = '2px solid #333'; };

                bgHistoryGrid.appendChild(card);
            });
        }

        function updateBgTabStatus() {
            if (!bgTabStatus) return;
            const currentBg = localStorage.getItem('hax_custom_bg');
            const currentBgName = localStorage.getItem('hax_custom_bg_name');
            if (currentBg) {
                bgTabStatus.innerText = 'Aktif: ' + (currentBgName || 'Özel Arka Plan');
                bgTabStatus.style.color = '#10b981';
                bgTabResetBtn.style.display = 'inline-block';
            } else {
                bgTabStatus.innerText = 'Pasif (Varsayılan)';
                bgTabStatus.style.color = '#666';
                bgTabResetBtn.style.display = 'none';
            }
        }
        updateBgTabStatus();

        bgTabUploadBtn.onclick = (e) => { e.preventDefault(); bgTabFileInput.click(); };

        bgTabFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mkv|mov|avi|gif)$/i) || file.type === 'image/gif') {
                bgTabStatus.innerText = 'Hata: Hareketli arkaplanlar geçici olarak devre dışı!';
                bgTabStatus.style.color = '#ef4444';
                bgTabFileInput.value = '';
                return;
            }

            bgTabStatus.innerText = 'Yükleniyor...';
            bgTabStatus.style.color = '#eab308';

            if (window.electronAPI && typeof window.electronAPI.saveCustomBackground === 'function') {
                try {
                    const res = await window.electronAPI.saveCustomBackground(file.path);
                    if (res && res.success) {
                        let history = getBgHistory();
                        history.unshift({ path: res.path, name: file.name, ts: Date.now() });
                        // Keep only 5
                        while (history.length > 5) {
                            const removed = history.pop();
                            if (window.electronAPI.deleteCustomBackground) {
                                try { await window.electronAPI.deleteCustomBackground(removed.path); } catch(err) {}
                            }
                        }
                        saveBgHistory(history);
                        localStorage.setItem('hax_custom_bg', res.path);
                        localStorage.setItem('hax_custom_bg_name', file.name);
                        updateBgTabStatus();
                        renderBgSystemPresets();
                        renderBgHistory();
                        window.dispatchEvent(new CustomEvent('hax-custom-bg-changed', { detail: { path: res.path } }));
                    } else {
                        bgTabStatus.innerText = 'Hata: ' + (res.error || 'Dosya yüklenemedi');
                        bgTabStatus.style.color = '#ef4444';
                    }
                } catch(err) {
                    bgTabStatus.innerText = 'Hata: ' + err.message;
                    bgTabStatus.style.color = '#ef4444';
                }
            } else {
                bgTabStatus.innerText = 'Hata: Electron API bulunamadı';
                bgTabStatus.style.color = '#ef4444';
            }
            bgTabFileInput.value = '';
        };

        bgTabResetBtn.onclick = async (e) => {
            e.preventDefault();
            const activeBg = localStorage.getItem('hax_custom_bg');
            localStorage.removeItem('hax_custom_bg');
            localStorage.removeItem('hax_custom_bg_name');
            updateBgTabStatus();
            renderBgSystemPresets();
            renderBgHistory();
            window.dispatchEvent(new CustomEvent('hax-custom-bg-changed', { detail: { path: null } }));
        };

        renderBgSystemPresets();
        renderBgHistory();


        // Anim Toggle
        const animSlider = document.getElementById('anim-slider');
        const animKnob = document.getElementById('anim-knob');
        document.getElementById('toggle-anim-wrapper').onclick = () => {
            switchAnim = !switchAnim;
            animSlider.style.backgroundColor = switchAnim ? '#10b981' : '#444';
            animKnob.style.transform = switchAnim ? 'translateX(22px)' : 'translateX(0)';
        };

        // Preset dropdown select
        const presetSelect = document.getElementById('inp-preset');
        const customFramesWrapper = document.getElementById('custom-frames-wrapper');
        presetSelect.onchange = () => {
            customFramesWrapper.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
        };

        // Speed range slider
        const speedSlider = document.getElementById('inp-speed');
        const speedVal = document.getElementById('speed-val');
        speedSlider.oninput = () => {
            speedVal.innerText = speedSlider.value + ' ms';
        };

        // Save
        document.getElementById('save-modal-btn').onclick = () => {
            // Update Vexa settings
            localStorage.setItem('hax_fps_limit', switchFps);
            localStorage.setItem('hax_fps_show', switchFpsShow);
            localStorage.setItem('hax_discord_rpc', switchRpc);
            localStorage.setItem('hax_ping_booster', switchPing);
            localStorage.setItem('hax_net_graph', switchNetGraph);

            // Save shortcuts dynamically
            const newShortcuts = {};
            const rows = document.querySelectorAll('.shortcut-row');
            rows.forEach(row => {
                const kEl = row.querySelector('.sh-key-input');
                const vEl = row.querySelector('.sh-val-input');
                if (kEl && vEl) {
                    const key = kEl.value.trim().toLowerCase();
                    const val = vEl.value.trim();
                    if (key && val) {
                        newShortcuts[key] = val;
                    }
                }
            });
            localStorage.setItem('hax_chat_shortcuts', JSON.stringify(newShortcuts));

            // Read custom frames
            const customFramesArray = [];
            for (let i = 1; i <= 10; i++) {
                const el = document.getElementById('cf-' + i);
                const val = el ? el.value.trim() : '';
                if (val) customFramesArray.push(val);
            }
            const newCustomFrames = customFramesArray.join(',');

            // Read the old reaction emotes config from localstorage
            let reactionEnabled = false;
            let defaultAv = "VX";
            let resetDur = 2000;
            let hotkeys = {};
            try {
                const stored = localStorage.getItem("animatedAvatar");
                if (stored) {
                    const avatarConfig = JSON.parse(stored);
                    reactionEnabled = avatarConfig.enabled || false;
                    defaultAv = avatarConfig.defaultAvatar || "VX";
                    hotkeys = avatarConfig.hotkeys || {};
                }
            } catch(e){}

            const avatarSettings = {
                enabled: reactionEnabled,
                defaultAvatar: defaultAv,
                resetDuration: resetDur,
                hotkeys: hotkeys,
                animEnabled: switchAnim,
                preset: presetSelect.value,
                customFrames: newCustomFrames,
                speed: parseInt(speedSlider.value) || 1000
            };
            localStorage.setItem("animatedAvatar", JSON.stringify(avatarSettings));

            // Persist to Electron profile
            const fpsChanged = Boolean(isFpsEnabled) !== Boolean(switchFps);
            const pingChanged = Boolean(isPingBoosterEnabled) !== Boolean(switchPing);
            
            isFpsEnabled = switchFps;
            isFpsShow = switchFpsShow;
            isRpcEnabled = switchRpc;
            isPingBoosterEnabled = switchPing;
            isNetGraphEnabled = switchNetGraph;

            const saveAndRestart = () => {
                try {
                    if (fpsChanged || pingChanged) {
                        if (window.electronAPI && typeof window.electronAPI.restartApp === 'function') {
                            window.electronAPI.restartApp();
                        } else {
                            window.location.reload();
                        }
                    } else {
                        const fpsCounter = document.getElementById('vexa-fps-counter');
                        if (fpsCounter) fpsCounter.style.display = switchFpsShow ? 'flex' : 'none';
                        closeModal();
                    }
                } catch(err) {
                    console.error("Failed to relaunch, falling back to reload:", err);
                    window.location.reload();
                }
            };

            if (window.electronAPI) {
                const currentProfileId = localStorage.getItem('current_profile') || 'default';
                window.electronAPI.getAppPreferences().then(prefs => {
                    try {
                        const profiles = (prefs && prefs.profiles) || [];
                        const pIdx = Array.isArray(profiles) ? profiles.findIndex(p => p.id === currentProfileId) : -1;
                        if (pIdx !== -1) {
                            profiles[pIdx].animatedAvatar = avatarSettings;
                        }
                        window.electronAPI.saveSettings({ 
                            profiles, 
                            animatedAvatar: avatarSettings,
                            fpsEnabled: switchFps,
                            fpsShow: switchFpsShow,
                            rpcEnabled: switchRpc,
                            pingBoosterEnabled: switchPing,
                            netGraphEnabled: switchNetGraph
                        });
                        
                        if (window.launcherAPI && typeof window.launcherAPI.toggleRPC === 'function') {
                            window.launcherAPI.toggleRPC(switchRpc);
                        } else if (window.electronAPI && typeof window.electronAPI.toggleRPC === 'function') {
                            window.electronAPI.toggleRPC(switchRpc);
                        }
                    } catch (err) {
                        console.error("Error saving settings to Electron profile:", err);
                    }
                    
                    if (typeof window.loadAvatarConfig === 'function') {
                        try { window.loadAvatarConfig(); } catch(e){}
                    }
                    
                    // Tiny timeout to let IPC message transmit before relaunch
                    setTimeout(saveAndRestart, 150);
                }).catch(err => {
                    console.error("Failed to get app preferences:", err);
                    saveAndRestart();
                });
            } else {
                if (typeof window.loadAvatarConfig === 'function') {
                    try { window.loadAvatarConfig(); } catch(e){}
                }
                saveAndRestart();
            }
        };
    }
})();
