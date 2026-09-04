// OEM HaxBall Designed Header + LocalStorage Settings
(() => {
    let isFpsEnabled = localStorage.getItem('hax_fps_limit') !== 'false';
    let isFpsShow = localStorage.getItem('hax_fps_show') !== 'false';
    let isRpcEnabled = localStorage.getItem('hax_discord_rpc') !== 'false';
    let isPingBoosterEnabled = localStorage.getItem('hax_ping_booster') === 'true';
    let isLowGraphicsEnabled = localStorage.getItem('hax_low_graphics') === 'true';
    let isPerfBgEnabled = localStorage.getItem('hax_perf_bg') === 'true';
    let isThinLinesEnabled = localStorage.getItem('hax_thin_lines') === 'true';
    let isAutoRecEnabled = localStorage.getItem('hax_auto_rec') !== 'false';

    // --- ACCENT COLOR SYSTEM ---
    let ACCENT = localStorage.getItem('hax_accent_color') || '#10b981';

    function hexToRgbStr(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    }

    function applyAccentColor(color) {
        ACCENT = color;
        localStorage.setItem('hax_accent_color', color);
        // Set CSS variable for live update in HaxBall UI
        document.documentElement.style.setProperty('--vexa-accent', color);
        const rgbStr = hexToRgbStr(color);
        document.documentElement.style.setProperty('--vexa-accent-rgb', rgbStr);
        
        const iframe = document.querySelector('.gameframe') || document.querySelector('iframe');
        if (iframe && iframe.contentDocument) {
            iframe.contentDocument.documentElement.style.setProperty('--vexa-accent', color);
            iframe.contentDocument.documentElement.style.setProperty('--vexa-accent-rgb', rgbStr);
        }

        // Accent rengini kullanan tüm modal elementlerini güncelle
        const sliders = ['rpc-slider','fps-show-slider','ping-slider','thin-lines-slider','auto-rec-slider','anim-slider'];
        const states = [isRpcEnabled, isFpsShow, isPingBoosterEnabled, isThinLinesEnabled, isAutoRecEnabled];
        sliders.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el && i < states.length && states[i]) el.style.backgroundColor = color;
        });
        // Website ikonu
        const webBtn = document.getElementById('vexa-web-btn');
        if (webBtn) webBtn.style.color = color;
        // Renk swatch seçim göstergelerini güncelle
        document.querySelectorAll('.vexa-color-swatch').forEach(sw => {
            const isSelected = sw.dataset.color === color;
            sw.style.outline = isSelected ? '2px solid #fff' : '2px solid transparent';
            sw.style.outlineOffset = '2px';
        });
    }

    // --- FORCE PAGE TITLE: "Vexa Haxball Play" ---
    (function forceVexaTitle() {
        const desiredTitle = "Vexa Haxball Play";

        const applyTitle = () => {
            if (document.title !== desiredTitle) {
                document.title = desiredTitle;
            }
        };

        applyTitle();

        // HaxBall's own scripts may rewrite document.title later (e.g. on room join/leave),
        // so keep enforcing our value whenever it changes.
        const titleEl = document.querySelector('title');
        if (titleEl) {
            new MutationObserver(applyTitle).observe(titleEl, { childList: true });
        }
        // Fallback in case the <title> node gets replaced entirely
        setInterval(applyTitle, 1000);
    })();

    // Replay Page Logic
    if (window.location.pathname.includes('/replay')) {
        const style = document.createElement('style');
        style.innerHTML = `
            body { background-color: #111318 !important; color: #fff !important; overflow: hidden !important; }
            .rightbar { display: none !important; }
            .container { width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
            .flexRow.flexGrow { height: calc(100vh - 48px) !important; }
            iframe.gameframe { border: none !important; width: 100vw !important; height: calc(100vh - 48px) !important; box-shadow: none !important; }
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
                isLowGraphicsEnabled = settings.lowGraphicsEnabled === true;
                isPerfBgEnabled = settings.perfBgEnabled === true;
                isThinLinesEnabled = settings.thinLinesEnabled === true;
                isAutoRecEnabled = settings.autoRecEnabled !== false;
                localStorage.setItem('hax_fps_limit', isFpsEnabled);
                localStorage.setItem('hax_fps_show', isFpsShow);
                localStorage.setItem('hax_discord_rpc', isRpcEnabled);
                localStorage.setItem('hax_ping_booster', isPingBoosterEnabled);
                localStorage.setItem('hax_low_graphics', isLowGraphicsEnabled);
                localStorage.setItem('hax_perf_bg', isPerfBgEnabled);
                localStorage.setItem('hax_thin_lines', isThinLinesEnabled);
                localStorage.setItem('hax_auto_rec', isAutoRecEnabled);
            }
        });
    }

    function checkAndInjectHeader() {
        if (document.getElementById('vexa-hdr-right')) return true;
        const nativeHeader = document.querySelector('.header') || document.querySelector('header') || document.querySelector('#header');
        if (nativeHeader) {
            hijackNativeHeader(nativeHeader);
            return true;
        }
        return false;
    }

    // 0ms Anlık enjeksiyon
    checkAndInjectHeader();

    // DOM değiştikçe (HaxBall ekran geçişlerinde) 0ms içinde header'ı yeniden bağla
    if (document.documentElement) {
        const headerObs = new MutationObserver(() => {
            checkAndInjectHeader();
        });
        headerObs.observe(document.documentElement, { childList: true, subtree: true });
    }

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
            minHeight: '48px',
            maxHeight: '48px',
            boxSizing: 'border-box',
            background: '#111214',
            borderBottom: '1px solid #222426',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            fontFamily: 'Inter, Tahoma, Arial, sans-serif',
            WebkitAppRegion: 'drag',
            userSelect: 'none',
            overflow: 'hidden'
        });

        // --- SOL: Orijinal Tarz Başlık ve Sosyal Butonlar ---
        const leftWrapper = document.createElement('div');
        leftWrapper.style.cssText = 'display:flex; align-items:center; flex-shrink:0; min-width:245px; gap:12px; -webkit-app-region:no-drag;';

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<span style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; margin-right:10px; border-radius:6px; background:#181a1e; border:1px solid #282b31;"><img src="file:///c:/Vexa/inject/logo.png" style="width:20px; height:20px; object-fit:contain;"></span><span style="display:flex; flex-direction:column; line-height:1.05;"><span style="color:#e6eaf0; font-size:16px; font-weight:800;">Vexa</span><span style="color:#5c6370; font-size:10px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase;">Client</span></span>';
        titleDiv.style.cssText = 'cursor:pointer; white-space:nowrap; display:flex; align-items:center;';
        titleDiv.onclick = () => window.location.href = 'https://www.haxball.com/play'; 

        const socialsDiv = document.createElement('div');
        socialsDiv.style.cssText = 'display:flex; align-items:center; gap:6px; border-left:1px solid #222426; padding-left:12px;';

        const discordIconBtn = document.createElement('a');
        discordIconBtn.href = "https://discord.gg/vexa";
        discordIconBtn.target = "_blank";
        discordIconBtn.title = "Vexa Discord";
        discordIconBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 127.14 96.36"><path fill="currentColor" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.49,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.49,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.13,65.69,84.73,65.69Z"/></svg>';
        discordIconBtn.style.cssText = "display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:6px; background:#1a1c20; color:#5865F2; border:1px solid #2d3035; transition:0.2s; cursor:pointer;";
        discordIconBtn.onmouseover = () => { discordIconBtn.style.background = '#22252b'; discordIconBtn.style.borderColor = '#3d4149'; discordIconBtn.style.transform = 'translateY(-1px)'; };
        discordIconBtn.onmouseout = () => { discordIconBtn.style.background = '#1a1c20'; discordIconBtn.style.borderColor = '#2d3035'; discordIconBtn.style.transform = 'translateY(0)'; };
        discordIconBtn.onclick = (e) => {
            e.preventDefault();
            if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal("https://discord.gg/vexa");
            } else {
                window.open("https://discord.gg/vexa", "_blank");
            }
        };

        const websiteIconBtn = document.createElement('a');
        websiteIconBtn.href = "https://vexaclient.com";
        websiteIconBtn.target = "_blank";
        websiteIconBtn.title = "Vexa Web Site";
        websiteIconBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
        websiteIconBtn.style.cssText = "display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:6px; background:#1a1c20; color:${ACCENT}; border:1px solid #2d3035; transition:0.2s; cursor:pointer;";
        websiteIconBtn.onmouseover = () => { websiteIconBtn.style.background = '#22252b'; websiteIconBtn.style.borderColor = '#3d4149'; websiteIconBtn.style.transform = 'translateY(-1px)'; };
        websiteIconBtn.onmouseout = () => { websiteIconBtn.style.background = '#1a1c20'; websiteIconBtn.style.borderColor = '#2d3035'; websiteIconBtn.style.transform = 'translateY(0)'; };
        websiteIconBtn.onclick = (e) => {
            e.preventDefault();
            if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal("https://vexaclient.com");
            } else {
                window.open("https://vexaclient.com", "_blank");
            }
        };

        socialsDiv.appendChild(discordIconBtn);
        socialsDiv.appendChild(websiteIconBtn);
        leftWrapper.appendChild(titleDiv);
        leftWrapper.appendChild(socialsDiv);

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
        joinBtn.id = 'vexa-join-btn';
        joinBtn.style.cssText = "background:#10b981 !important; color:#06110d !important; border:1px solid #17d59a !important; border-radius:6px; padding:8px 18px; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; transition:background 0.15s, color 0.15s;";
        joinBtn.onmouseover = () => { joinBtn.style.background = '#059669'; };
        joinBtn.onmouseout = () => { joinBtn.style.background = '#10b981'; };
        
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
        replayBtn.id = "vexa-replay-btn";
        replayBtn.style.cssText = "background:#1a1c20 !important; color:#8b949e !important; border:1px solid #2d3035 !important; border-radius:6px; padding:8px 13px; font-size:12px; font-weight:700; cursor:pointer; transition:color 0.15s, background 0.15s; white-space:nowrap; margin-right:4px; display:flex; align-items:center;";
        replayBtn.onmouseover = () => { replayBtn.style.color = '#c9d1d9'; replayBtn.style.background = '#22252b'; replayBtn.style.borderColor = '#3d4149'; };
        replayBtn.onmouseout = () => { replayBtn.style.color = '#8b949e'; replayBtn.style.background = '#1a1c20'; replayBtn.style.borderColor = '#2d3035'; };
        if (window.location.pathname.includes('/replay')) {
            replayBtn.innerHTML = '📂 <span style="margin-left:3px;">Dosya Aç</span>';
            replayBtn.onclick = () => {
                const iframe = document.getElementById('gameframe');
                if (iframe && iframe.contentDocument) {
                    const fileInput = iframe.contentDocument.querySelector('input[type="file"]');
                    if (fileInput) fileInput.click();
                }
            };
        } else {
            replayBtn.innerHTML = '🎬 <span style="margin-left:3px;">Replays</span>';
            replayBtn.onclick = () => {
                if (window.electronAPI && window.electronAPI.openReplayViewer) {
                    window.electronAPI.openReplayViewer();
                }
            };
        }

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

        headerElement.appendChild(leftWrapper);
        headerElement.appendChild(centerWrapper);
        headerElement.appendChild(rightWrapper);
        
        // --- API: Menüden barı kontrol etmek için ---
        window.vexaHeader = {
            toggleSearchBar: (visible) => {
                centerWrapper.style.display = visible ? 'flex' : 'none';
            }
        };

        // Alt Bilgi (Watermarks) + Gizle Butonu
        const watermarkContainer = document.createElement('div');
        watermarkContainer.style.cssText = "position:fixed; bottom:0; left:0; width:100%; display:flex; justify-content:space-between; align-items:center; padding:8px 14px; box-sizing:border-box; z-index:9999; font-family:Tahoma, Arial, sans-serif; pointer-events:none;";
        
        // Sol Alt: Sürüm
        const versionSpan = document.createElement('span');
        versionSpan.style.cssText = "color:rgba(255,255,255,0.25); font-size:11px; font-weight:bold; letter-spacing:0.5px; pointer-events:none;";
        versionSpan.innerText = "v0.0.0";
        if (window.electronAPI && window.electronAPI.getVersion) {
            window.electronAPI.getVersion().then(v => versionSpan.innerText = "v" + v).catch(()=>{});
        }
        
        // Sağ Alt: Yapımcı
        const creatorSpan = document.createElement('span');
        creatorSpan.style.cssText = "color:rgba(255,255,255,0.25); font-size:11px; font-weight:bold; letter-spacing:0.5px; pointer-events:none;";
        creatorSpan.innerText = "Created by Vexa";
        
        watermarkContainer.appendChild(versionSpan);
        watermarkContainer.appendChild(creatorSpan);
        document.body.appendChild(watermarkContainer);

        // Reklam Saklayıcı
        const style = document.createElement('style');
        style.innerHTML = "iframe[src*='cpmstar'] { display: none !important; opacity: 0 !important; } div[id*='ad'] { display: none !important; opacity: 0 !important; }";
        document.head.appendChild(style);
    }


    // Expose openVexaSettings globally
    // ==========================================
    // 2. Özel Vexa Stilleri (Menü ve Ayarlar)
    // ==========================================
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        body, button, input, select, textarea, #vexa-header, #haxclient-settings-modal {
            font-family: 'Inter', Tahoma, Arial, sans-serif;
        }

        /* Modern Thinner Scrollbar */
    `;
    document.head.appendChild(styleTag);

    window.openVexaSettings = (tab) => openSettingsModal(tab);

    // ==========================================
    // 3. Ayarlar Modal'ı ve Aç-Kapa (Toggle) Sistemi
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
            width: '780px', maxWidth: 'calc(100vw - 32px)', height: '540px', maxHeight: 'calc(100vh - 48px)',
            display: 'flex', flexDirection: 'row', overflow: 'hidden', boxSizing: 'border-box',
            background: '#151619',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.55)', padding: '0', color: '#d1d5db', borderRadius: '10px',
            transform: 'scale(0.94)', transition: 'transform 0.2s ease, opacity 0.2s ease', opacity: '0'
        });

        modalBox.innerHTML = `
            <!-- Left Sidebar -->
            <div style="width:155px; background:#0d0f12; border-right:1px solid rgba(255,255,255,0.05); padding:20px 10px 16px; display:flex; flex-direction:column; box-sizing:border-box; flex-shrink:0;">
                <div style="margin-bottom:20px; padding:0 8px; flex-shrink:0;">
                    <div style="font-weight:900; color:${ACCENT}; font-size:14px; letter-spacing:2px; line-height:1.2;">VEXA</div>
                    <div style="font-weight:600; color:#374151; font-size:9px; letter-spacing:2.5px; margin-top:2px;">SETTINGS</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                    <div class="vexa-section-label">Genel</div>
                    <button id="set-tab-general-btn" style="background:transparent; border:none; color:#8b949e; padding:8px 10px; border-radius:6px; text-align:left; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:8px; outline:none; width:100%; box-sizing:border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        <span>Genel</span>
                    </button>
                    <button id="set-tab-perf-btn" style="background:transparent; border:none; color:#8b949e; padding:8px 10px; border-radius:6px; text-align:left; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:8px; outline:none; width:100%; box-sizing:border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline></svg>
                        <span>Performans</span>
                    </button>
                    <div class="vexa-section-label">Kişiselleştir</div>
                    <button id="set-tab-avatar-btn" style="background:transparent; border:none; color:#8b949e; padding:8px 10px; border-radius:6px; text-align:left; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:8px; outline:none; width:100%; box-sizing:border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Avatar</span>
                    </button>
                    <button id="set-tab-bg-btn" style="background:transparent; border:none; color:#8b949e; padding:8px 10px; border-radius:6px; text-align:left; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:8px; outline:none; width:100%; box-sizing:border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span>Arka Plan</span>
                    </button>
                    <div class="vexa-section-label">Kontroller</div>
                    <button id="set-tab-shortcuts-btn" style="background:transparent; border:none; color:#8b949e; padding:8px 10px; border-radius:6px; text-align:left; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:8px; outline:none; width:100%; box-sizing:border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                        <span>Kısayollar</span>
                    </button>
                    <div class="vexa-section-label">Sistem</div>
                    <button id="set-tab-about-btn" style="background:transparent; border:none; color:#8b949e; padding:8px 10px; border-radius:6px; text-align:left; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:8px; outline:none; width:100%; box-sizing:border-box;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>Hakkında</span>
                    </button>
                </div>
            </div>

            <!-- Right Content Container -->
            <div style="flex:1; background:#151619; display:flex; flex-direction:column; padding:20px 20px 16px 20px; box-sizing:border-box; overflow:hidden;">
                <!-- Right Header -->
                <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:14px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05); flex-shrink:0;">
                    <h2 id="vexa-tab-title" style="margin:0; font-size:13px; color:#9ca3af; font-weight:700; font-family:Tahoma, Arial, sans-serif; text-transform:uppercase; letter-spacing:1px;">Genel Ayarlar</h2>
                    <button id="close-modal-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.07); border-radius:6px; color:#6b7280; cursor:pointer; font-size:14px; width:26px; height:26px; transition:0.2s; display:inline-flex; align-items:center; justify-content:center; padding:0; line-height:1; outline:none;">✕</button>
                </div>

                <!-- Right Scrollable Content Wrapper -->
                <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">

            <!-- TAB 1: GENERAL SETTINGS -->
            <div id="set-tab-general-content" style="display:block; flex:1; overflow-y:auto; padding-right:6px; padding-bottom:8px; margin-bottom:12px; box-sizing:border-box;">
                <div class="vexa-panel-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">Discord RPC</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Discord'da durum bilgisini göster.</div>
                    </div>
                    <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-rpc-wrapper">
                        <div id="rpc-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_discord_rpc') !== 'false' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="rpc-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_discord_rpc') !== 'false' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                    </div>
                </div>

                <div class="vexa-panel-card" style="margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
                        <div style="min-width:0;">
                            <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">🎵 Müzik Widget</div>
                            <div style="color:#6b7280; font-size:11px; line-height:1.4;">Şu an çalan müziği ve kontrolleri göster.</div>
                        </div>
                        <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-music-wrapper">
                            <div id="music-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_music_widget') !== 'false' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                            <div id="music-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_music_widget') !== 'false' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                        </div>
                    </div>
                    
                    <div id="music-options-container" style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05); display:${localStorage.getItem('hax_music_widget') !== 'false' ? 'block' : 'none'};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#9ca3af; font-size:11px; font-weight:600;">Görünüm Stili</span>
                            <select id="inp-music-style" style="width:150px;">
                                <option value="full" ${localStorage.getItem('hax_music_style') !== 'mini' ? 'selected' : ''}>Full (İsim + Kontroller)</option>
                                <option value="mini" ${localStorage.getItem('hax_music_style') === 'mini' ? 'selected' : ''}>Mini (Sadece İsim)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="vexa-panel-card" style="margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
                        <div style="min-width:0;">
                            <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">⌨️ Tuş Göstergesi</div>
                            <div style="color:#6b7280; font-size:11px; line-height:1.4;">Ekranda WASD+Space (veya yön tuşları) durumunu gösterir.</div>
                        </div>
                        <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-keys-wrapper">
                            <div id="keys-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_keystrokes_widget') !== 'false' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                            <div id="keys-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_keystrokes_widget') !== 'false' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                        </div>
                    </div>
                </div>

                <div class="vexa-panel-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">🎯 HUD Düzenleyici</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Widget'ların konumunu, boyutunu ve opaklığını sürükle-bırak ile ayarla.</div>
                    </div>
                    <button id="open-hud-editor-btn" style="background:rgba(16,185,129,0.12); color:${ACCENT}; border:1px solid rgba(16,185,129,0.25); padding:7px 14px; border-radius:7px; font-weight:700; cursor:pointer; font-size:11px; transition:0.2s; white-space:nowrap; outline:none; letter-spacing:0.3px;" onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.12)'">Düzenle →</button>
                </div>

                <div class="vexa-panel-card" style="margin-bottom:10px;">
                    <div style="margin-bottom:12px;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">🎨 Tema Rengi</div>
                        <div style="color:#6b7280; font-size:11px;">Arayüz vurgu rengini seçin.</div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                        ${['#10b981', '#3b82f6', '#f43f5e', '#a855f7', '#f59e0b', '#0ea5e9'].map(c => `
                            <div class="vexa-color-swatch" data-color="${c}" style="width:26px; height:26px; border-radius:50%; background-color:${c}; cursor:pointer; outline:${ACCENT === c ? '2px solid #fff' : '2px solid transparent'}; outline-offset:3px; transition:0.2s; box-shadow:0 2px 6px ${c}40;"></div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- TAB 1B: PERFORMANCE SETTINGS -->
            <div id="set-tab-perf-content" style="display:none; flex:1; overflow-y:auto; padding-right:6px; padding-bottom:8px; margin-bottom:12px; box-sizing:border-box;">
                <div class="vexa-panel-card" style="margin-bottom:10px;">
                    <div style="margin-bottom:12px;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">⚡ FPS Limiti</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Hedef FPS değerini seç. Sınırsız maksimum performansı verir. <span style="color:#f59e0b;">(Yenileme gerektirir)</span></div>
                    </div>
                    <div id="fps-cap-buttons" style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${['Kapalı','120','144','240','Sınırsız'].map(v => {
                            const stored = localStorage.getItem('hax_fps_cap') || 'Sınırsız';
                            const isActive = stored === v;
                            return '<button id="fps-cap-btn-' + v + '" data-cap="' + v + '" style="flex:1; min-width:52px; padding:6px 4px; border-radius:7px; border:1.5px solid ' + (isActive ? ACCENT : 'rgba(255,255,255,0.08)') + '; background:' + (isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)') + '; color:' + (isActive ? ACCENT : '#6b7280') + '; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s;">' + v + '</button>';
                        }).join('')}
                    </div>
                </div>

                <div class="vexa-panel-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">FPS Göstergesi</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Ekranda anlık FPS ve Ping sayacını göster.</div>
                    </div>
                    <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-fps-show-wrapper">
                        <div id="fps-show-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_fps_show') !== 'false' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="fps-show-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_fps_show') !== 'false' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                    </div>
                </div>

                <div class="vexa-panel-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">Ping Booster</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Girdi gecikmesini azaltır ve WebGL'yi optimize eder. <span style="color:#f59e0b;">(Yenileme gerektirir)</span></div>
                    </div>
                    <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-ping-wrapper">
                        <div id="ping-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_ping_booster') === 'true' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="ping-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_ping_booster') === 'true' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                    </div>
                </div>

                <div class="vexa-panel-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">İnce Saha Çizgileri</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Çizgileri 1px'e indirerek sahayı sadeleştirir.</div>
                    </div>
                    <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-thin-lines-wrapper">
                        <div id="thin-lines-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_thin_lines') === 'true' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="thin-lines-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_thin_lines') === 'true' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                    </div>
                </div>

                <div class="vexa-panel-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">🔴 Auto REC</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Maç başladığında kaydı otomatik başlatır ve bitirir.</div>
                        <div style="color:#4b5563; font-size:10px; margin-top:3px;">İndirilenler / Vexa Recordings</div>
                    </div>
                    <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-auto-rec-wrapper">
                        <div id="auto-rec-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${localStorage.getItem('hax_auto_rec') !== 'false' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="auto-rec-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${localStorage.getItem('hax_auto_rec') !== 'false' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: AVATAR SETTINGS -->
            <div id="set-tab-avatar-content" style="display:none; flex:1; overflow-y:auto; padding-right:6px; padding-bottom:8px; margin-bottom:12px; box-sizing:border-box;">
                <!-- Döngü Animasyonu Toggle -->
                <div class="vexa-panel-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px;">Döngü Animasyonu</div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Avatarı belirli kareler arasında döngüsel olarak değiştirir.</div>
                    </div>
                    <div style="position:relative; width:42px; height:22px; flex-shrink:0; cursor:pointer;" id="toggle-anim-wrapper">
                        <div id="anim-slider" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${animConfig.enabled ? ACCENT : '#2a2d33'}; border-radius:24px; transition:0.3s;"></div>
                        <div id="anim-knob" style="position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:${animConfig.enabled ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
                    </div>
                </div>

                <!-- Hazır Şablonlar -->
                <div class="vexa-panel-card" style="margin-bottom:15px;">
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
                <div class="vexa-panel-card" id="custom-frames-wrapper" style="margin-bottom:15px; display:${animConfig.preset === 'custom' ? 'block' : 'none'};">
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
                <div class="vexa-panel-card" style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="color:#eee; font-size:14px; font-weight:bold;">Geçiş Hızı (Kare Süresi)</div>
                        <span id="speed-val" style="font-size:14px; font-weight:bold; color:${ACCENT};">${animConfig.speed} ms</span>
                    </div>
                    <input type="range" id="inp-speed" min="250" max="5000" step="50" value="${animConfig.speed}" style="width:100%; accent-color:${ACCENT}; cursor:pointer; margin-bottom:8px;">
                    <div style="font-size:10px; color:#f59e0b; line-height:1.4; display:flex; gap:4px; align-items:flex-start;">
                        <span style="font-weight:bold;">⚠️</span>
                        <span>Engellemeye (flood) takılmamak için 1000ms ve üzeri hızlar önerilir. Minimum: 250ms.</span>
                    </div>
                </div>
            </div>

            <!-- TAB 3: SHORTCUTS -->
            <div id="set-tab-shortcuts-content" style="display:none; flex:1; overflow-y:auto; padding-right:8px; padding-bottom:12px; margin-bottom:14px; box-sizing:border-box;">

                <div style="background:#111318; padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.07); box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);">
                    <div style="font-size:11px; color:#9ca3af; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
                        <span>Boşluk veya Enter'a bastığınızda otomatik genişletilir.</span>
                        <span id="shortcuts-count-badge" style="font-size:10px; color:${ACCENT}; font-weight:bold; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:12px;">0 / 20</span>
                    </div>
                    <!-- Dynamic container -->
                    <div id="shortcuts-list-container" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
                        <!-- Rows injected here -->
                    </div>
                    <!-- Add Button -->
                    <div style="text-align:left;">
                        <button id="add-shortcut-btn" style="background:rgba(16,185,129,0.1); color:${ACCENT}; border:1px solid rgba(16,185,129,0.2); padding:8px 16px; font-size:12px; font-weight:bold; cursor:pointer; border-radius:6px; transition:0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'">+ Yeni Kısayol Ekle</button>
                    </div>
                </div>
            </div>

            <!-- TAB 4: BACKGROUNDS -->
            <div id="set-tab-bg-content" style="display:none; flex:1; overflow-y:auto; padding-right:8px; padding-bottom:12px; margin-bottom:14px; box-sizing:border-box;">
                <div style="background:#111318; padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.07); box-shadow:inset 0 1px 0 rgba(255,255,255,0.03); margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div>
                            <div style="color:#eee; font-size:14px; font-weight:bold; margin-bottom:4px;">Özel Arka Plan</div>
                            <div id="hax-bg-tab-status" style="color:${ACCENT}; font-size:11px; font-style:italic;">Pasif (Varsayılan)</div>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <input type="file" id="hax-bg-tab-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;">
                            <button id="hax-bg-tab-upload-btn" style="background:${ACCENT}; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background=ACCENT">Dosya Seç</button>
                            <button id="hax-bg-tab-reset-btn" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); padding:8px 16px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer; transition:0.2s; display:none;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">Sıfırla</button>
                        </div>
                    </div>
                    <div style="color:#6b7280; font-size:11px;">Sadece statik resim (.png, .jpg, .webp) yükleyebilirsiniz.</div>
                </div>

                <div style="background:#111318; padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.07); box-shadow:inset 0 1px 0 rgba(255,255,255,0.03); margin-bottom:15px;">
                    <div style="color:#eee; font-size:13px; font-weight:bold; margin-bottom:12px;">Hazır Arka Planlar</div>
                    <div id="hax-bg-system-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; min-height:74px;"></div>
                </div>

                <div style="background:#111318; padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.07); box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);">
                    <div style="color:#eee; font-size:13px; font-weight:bold; margin-bottom:12px;">Yüklenen Geçmişi</div>
                    <div id="hax-bg-history-grid" style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; min-height:60px;"></div>
                </div>
            </div>

            <!-- TAB 5: ABOUT & DATA -->
            <div id="set-tab-about-content" style="display:none; flex:1; overflow-y:auto; padding-right:6px; padding-bottom:8px; margin-bottom:12px; box-sizing:border-box;">
                <!-- Brand Hero Card -->
                <div class="vexa-panel-card" style="margin-bottom:12px; padding:18px 20px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="width:42px; height:42px; border-radius:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        <div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-weight:900; font-size:16px; color:#ffffff; letter-spacing:1px;">VEXA CLIENT</span>
                                <span id="vexa-about-version-display" style="font-size:11px; font-weight:700; color:${ACCENT}; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:6px;">v18.2.0</span>
                            </div>
                            <div style="color:#6b7280; font-size:11.5px; margin-top:3px;">Özel HaxBall Masaüstü İstemcisi</div>
                        </div>
                    </div>
                </div>

                <!-- Badge Toggle Card -->
                <div class="vexa-panel-card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px; display:flex; align-items:center; gap:6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            <span>Vexa Client Rozeti</span>
                        </div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Oda oyuncu listesinde ve sohbette nickinizin yanında özel Vexa rozetini gösterir.</div>
                    </div>
                    <div id="toggle-badge-wrapper" style="position:relative; width:44px; height:24px; min-width:44px; flex-shrink:0; cursor:pointer; background:${localStorage.getItem('hax_vexa_badge') !== 'false' ? ACCENT : '#2a2d33'}; border-radius:24px; transition:background 0.25s;">
                        <div id="badge-knob" style="position:absolute; height:18px; width:18px; left:3px; top:3px; background:#ffffff; border-radius:50%; transition:transform 0.25s; transform:${localStorage.getItem('hax_vexa_badge') !== 'false' ? 'translateX(20px)' : 'translateX(0)'}; box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>
                    </div>
                </div>

                <!-- 1. Sadece Önbellek Temizleme -->
                <div class="vexa-panel-card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px; display:flex; align-items:center; gap:6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                            <span>Önbelleği Sıfırla</span>
                        </div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">Yalnızca istemci ve oturum önbelleğini temizler. Kayıtlı profillerinize, nickinize ve hesaplarınıza dokunmaz.</div>
                    </div>
                    <button id="clear-cache-only-btn" style="background:rgba(255,255,255,0.05); color:#ffffff; border:1px solid rgba(255,255,255,0.12); padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:11.5px; transition:0.2s; white-space:nowrap; outline:none;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='var(--vexa-accent)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.12)'">Önbelleği Sıfırla</button>
                </div>

                <!-- 2. Tüm Verileri Kökten Silme (Fabrika Ayarları) -->
                <div class="vexa-panel-card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:16px;">
                    <div style="min-width:0;">
                        <div style="color:#e5e7eb; font-size:13px; font-weight:700; margin-bottom:3px; display:flex; align-items:center; gap:6px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            <span>Tüm Verileri Sil (Fabrika Ayarları)</span>
                        </div>
                        <div style="color:#6b7280; font-size:11px; line-height:1.4;">İstemcinin kaydettiği TÜM profilleri, özel ayarları, arka planları ve verileri kökünden siler.</div>
                    </div>
                    <button id="reset-all-data-btn" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.25); padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:11.5px; transition:0.2s; white-space:nowrap; outline:none;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">Tüm Verileri Sil</button>
                </div>
            </div>

                <!-- Right Footer (Save Button) -->
                <div style="display:flex; justify-content:flex-end; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; flex-shrink:0; gap:8px;">
                    <button id="save-modal-btn" style="background:${ACCENT}; color:#fff; border:none; padding:8px 22px; font-size:12px; font-weight:700; cursor:pointer; border-radius:8px; transition:0.15s; letter-spacing:0.5px;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Kaydet & Kapat</button>
                </div>
            </div>
        `;

        const styleTag = document.createElement('style');
        styleTag.id = 'haxclient-scrollbar-style';
        styleTag.innerHTML = `
            #haxclient-settings-modal *::-webkit-scrollbar {
                width: 4px !important;
                height: 4px !important;
            }
            #haxclient-settings-modal *::-webkit-scrollbar-track {
                background: transparent !important;
            }
            #haxclient-settings-modal *::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 10px !important;
                transition: background 0.2s !important;
            }
            #haxclient-settings-modal *::-webkit-scrollbar-thumb:hover {
                background: ${ACCENT} !important;
            }
            #haxclient-settings-modal .vexa-panel-card {
                background: rgba(255,255,255,0.03) !important;
                border: 1px solid rgba(255,255,255,0.06) !important;
                border-radius: 10px !important;
                padding: 14px 16px !important;
                box-sizing: border-box !important;
                transition: border-color 0.2s !important;
            }
            #haxclient-settings-modal .vexa-panel-card:hover {
                border-color: rgba(255,255,255,0.1) !important;
            }
            #haxclient-settings-modal button[id^="set-tab-"] {
                background: transparent;
                color: #6b7280;
                font-weight: 600;
                font-size: 12px;
                letter-spacing: 0.2px;
                transition: background 0.15s, color 0.15s;
            }
            #haxclient-settings-modal button[id^="set-tab-"]:hover {
                background: rgba(255, 255, 255, 0.04) !important;
                color: #d1d5db !important;
            }
            #haxclient-settings-modal button[id^="set-tab-"].active {
                background: rgba(16, 185, 129, 0.12) !important;
                color: ${ACCENT} !important;
                font-weight: 700 !important;
            }
            #haxclient-settings-modal .vexa-section-label {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: #4b5563;
                padding: 0 8px;
                margin-bottom: 6px;
                margin-top: 12px;
            }
            #haxclient-settings-modal .vexa-section-label:first-child {
                margin-top: 0;
            }
            #haxclient-settings-modal select {
                background: #0d0f12 !important;
                color: #d1d5db !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                padding: 5px 8px !important;
                font-size: 12px !important;
                outline: none !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                transition: border-color 0.2s !important;
            }
            #haxclient-settings-modal select:hover, #haxclient-settings-modal select:focus {
                border-color: rgba(255,255,255,0.2) !important;
            }
            #haxclient-settings-modal input[type="range"] {
                accent-color: ${ACCENT} !important;
            }
        `;
        document.head.appendChild(styleTag);

        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);


        // Standardize all input/select/button border-radius to 6px
        modalBox.querySelectorAll('input, select').forEach((field) => {
            field.style.borderRadius = '6px';
        });
        modalBox.querySelectorAll('button').forEach((btn) => {
            if (!btn.id) return;
            btn.style.borderRadius = '8px';
        });

        // Close button hover effect
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn) {
            closeBtn.style.transition = '0.2s';
            closeBtn.onmouseover = () => { closeBtn.style.background = '#ef4444'; closeBtn.style.color = '#fff'; closeBtn.style.borderColor = '#ef4444'; };
            closeBtn.onmouseout = () => { closeBtn.style.background = '#1a1c20'; closeBtn.style.color = '#9ca3af'; closeBtn.style.borderColor = 'rgba(255,255,255,0.06)'; };
        }

        const saveBtn = document.getElementById('save-modal-btn');
        if (saveBtn) {
            saveBtn.style.borderRadius = '8px';
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
            setTimeout(() => {
                modalOverlay.remove();
                const scrollbarStyle = document.getElementById('haxclient-scrollbar-style');
                if (scrollbarStyle) scrollbarStyle.remove();
            }, 200);
        };

        // Interaction Codes
        document.getElementById('close-modal-btn').onclick = closeModal;
        
        let switchFps = localStorage.getItem('hax_fps_limit') !== 'false';
        let switchFpsShow = localStorage.getItem('hax_fps_show') !== 'false';
        let switchRpc = localStorage.getItem('hax_discord_rpc') !== 'false';
        let switchPing = localStorage.getItem('hax_ping_booster') === 'true';
        let switchLowGraphics = localStorage.getItem('hax_low_graphics') === 'true';
        let switchPerfBg = localStorage.getItem('hax_perf_bg') === 'true';
        let switchThinLines = localStorage.getItem('hax_thin_lines') === 'true';
        let switchAutoRec = localStorage.getItem('hax_auto_rec') !== 'false';
        let switchAnim = animConfig.enabled;

        // Tab selection logic
        const tabGenBtn = document.getElementById('set-tab-general-btn');
        const tabPerfBtn = document.getElementById('set-tab-perf-btn');
        const tabAvBtn = document.getElementById('set-tab-avatar-btn');
        const tabShortcutsBtn = document.getElementById('set-tab-shortcuts-btn');
        const tabBgBtn = document.getElementById('set-tab-bg-btn');
        const tabAboutBtn = document.getElementById('set-tab-about-btn');
        const tabGenContent = document.getElementById('set-tab-general-content');
        const tabPerfContent = document.getElementById('set-tab-perf-content');
        const tabAvContent = document.getElementById('set-tab-avatar-content');
        const tabShortcutsContent = document.getElementById('set-tab-shortcuts-content');
        const tabBgContent = document.getElementById('set-tab-bg-content');
        const tabAboutContent = document.getElementById('set-tab-about-content');

        const allTabBtns = [tabGenBtn, tabPerfBtn, tabAvBtn, tabShortcutsBtn, tabBgBtn, tabAboutBtn];
        const allTabContents = [tabGenContent, tabPerfContent, tabAvContent, tabShortcutsContent, tabBgContent, tabAboutContent];

        function activateTab(activeBtn, activeContent) {
            allTabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = '';
                b.style.color = '';
                b.style.fontWeight = '';
            });
            allTabContents.forEach(c => { c.style.display = 'none'; });
            activeBtn.classList.add('active');
            activeContent.style.display = 'block';

            const tabTitle = document.getElementById('vexa-tab-title');
            if (tabTitle) {
                if (activeBtn.id === 'set-tab-general-btn') tabTitle.innerText = 'Genel Ayarlar';
                if (activeBtn.id === 'set-tab-perf-btn') tabTitle.innerText = 'Performans Ayarları';
                if (activeBtn.id === 'set-tab-avatar-btn') tabTitle.innerText = 'Avatar Ayarları';
                if (activeBtn.id === 'set-tab-shortcuts-btn') tabTitle.innerText = 'Sohbet Kısayolları';
                if (activeBtn.id === 'set-tab-bg-btn') tabTitle.innerText = 'Arka Plan Seçenekleri';
                if (activeBtn.id === 'set-tab-about-btn') tabTitle.innerText = 'Hakkında & Veri';
            }
        }

        tabGenBtn.onclick = () => activateTab(tabGenBtn, tabGenContent);
        tabPerfBtn.onclick = () => activateTab(tabPerfBtn, tabPerfContent);
        tabAvBtn.onclick = () => activateTab(tabAvBtn, tabAvContent);
        tabShortcutsBtn.onclick = () => { activateTab(tabShortcutsBtn, tabShortcutsContent); tabShortcutsContent.scrollTop = 0; };
        tabBgBtn.onclick = () => { activateTab(tabBgBtn, tabBgContent); renderBgSystemPresets(); renderBgHistory(); };
        tabAboutBtn.onclick = () => activateTab(tabAboutBtn, tabAboutContent);
        
        // 1. Sadece Önbelleği Sıfırla (Hesaplar ve Profiller Korunur)
        const clearCacheOnlyBtn = document.getElementById('clear-cache-only-btn');
        if (clearCacheOnlyBtn) {
            clearCacheOnlyBtn.onclick = async () => {
                if (confirm('İstemci ve oturum önbelleği temizlenecek. Kayıtlı profilleriniz ve hesap bilgileriniz KORUNACAK. Devam etmek istiyor musunuz?')) {
                    try {
                        sessionStorage.clear();
                        localStorage.removeItem('vexa_cache_version');
                        if (window.electronAPI && window.electronAPI.clearCache) {
                            await window.electronAPI.clearCache();
                        }
                        alert('Önbellek başarıyla temizlendi! Uygulama yenilenecek.');
                        window.location.reload();
                    } catch(e) {
                        console.error('Clear cache error:', e);
                        window.location.reload();
                    }
                }
            };
        }

        // 2. Tüm Verileri Sil (Kökten Fabrika Ayarları)
        const resetAllDataBtn = document.getElementById('reset-all-data-btn');
        if (resetAllDataBtn) {
            resetAllDataBtn.onclick = async () => {
                if (confirm('DİKKAT: İstemcinin kaydettiği TÜM profiller, özel ayarlar, arka planlar, önbellek ve veriler kökünden sıfırlanacak. Devam etmek istiyor musunuz?')) {
                    try {
                        localStorage.clear();
                        sessionStorage.clear();
                        if (window.electronAPI && window.electronAPI.factoryReset) {
                            await window.electronAPI.factoryReset();
                        }
                        alert('Tüm veriler kökünden sıfırlandı! İstemci fabrika ayarlarına döndürülerek yeniden başlatılıyor.');
                        if (window.electronAPI && window.electronAPI.restartApp) {
                            window.electronAPI.restartApp();
                        } else {
                            window.location.reload();
                        }
                    } catch(e) {
                        console.error('Reset error:', e);
                        window.location.reload();
                    }
                }
            };
        }

        if (window.electronAPI && window.electronAPI.getVersion) {
            window.electronAPI.getVersion().then(v => {
                const verEl = document.getElementById('vexa-about-version-display');
                if (verEl) verEl.innerText = 'v' + v;
            }).catch(()=>{});
        }

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

        // Color Swatches
        document.querySelectorAll('.vexa-color-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                const color = sw.dataset.color;
                if (color) applyAccentColor(color);
            });
        });

        // FPS Cap Buttons
        let selectedFpsCap = localStorage.getItem('hax_fps_cap') || 'Sınırsız';
        const fpsCapsContainer = document.getElementById('fps-cap-buttons');
        if (fpsCapsContainer) {
            fpsCapsContainer.querySelectorAll('button[data-cap]').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectedFpsCap = btn.dataset.cap;
                    fpsCapsContainer.querySelectorAll('button[data-cap]').forEach(b => {
                        const active = b.dataset.cap === selectedFpsCap;
                        b.style.borderColor = active ? ACCENT : '#3a3d43';
                        b.style.background = active ? 'rgba(16,185,129,0.15)' : '#23262b';
                        b.style.color = active ? ACCENT : '#aaa';
                    });
                });
            });
        }

        // FPS Show Toggle
        const fpsShowSlider = document.getElementById('fps-show-slider');
        const fpsShowKnob = document.getElementById('fps-show-knob');
        document.getElementById('toggle-fps-show-wrapper').onclick = () => {
            switchFpsShow = !switchFpsShow;
            fpsShowSlider.style.backgroundColor = switchFpsShow ? ACCENT : '#2d3035';
            fpsShowKnob.style.transform = switchFpsShow ? 'translateX(22px)' : 'translateX(0)';
        };

        // RPC Toggle
        const rpcSlider = document.getElementById('rpc-slider');
        const rpcKnob = document.getElementById('rpc-knob');
        document.getElementById('toggle-rpc-wrapper').onclick = () => {
            switchRpc = !switchRpc;
            rpcSlider.style.backgroundColor = switchRpc ? ACCENT : '#2d3035';
            rpcKnob.style.transform = switchRpc ? 'translateX(22px)' : 'translateX(0)';
        };

        // Ping Booster Toggle
        const pingSlider = document.getElementById('ping-slider');
        const pingKnob = document.getElementById('ping-knob');
        document.getElementById('toggle-ping-wrapper').onclick = () => {
            switchPing = !switchPing;
            pingSlider.style.backgroundColor = switchPing ? ACCENT : '#2d3035';
            pingKnob.style.transform = switchPing ? 'translateX(22px)' : 'translateX(0)';
        };


        // İnce Saha Çizgileri Toggle (Anında Uygulanır)
        const thinLinesSlider = document.getElementById('thin-lines-slider');
        const thinLinesKnob = document.getElementById('thin-lines-knob');
        document.getElementById('toggle-thin-lines-wrapper').onclick = () => {
            switchThinLines = !switchThinLines;
            thinLinesSlider.style.backgroundColor = switchThinLines ? ACCENT : '#2d3035';
            thinLinesKnob.style.transform = switchThinLines ? 'translateX(22px)' : 'translateX(0)';
            // Anında uygula
            localStorage.setItem('hax_thin_lines', switchThinLines);
        };

        // Otomatik Maç Kaydedici (Auto REC) Toggle
        const autoRecSlider = document.getElementById('auto-rec-slider');
        const autoRecKnob = document.getElementById('auto-rec-knob');
        document.getElementById('toggle-auto-rec-wrapper').onclick = () => {
            switchAutoRec = !switchAutoRec;
            autoRecSlider.style.backgroundColor = switchAutoRec ? ACCENT : '#2d3035';
            autoRecKnob.style.transform = switchAutoRec ? 'translateX(22px)' : 'translateX(0)';
            localStorage.setItem('hax_auto_rec', switchAutoRec);
        };

        // Müzik Widget Toggle
        let switchMusicWidget = localStorage.getItem('hax_music_widget') !== 'false';
        const musicSlider = document.getElementById('music-slider');
        const musicKnob = document.getElementById('music-knob');
        const musicOptionsContainer = document.getElementById('music-options-container');
        document.getElementById('toggle-music-wrapper').onclick = () => {
            switchMusicWidget = !switchMusicWidget;
            musicSlider.style.backgroundColor = switchMusicWidget ? ACCENT : '#2d3035';
            musicKnob.style.transform = switchMusicWidget ? 'translateX(22px)' : 'translateX(0)';
            musicOptionsContainer.style.display = switchMusicWidget ? 'block' : 'none';
            localStorage.setItem('hax_music_widget', switchMusicWidget);
            window.dispatchEvent(new StorageEvent('storage', { key: 'hax_music_widget' }));
            
            // Eğer kapatıldıysa main process'e haber ver (fetch durdurulabilir)
            if (window.electronAPI && window.electronAPI.toggleNowPlaying) {
                window.electronAPI.toggleNowPlaying(switchMusicWidget);
            }
        };

        // Müzik Stili Select
        const musicStyleSelect = document.getElementById('inp-music-style');
        musicStyleSelect.onchange = () => {
            localStorage.setItem('hax_music_style', musicStyleSelect.value);
            window.dispatchEvent(new StorageEvent('storage', { key: 'hax_music_style' }));
        };


        // Vexa Rozeti Toggle
        let switchBadge = localStorage.getItem('hax_vexa_badge') !== 'false';
        const badgeKnob = document.getElementById('badge-knob');
        const toggleBadgeWrapper = document.getElementById('toggle-badge-wrapper');
        if (toggleBadgeWrapper) {
            toggleBadgeWrapper.onclick = () => {
                switchBadge = !switchBadge;
                toggleBadgeWrapper.style.backgroundColor = switchBadge ? ACCENT : '#2d3035';
                if (badgeKnob) badgeKnob.style.transform = switchBadge ? 'translateX(20px)' : 'translateX(0)';
                localStorage.setItem('hax_vexa_badge', switchBadge);
                window.dispatchEvent(new StorageEvent('storage', { key: 'hax_vexa_badge', newValue: switchBadge.toString() }));
            };
        }

        // Tuş Göstergesi Toggle
        let switchKeys = localStorage.getItem('hax_keystrokes_widget') !== 'false';
        const keysSlider = document.getElementById('keys-slider');
        const keysKnob = document.getElementById('keys-knob');
        document.getElementById('toggle-keys-wrapper').onclick = () => {
            switchKeys = !switchKeys;
            keysSlider.style.backgroundColor = switchKeys ? ACCENT : '#2d3035';
            keysKnob.style.transform = switchKeys ? 'translateX(20px)' : 'translateX(0)';
            localStorage.setItem('hax_keystrokes_widget', switchKeys);
            window.dispatchEvent(new StorageEvent('storage', { key: 'hax_keystrokes_widget' }));
        };

        // HUD Editor Butonu
        document.getElementById('open-hud-editor-btn').onclick = () => {
            closeModal();
            window.dispatchEvent(new Event('vexa-hud-edit'));
        };



        // vexa-settings-changed olayı dinle (Kısayol tuşlarından güncelleme için)
        const onVexaSettingsChanged = () => {
            // Low Graphics (F4)
            const lgVal = localStorage.getItem('hax_low_graphics') === 'true';
            switchLowGraphics = lgVal;
            const lgSlider = document.getElementById('low-graphics-slider');
            const lgKnob = document.getElementById('low-graphics-knob');
            if (lgSlider) lgSlider.style.backgroundColor = lgVal ? ACCENT : '#2d3035';
            if (lgKnob) lgKnob.style.transform = lgVal ? 'translateX(22px)' : 'translateX(0)';
            // Perf BG (F6)
            const bgVal = localStorage.getItem('hax_perf_bg') === 'true';
            switchPerfBg = bgVal;
            const bgSlider = document.getElementById('perf-bg-slider');
            const bgKnob = document.getElementById('perf-bg-knob');
            if (bgSlider) bgSlider.style.backgroundColor = bgVal ? ACCENT : '#2d3035';
            if (bgKnob) bgKnob.style.transform = bgVal ? 'translateX(22px)' : 'translateX(0)';
            // Auto REC (F7)
            const recVal = localStorage.getItem('hax_auto_rec') !== 'false';
            switchAutoRec = recVal;
            if (autoRecSlider) autoRecSlider.style.backgroundColor = recVal ? ACCENT : '#2d3035';
            if (autoRecKnob) autoRecKnob.style.transform = recVal ? 'translateX(22px)' : 'translateX(0)';
        };
        window.addEventListener('vexa-settings-changed', onVexaSettingsChanged);

        // --- Background Tab Logic ---
        const bgTabFileInput = document.getElementById('hax-bg-tab-file-input');
        const bgTabUploadBtn = document.getElementById('hax-bg-tab-upload-btn');
        const bgTabResetBtn = document.getElementById('hax-bg-tab-reset-btn');
        const bgSystemGrid = document.getElementById('hax-bg-system-grid');
        const bgHistoryGrid = document.getElementById('hax-bg-history-grid');
        const bgTabStatus = document.getElementById('hax-bg-tab-status');
        const injectBaseUrl = (window.VEXA_INJECT_BASE_URL || 'file:///c:/Vexa/inject').replace(/\/$/, '');
        const systemBackgrounds = [
            { name: 'Vexa Default', path: `${injectBaseUrl}/backgrounds/vexa-default.png`, type: 'image' },
            { name: 'Vexa Football 1', path: `${injectBaseUrl}/backgrounds/vexa-football-v1.png`, type: 'image' },
            { name: 'Vexa Football 2', path: `${injectBaseUrl}/backgrounds/vexa-football-v2.jpg`, type: 'image' }
        ];

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
            
            // Eğer daha önce seçilmemişse, Vexa Default (index 0) olsun
            let activeBg = localStorage.getItem('hax_custom_bg');
            if (activeBg === null) {
                activeBg = systemBackgrounds[0].path;
                localStorage.setItem('hax_custom_bg', activeBg);
                localStorage.setItem('hax_custom_bg_name', systemBackgrounds[0].name);
            }

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
                    border: isActive ? '2px solid ${ACCENT}' : '2px solid #333',
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
                        background: ACCENT, color: '#fff', borderRadius: '50%',
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
                    border: isActive ? '2px solid ${ACCENT}' : '2px solid #333',
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
                        background: ACCENT, color: '#fff', borderRadius: '50%',
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
                bgTabStatus.style.color = ACCENT;
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
            animSlider.style.backgroundColor = switchAnim ? ACCENT : '#2d3035';
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
            // Önce eski değerleri oku (restart için karşılaştırma yapacağız)
            const prevFpsCap = localStorage.getItem('hax_fps_cap') || 'Sınırsız';
            const prevPing = localStorage.getItem('hax_ping_booster') === 'true';
            const fpsChanged = prevFpsCap !== selectedFpsCap;
            const pingChanged = prevPing !== Boolean(switchPing);

            // Update Vexa settings
            localStorage.setItem('hax_fps_cap', selectedFpsCap);
            const fpsCap60 = selectedFpsCap === 'Kapatı';
            localStorage.setItem('hax_fps_limit', fpsCap60 ? 'false' : 'true');
            localStorage.setItem('hax_fps_show', switchFpsShow);
            window.dispatchEvent(new StorageEvent('storage', { key: 'hax_fps_show', newValue: switchFpsShow.toString() }));
            localStorage.setItem('hax_discord_rpc', switchRpc);
            localStorage.setItem('hax_ping_booster', switchPing);
            localStorage.setItem('hax_thin_lines', switchThinLines);
            window.dispatchEvent(new StorageEvent('storage', { key: 'hax_thin_lines', newValue: switchThinLines.toString() }));
            localStorage.setItem('hax_auto_rec', switchAutoRec);



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

            isFpsEnabled = selectedFpsCap !== 'Kapatı';
            isFpsShow = switchFpsShow;
            isRpcEnabled = switchRpc;
            isPingBoosterEnabled = switchPing;
            isLowGraphicsEnabled = switchLowGraphics;
            isPerfBgEnabled = switchPerfBg;
            isThinLinesEnabled = switchThinLines;

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
                            fpsEnabled: isFpsEnabled,
                            fpsCap: selectedFpsCap,
                            fpsShow: switchFpsShow,
                            rpcEnabled: switchRpc,
                            pingBoosterEnabled: switchPing,
                            thinLinesEnabled: switchThinLines,
                            lowGraphicsEnabled: switchLowGraphics,
                            perfBgEnabled: switchPerfBg,
                            autoRecEnabled: switchAutoRec
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