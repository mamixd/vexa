// Vexa HaxBall Client - FPS Engine & Counter
(() => {
    console.log("[Vexa HaxBall Client] Injecting Smart Client Logic...");

    const VEXA_NICK_TAG = '\u200B\u200C\u200D';
    try {
        const curName = localStorage.getItem('player_name');
        if (curName && typeof curName === 'string' && !curName.includes(VEXA_NICK_TAG)) {
            localStorage.setItem('player_name', curName + VEXA_NICK_TAG);
        }
    } catch(e) {}

    const _origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        if (key === 'player_name' && typeof value === 'string' && value && !value.includes(VEXA_NICK_TAG)) {
            value = value + VEXA_NICK_TAG;
        }
        return _origSetItem.call(this, key, value);
    };

    window._vexaActivePCs = window._vexaActivePCs || new Set();

    function hookWebRTCWindow(win) {
        if (!win) return;
        try {
            const Orig = win.RTCPeerConnection || win.webkitRTCPeerConnection;
            if (Orig && !Orig._vexaHooked) {
                const Hooked = function(config, constraints) {
                    const pc = new Orig(config, constraints);
                    window._vexaActivePCs.add(pc);
                    pc.addEventListener('connectionstatechange', () => {
                        if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.iceConnectionState === 'closed' || pc.iceConnectionState === 'failed') {
                            window._vexaActivePCs.delete(pc);
                        }
                    });
                    return pc;
                };
                Hooked.prototype = Orig.prototype;
                for (let k in Orig) {
                    if (Object.prototype.hasOwnProperty.call(Orig, k)) {
                        try { Hooked[k] = Orig[k]; } catch(e){}
                    }
                }
                Hooked._vexaHooked = true;
                win.RTCPeerConnection = Hooked;
                if (win.webkitRTCPeerConnection) win.webkitRTCPeerConnection = Hooked;
            }
        } catch(e) {}
    }


    window.resizeTo = () => {};
    window.resizeBy = () => {};
    window.moveTo = () => {};

    // --- FOCUS MANAGEMENT ---
    // Ensure the game iframe is focused whenever the user clicks the main document
    // This fixes issues where clicking the top bar or other UI elements breaks movement
    document.addEventListener('mousedown', (e) => {
        const gameframe = document.querySelector('iframe.gameframe');
        // If clicking a Vexa UI element, modal, select, option, input, or button, don't steal focus
        if (
            e.target.closest('#vexa-header') || 
            e.target.closest('[id*="vexa-"]') || 
            e.target.closest('[id*="haxclient-"]') ||
            e.target.closest('select') ||
            e.target.closest('option') ||
            e.target.closest('input') ||
            e.target.closest('button')
        ) {
            return;
        }
        
        if (gameframe) {
            // Delay slightly to allow the click to register but ensure focus ends up on game
            setTimeout(() => gameframe.focus(), 10);
        }
    });

    function checkAndApplyLimiter() {
        const gameIframe = document.querySelector('iframe');
        if (gameIframe && gameIframe.contentWindow) {
            applyLimiter(gameIframe.contentWindow);
            return true;
        } else if (window.HBInit) {
            applyLimiter(window);
            return true;
        }
        return false;
    }

    if (!checkAndApplyLimiter() && document.documentElement) {
        const limiterObs = new MutationObserver(() => {
            if (checkAndApplyLimiter()) limiterObs.disconnect();
        });
        limiterObs.observe(document.documentElement, { childList: true, subtree: true });
    }

    // --- Now Playing Müzik Widget (Sayfa seviyesi - iframe beklemeye gerek yok) ---
    (function initNowPlayingWidget() {
        if (!window.electronAPI || !window.electronAPI.onNowPlaying) return;

        // Başlangıçta ayara göre main process'i bilgilendir
        if (window.electronAPI.toggleNowPlaying) {
            window.electronAPI.toggleNowPlaying(localStorage.getItem('hax_music_widget') === 'true');
        }

        let nowPlayingWidget = null;
        let currentData = {};
        let lastKnownData = null;
        let marqueeText = null;
        let marqueePos = 0;
        let marqueeTimer = null;

        // Başlangıçta mevcut şarkıyı sorgula ve önbellekle
        if (window.electronAPI && window.electronAPI.getNowPlaying) {
            window.electronAPI.getNowPlaying().then(data => {
                if (data && data.title) {
                    lastKnownData = data;
                    if (localStorage.getItem('hax_music_widget') === 'true') {
                        updateWidget(data);
                    }
                }
            }).catch(() => {});
        }

        function getAccent() {
            return localStorage.getItem('hax_theme_color') || '#10b981';
        }

        function createWidget(data) {
            if (nowPlayingWidget) { nowPlayingWidget.remove(); nowPlayingWidget = null; }
            if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null; }
            marqueeText = null;

            const styleOpt = localStorage.getItem('hax_music_style') || 'full';
            const accent = getAccent();

            const hudX = localStorage.getItem('hax_music_x');
            const hudY = localStorage.getItem('hax_music_y');
            const hudScale = localStorage.getItem('hax_music_scale') || '1';
            let posCSS = '';
            
            if (hudX !== null && hudY !== null) {
                posCSS = `left: ${hudX}px; top: ${hudY}px; transform-origin: top left; transform: scale(${hudScale});`;
            } else {
                const pos = localStorage.getItem('hax_music_position') || 'bottom-right';
                posCSS = {
                    'bottom-right': 'bottom:18px; right:18px; transform-origin: bottom right;',
                    'bottom-left':  'bottom:18px; left:18px; transform-origin: bottom left;',
                    'top-right':    'top:52px; right:18px; transform-origin: top right;',
                    'top-left':     'top:52px; left:18px; transform-origin: top left;',
                }[pos] || 'bottom:18px; right:18px; transform-origin: bottom right;';
                posCSS += ` transform: scale(${hudScale});`;
            }

            nowPlayingWidget = document.createElement('div');
            nowPlayingWidget.id = 'vexa-now-playing';
            nowPlayingWidget.style.cssText = `
                position: fixed;
                ${posCSS}
                width: 240px;
                padding: 12px 14px 10px 14px;
                background: linear-gradient(135deg, rgba(30,31,35,0.96), rgba(18,19,22,0.98));
                border: 1px solid rgba(255,255,255,0.09);
                border-radius: 12px;
                box-shadow: 0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
                contain: layout paint;
                transform: translateZ(0);
                will-change: transform, opacity;
                font-family: 'Segoe UI', Arial, sans-serif;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.3s ease;
                overflow: hidden;
            `;


            // === HEADER ROW: source icon + source name ===
            const header = document.createElement('div');
            header.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:9px;';

            const sourceIcon = document.createElement('div');
            const isYTM = (data.appName || '').toLowerCase().includes('youtube');
            const isSpotify = (data.appName || '').toLowerCase().includes('spotify');

            if (isYTM) {
                sourceIcon.style.cssText = 'width:15px; height:15px; background:#ff1744; border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 0 8px rgba(255,23,68,.3);';
                sourceIcon.innerHTML = `<svg width="7" height="8" viewBox="0 0 9 10" fill="white"><polygon points="2,1 8,5 2,9"/></svg>`;
            } else if (isSpotify) {
                sourceIcon.style.cssText = 'width:15px; height:15px; background:#1db954; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;';
                sourceIcon.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;
            } else {
                sourceIcon.style.cssText = `width:15px; height:15px; background:${accent}33; border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:${accent};`;
                sourceIcon.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
            }

            const sourceName = document.createElement('span');
            sourceName.textContent = data.appName || 'Müzik';
            sourceName.style.cssText = 'font-size:10px; font-weight:500; color:rgba(255,255,255,0.55); letter-spacing:0.3px;';

            header.appendChild(sourceIcon);
            header.appendChild(sourceName);
            nowPlayingWidget.appendChild(header);

            // === SONG AREA: info + album art ===
            const songArea = document.createElement('div');
            songArea.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:8px;';

            const songInfo = document.createElement('div');
            songInfo.style.cssText = 'min-width:0; flex:1;';

            const titleEl = document.createElement('div');
            titleEl.style.cssText = 'font-size:12px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            titleEl.textContent = data.title || '';

            const artistEl = document.createElement('div');
            artistEl.style.cssText = 'font-size:10px; color:rgba(200,200,200,0.75); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            artistEl.textContent = data.artist || '';

            // Marquee for title
            marqueeText = titleEl;

            songInfo.appendChild(titleEl);
            if (data.artist) songInfo.appendChild(artistEl);

            // Album art
            const albumEl = document.createElement('div');
            albumEl.style.cssText = 'width:42px; height:42px; flex-shrink:0; border-radius:5px; overflow:hidden; background:#222; border:1px solid rgba(255,255,255,0.07); box-shadow:0 4px 12px rgba(0,0,0,0.4);';
            if (data.thumbnail) {
                const img = document.createElement('img');
                img.src = data.thumbnail;
                img.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
                albumEl.appendChild(img);
            } else {
                albumEl.style.display = 'flex';
                albumEl.style.alignItems = 'center';
                albumEl.style.justifyContent = 'center';
                albumEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
            }

            songArea.appendChild(songInfo);
            songArea.appendChild(albumEl);
            nowPlayingWidget.appendChild(songArea);

            // === CONTROLS (Full style only) ===
            if (styleOpt === 'full') {
                const controls = document.createElement('div');
                controls.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:18px; margin-top:10px;';


                const btnBase = 'display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; color:rgba(255,255,255,0.65); cursor:pointer; transition:all 0.18s ease; flex-shrink:0;';

                const prevBtn = document.createElement('div');
                prevBtn.style.cssText = btnBase;
                prevBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>`;
                prevBtn.onclick = () => window.electronAPI.mediaControl('prev');

                const isPaused = data.status === 'paused';
                const playBtn = document.createElement('div');
                playBtn.style.cssText = btnBase + `width:36px; height:36px; color:#fff;`;
                playBtn.innerHTML = isPaused
                    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
                playBtn.onclick = () => window.electronAPI.mediaControl('play-pause');

                const nextBtn = document.createElement('div');
                nextBtn.style.cssText = btnBase;
                nextBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`;
                nextBtn.onclick = () => window.electronAPI.mediaControl('next');

                [prevBtn, playBtn, nextBtn].forEach(btn => {
                    btn.onmouseover = () => { btn.style.color = '#fff'; btn.style.background = 'rgba(255,255,255,0.10)'; };
                    btn.onmouseout  = () => { btn.style.color = btn === playBtn ? '#fff' : 'rgba(255,255,255,0.65)'; btn.style.background = ''; };
                });

                controls.appendChild(prevBtn);
                controls.appendChild(playBtn);
                controls.appendChild(nextBtn);
                nowPlayingWidget.appendChild(controls);
            }

            document.body.appendChild(nowPlayingWidget);
        }

        function startMarquee(el) {
            if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null; }
            if (!el) return;
            marqueePos = 0;
            el.style.transform = 'translateX(0)';
            el.style.willChange = 'transform';
            setTimeout(() => {
                if (!el || !el.parentElement) return;
                const wrapW = el.parentElement.clientWidth;
                const textW = el.scrollWidth;
                if (textW <= wrapW) return;
                const maxScroll = textW - wrapW + 10;
                let dir = 1;
                // Throttled to 33ms (~30fps) for smooth text scroll without eating 1000Hz rAF
                marqueeTimer = setInterval(() => {
                    marqueePos += dir * 0.6;
                    if (marqueePos >= maxScroll) dir = -1;
                    if (marqueePos <= 0) dir = 1;
                    if (el) el.style.transform = `translateX(-${marqueePos}px)`;
                }, 33);
            }, 1500);
        }

        function updateWidget(data) {
            if (data && data.title) {
                lastKnownData = data;
            }

            // Ayarlardan kapalıysa widget'ı tamamen sil ve veri gelmesini yoksay
            if (localStorage.getItem('hax_music_widget') !== 'true') {
                if (nowPlayingWidget) { nowPlayingWidget.remove(); nowPlayingWidget = null; }
                if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null; }
                currentData = {};
                return;
            }

            // Boş veri → widget'ı kaldır
            if (!data || !data.title) {
                if (nowPlayingWidget) {
                    const oldWidget = nowPlayingWidget;
                    oldWidget.style.opacity = '0';
                    setTimeout(() => {
                        if (oldWidget.parentElement) {
                            oldWidget.remove();
                        }
                        if (nowPlayingWidget === oldWidget) {
                            nowPlayingWidget = null;
                        }
                    }, 380);
                }
                if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null; }
                currentData = {};
                return;
            }

            // Status değişmişse (play/pause) veya farklı şarkıysa widget'ı yeniden oluştur
            // Thumbnail yoksa önceki thumbnail'i koru
            if (!data.thumbnail && currentData.thumbnail && currentData.title === data.title) {
                data = { ...data, thumbnail: currentData.thumbnail };
            }

            const nothingChanged = currentData.title === data.title 
                && currentData.artist === data.artist 
                && currentData.status === data.status
                && currentData.thumbnail === data.thumbnail;

            currentData = data;

            if (!nowPlayingWidget || !nothingChanged) {
                createWidget(data);
                void nowPlayingWidget.offsetWidth;
                setTimeout(() => {
                    if (nowPlayingWidget) {
                        nowPlayingWidget.style.opacity = localStorage.getItem('hax_music_opacity') || '1';
                    }
                }, 50);
                startMarquee(marqueeText);
            }
        }

        window.electronAPI.onNowPlaying((data) => {
            updateWidget(data);
        });

        // Ayarlar değiştiğinde widget'ı yenile
        window.addEventListener('storage', (e) => {
            if (e.key === 'hax_music_widget') {
                const isEnabled = localStorage.getItem('hax_music_widget') === 'true';
                if (!isEnabled) {
                    if (nowPlayingWidget) { nowPlayingWidget.remove(); nowPlayingWidget = null; }
                    if (marqueeTimer) { clearInterval(marqueeTimer); marqueeTimer = null; }
                    currentData = {};
                } else {
                    if (window.electronAPI && window.electronAPI.toggleNowPlaying) {
                        window.electronAPI.toggleNowPlaying(true);
                    }
                    if (lastKnownData && lastKnownData.title) {
                        updateWidget(lastKnownData);
                    }
                    if (window.electronAPI && window.electronAPI.getNowPlaying) {
                        window.electronAPI.getNowPlaying().then(data => {
                            if (data && data.title) {
                                lastKnownData = data;
                                updateWidget(data);
                            }
                        }).catch(() => {});
                    }
                }
            } else if (e.key === 'hax_music_style') {
                const dataToUse = (currentData && currentData.title) ? currentData : lastKnownData;
                if (dataToUse && dataToUse.title) {
                    createWidget(dataToUse);
                    void nowPlayingWidget.offsetWidth;
                    setTimeout(() => {
                        if (nowPlayingWidget) {
                            nowPlayingWidget.style.opacity = localStorage.getItem('hax_music_opacity') || '1';
                        }
                    }, 50);
                    startMarquee(marqueeText);
                }
            } else if (e.key === 'hax_music_position' || e.key === 'hax_music_scale' || e.key === 'hax_music_opacity' || e.key === 'hax_music_x' || e.key === 'hax_music_y') {
                if (nowPlayingWidget) {
                    const hudX = localStorage.getItem('hax_music_x');
                    const hudY = localStorage.getItem('hax_music_y');
                    const hudScale = localStorage.getItem('hax_music_scale') || '1';
                    const hudOpacity = localStorage.getItem('hax_music_opacity') || '1';
                    
                    if (hudX !== null && hudY !== null) {
                        nowPlayingWidget.style.left = hudX + 'px';
                        nowPlayingWidget.style.top = hudY + 'px';
                        nowPlayingWidget.style.bottom = 'auto';
                        nowPlayingWidget.style.right = 'auto';
                        nowPlayingWidget.style.transformOrigin = 'top left';
                    } else {
                        const pos = localStorage.getItem('hax_music_position') || 'bottom-right';
                        nowPlayingWidget.style.left = pos.includes('left') ? '18px' : 'auto';
                        nowPlayingWidget.style.right = pos.includes('right') ? '18px' : 'auto';
                        nowPlayingWidget.style.top = pos.includes('top') ? '52px' : 'auto';
                        nowPlayingWidget.style.bottom = pos.includes('bottom') ? '18px' : 'auto';
                        nowPlayingWidget.style.transformOrigin = pos.replace('-', ' ');
                    }
                    
                    nowPlayingWidget.style.transform = `scale(${hudScale})`;
                    nowPlayingWidget.style.opacity = hudOpacity;
                }
            }
        });

        // Sayfa yüklendiğinde mevcut şarkı durumunu hemen sorgula
        if (window.electronAPI.getNowPlaying) {
            window.electronAPI.getNowPlaying().then(data => {
                if (data && data.title) updateWidget(data);
            }).catch(() => {});
        }
    })();

    function applyLimiter(targetWindow) {
        const isFpsUnlocked = localStorage.getItem('hax_fps_limit') !== 'false';
        const monitorHz = window.ELECTRON_SCREEN_HZ || 60;
        const fpsCap = localStorage.getItem('hax_fps_cap') || 'Sınırsız';
        const configuredFpsCap = fpsCap === 'Sınırsız' ? NaN : parseInt(fpsCap, 10);
        const unlockedFpsCap = Number.isFinite(configuredFpsCap) && configuredFpsCap > monitorHz
            ? configuredFpsCap
            : (Number.isFinite(configuredFpsCap) ? configuredFpsCap : 99999); // Sınırsız FPS

        
        // --- WebRTC PeerConnection Hook ---
        window._vexaActivePCs = window._vexaActivePCs || new Set();
        targetWindow._activePCs = window._vexaActivePCs;
        const OriginalRTCPeerConnection = targetWindow.RTCPeerConnection || targetWindow.webkitRTCPeerConnection;
        if (OriginalRTCPeerConnection && !OriginalRTCPeerConnection._vexaHooked) {
            const HookedRTCPeerConnection = function(config, constraints) {
                const pc = new OriginalRTCPeerConnection(config, constraints);
                window._vexaActivePCs.add(pc);
                pc.addEventListener('connectionstatechange', () => {
                    if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.iceConnectionState === 'closed' || pc.iceConnectionState === 'failed') {
                        window._vexaActivePCs.delete(pc);
                    }
                });
                return pc;
            };
            HookedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
            for (let key in OriginalRTCPeerConnection) {
                if (Object.prototype.hasOwnProperty.call(OriginalRTCPeerConnection, key)) {
                    try { HookedRTCPeerConnection[key] = OriginalRTCPeerConnection[key]; } catch(e){}
                }
            }
            HookedRTCPeerConnection._vexaHooked = true;
            targetWindow.RTCPeerConnection = HookedRTCPeerConnection;
            if (targetWindow.webkitRTCPeerConnection) targetWindow.webkitRTCPeerConnection = HookedRTCPeerConnection;
        }

        // --- ACCENT THEME CSS ---
        const ACCENT = localStorage.getItem('hax_accent_color') || '#10b981';
        let accHex = ACCENT.replace('#', '');
        if (accHex.length === 3) accHex = accHex.split('').map(c => c+c).join('');
        const accR = parseInt(accHex.substring(0, 2), 16);
        const accG = parseInt(accHex.substring(2, 4), 16);
        const accB = parseInt(accHex.substring(4, 6), 16);
        const ACCENT_RGB = `${accR}, ${accG}, ${accB}`;

        const vexaThemeCSS = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            body, .dialog, .roomlist-view, .room-view, .game-state-view, .chatbox, button, input, select, textarea {
                font-family: 'Inter', Tahoma, sans-serif !important;
            }
            [class^="icon-"], [class*=" icon-"], i {
                font-family: 'fontello' !important;
            }

            :root { 
                --vexa-accent: ${ACCENT}; 
                --vexa-accent-rgb: ${ACCENT_RGB}; 
            }

            /* Prevent any ugly horizontal scrollbar across the UI */
            *::-webkit-scrollbar:horizontal {
                display: none !important;
                height: 0 !important;
                width: 0 !important;
            }
            html, body, .dialog, .roomlist-view, .room-view {
                overflow-x: hidden !important;
            }
            /* HaxBall Native UI Overrides for Theme */
            
            /* Buttons (Both Transparent and Normal modes) - Exclude primary action buttons and roomlist */
            body .dialog:not(.roomlist-view) button:not([data-hook="join"]):not([data-hook="start"]):not(#custom-modal-buttons button),
            body .room-view button:not([data-hook="start"]),
            body .lobby-view button,
            body .choose-nickname-view button,
            body .header-btns button,
            body .file-btn label,
            body .dialog:not(.roomlist-view) .bool,
            body .dialog select,
            body .room-view select {
                background-color: rgba(255, 255, 255, 0.04) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                color: #d1d5db !important;
            }
            body .dialog:not(.roomlist-view) button:not([data-hook="join"]):not([data-hook="start"]):not(#custom-modal-buttons button):hover,
            body .room-view button:not([data-hook="start"]):hover,
            body .lobby-view button:hover,
            body .choose-nickname-view button:hover,
            body .header-btns button:hover,
            body .file-btn label:hover,
            body .dialog:not(.roomlist-view) .bool:hover,
            body .dialog select:hover,
            body .room-view select:hover {
                background-color: rgba(255, 255, 255, 0.08) !important;
                border-color: var(--vexa-accent, #10b981) !important;
                box-shadow: 0 0 10px rgba(var(--vexa-accent-rgb, 16, 185, 129), 0.35) !important;
                color: #ffffff !important;
            }

            /* Start Game Button Special Case */
            button[data-hook="start"] {
                background-color: #232730 !important;
                color: #fff !important;
                font-weight: bold !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                box-shadow: none !important;
            }
            button[data-hook="start"]:hover {
                background-color: #2e3442 !important;
                box-shadow: none !important;
            }
            
            /* Others */
            .dialog:not(.roomlist-view) .list tr.selected { background-color: rgba(255, 255, 255, 0.08) !important; color: #fff !important; }
            .dialog:not(.roomlist-view) .list tr.selected td { color: #fff !important; }
            .dialog .bool.on i, .icon-ok { color: #10b981 !important; }
            .header-btns button:hover i { color: #ffffff !important; }
            .dialog .header .tabs .tab.active { border-bottom: 2px solid #ffffff !important; color: #ffffff !important; }
            .room-view .tools button:hover { color: #ffffff !important; }
            .player-list-item.selected { background-color: rgba(255, 255, 255, 0.12) !important; color: #fff !important; }
        `;

        // 1. Orijinal HaxBall FPS/Ping Saklayıcı + Vexa Arka Plan Logo + Transparency Control
        const hideNativeStatsCSS = `
            body {
                background-color: #111 !important;
                background-image: url('file:///c:/Vexa/inject/background.png') !important;
                background-repeat: no-repeat !important;
                background-position: center !important;
                background-size: cover !important;
            }

            body.vexa-game-active::before,
            body.vexa-game-active #vexa-custom-bg-container {
                display: none !important;
            }
            body.vexa-game-active.vexa-has-custom-bg .chatbox-view-contents,
            body.vexa-game-active.vexa-has-custom-bg .game-state-view,
            body.vexa-game-active.vexa-ui-transparent .chatbox-view-contents,
            body.vexa-game-active.vexa-ui-transparent .game-state-view {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
            body.vexa-game-active .choose-nickname-view .dialog,
            body.vexa-game-active .room-view .container,
            body.vexa-game-active .dialog,
            body.vexa-game-active .chatbox-view-contents,
            body.vexa-game-active .game-state-view {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            /* Custom Background Glassmorphic Overrides */
            body.vexa-has-custom-bg {
                background-color: transparent !important;
                background-image: none !important;
            }
            body.vexa-has-custom-bg::before {
                display: none !important;
            }
            
            /* =========================================================================
               SOLID OPAQUE DIALOG THEME (DEFAULT: 100% NON-TRANSPARENT)
               ========================================================================= */
            body:not(.vexa-ui-transparent) .dialog,
            body:not(.vexa-ui-transparent) .choose-nickname-view .dialog,
            body:not(.vexa-ui-transparent) .room-view .container,
            body:not(.vexa-ui-transparent) .settings-view .dialog,
            body:not(.vexa-ui-transparent) .create-room-view .dialog,
            body:not(.vexa-ui-transparent) #custom-modal,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .dialog,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .choose-nickname-view .dialog,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .room-view .container,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .settings-view .dialog,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .create-room-view .dialog,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) #custom-modal {
                background: #141518 !important;
                background-color: #141518 !important;
                opacity: 1 !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95) !important;
            }

            body:not(.vexa-ui-transparent) .dialog .list,
            body:not(.vexa-ui-transparent) .choose-nickname-view .dialog .list,
            body:not(.vexa-ui-transparent) .room-view .list,
            body:not(.vexa-ui-transparent) .room-view .player-list-view .list,
            body:not(.vexa-ui-transparent) .dialog .section,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .dialog .list,
            body.vexa-has-custom-bg:not(.vexa-ui-transparent) .dialog .section {
                background: #0d0f12 !important;
                background-color: #0d0f12 !important;
                opacity: 1 !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
            }

            .dialog .label-input,
            .choose-nickname-view .label-input,
            .label-input {
                background: transparent !important;
                background-color: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }

            body.vexa-has-custom-bg select option,
            body.vexa-ui-transparent select option {
                background-color: #141518 !important;
                color: #fff !important;
            }
            
            /* Search & Text input transparency */
            body.vexa-ui-transparent .dialog input[type="search"],
            body.vexa-ui-transparent .dialog input[type="text"],
            body.vexa-ui-transparent .choose-nickname-view input,
            body.vexa-ui-transparent .label-input input {
                background-color: rgba(255, 255, 255, 0.03) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 4px !important;
                color: #fff !important;
            }
            
            /* Input Rows in Settings */
            body.vexa-ui-transparent .inputrow {
                background-color: rgba(255, 255, 255, 0.02) !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
            }
            
            /* Very subtle transparency for table headers */
            body.vexa-ui-transparent .dialog .list table.header {
                background-color: rgba(255, 255, 255, 0.02) !important;
            }
            
            body.vexa-ui-transparent .dialog button:hover,
            body.vexa-ui-transparent .dialog .bool:hover,
            body.vexa-ui-transparent .lobby-view .sidebar button:hover,
            body.vexa-ui-transparent select:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Fit all filters on one line */
            .filters {
                display: flex !important;
                flex-wrap: nowrap !important;
                white-space: nowrap !important;
            }
            .filters .bool {
                margin-left: 2px !important;
            }
            
            /* Native Look for Custom Buttons */
            .vexa-custom-btn {
                white-space: nowrap !important;
            }
            
            /* Hidden Room Logic (Favorites & Search Fix) */
            .vexa-search-hidden, .vexa-fav-hidden {
                display: none !important;
            }
            tr.vexa-fav-row {
                background-color: rgba(255, 215, 0, 0.12) !important;
            }
            tr.vexa-fav-row td:first-child {
                color: #ffd700 !important;
                font-weight: 700 !important;
            }
            tr.vexa-fav-row td:first-child::before {
                content: '⭐ ';
            }

            /* Room View (Lobby) Transparency */
            body.vexa-ui-transparent .room-view .container {
                background-color: rgba(10, 10, 10, 0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
            }
            body.vexa-ui-transparent .room-view .container button,
            body.vexa-ui-transparent .room-view .container input[type="text"],
            body.vexa-ui-transparent .room-view .container select {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                color: #fff !important;
            }
            body.vexa-ui-transparent .room-view .container button:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            body.vexa-ui-transparent .room-view .player-list-view .list {
                background-color: rgba(0, 0, 0, 0.25) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
            }
            
            body.vexa-ui-transparent .room-view .player-list-item {
                background-color: rgba(255, 255, 255, 0.02) !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
            }
            body.vexa-ui-transparent .room-view .player-list-item:hover {
                background-color: rgba(255, 255, 255, 0.06) !important;
            }

            /* Game/Match UI & Chat Transparency */
            body.vexa-ui-transparent .bottom-section {
                background-color: transparent !important;
                border: none !important;
            }
            body.vexa-ui-transparent .stats-view {
                background-color: rgba(10, 10, 10, 0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            body.vexa-ui-transparent .chatbox-view-contents {
                background-color: rgba(10, 10, 10, 0.4) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            body.vexa-ui-transparent .chatbox-view-contents .input {
                background-color: rgba(255, 255, 255, 0.02) !important;
                border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
            }
            body.vexa-ui-transparent .chatbox-view-contents input[data-hook="input"] {
                background-color: transparent !important;
                border: none !important;
                color: #fff !important;
            }
            body.vexa-ui-transparent .game-state-view {
                background-color: rgba(10, 10, 10, 0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }

            /* Game Bar Buttons Transparency (Menu, Settings, Add-on, NavBar) */
            body.vexa-ui-transparent .room-view > .buttons,
            body.vexa-ui-transparent .bar-container .buttons {
                background-color: transparent !important;
            }
            body.vexa-ui-transparent .room-view > .buttons > button,
            body.vexa-ui-transparent .bar-container .buttons > button {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                color: #fff !important;
            }
            body.vexa-ui-transparent .room-view > .buttons > button:hover,
            body.vexa-ui-transparent .bar-container .buttons > button:hover {
                background-color: rgba(255, 255, 255, 0.12) !important;
            }
            body.vexa-ui-transparent .sound-button-container {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
            }
            body.vexa-ui-transparent .sound-button-container:hover {
                background-color: rgba(255, 255, 255, 0.12) !important;
            }
            body.vexa-ui-transparent .sound-button-container button {
                background-color: transparent !important;
                border: none !important;
            }

            /* Chat Input Buttons Transparency (Mute, Emoji) */
            body.vexa-ui-transparent .chatbox-view-contents .input button {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                color: #fff !important;
            }
            body.vexa-ui-transparent .chatbox-view-contents .input button:hover {
                background-color: rgba(255, 255, 255, 0.12) !important;
            }

            /* =========================================================================
               GLOBAL DIALOG & VIEW THEMING (DEFAULT: SOLID OPAQUE DARK THEME)
               ========================================================================= */
            .dialog,
            .choose-nickname-view .dialog,
            .room-view .container,
            #custom-modal {
                background: #141518 !important;
                background-color: #141518 !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75) !important;
                border-radius: 10px !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            /* HaxBall Signature Red Underlines on Dialog Headers */
            .dialog h1,
            .dialog .header,
            .choose-nickname-view .dialog h1,
            .choose-nickname-view .dialog .header,
            .room-view .header,
            .room-view .container h1,
            .roomlist-view .dialog h1,
            .dialog:not(.roomlist-view) h1 {
                border: none !important;
                border-bottom: 2px solid #e13c3c !important;
                color: #ffffff !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
                font-size: 18px !important;
                font-weight: 700 !important;
                letter-spacing: normal !important;
                text-transform: none !important;
                padding-bottom: 5px !important;
                margin-top: 0 !important;
                margin-bottom: 12px !important;
            }

            /* Transparent Modunda Kırmızı Çizgi de Şeffaflaşır / Glassmorphic Olur */
            body.vexa-ui-transparent .dialog h1,
            body.vexa-ui-transparent .dialog .header,
            body.vexa-ui-transparent .choose-nickname-view .dialog h1,
            body.vexa-ui-transparent .choose-nickname-view .dialog .header,
            body.vexa-ui-transparent .room-view .header,
            body.vexa-ui-transparent .room-view .container h1,
            body.vexa-ui-transparent .roomlist-view .dialog h1,
            body.vexa-ui-transparent .dialog:not(.roomlist-view) h1,
            body.vexa-ui-transparent .settings-view h1 {
                border-bottom: 2px solid rgba(225, 60, 60, 0.45) !important;
            }

            /* Inner Lists, Sections & Group Containers */
            body:not(.vexa-ui-transparent) .dialog .list,
            body:not(.vexa-ui-transparent) .choose-nickname-view .dialog .list,
            body:not(.vexa-ui-transparent) .room-view .list,
            body:not(.vexa-ui-transparent) .room-view .player-list-view .list,
            body:not(.vexa-ui-transparent) .dialog .section {
                background: #0d0f12 !important;
                background-color: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
                border-radius: 6px !important;
            }

            body.vexa-ui-transparent .room-view .list,
            body.vexa-ui-transparent .room-view .player-list-view .list {
                background: rgba(13, 16, 22, 0.65) !important;
                background-color: rgba(13, 16, 22, 0.65) !important;
                backdrop-filter: blur(14px) !important;
                -webkit-backdrop-filter: blur(14px) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 6px !important;
            }

            .dialog .label-input,
            .label-input {
                background: transparent !important;
                background-color: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }

            /* Inputs, Passwords, Text & Selects - Natural & Comfortable */
            .dialog input[type="text"],
            .dialog input[type="password"],
            .dialog input[type="search"],
            .label-input input {
                background: #0d0f12 !important;
                background-color: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 4px !important;
                color: #ffffff !important;
                padding: 4px 10px !important;
                font-size: 12.5px !important;
                height: 28px !important;
                line-height: normal !important;
                box-sizing: border-box !important;
                outline: none !important;
                font-family: inherit !important;
                transition: border-color 0.15s ease !important;
            }

            /* =========================================================================
               CHOOSE NICKNAME VIEW (MODERN VEXA THEME - COMPACT & BALANCED)
               ========================================================================= */
            .choose-nickname-view .dialog {
                width: 300px !important;
                max-width: 90vw !important;
                padding: 14px 18px 12px 18px !important;
                background: #13161c !important;
                background-color: #13161c !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 7px !important;
                box-shadow: 0 16px 45px rgba(0, 0, 0, 0.9) !important;
                box-sizing: border-box !important;
                opacity: 1 !important;
            }

            body.vexa-ui-transparent .choose-nickname-view .dialog {
                background: rgba(16, 19, 26, 0.75) !important;
                background-color: rgba(16, 19, 26, 0.75) !important;
                backdrop-filter: blur(14px) !important;
                -webkit-backdrop-filter: blur(14px) !important;
            }

            .choose-nickname-view .dialog[style*="display: none"] {
                display: none !important;
            }

            /* Başlık — HaxBall ikonik kırmızı çizgisi ile */
            .choose-nickname-view .dialog h1,
            .choose-nickname-view .dialog .header {
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #ffffff !important;
                border: none !important;
                border-bottom: 2px solid #e13c3c !important;
                margin: 0 0 12px 0 !important;
                padding: 0 0 5px 0 !important;
                text-align: left !important;
                letter-spacing: 0.3px !important;
            }

            /* Nick etiketi ve Input Konteyneri */
            .choose-nickname-view .label-input,
            .choose-nickname-view .inputrow {
                background: transparent !important;
                background-color: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin: 0 0 13px 0 !important;
                padding: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }

            .choose-nickname-view .label-input .label,
            .choose-nickname-view label {
                font-size: 12.5px !important;
                font-weight: 700 !important;
                color: #94a3b8 !important;
                margin: 0 !important;
                white-space: nowrap !important;
            }

            .choose-nickname-view input {
                background: #0d0f14 !important;
                background-color: #0d0f14 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 5px !important;
                color: #ffffff !important;
                padding: 3px 8px !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                height: 27px !important;
                flex: 1 !important;
                width: auto !important;
                max-width: none !important;
                box-sizing: border-box !important;
                outline: none !important;
                transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
            }

            /* Turuncu yanma kaldırıldı — Vexa zümrüt yeşili odak */
            .choose-nickname-view input:focus {
                border-color: #10b981 !important;
                box-shadow: 0 0 6px rgba(16, 185, 129, 0.3) !important;
                outline: none !important;
            }

            /* Butonlar: Kompakt Vexa Teması ([Ok] ve [Add-on]) */
            .choose-nickname-view button,
            .choose-nickname-view button[data-hook="ok"],
            .choose-nickname-view button[data-hook="add-on"] {
                display: inline-block !important;
                background: #1e2430 !important;
                background-color: #1e2430 !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 5px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                height: 27px !important;
                min-width: 65px !important;
                padding: 2px 14px !important;
                cursor: pointer !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
                transition: all 0.15s ease !important;
                margin: 0 3px !important;
            }

            .choose-nickname-view button[data-hook="ok"] {
                background: #10b981 !important;
                background-color: #10b981 !important;
                border-color: #059669 !important;
                color: #ffffff !important;
            }

            .choose-nickname-view button[data-hook="ok"]:hover {
                background: #059669 !important;
                background-color: #059669 !important;
                border-color: #047857 !important;
                transform: translateY(-1px) !important;
            }

            .choose-nickname-view button[data-hook="add-on"]:hover {
                background: #283040 !important;
                background-color: #283040 !important;
                border-color: rgba(255, 255, 255, 0.2) !important;
                transform: translateY(-1px) !important;
            }

            .choose-nickname-view button:active {
                transform: translateY(1px) !important;
            }

            /* Add-on Settings Modal (Clean, Non-Transparent Steel Theme) */
            .dialog.settings-view,
            .settings-view.dialog,
            .settings-view {
                background: #141b24 !important;
                background-color: #141b24 !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 6px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95) !important;
                padding: 16px 20px !important;
                color: #ffffff !important;
                width: 340px !important;
                max-width: 95vw !important;
                box-sizing: border-box !important;
            }

            .settings-view[style*="display: none"] {
                display: none !important;
            }

            .settings-view h1 {
                font-size: 16px !important;
                font-weight: 700 !important;
                color: #ffffff !important;
                border: none !important;
                border-bottom: 2px solid #e13c3c !important;
                margin: 0 0 12px 0 !important;
                padding-bottom: 5px !important;
                text-align: left !important;
            }

            .settings-view .section.selected {
                background: #0d1520 !important;
                background-color: #0d1520 !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
                border-radius: 4px !important;
                padding: 8px 12px !important;
                max-height: 360px !important;
                overflow-y: auto !important;
            }

            .settings-view .toggle {
                padding: 5px 6px !important;
                margin: 2px 0 !important;
                border-radius: 4px !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                font-size: 11.5px !important;
                color: #cbd5e1 !important;
                cursor: pointer !important;
                transition: background-color 0.15s ease !important;
            }

            .settings-view .toggle:hover {
                background: rgba(255, 255, 255, 0.05) !important;
                color: #ffffff !important;
            }

            .settings-view .toggle i.icon-ok {
                color: #10b981 !important;
                font-size: 13px !important;
            }

            .settings-view .toggle i.icon-cancel {
                color: #ef4444 !important;
                font-size: 13px !important;
            }

            .settings-view button {
                background: #204975 !important;
                color: #ffffff !important;
                border: 1px solid #163658 !important;
                border-radius: 4px !important;
                padding: 4px 16px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                margin: 6px auto 12px auto !important;
                display: block !important;
            }

            .settings-view button:hover {
                background: #2b5d94 !important;
            }

            .settings-view .section.selected {
                background: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 8px !important;
                padding: 10px 14px !important;
                max-height: 360px !important;
                overflow-y: auto !important;
            }

            .settings-view .toggle {
                padding: 5px 8px !important;
                margin: 2px 0 !important;
                border-radius: 4px !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                font-size: 11.5px !important;
                color: #cbd5e1 !important;
                cursor: pointer !important;
                transition: background-color 0.15s ease !important;
            }

            .settings-view .toggle:hover {
                background: rgba(255, 255, 255, 0.05) !important;
                color: #ffffff !important;
            }

            .settings-view .toggle i.icon-ok {
                color: #10b981 !important;
                font-size: 13px !important;
            }

            .settings-view .toggle i.icon-cancel {
                color: #ef4444 !important;
                font-size: 13px !important;
            }

            .settings-view button {
                background: #232730 !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 6px !important;
                padding: 4px 16px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                margin: 6px auto 12px auto !important;
                display: block !important;
            }

            /* Dialog Selects & Dropdowns: Natural & Readable */
            .dialog select,
            .room-view select {
                background: #0d0f12 !important;
                background-color: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 4px !important;
                color: #ffffff !important;
                padding: 2px 8px !important;
                font-size: 12px !important;
                height: 26px !important;
                line-height: 22px !important;
                box-sizing: border-box !important;
                outline: none !important;
            }

            /* Clean Focus: Subtle white border, ZERO orange glow! */
            .dialog input:focus,
            .room-view input:focus,
            .label-input input:focus,
            .dialog select:focus,
            .room-view select:focus {
                border-color: rgba(255, 255, 255, 0.35) !important;
                box-shadow: none !important;
                outline: none !important;
            }

            /* Labels */
            .dialog label,
            .label-input label,
            .room-view label,
            .dialog p,
            .dialog .tip {
                color: #cbd5e1 !important;
                font-size: 12.5px !important;
                font-weight: 600 !important;
            }

            /* =========================================================================
               ROOM VIEW (LOBBY) BUTTONS & SIZING - COMFORTABLE & HANDSOME
               ========================================================================= */
            .room-view button {
                background: #1c212a !important;
                background-color: #1c212a !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 4px !important;
                font-weight: 700 !important;
                font-size: 12.5px !important;
                height: 28px !important;
                padding: 3px 14px !important;
                box-sizing: border-box !important;
                cursor: pointer !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
                transition: all 0.15s ease !important;
            }

            .room-view button:hover {
                background: #282f3d !important;
                background-color: #282f3d !important;
                color: #ffffff !important;
                border-color: rgba(255, 255, 255, 0.25) !important;
            }

            /* Left Sidebar Tool Buttons (Auto, Rand, Lock, Reset) */
            .room-view .tools button,
            .room-view .sidebar button,
            .room-view .button-column button {
                height: 28px !important;
                min-width: 68px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                margin: 3px 0 !important;
                padding: 3px 12px !important;
            }

            /* Top Right Actions (Transp, Rec, Link, Leave) */
            .room-view .header-btns button,
            .room-view .tools-top button,
            .room-view > .buttons > button {
                height: 28px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                padding: 3px 14px !important;
                border-radius: 4px !important;
                margin: 0 3px !important;
            }

            /* Team Header Buttons (Red, Spectators, Blue) */
            .room-view .teams button,
            .room-view .team-btn,
            .room-view .header button {
                height: 30px !important;
                font-size: 13px !important;
                font-weight: 700 !important;
                padding: 4px 18px !important;
                border-radius: 4px !important;
            }

            /* Team Arrows (►, ◄) */
            .room-view .teams button.arrow,
            .room-view .header button.arrow {
                min-width: 32px !important;
                padding: 4px 8px !important;
            }

            /* Start Game Button (Prominent & Classic) */
            .room-view button[data-hook="start"] {
                background: #204975 !important;
                background-color: #204975 !important;
                color: #ffffff !important;
                font-weight: 700 !important;
                font-size: 14px !important;
                height: 36px !important;
                padding: 6px 28px !important;
                border: 1px solid #163658 !important;
                border-radius: 5px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45) !important;
                cursor: pointer !important;
                margin-top: 10px !important;
            }

            .room-view button[data-hook="start"]:hover {
                background: #2b5d94 !important;
                background-color: #2b5d94 !important;
                border-color: #204975 !important;
                color: #ffffff !important;
                transform: translateY(-1px) !important;
            }

            /* Pick Stadium Button */
            .room-view button[data-hook="pick"] {
                height: 26px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                padding: 3px 16px !important;
            }

            /* Inputs in Room View (Time limit, Score limit) */
            .room-view input {
                background: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.14) !important;
                border-radius: 4px !important;
                color: #ffffff !important;
                padding: 3px 8px !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                height: 26px !important;
                width: 75px !important;
                box-sizing: border-box !important;
                text-align: center !important;
            }

            /* General Dialog Buttons (e.g. Create Room, Settings) */
            .dialog button,
            .header-btns button {
                background: #1e222b !important;
                color: #e2e8f0 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 4px !important;
                font-weight: 600 !important;
                font-size: 12px !important;
                height: 28px !important;
                padding: 3px 16px !important;
                box-sizing: border-box !important;
                cursor: pointer !important;
                box-shadow: none !important;
                transition: all 0.15s ease !important;
            }

            .dialog button:hover,
            .header-btns button:hover {
                background: #282f3d !important;
                color: #ffffff !important;
                border-color: var(--vexa-accent, #10b981) !important;
                box-shadow: 0 0 10px rgba(var(--vexa-accent-rgb, 16, 185, 129), 0.35) !important;
            }

            /* Dialog Action Buttons (Create, Ok) */
            .dialog button[data-hook="create"],
            .dialog button[data-hook="ok"] {
                background: #204975 !important;
                color: #ffffff !important;
                border: 1px solid #163658 !important;
                border-radius: 4px !important;
                font-weight: 700 !important;
                font-size: 12.5px !important;
                height: 28px !important;
                padding: 3px 18px !important;
            }

            .dialog button[data-hook="create"]:hover,
            .dialog button[data-hook="ok"]:hover {
                background: #2b5d94 !important;
                color: #ffffff !important;
            }

            /* Boolean Toggles (e.g. "Show in room list: Yes") */
            .dialog .bool,
            .dialog .dropdown {
                background: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 4px !important;
                color: #ffffff !important;
                padding: 2px 8px !important;
                font-size: 11.5px !important;
                height: 22px !important;
                box-sizing: border-box !important;
                font-weight: 600 !important;
                box-shadow: none !important;
            }
            .dialog .bool.on {
                border-color: rgba(255, 255, 255, 0.22) !important;
                color: #ffffff !important;
                box-shadow: none !important;
            }

            /* =========================================================================
               TRANSPARENT MODE (ACTIVE ONLY WHEN Transparent ✔ is ON)
               ========================================================================= */
            body.vexa-ui-transparent .dialog,
            body.vexa-ui-transparent .choose-nickname-view .dialog,
            body.vexa-ui-transparent .room-view .container {
                background: rgba(14, 16, 22, 0.62) !important;
                background-color: rgba(14, 16, 22, 0.62) !important;
                backdrop-filter: blur(14px) !important;
                -webkit-backdrop-filter: blur(14px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5) !important;
            }

            body.vexa-ui-transparent .dialog .list,
            body.vexa-ui-transparent .choose-nickname-view .dialog .list,
            body.vexa-ui-transparent .room-view .list,
            body.vexa-ui-transparent .room-view .player-list-view .list,
            body.vexa-ui-transparent .dialog .section,
            body.vexa-ui-transparent .label-input {
                background: rgba(8, 10, 14, 0.45) !important;
                background-color: rgba(8, 10, 14, 0.45) !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
            }

            body.vexa-ui-transparent .dialog input[type="text"],
            body.vexa-ui-transparent .dialog input[type="password"],
            body.vexa-ui-transparent .dialog input[type="search"],
            body.vexa-ui-transparent .dialog select,
            body.vexa-ui-transparent .choose-nickname-view input,
            body.vexa-ui-transparent .room-view input,
            body.vexa-ui-transparent .room-view select {
                background: rgba(6, 8, 12, 0.5) !important;
                background-color: rgba(6, 8, 12, 0.5) !important;
            }

            /* Make bottom section containers completely transparent ALWAYS */
            .bottom-section,
            .chatbox-view,
            .bottom-spacer {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }
        `;

        const premiumRoomlistCSS = `
            /* Vexa Client - Room List matching Image 3 (HaxScript Client Style) */
            .roomlist-view .dialog {
                background: #141518 !important;
                background-color: #141518 !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.75) !important;
                border-radius: 10px !important;
                padding: 20px !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            body.vexa-ui-transparent .roomlist-view .dialog {
                background: rgba(14, 16, 22, 0.65) !important;
                background-color: rgba(14, 16, 22, 0.65) !important;
                backdrop-filter: blur(14px) !important;
                -webkit-backdrop-filter: blur(14px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }

            .roomlist-view .dialog h1,
            .roomlist-view .dialog .header {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
                font-weight: 700 !important;
                color: #ffffff !important;
                border: none !important;
                border-bottom: 2px solid #e13c3c !important;
                padding-bottom: 5px !important;
                margin-bottom: 8px !important;
                letter-spacing: 0 !important;
                text-transform: none !important;
                font-size: 18px !important;
            }

            .roomlist-view .dialog p,
            .roomlist-view .dialog .tip {
                color: #94a3b8 !important;
                font-size: 11.5px !important;
                margin-bottom: 6px !important;
                line-height: 1.4 !important;
            }

            /* Main List Container: Harmonized Client Deep Dark Theme (#0d0f12) */
            .roomlist-view .dialog .list,
            body.vexa-ui-transparent .roomlist-view .dialog .list,
            body.vexa-ui-transparent .dialog.roomlist-view > .list {
                background: #0d0f12 !important;
                background-color: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 6px !important;
                padding: 0 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }

            .roomlist-view table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            }

            .roomlist-view th {
                background: #121418 !important;
                position: sticky !important;
                top: 0 !important;
                z-index: 10 !important;
                color: #ffffff !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                text-transform: capitalize !important;
                letter-spacing: 0.3px !important;
                padding: 6px 10px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                text-align: left !important;
            }

            /* Rows: Uniform clean background matching client */
            .roomlist-view tbody tr {
                background: transparent !important;
                border: none !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
                height: 24px !important;
                transition: background 0.1s ease !important;
            }

            .roomlist-view tbody tr:nth-child(even) {
                background: transparent !important;
            }

            .roomlist-view tbody tr:hover {
                background: rgba(255, 255, 255, 0.05) !important;
                cursor: pointer !important;
            }

            /* Selected Row: Clean Emerald tint highlight */
            .roomlist-view tbody tr.selected {
                background: rgba(16, 185, 129, 0.2) !important;
                color: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 4px !important;
            }

            .roomlist-view td {
                padding: 3px 10px !important;
                border: none !important;
                font-size: 12.5px !important;
                font-weight: 400 !important;
                color: #ffffff !important;
                letter-spacing: 0.2px !important;
                vertical-align: middle !important;
                line-height: normal !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            }

            .roomlist-view td[data-hook="name"],
            .roomlist-view td:first-child {
                font-weight: 400 !important;
                color: #ffffff !important;
                max-width: 320px !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }

            .roomlist-view td[data-hook="players"] {
                font-weight: 400 !important;
                color: #ffffff !important;
                white-space: nowrap !important;
            }

            .roomlist-view td[data-hook="pass"] {
                font-weight: 400 !important;
                color: #ffffff !important;
                white-space: nowrap !important;
            }

            .roomlist-view td[data-hook="distance"] {
                font-weight: 400 !important;
                color: #ffffff !important;
                white-space: nowrap !important;
            }

            /* Search Bar Wrapper & Layout (Image 3) */
            #vexa-search-wrapper {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-top: 8px !important;
                margin-bottom: 10px !important;
                width: 100% !important;
            }

            #searchRoom,
            .roomlist-view input[type="search"],
            .roomlist-view input[type="text"] {
                flex: 1 !important;
                width: auto !important;
                background: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 6px !important;
                color: #ffffff !important;
                padding: 6px 10px !important;
                font-size: 11.5px !important;
                font-weight: 500 !important;
                font-family: inherit !important;
                transition: all 0.15s ease !important;
            }

            #searchRoom::placeholder {
                color: #64748b !important;
            }

            #searchRoom:focus,
            .roomlist-view input[type="search"]:focus,
            .roomlist-view input[type="text"]:focus {
                border-color: rgba(255, 255, 255, 0.35) !important;
                box-shadow: none !important;
                outline: none !important;
                color: #ffffff !important;
            }

            /* Country Search Button & Dropdown */
            #searchRoomByCountry {
                position: relative !important;
                z-index: 99999 !important;
                min-width: 110px !important;
                flex-shrink: 0 !important;
                background: #0d0f12 !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 6px !important;
                color: #ffffff !important;
                font-weight: 700 !important;
                font-size: 11px !important;
                padding: 7px 12px !important;
                text-transform: capitalize !important;
                letter-spacing: 0.3px !important;
                cursor: pointer !important;
                transition: all 0.15s ease !important;
                text-align: center !important;
            }

            #searchRoomByCountry:hover {
                border-color: var(--vexa-accent) !important;
                color: var(--vexa-accent) !important;
                background: rgba(255, 255, 255, 0.04) !important;
            }

            #dropdown-content {
                position: absolute !important;
                top: 100% !important;
                left: 0 !important;
                z-index: 999999 !important;
                background: rgba(10, 14, 20, 0.98) !important;
                border: 1px solid rgba(var(--vexa-accent-rgb), 0.4) !important;
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.95), 0 0 20px rgba(var(--vexa-accent-rgb), 0.2) !important;
                border-radius: 8px !important;
                max-height: 220px !important;
                overflow-y: auto !important;
                padding: 6px 0 !important;
                min-width: 120px !important;
            }

            #dropdown-content::-webkit-scrollbar,
            .roomlist-view .dialog .list::-webkit-scrollbar {
                width: 5px !important;
                height: 5px !important;
            }

            #dropdown-content::-webkit-scrollbar-track,
            .roomlist-view .dialog .list::-webkit-scrollbar-track {
                background: rgba(10, 14, 20, 0.6) !important;
                border-radius: 4px !important;
            }

            #dropdown-content::-webkit-scrollbar-thumb,
            .roomlist-view .dialog .list::-webkit-scrollbar-thumb {
                background: rgba(var(--vexa-accent-rgb), 0.4) !important;
                border-radius: 4px !important;
            }

            #dropdown-content::-webkit-scrollbar-thumb:hover,
            .roomlist-view .dialog .list::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.4) !important;
                box-shadow: none !important;
            }

            #dropdown-content ul {
                list-style: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            #dropdown-content li {
                display: flex !important;
                align-items: center !important;
                padding: 6px 12px !important;
                cursor: pointer !important;
                transition: background 0.15s ease !important;
            }

            #dropdown-content li:hover {
                background: rgba(var(--vexa-accent-rgb), 0.25) !important;
            }

            #dropdown-content a {
                color: #ffffff !important;
                text-decoration: none !important;
                font-size: 11px !important;
                font-weight: bold !important;
                text-transform: uppercase !important;
                margin-left: 8px !important;
            }

            /* Right Action Buttons Panel - Full Image 3 Style (Solid Accent, black bold text, rounded) */
            .roomlist-view .buttons {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
            }

            .roomlist-view .dialog .tools,
            .roomlist-view .tools {
                margin-top: 6px !important;
                margin-bottom: 0 !important;
                position: static !important;
                top: auto !important;
                bottom: auto !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
            }

            /* Action Buttons: Transparent/Dark Theme with Orange Borders on Hover */
            .roomlist-view button,
            .roomlist-view .buttons button,
            .roomlist-view .tools button,
            body .roomlist-view button[data-hook="join"] {
                background-color: rgba(20, 23, 29, 0.75) !important;
                background: rgba(20, 23, 29, 0.75) !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 6px !important;
                font-weight: 600 !important;
                font-size: 12px !important;
                height: 32px !important;
                padding: 0 14px !important;
                transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
                text-transform: capitalize !important;
                letter-spacing: 0.3px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                transform: none !important;
                filter: none !important;
            }

            /* Mouse ustundeyken kenarlari ve parildamasi secili tema rengi */
            .roomlist-view button:hover,
            .roomlist-view .buttons button:hover,
            .roomlist-view .tools button:hover,
            body .roomlist-view button[data-hook="join"]:not(:disabled):hover {
                background-color: rgba(28, 33, 42, 0.85) !important;
                background: rgba(28, 33, 42, 0.85) !important;
                border: 1px solid var(--vexa-accent, #10b981) !important;
                border-color: var(--vexa-accent, #10b981) !important;
                box-shadow: 0 0 12px rgba(var(--vexa-accent-rgb, 16, 185, 129), 0.45) !important;
                color: #ffffff !important;
                transform: none !important;
                filter: none !important;
            }

            /* Join Room: Asla yeşil yanmaz, şeffaf/koyu ve diğer butonlarla aynı */
            body .roomlist-view button[data-hook="join"]:disabled,
            .roomlist-view button[data-hook="join"]:disabled {
                background: rgba(20, 23, 29, 0.4) !important;
                background-color: rgba(20, 23, 29, 0.4) !important;
                color: #64748b !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                box-shadow: none !important;
                filter: none !important;
                transform: none !important;
            }

            body .roomlist-view button[data-hook="join"]:not(:disabled),
            .roomlist-view button[data-hook="join"]:not(:disabled) {
                background: rgba(20, 23, 29, 0.75) !important;
                background-color: rgba(20, 23, 29, 0.75) !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                font-weight: 600 !important;
                opacity: 1 !important;
                cursor: pointer !important;
                box-shadow: none !important;
                filter: none !important;
            }

            .roomlist-view button:active {
                transform: translateY(1px) !important;
                box-shadow: none !important;
            }

            /* Bottom Filter Checkboxes - Yatay scrollbar tamamen engellendi */
            .roomlist-view .dialog,
            .dialog.roomlist-view {
                overflow-x: hidden !important;
            }

            .roomlist-view .filters {
                margin-top: 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 5px !important;
                flex-wrap: nowrap !important;
                overflow: hidden !important;
                overflow-x: hidden !important;
                padding-bottom: 0 !important;
                width: 100% !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            .roomlist-view .filters::-webkit-scrollbar,
            .dialog::-webkit-scrollbar:horizontal {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            .roomlist-view .filters .bool,
            .roomlist-view .filters .vexa-custom-btn {
                background: rgba(20, 23, 29, 0.75) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 6px !important;
                padding: 4px 8px !important;
                font-size: 11px !important;
                white-space: nowrap !important;
                color: #cbd5e1 !important;
                transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                cursor: pointer !important;
                user-select: none !important;
                flex-shrink: 0 !important;
            }

            .roomlist-view .filters .bool:hover,
            .roomlist-view .filters .vexa-custom-btn:hover {
                background: rgba(28, 33, 42, 0.85) !important;
                border: 1px solid var(--vexa-accent, #10b981) !important;
                border-color: var(--vexa-accent, #10b981) !important;
                box-shadow: 0 0 10px rgba(var(--vexa-accent-rgb, 16, 185, 129), 0.35) !important;
                color: #ffffff !important;
            }
        `;


        const styleEl = document.createElement('style');
        styleEl.innerHTML = hideNativeStatsCSS + vexaThemeCSS + premiumRoomlistCSS;
        document.head.appendChild(styleEl);

        // Performans optimizasyonu: Her frame'de querySelector/localStorage yapmamak için önbellek
        let _lastIframeDoc = null;
        let _filtersFound = false;
        let _headerBtnsFound = false;
        let _statsViewFound = false;
        let _lastSyncTime = 0;

        function syncAccentVars(targetDoc) {
            if (!targetDoc || !targetDoc.documentElement) return;
            const currentAccent = localStorage.getItem('hax_accent_color') || '#10b981';
            let hex = currentAccent.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
            const r = parseInt(hex.substring(0, 2), 16) || 16;
            const g = parseInt(hex.substring(2, 4), 16) || 185;
            const b = parseInt(hex.substring(4, 6), 16) || 129;
            targetDoc.documentElement.style.setProperty('--vexa-accent', currentAccent);
            targetDoc.documentElement.style.setProperty('--vexa-accent-rgb', `${r}, ${g}, ${b}`);
        }

        // Şeffaflık durumunu önbelleğe al - her frame localStorage okumak FPS öldürür
        let _cachedTransparent = localStorage.getItem('vexa-ui-transparent') === 'true';
        window.addEventListener('storage', (e) => {
            if (e.key === 'vexa-ui-transparent') {
                setTransparencyState(e.newValue === 'true');
            } else if (e.key === 'hax_accent_color') {
                syncAccentVars(document);
                const iframe = document.querySelector(".gameframe") || document.querySelector("iframe");
                if (iframe && iframe.contentDocument) syncAccentVars(iframe.contentDocument);
            }
        });

        function setTransparencyState(active) {
            _cachedTransparent = !!active;
            localStorage.setItem('vexa-ui-transparent', _cachedTransparent);
            
            const docs = [document];
            const iframe = document.querySelector(".gameframe") || document.querySelector("iframe");
            if (iframe && iframe.contentDocument) docs.push(iframe.contentDocument);

            docs.forEach(doc => {
                if (!doc || !doc.body) return;
                doc.body.classList.toggle('vexa-ui-transparent', _cachedTransparent);
                const transBtn = doc.getElementById('vexa-trans-btn');
                if (transBtn) {
                    const icon = transBtn.querySelector('i');
                    if (icon) icon.className = _cachedTransparent ? 'icon-ok' : 'icon-cancel';
                }

                const roomTransBtn = doc.getElementById('vexa-room-trans-btn');
                if (roomTransBtn) {
                    roomTransBtn.innerHTML = `<span>Transparent</span> <i class="${_cachedTransparent ? 'icon-ok' : 'icon-cancel'}"></i>`;
                }

                try { syncCustomBackgroundForDoc(doc); } catch(e) {}
            });
        }

        // Iframe içine de enjekte et (Transparency ve Buton Enjeksiyonu)
        function injectIframeContent() {
            const iframe = document.querySelector(".gameframe");
            if (!iframe) return;
            const doc = iframe.contentDocument;
            if (!doc) return;

            // Doküman değiştiyse (sayfa yenilendi/oda değişti) önbelleği sıfırla
            if (_lastIframeDoc !== doc) {
                _lastIframeDoc = doc;
                _statsViewFound = false;
            }

            // Tema rengi değişkenlerini iframe'e garantiye al
            syncAccentVars(doc);

            // 1. CSS Enjeksiyonu (Sadece yoksa)
            if (!doc.getElementById('vexa-iframe-css')) {
                const s = doc.createElement('style');
                s.id = 'vexa-iframe-css';
                s.innerHTML = hideNativeStatsCSS + vexaThemeCSS + premiumRoomlistCSS;
                const target = doc.head || doc.documentElement;
                if (target) target.appendChild(s);
            }

            syncNativeStatsVisibility();

            // 2. Arka plan ve DOM tarama senkronizasyonu (Hızlı - Throttle ile 250ms'de bir)
            try {
                const now = performance.now();
                if (now - _lastSyncTime > 250) {
                    _lastSyncTime = now;
                    const gameActive = syncGameRenderMode(doc);
                    syncGameRenderMode(document, gameActive);
                    syncCustomBackgroundForDoc(doc, gameActive);
                    syncCustomBackgroundForDoc(document, gameActive);

                    // 4. Buton Enjeksiyonları - Herhangi bir menüden (Settings, Create Room vs.) geri dönüldüğünde buton kaybolmaz
                    const filters = doc.querySelector('.filters');
                    if (filters) {
                        const roomDialog = filters.closest('.dialog');
                        if (roomDialog && !roomDialog.classList.contains('vexa-roomlist')) {
                            roomDialog.classList.add('vexa-roomlist');
                        }

                        let transBtn = doc.getElementById('vexa-trans-btn');
                        if (!transBtn || !filters.contains(transBtn)) {
                            if (transBtn) transBtn.remove();
                            transBtn = doc.createElement('span');
                            transBtn.id = 'vexa-trans-btn';
                            transBtn.className = 'bool vexa-custom-btn';
                            transBtn.innerHTML = `<span>Transparent</span><i class="${_cachedTransparent ? 'icon-ok' : 'icon-cancel'}"></i>`;
                            filters.appendChild(transBtn);
                            
                            transBtn.addEventListener('click', () => {
                                setTransparencyState(!_cachedTransparent);
                            });
                        }
                    }

                    const headerBtns = doc.querySelector('.header-btns');
                    if (headerBtns) {
                        let roomTransBtn = doc.getElementById('vexa-room-trans-btn');
                        if (!roomTransBtn || !headerBtns.contains(roomTransBtn)) {
                            if (roomTransBtn) roomTransBtn.remove();
                            roomTransBtn = doc.createElement('button');
                            roomTransBtn.id = 'vexa-room-trans-btn';
                            roomTransBtn.innerHTML = `<span>Transparent</span> <i class="${_cachedTransparent ? 'icon-ok' : 'icon-cancel'}"></i>`;
                            
                            const recBtn = doc.querySelector('[data-hook="rec-btn"]');
                            if (recBtn) {
                                headerBtns.insertBefore(roomTransBtn, recBtn);
                            } else {
                                headerBtns.appendChild(roomTransBtn);
                            }
                            
                            roomTransBtn.addEventListener('click', () => {
                                setTransparencyState(!_cachedTransparent);
                            });
                        }
                    }
                }
            } catch(e) {}

            // 3. Şeffaflık Sınıfı Senkronizasyonu (Hızlı - her frame, ama localStorage yok)
            if (doc.body) {
                const hasClass = doc.body.classList.contains('vexa-ui-transparent');
                if (_cachedTransparent && !hasClass) {
                    doc.body.classList.add('vexa-ui-transparent');
                } else if (!_cachedTransparent && hasClass) {
                    doc.body.classList.remove('vexa-ui-transparent');
                }
            }

            // 5. İnce Saha Çizgileri Hook (WebGL DPI Override & Canvas Stroke)
            const win = iframe.contentWindow;
            if (win && !win._vexaThinHooked) {
                win._vexaThinHooked = true;
                let currentIsThin = localStorage.getItem('hax_thin_lines') === 'true';
                
                try {
                    const proto = Object.getPrototypeOf(win);
                    const origGetDPI = Object.getOwnPropertyDescriptor(proto, 'devicePixelRatio');
                    Object.defineProperty(win, 'devicePixelRatio', {
                        get: function() {
                            if (currentIsThin) return 1.5; 
                            return origGetDPI ? origGetDPI.get.call(win) : 1;
                        }
                    });
                } catch(e) {}

                try {
                    const origStroke = win.CanvasRenderingContext2D.prototype.stroke;
                    win.CanvasRenderingContext2D.prototype.stroke = function() {
                        if (currentIsThin) {
                            if (this.lineWidth > 1) this.lineWidth = 1;
                        }
                        return origStroke.apply(this, arguments);
                    };
                } catch(e) {}

                window.addEventListener('storage', (e) => {
                    if (e.key === 'hax_thin_lines') {
                        currentIsThin = e.newValue === 'true';
                        win.dispatchEvent(new Event('resize'));
                    }
                });

                if (window._attachKeystrokeToIframe) {
                    window._attachKeystrokeToIframe(win);
                }
            }
        }

        // --- Anında Inject Sistemi (0ms) ---
        // Iframe'in içindeki DOM sürekli olarak değiştiği için en güvenli ve
        // en hızlı (0ms gecikme) yöntem requestAnimationFrame ile sürekli taramaktır.
        // Bu sayede load eventini beklemeden, elementler oluştuğu salisede stil alır.
        function continuousInjectLoop() {
            injectIframeContent();
            requestAnimationFrame(continuousInjectLoop);
        }
        continuousInjectLoop();

        // --- Auto REC Sistemi ---
        // HaxBall'ın rec butonuna odaya girince otomatik tıklar, çıkınca durdurur
        let _autoRecInRoom = false;      // şu an odada mıyız
        let _autoRecStarted = false;     // kayıt başlatıldı mı
        let _autoRecCheckCount = 0;      // rec butonu görünene kadar deneme sayacı

        setInterval(() => {
            const isAutoRec = localStorage.getItem('hax_auto_rec') === 'true';
            if (!isAutoRec) {
                _autoRecInRoom = false;
                _autoRecStarted = false;
                return;
            }
            const iframe = document.querySelector('.gameframe');
            if (!iframe || !iframe.contentDocument) {
                _autoRecInRoom = false;
                _autoRecStarted = false;
                return;
            }
            const doc = iframe.contentDocument;

            // Odada mıyız? (game-state-view görünüyor mu)
            const gameView = doc.querySelector('.game-state-view');
            const inRoom = !!(gameView);

            if (inRoom && !_autoRecInRoom) {
                // Odaya yeni girdik
                _autoRecInRoom = true;
                _autoRecStarted = false;
                _autoRecCheckCount = 0;
            } else if (!inRoom && _autoRecInRoom) {
                // Odadan çıktık — kayıt zaten HaxBall tarafından durduruluyor (dosyayı kaydeder)
                _autoRecInRoom = false;
                _autoRecStarted = false;
            }

            // Oda içindeyiz ve kayıt henüz başlatılmadı ve auto-rec açık
            if (inRoom && !_autoRecStarted && isAutoRec) {
                _autoRecCheckCount++;
                // Rec butonunu bul ve tıkla (maks 30 deneme = ~3 sn)
                const recBtn = doc.querySelector('[data-hook="rec-btn"]');
                if (recBtn) {
                    // Zaten kayıt yapılıyorsa tekrar tıklama
                    const isRecording = recBtn.classList.contains('active') || 
                                       recBtn.getAttribute('data-recording') === 'true' ||
                                       recBtn.style.color === 'red' ||
                                       recBtn.querySelector('.icon-record') !== null;
                    if (!isRecording) {
                        // Oda adını DOM'dan al ve Electron'a gönder
                        try {
                            const roomNameEl = doc.querySelector('.room-name') ||
                                              doc.querySelector('.game-state-view h1') ||
                                              doc.querySelector('.game-state-view .name') ||
                                              doc.querySelector('.header-btns .name');
                            const roomName = roomNameEl ? roomNameEl.textContent.trim() : 'Oda';
                            if (window.electronAPI && window.electronAPI.setRoomName) {
                                window.electronAPI.setRoomName(roomName);
                            }
                        } catch(e) {}
                        recBtn.click();
                    }
                    _autoRecStarted = true;
                } else if (_autoRecCheckCount > 30) {
                    // 3 saniyede bulunamadı, vazgeç
                    _autoRecStarted = true;
                }
            }
        }, 100);

        const targetFps = isFpsUnlocked ? unlockedFpsCap : monitorHz;
        const frameTime = 1000 / targetFps;

        const originalRAF = targetWindow.requestAnimationFrame.bind(targetWindow);
        const originalCAF = targetWindow.cancelAnimationFrame.bind(targetWindow);

        // 1. FPS Modu
        if (isFpsUnlocked) {
            console.log("[Vexa HaxBall Client] FPS Unlocker AKTIF (Native rAF + Electron Flags - 1000+ FPS, sifir lag)");
            // HaxBall OG Client gibi, JS ile rAF'i bozmuyoruz. 
            // Electron'daki --disable-frame-rate-limit ve --disable-gpu-vsync flag'leri
            // native rAF'i zaten limitsiz calistiracaktir.
            // Bu sayede event loop hicbir sekilde bozulmaz, lag/takilma olmaz!
        } else {
            // FPS KAPALI ise monitör Hz'ine kilitle
            targetWindow.requestAnimationFrame = function(callback) {
                return setTimeout(() => callback(performance.now()), frameTime);
            };
            targetWindow.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
            console.log("[Vexa HaxBall Client] FPS Limiter AKTIF (" + monitorHz + " Hz)");
        }

        // --- Custom Background Engine ---
        function isGameActiveDoc(doc) {
            if (!doc || !doc.body) return false;

            const isVisible = (el) => {
                if (!el) return false;
                // offsetParent is a very fast way to check if an element or its parents have display: none
                // Note: it returns null for fixed elements, but game-view and canvas are not fixed in Haxball
                return el.offsetParent !== null;
            };

            const gameView = doc.querySelector('.game-view');
            const canvas = doc.querySelector('canvas');
            
            // Eğer game-view veya canvas DOM'da yoksa veya gizliyse (display:none), oyun aktif değildir
            if (!gameView || !canvas || !isVisible(gameView) || !isVisible(canvas)) {
                return false;
            }

            // Oyun aktif görünüyor, ek olarak ekranda 'Start Game' butonu var mı kontrol et
            // (Sadece gameView ve canvas görünürken bu masraflı işlemi yapıyoruz)
            const buttons = doc.querySelectorAll('button, .button, [role="button"]');
            for (let i = 0; i < buttons.length; i++) {
                const el = buttons[i];
                if (/start\s*game/i.test(el.textContent || '')) {
                    if (isVisible(el)) return false;
                }
            }

            return true;
        }

        function syncGameRenderMode(doc, forcedActive) {
            if (!doc || !doc.body) return false;
            const gameActive = typeof forcedActive === 'boolean' ? forcedActive : isGameActiveDoc(doc);
            doc.body.classList.toggle('vexa-game-active', gameActive);
            return gameActive;
        }

        function syncCustomBackgroundForDoc(doc, forcedGameActive) {
            if (!doc || !doc.body) return;
            let currentBgPath = localStorage.getItem('hax_custom_bg');
            if (!currentBgPath || currentBgPath === 'null' || currentBgPath === 'undefined') {
                const defaultBg = window.VEXA_DEFAULT_BG || (window.VEXA_INJECT_BASE_URL ? (window.VEXA_INJECT_BASE_URL.replace(/\/$/, '') + '/backgrounds/vexa-default.png') : 'backgrounds/vexa-default.png');
                currentBgPath = defaultBg;
                localStorage.setItem('hax_custom_bg', defaultBg);
                localStorage.setItem('hax_custom_bg_name', 'Vexa Default');
            }
            const gameActive = syncGameRenderMode(doc, forcedGameActive);

            if (currentBgPath) {
                if (!doc.body.classList.contains('vexa-has-custom-bg')) {
                    doc.body.classList.add('vexa-has-custom-bg');
                }
                
                let container = doc.getElementById('vexa-custom-bg-container');
                if (!container) {
                    container = doc.createElement('div');
                    container.id = 'vexa-custom-bg-container';
                    Object.assign(container.style, {
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        width: '100vw',
                        height: '100vh',
                        zIndex: '-10000',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                    });
                    doc.body.appendChild(container);
                }

                // Oyun aktifse arka planı gizle (Ekran kartı yorulmasın)
                container.style.display = gameActive ? 'none' : 'block';

                if (container.dataset.bgPath !== currentBgPath) {
                    container.innerHTML = '';
                    container.dataset.bgPath = currentBgPath;

                    const isVideo = currentBgPath.match(/\.(mp4|webm|mkv|mov|avi)($|\?)/i);
                    if (isVideo) {
                        const video = doc.createElement('video');
                        video.src = currentBgPath;
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.dataset.vexaBgVideo = 'true';
                        Object.assign(video.style, {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        });
                        container.appendChild(video);
                        video.play().catch(err => console.log('Video play error:', err));
                    } else {
                        const img = doc.createElement('img');
                        img.src = currentBgPath;
                        img.onerror = () => {
                            const fallbackBg = window.VEXA_DEFAULT_BG;
                            if (fallbackBg && img.src !== fallbackBg) {
                                img.src = fallbackBg;
                                container.dataset.bgPath = fallbackBg;
                                localStorage.setItem('hax_custom_bg', fallbackBg);
                                localStorage.setItem('hax_custom_bg_name', 'Vexa Default');
                            }
                        };
                        Object.assign(img.style, {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        });
                        container.appendChild(img);
                    }
                }

                const bgVideo = container.querySelector('video[data-vexa-bg-video="true"]');
                if (bgVideo) {
                    if (gameActive && !bgVideo.paused) {
                        bgVideo.pause();
                    } else if (!gameActive && bgVideo.paused) {
                        bgVideo.play().catch(err => console.log('Video play error:', err));
                    }
                }
            } else {
                if (doc.body.classList.contains('vexa-has-custom-bg')) {
                    doc.body.classList.remove('vexa-has-custom-bg');
                }
                const container = doc.getElementById('vexa-custom-bg-container');
                if (container) {
                    container.remove();
                }
            }
        }

        // Initialize parent document background
        try { syncCustomBackgroundForDoc(document); } catch(e) {}

        // Listen for changes
        window.addEventListener('hax-custom-bg-changed', (e) => {
            try { syncCustomBackgroundForDoc(document); } catch(e) {}
            try {
                const iframe = document.querySelector(".gameframe");
                if (iframe && iframe.contentDocument) {
                    syncCustomBackgroundForDoc(iframe.contentDocument);
                }
            } catch(e) {}
        });

        // 2. FPS Sayacı Değişkenleri (Global)
        let lastTime = performance.now();
        let frames = 0;
        let lastKnownFps = targetFps;
        let fpsTextNode = null;
        let pingTextNode = null;

        // NetGraph Değişkenleri
        let lastKnownWebRTCPing = null;
        let netGraphContainer = null;
        let netGraphCanvas = null;
        let netGraphCtx = null;
        let pingHistory = [];
        const maxHistoryPoints = 40;
        let lastPingValue = 0;
        let pingJitter = 0;

        // 2.1 WebRTC Stats Collector
        async function getWebRTCPing() {
            try {
                if (!window._vexaActivePCs || window._vexaActivePCs.size === 0) return null;
                for (const pc of window._vexaActivePCs) {
                    try {
                        if (pc.connectionState === 'closed' || pc.iceConnectionState === 'closed') {
                            window._vexaActivePCs.delete(pc);
                            continue;
                        }
                        const stats = await pc.getStats();
                        let ping = null;
                        stats.forEach(report => {
                            if (report.currentRoundTripTime !== undefined && report.currentRoundTripTime > 0) {
                                ping = Math.round(report.currentRoundTripTime * 1000);
                            } else if (report.roundTripTime !== undefined && report.roundTripTime > 0) {
                                ping = Math.round(report.roundTripTime * 1000);
                            }
                        });
                        if (ping !== null && ping > 0) return ping;
                    } catch(e) {}
                }
            } catch(e) {}
            return null;
        }

        // 2.2 Scrape Ping & Loss from Haxball DOM (Stats Bar + Room Player List)
        function getScrapedPingAndLoss() {
            let pingVal = null;
            let maxPingVal = null;
            
            try {
                const docs = [document];
                const iframe = document.querySelector(".gameframe") || document.querySelector("iframe");
                if (iframe) {
                    try {
                        if (iframe.contentDocument) docs.push(iframe.contentDocument);
                        if (iframe.contentWindow && iframe.contentWindow.document) docs.push(iframe.contentWindow.document);
                    } catch(e){}
                }

                for (const doc of docs) {
                    if (!doc) continue;
                    
                    // 1. Try local player's item in room list: <div class="player-list-item"><div data-hook="name">31</div><div data-hook="ping">39</div></div>
                    const localName = getLocalPlayerName(doc);
                    const playerItems = doc.querySelectorAll('.player-list-item, [class*="player-list-item"], .room-view .item');
                    for (let i = 0; i < playerItems.length; i++) {
                        const item = playerItems[i];
                        const nameEl = item.querySelector('[data-hook="name"]');
                        const pingEl = item.querySelector('[data-hook="ping"]');
                        
                        const itemText = (nameEl ? nameEl.textContent : item.textContent || '').trim().toLowerCase();
                        if (pingEl && (!localName || itemText.includes(localName))) {
                            const pText = (pingEl.textContent || '').trim();
                            const matchRange = pText.match(/(\d+)\s*-\s*(\d+)/);
                            if (matchRange) {
                                pingVal = parseInt(matchRange[1]);
                                maxPingVal = parseInt(matchRange[2]);
                                break;
                            }
                            const pNum = parseInt(pText);
                            if (!isNaN(pNum) && pNum >= 0 && pNum < 1000) {
                                pingVal = pNum;
                                break;
                            }
                        }
                    }

                    // 2. Try match stats view (<p data-hook="ping">Ping: 25 - 30</p> or .stats-view)
                    if (pingVal === null) {
                        const statsPingEls = doc.querySelectorAll('.stats-view [data-hook="ping"], [data-hook="ping"], .stats-view p, .stats-view, .fps-view');
                        for (let i = 0; i < statsPingEls.length; i++) {
                            const text = (statsPingEls[i].textContent || '').trim();
                            if (!text) continue;
                            let match = text.match(/Ping[:\s]*(\d+)\s*-\s*(\d+)/i) || text.match(/(\d+)\s*-\s*(\d+)/);
                            if (match) {
                                pingVal = parseInt(match[1]);
                                maxPingVal = parseInt(match[2]);
                                break;
                            }
                            match = text.match(/Ping[:\s]*(\d+)/i) || text.match(/(\d+)/);
                            if (match) {
                                pingVal = parseInt(match[1]);
                                break;
                            }
                        }
                    }

                    if (pingVal !== null) break;
                }
            } catch (e) {}
            
            return { ping: pingVal, maxPing: maxPingVal };
        }

        // 2.3 NetGraph UI Builder
        function ensureNetGraphUI() {
            if (!document.body) return;
            const showNetGraph = localStorage.getItem('hax_net_graph') !== 'false';
            const existing = document.getElementById('vexa-net-graph');
            
            if (!showNetGraph) {
                if (existing) existing.remove();
                return;
            }
            
            if (existing) {
                netGraphContainer = existing;
                netGraphCanvas = document.getElementById('vexa-net-graph-canvas');
                if (netGraphCanvas) netGraphCtx = netGraphCanvas.getContext('2d');
                return;
            }

            netGraphContainer = document.createElement('div');
            netGraphContainer.id = 'vexa-net-graph';
            Object.assign(netGraphContainer.style, {
                position: 'fixed',
                bottom: '15px',
                left: '15px',
                width: '200px',
                backgroundColor: 'rgba(10, 10, 10, 0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                zIndex: '999999',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '11px',
                color: '#fff',
                pointerEvents: 'none',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'opacity 0.3s ease'
            });

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            header.style.paddingBottom = '4px';
            header.style.color = '#888';
            header.style.fontSize = '9px';
            header.style.fontWeight = 'bold';
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = "NET_GRAPH v1.0";
            
            const actionSpan = document.createElement('span');
            actionSpan.style.display = 'flex';
            actionSpan.style.gap = '8px';
            actionSpan.style.alignItems = 'center';
            
            const statusSpan = document.createElement('span');
            statusSpan.style.color = '#10b981';
            statusSpan.innerText = "ONLINE";
            
            const closeBtn = document.createElement('span');
            closeBtn.innerText = "✕";
            closeBtn.style.color = '#555';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontSize = '10px';
            closeBtn.style.pointerEvents = 'auto'; // Make only the close button clickable
            closeBtn.style.transition = 'color 0.2s';
            closeBtn.onmouseover = () => closeBtn.style.color = '#ef4444';
            closeBtn.onmouseout = () => closeBtn.style.color = '#555';
            closeBtn.onclick = () => {
                localStorage.setItem('hax_net_graph', 'false');
                netGraphContainer.remove();
            };
            
            actionSpan.appendChild(statusSpan);
            actionSpan.appendChild(closeBtn);
            header.appendChild(titleSpan);
            header.appendChild(actionSpan);
            
            const statsGrid = document.createElement('div');
            statsGrid.style.display = 'grid';
            statsGrid.style.gridTemplateColumns = '1fr 1fr';
            statsGrid.style.gap = '4px';

            const pingDiv = document.createElement('div');
            pingDiv.id = 'vexa-ng-ping';
            pingDiv.innerHTML = `PING: <span style="color:#10b981; font-weight:bold;">--</span>`;

            const jitterDiv = document.createElement('div');
            jitterDiv.id = 'vexa-ng-jitter';
            jitterDiv.innerHTML = `JTR: <span style="color:#a855f7; font-weight:bold;">--</span>`;

            const maxPingDiv = document.createElement('div');
            maxPingDiv.id = 'vexa-ng-maxping';
            maxPingDiv.innerHTML = `MAX: <span style="color:#f59e0b; font-weight:bold;">--</span>`;

            const fpsDiv = document.createElement('div');
            fpsDiv.id = 'vexa-ng-fps';
            fpsDiv.innerHTML = `FPS: <span style="color:#3b82f6; font-weight:bold;">--</span>`;

            statsGrid.appendChild(pingDiv);
            statsGrid.appendChild(maxPingDiv);
            statsGrid.appendChild(jitterDiv);
            statsGrid.appendChild(fpsDiv);

            netGraphCanvas = document.createElement('canvas');
            netGraphCanvas.id = 'vexa-net-graph-canvas';
            netGraphCanvas.width = 180;
            netGraphCanvas.height = 50;
            netGraphCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            netGraphCanvas.style.border = '1px solid rgba(255, 255, 255, 0.03)';
            netGraphCanvas.style.borderRadius = '2px';
            netGraphCanvas.style.marginTop = '4px';
            
            netGraphCtx = netGraphCanvas.getContext('2d');

            netGraphContainer.appendChild(header);
            netGraphContainer.appendChild(statsGrid);
            netGraphContainer.appendChild(netGraphCanvas);
            document.body.appendChild(netGraphContainer);
        }

        // 2.4 Draw NetGraph Chart on Canvas
        function drawNetGraph(ping, maxPing, jitter, fps) {
            if (!netGraphCtx || !netGraphCanvas) return;
            
            const ctx = netGraphCtx;
            const w = netGraphCanvas.width;
            const h = netGraphCanvas.height;
            
            // Add to history
            pingHistory.push({ ping: ping || 0, maxPing: maxPing || 0 });
            if (pingHistory.length > maxHistoryPoints) {
                pingHistory.shift();
            }
            
            ctx.clearRect(0, 0, w, h);
            
            // Draw grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            for (let y = 10; y < h; y += 15) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            
            let maxVal = 100;
            pingHistory.forEach(pt => {
                if (pt.ping > maxVal) maxVal = pt.ping;
                if (pt.maxPing > maxVal) maxVal = pt.maxPing;
            });
            maxVal = Math.ceil(maxVal / 50) * 50;
            
            if (pingHistory.length > 1) {
                const step = w / (maxHistoryPoints - 1);
                
                // Draw filled gradient area under ping
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
                grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                
                ctx.beginPath();
                pingHistory.forEach((pt, i) => {
                    const x = i * step;
                    const y = h - (pt.ping / maxVal) * (h - 10);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                
                ctx.lineTo((pingHistory.length - 1) * step, h);
                ctx.lineTo(0, h);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
                
                // Draw ping line
                ctx.beginPath();
                pingHistory.forEach((pt, i) => {
                    const x = i * step;
                    const y = h - (pt.ping / maxVal) * (h - 10);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                
                if (ping < 60) ctx.strokeStyle = '#10b981';
                else if (ping < 120) ctx.strokeStyle = '#eab308';
                else ctx.strokeStyle = '#ef4444';
                
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw max ping line
                ctx.beginPath();
                pingHistory.forEach((pt, i) => {
                    if (pt.maxPing > 0) {
                        const x = i * step;
                        const y = h - (pt.maxPing / maxVal) * (h - 10);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                });
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(maxVal + 'ms', w - 4, 10);
        }

        // 2.5 Update NetGraph stats
        async function updateNetGraph(currentFps) {
            try {
                ensureNetGraphUI();
                
                const container = document.getElementById('vexa-net-graph');
                if (!container) return;
                
                let networkStats = getScrapedPingAndLoss();
                let webRTCPing = lastKnownWebRTCPing;
                
                let ping = webRTCPing !== null ? webRTCPing : networkStats.ping;
                let maxPing = networkStats.maxPing;
                
                if (ping !== null) {
                    if (lastPingValue > 0) {
                        const diff = Math.abs(ping - lastPingValue);
                        pingJitter = Math.round(pingJitter * 0.8 + diff * 0.2);
                    }
                    lastPingValue = ping;
                }
                
                const pingEl = document.getElementById('vexa-ng-ping');
                const jitterEl = document.getElementById('vexa-ng-jitter');
                const maxPingEl = document.getElementById('vexa-ng-maxping');
                const fpsEl = document.getElementById('vexa-ng-fps');
                
                if (pingEl) {
                    if (ping !== null) {
                        pingEl.innerHTML = `PING: <span style="font-weight:bold; color:${ping < 60 ? '#10b981' : (ping < 120 ? '#eab308' : '#ef4444')}">${ping} ms</span>`;
                    } else {
                        pingEl.innerHTML = `PING: <span style="color:#666; font-weight:bold;">--</span>`;
                    }
                }
                
                if (jitterEl) {
                    if (ping !== null) {
                        jitterEl.innerHTML = `JTR: <span style="font-weight:bold; color:${pingJitter < 5 ? '#10b981' : (pingJitter < 15 ? '#eab308' : '#ef4444')}">${pingJitter} ms</span>`;
                    } else {
                        jitterEl.innerHTML = `JTR: <span style="color:#666; font-weight:bold;">--</span>`;
                    }
                }
                
                if (maxPingEl) {
                    if (maxPing !== null && maxPing > 0) {
                        maxPingEl.innerHTML = `MAX: <span style="font-weight:bold; color:${maxPing < 60 ? '#10b981' : (maxPing < 120 ? '#eab308' : '#ef4444')}">${maxPing} ms</span>`;
                    } else {
                        maxPingEl.innerHTML = `MAX: <span style="color:#666; font-weight:bold;">--</span>`;
                    }
                }
                
                if (fpsEl) {
                    fpsEl.innerHTML = `FPS: <span style="font-weight:bold; color:${currentFps >= 60 ? '#10b981' : (currentFps >= 30 ? '#eab308' : '#ef4444')}">${currentFps}</span>`;
                }
                
                drawNetGraph(ping, maxPing, pingJitter, currentFps);
            } catch(e) {
                console.error("Error updating NetGraph:", e);
            }
        }

        // 3. FPS & PING UI - Ana sayfaya (üst document) ekle, iframe'e DEĞİL
        function getHeaderAwareTop() {
            const header = document.querySelector('.header') || document.querySelector('header') || document.querySelector('#header');
            if (!header || header.offsetHeight <= 0) return '15px';
            const rect = header.getBoundingClientRect();
            return Math.max(15, Math.ceil(rect.bottom + 8)) + 'px';
        }

        function syncNativeStatsVisibility() {
            const fpsShow = localStorage.getItem('hax_fps_show') === 'true';
            const iframe = document.querySelector(".gameframe") || document.querySelector("iframe");
            const docs = [document];
            if (iframe && iframe.contentDocument) docs.push(iframe.contentDocument);

            docs.forEach(doc => {
                let hideTag = doc.getElementById('vexa-hide-native-stats');
                let showTag = doc.getElementById('vexa-show-native-stats');
                if (fpsShow) {
                    // Vexa FPS Açık -> Haxball orijinal stats gizle
                    if (showTag) showTag.remove();
                    if (!hideTag) {
                        hideTag = doc.createElement('style');
                        hideTag.id = 'vexa-hide-native-stats';
                        hideTag.textContent = '.stats-view, .fps-view { opacity: 0.001 !important; pointer-events: none !important; color: transparent !important; background: transparent !important; }';
                        const target = doc.head || doc.documentElement;
                        if (target) target.appendChild(hideTag);
                    }
                } else {
                    // Vexa FPS Kapalı -> Haxball orijinal stats kesinlikle göster
                    if (hideTag) hideTag.remove();
                    if (!showTag) {
                        showTag = doc.createElement('style');
                        showTag.id = 'vexa-show-native-stats';
                        showTag.textContent = '.stats-view, [data-hook="fps"], [data-hook="ping"], .fps-view { display: block !important; visibility: visible !important; opacity: 1 !important; }';
                        const target = doc.head || doc.documentElement;
                        if (target) target.appendChild(showTag);
                    }
                }
            });
        }

        function ensureFpsUI() {
            syncNativeStatsVisibility();

            const existingCounter = document.getElementById('vexa-fps-counter');
            const hudX = localStorage.getItem('hax_fps_x');
            const hudY = localStorage.getItem('hax_fps_y');
            const hudOpacity = localStorage.getItem('hax_fps_opacity') || '1';
            const hudScale = localStorage.getItem('hax_fps_scale') || '1';

            const fpsShow = localStorage.getItem('hax_fps_show') === 'true';

            if (existingCounter) {
                existingCounter.style.display = fpsShow ? 'flex' : 'none';
                if (hudX !== null && hudY !== null) {
                    existingCounter.style.top = hudY + 'px';
                    existingCounter.style.left = hudX + 'px';
                    existingCounter.style.transform = `scale(${hudScale})`;
                    existingCounter.style.opacity = hudOpacity;
                } else {
                    const nextTop = getHeaderAwareTop();
                    if (existingCounter.style.top !== nextTop) existingCounter.style.top = nextTop;
                    existingCounter.style.left = '15px';
                    existingCounter.style.transform = `scale(${hudScale})`;
                    existingCounter.style.opacity = hudOpacity;
                }
                return;
            }

            const fpsContainer = document.createElement('div');
            fpsContainer.id = 'vexa-fps-counter';
            
            const startTop = (hudX !== null && hudY !== null) ? hudY + 'px' : '-60px';
            const startLeft = (hudX !== null && hudY !== null) ? hudX + 'px' : '15px';

            Object.assign(fpsContainer.style, {
                position: 'fixed', top: startTop, left: startLeft,
                background: '#0a0a0a',
                border: '1px solid #333',
                padding: '5px 12px',
                color: '#888',
                fontFamily: 'Tahoma, Arial, sans-serif',
                fontSize: '11px',
                fontWeight: 'bold',
                zIndex: '999999',
                boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                display: fpsShow ? 'flex' : 'none',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                borderRadius: '6px',
                contain: 'layout paint',
                transform: `scale(${hudScale}) translateZ(0)`,
                transformOrigin: 'top left',
                opacity: hudOpacity,
                willChange: 'transform'
            });

            // FPS Text Node
            const fpsTextNode = document.createElement('span');
            fpsTextNode.className = 'vexa-fps-val';
            fpsTextNode.innerText = "FPS: ...";
            fpsContainer.appendChild(fpsTextNode);

            // Separator
            const sep = document.createElement('span');
            sep.innerText = "•";
            sep.style.color = '#333';
            fpsContainer.appendChild(sep);

            // PING Text Node
            const pingTextNode = document.createElement('span');
            pingTextNode.className = 'vexa-ping-val';
            pingTextNode.innerText = "PING: ...";
            pingTextNode.style.color = '#666';
            fpsContainer.appendChild(pingTextNode);

            document.body.appendChild(fpsContainer);
        }

        // Header yükseklik değişimini (animasyon/daralma) takip edip FPS sayacını anında pürüzsüz kaydır
        let lastHeaderHeight = 48;
        function startHeaderObserver() {
            const header = document.querySelector('.header') || document.querySelector('header') || document.querySelector('#header');
            const fpsEl = document.getElementById('vexa-fps-counter');
            if (!header || !fpsEl || !window.ResizeObserver) return;

            const ro = new ResizeObserver(entries => {
                const entry = entries[0];
                const currentHeight = entry ? entry.contentRect.height : header.offsetHeight;
                if (currentHeight === lastHeaderHeight) return;
                lastHeaderHeight = currentHeight;

                if (localStorage.getItem('hax_fps_y') !== null) return; // Custom HUD position overrides this
                
                const targetTop = getHeaderAwareTop();
                fpsEl.style.transition = 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                fpsEl.style.top = targetTop;
            });
            ro.observe(header);
        }
        // Header enjekte edildikten hemen sonra observer'ı başlat
        setTimeout(startHeaderObserver, 1000);

        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('hax_fps_')) {
                ensureFpsUI();
            }
        });

        // 4. Gerçek FPS Ölçüm Döngüsü (Chromium Native)
        function measureFPS() {
            frames++;
            const now = performance.now();
            const delta = now - lastTime;

            if (delta >= 1000) { 
                const realFps = Math.round((frames / delta) * 1000);
                lastKnownFps = realFps; 

                // measureFPS içinde pozisyon güncellemesi artık ResizeObserver tarafından yapılıyor
                // Burada sadece fallback olarak kontrol et (observer başlamadan önceki ilk saniye)
                const fpsEl = document.getElementById('vexa-fps-counter');
                if (fpsEl && localStorage.getItem('hax_fps_y') === null) {
                    const fallbackTop = getHeaderAwareTop();
                    if (fpsEl.style.top !== fallbackTop && !fpsEl.style.transition) {
                        fpsEl.style.top = fallbackTop;
                    }
                }

                // Vexa FPS UI Güncelleme (Sayaç Açıksa)
                const fpsTextNode = fpsEl ? (fpsEl.querySelector('.vexa-fps-val') || fpsEl.children[0]) : null;
                const pingTextNode = fpsEl ? (fpsEl.querySelector('.vexa-ping-val') || fpsEl.children[2]) : null;

                if (fpsTextNode) {
                    const isLimitEnabled = localStorage.getItem('hax_fps_limit') !== 'false';
                    const targetCap = parseInt(localStorage.getItem('hax_fps_cap')) || 0;
                    
                    let currentFps = realFps;
                    if (isLimitEnabled && targetCap > 0 && currentFps > targetCap) {
                        currentFps = targetCap;
                    }

                    fpsTextNode.innerHTML = `FPS: <span style="font-weight:bold; color:${currentFps >= 60 ? '#10b981' : (currentFps >= 30 ? '#eab308' : '#ef4444')}">${currentFps}</span>`;
                }

                if (pingTextNode) {
                    const networkStats = getScrapedPingAndLoss();
                    const ping = networkStats.ping !== null ? networkStats.ping : lastKnownWebRTCPing;
                    const maxPing = networkStats.maxPing;

                    if (ping !== null) {
                        const pingDisplay = (maxPing !== null && maxPing !== ping) ? `${ping} - ${maxPing} ms` : `${ping} ms`;
                        pingTextNode.innerHTML = `PING: <span style="color:${ping < 50 ? '#10b981' : (ping < 100 ? '#eab308' : '#ef4444')}">${pingDisplay}</span>`;
                    } else if (maxPing !== null) {
                        pingTextNode.innerHTML = `PING: <span style="color:#eab308">${maxPing} ms</span>`;
                    } else {
                        pingTextNode.innerHTML = `PING: <span style="color:#555">--</span>`;
                    }
                }

                frames = 0;
                lastTime = now;
            }

            originalRAF(measureFPS);
        }

        originalRAF(measureFPS);

        // İlk oluştur
        ensureFpsUI();
        // Her 2 saniyede kontrol et, kaybolmuşsa tekrar oluştur
        setInterval(ensureFpsUI, 2000);
        // 5. HaxBall Native FPS Spoof (MutationObserver)
        /* GECICI OLARAK IPTAL EDILDI (Kullanici istegi)
        const findNativeFps = setInterval(() => {
            const nativeFpsText = targetWindow.document.querySelector('[data-hook="fps"]');
            if (nativeFpsText) {
                clearInterval(findNativeFps);
                
                const spoofFps = () => {
                    const spoofValue = "Fps: " + (isFpsUnlocked ? 999 : lastKnownFps);
                    if (nativeFpsText.innerText !== spoofValue) {
                        nativeFpsText.innerText = spoofValue;
                    }
                };

                spoofFps();
                const observer = new MutationObserver(spoofFps);
                observer.observe(nativeFpsText, { childList: true, characterData: true, subtree: true });
            }
        }, 500);
        */

        // 6. NetGraph & WebRTC Stats Update Interval (500ms)
        setInterval(async () => {
            try {
                const webRTCPing = await getWebRTCPing();
                if (webRTCPing !== null) {
                    lastKnownWebRTCPing = webRTCPing;
                }
            } catch(e) {}
            
            const showNetGraph = false; // localStorage.getItem('hax_net_graph') !== 'false'; // GECICI IPTAL
            if (showNetGraph) {
                updateNetGraph(lastKnownFps);
            } else {
                const existing = document.getElementById('vexa-net-graph');
                if (existing) existing.remove();
            }
        }, 500);

        // 7. Hotkey keydown handler for F6 toggle
        const handleToggleHotkey = (e) => {
            if (e.key === 'F6') {
                const showNetGraph = localStorage.getItem('hax_net_graph') !== 'false';
                localStorage.setItem('hax_net_graph', showNetGraph ? 'false' : 'true');
                if (showNetGraph) {
                    const existing = document.getElementById('vexa-net-graph');
                    if (existing) existing.remove();
                } else {
                    updateNetGraph(lastKnownFps);
                }
            }
        };
        document.addEventListener('keydown', handleToggleHotkey);
        try {
            targetWindow.document.addEventListener('keydown', handleToggleHotkey);
        } catch(e) {}

        // 8. Chat Text Shortcuts (Kısayollar) Expander
        const attachChatShortcutsListener = () => {
            try {
                const doc = targetWindow.document;
                const chatInput = doc.querySelector('[data-hook="input"]');
                if (chatInput && !chatInput.dataset.shortcutsBound) {
                    chatInput.dataset.shortcutsBound = "true";
                    chatInput.addEventListener('keydown', (e) => {
                        // Expand on Space (keyCode 32) or Enter (keyCode 13) keydown
                        if (e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32 || e.key === 'Enter' || e.keyCode === 13) {
                            try {
                                const shortcutsStr = localStorage.getItem('hax_chat_shortcuts');
                                if (!shortcutsStr) return;
                                const shortcuts = JSON.parse(shortcutsStr);
                                if (typeof shortcuts !== 'object' || shortcuts === null) return;
                                
                                let text = chatInput.value;
                                let changed = false;
                                
                                for (const [shortcut, expansion] of Object.entries(shortcuts)) {
                                    if (!shortcut) continue;
                                    const escaped = shortcut.replace(/[-\/\\^$*+!.?()[\]{}]/g, '\\$&');
                                    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
                                    if (regex.test(text)) {
                                        text = text.replace(regex, expansion);
                                        changed = true;
                                    }
                                }
                                
                                if (changed) {
                                    chatInput.value = text;
                                    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            } catch (err) {
                                console.error("[Vexa Client] Error expanding chat shortcuts:", err);
                            }
                        }
                    }, true);
                }
            } catch (err) {}
        };
        setInterval(attachChatShortcutsListener, 1000);
        // 9. Discord RPC - Dynamic Game State Observer
        (() => {
            if (!window.haxballAPI || !window.haxballAPI.updateRPC) return;

            let lastRpcState = '';

            function getIframeDoc() {
                try {
                    const iframe = document.querySelector('iframe.gameframe');
                    if (iframe && iframe.contentDocument) return iframe.contentDocument;
                } catch(e) {}
                return null;
            }

            function getNickname() {
                try {
                    const doc = getIframeDoc();
                    const nickInput = doc ? doc.querySelector('.choose-nickname-view [data-hook="input"]') : null;
                    const val = (nickInput && nickInput.value) ? nickInput.value : localStorage.getItem('player_name');
                    if (val) return val.replace(/[\u200B\u200C\u200D]/g, '');
                } catch(e) {}
                return '';
            }



            function isInRoom() {
                try {
                    const doc = getIframeDoc();
                    if (!doc) return false;
                    const roomView = doc.querySelector('.room-view');
                    if (roomView) {
                        const style = doc.defaultView.getComputedStyle(roomView);
                        return style.display !== 'none';
                    }
                } catch(e) {}
                return false;
            }

            function isChoosingNickname() {
                try {
                    const doc = getIframeDoc();
                    if (!doc) return false;
                    const nickView = doc.querySelector('.choose-nickname-view');
                    if (nickView) {
                        const style = doc.defaultView.getComputedStyle(nickView);
                        return style.display !== 'none';
                    }
                } catch(e) {}
                return false;
            }

            let cachedRoomName = '';

            function getRoomName() {
                try {
                    const doc = getIframeDoc();
                    if (!doc) return cachedRoomName;
                    
                    const roomNameEl = doc.querySelector('[data-hook="room-name"]') || doc.querySelector('.room-name');
                    if (roomNameEl && roomNameEl.textContent.trim()) {
                        cachedRoomName = roomNameEl.textContent.trim();
                        return cachedRoomName;
                    }
                } catch(e) {}
                return cachedRoomName;
            }

            function isInGame() {
                try {
                    const doc = getIframeDoc();
                    if (!doc) return false;
                    
                    const gameView = doc.querySelector('.game-view');
                    if (!gameView) return false;

                    // Haxball'da game-view hem lobiyi hem de maci kapsar.
                    // Eger room-view (lobi) gorunur durumdaysa, macta degiliz (lobideyiz).
                    const roomView = doc.querySelector('.room-view');
                    if (roomView) {
                        const style = doc.defaultView.getComputedStyle(roomView);
                        if (style.display !== 'none' && style.visibility !== 'hidden') {
                            return false; 
                        }
                    }
                    
                    // Oda arayuzu gizliyse ve game-view varsa, mactayiz demektir.
                    const gameStyle = doc.defaultView.getComputedStyle(gameView);
                    return gameStyle.display !== 'none';
                } catch(e) {}
                return false;
            }

            function updateDiscordRPC() {
                try {
                    let state = '';
                    let details = 'Vexa Client';
                    const nick = getNickname();
                    const roomName = getRoomName();

                    if (isInGame()) {
                        details = roomName ? roomName : 'Bilinmeyen Oda';
                        state = 'Maçta';
                    } else if (isInRoom()) {
                        details = roomName ? roomName : 'Bilinmeyen Oda';
                        state = 'Odada Bekliyor';
                    } else if (isChoosingNickname()) {
                        details = 'İsim Seçiyor';
                        state = 'Ana Menü';
                        cachedRoomName = ''; 
                    } else {
                        details = 'Oda Listesinde';
                        state = 'Ana Menü';
                        cachedRoomName = ''; 
                    }

                    if (state !== lastRpcState || details !== lastRpcDetails) {
                        lastRpcState = state;
                        lastRpcDetails = details;
                        window.haxballAPI.updateRPC(state, details, nick);
                    }
                } catch(e) {}
            }

            setInterval(updateDiscordRPC, 3000);
            setTimeout(updateDiscordRPC, 2000);
        })();
    }

    // --- HBR2 Replay Loader Injector ---
    if (window.haxballAPI) {
        window.haxballAPI.onLoadReplay((data, filename) => {
            console.log(`[Vexa] Received replay data for ${filename}`);
            try {
                // Ensure data is properly converted to a Uint8Array from IPC
                let rawData;
                if (data.type === 'Buffer' && Array.isArray(data.data)) {
                    rawData = new Uint8Array(data.data);
                } else if (data instanceof Uint8Array) {
                    rawData = data;
                } else {
                    rawData = new Uint8Array(data);
                }
                
                const blob = new Blob([rawData]); 
                const file = new File([blob], filename, { lastModified: Date.now() });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                const injectionPoller = setInterval(() => {
                    const gameIframe = document.querySelector('iframe.gameframe');
                    const targetWindow = gameIframe ? gameIframe.contentWindow : window;
                    const doc = targetWindow.document;

                    // 1. Bypass Nickname Screen
                    const nickView = doc.querySelector('.choose-nickname-view');
                    if (nickView && nickView.offsetParent !== null) {
                        const input = doc.querySelector('.choose-nickname-view [data-hook="input"]');
                        const okBtn = doc.querySelector('.choose-nickname-view [data-hook="ok"]');
                        if (input && okBtn) {
                            if (!input.value) input.value = "Viewer";
                            okBtn.click();
                        }
                    }

                    // 2. Locate and Inject into Replay File Input
                    const fileInput = doc.getElementById('replayfile');
                    if (fileInput) {
                        clearInterval(injectionPoller);
                        fileInput.files = dataTransfer.files;
                        const event = new Event('change', { bubbles: true });
                        fileInput.dispatchEvent(event);
                        console.log(`[Vexa] Automatically injected ${filename} into the replay player!`);
                    }
                }, 500);
            } catch(e) {
                console.error("[Vexa] Error loading replay:", e);
            }
        });
    }

    // --- HUD Editor Mode ---
    function enterHUDEditMode() {
        if (document.getElementById('vexa-hud-editor-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'vexa-hud-editor-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.4)', zIndex: 9999999, backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
        });

        const toolbar = document.createElement('div');
        Object.assign(toolbar.style, {
            background: '#111214', padding: '12px 24px', borderRadius: '0 0 12px 12px',
            border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none',
            display: 'flex', gap: '20px', alignItems: 'center', color: '#fff',
            fontFamily: 'Arial', fontSize: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        });
        toolbar.innerHTML = `
            <div style="font-weight:bold; color:#10b981;">✦ HUD Düzenleme Modu</div>
            <div style="color:#888;">Öğeleri sürükle • Tıklayarak ayarla</div>
            <div style="flex:1;"></div>
            <div id="hud-save-btn" style="background:#10b981; color:#fff; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Kaydet & Çık</div>
        `;
        overlay.appendChild(toolbar);

        const sidePanel = document.createElement('div');
        Object.assign(sidePanel.style, {
            position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)',
            background: '#16171a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '16px', width: '260px', color: '#fff',
            fontFamily: 'Arial', fontSize: '13px', display: 'none', flexDirection: 'column', gap: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
        });
        
        let currentEditingKeyPrefix = ''; // 'hax_fps' veya 'hax_music'
        let currentTargetEl = null;

        sidePanel.innerHTML = `
            <div id="hud-panel-title" style="font-weight:bold; font-size:15px; color:#10b981; border-bottom:1px solid #333; padding-bottom:8px;">Öğe Düzenle</div>
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#aaa;">X Pozisyon:</span>
                <input type="number" id="hud-x-input" style="width:70px; background:#0a0a0a; border:1px solid #333; color:#fff; padding:4px; border-radius:4px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#aaa;">Y Pozisyon:</span>
                <input type="number" id="hud-y-input" style="width:70px; background:#0a0a0a; border:1px solid #333; color:#fff; padding:4px; border-radius:4px;">
            </div>
            
            <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#aaa;">Opaklık:</span><span id="hud-op-val">100%</span></div>
                <input type="range" id="hud-op-slider" min="0.1" max="1" step="0.05" style="width:100%; accent-color:#10b981;">
            </div>
            
            <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#aaa;">Boyut (Scale):</span><span id="hud-scale-val">100%</span></div>
                <input type="range" id="hud-scale-slider" min="0.5" max="1.5" step="0.05" style="width:100%; accent-color:#10b981;">
            </div>

            <div id="hud-reset-btn" style="margin-top:8px; text-align:center; padding:6px; background:#2a0a0a; color:#ff4444; border:1px solid #ff4444; border-radius:6px; cursor:pointer;">Varsayılana Sıfırla</div>
        `;
        overlay.appendChild(sidePanel);
        document.body.appendChild(overlay);

        const targets = [
            { id: 'vexa-fps-counter', prefix: 'hax_fps', name: 'FPS Sayacı' },
            { id: 'vexa-now-playing', prefix: 'hax_music', name: 'Müzik Widget' },
            { id: 'vexa-keystroke', prefix: 'hax_keys', name: 'Tuş Göstergesi' }
        ];

        let dragging = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        const cleanupFns = [];

        targets.forEach(t => {
            const el = document.getElementById(t.id);
            if (!el) return;
            
            const originalBorder = el.style.border;
            const originalBoxShadow = el.style.boxShadow;
            const originalPointerEvents = el.style.pointerEvents;
            const originalZIndex = el.style.zIndex;

            el.style.border = '2px dashed #10b981';
            el.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'move';
            el.style.zIndex = '99999999';

            const onMouseDown = (e) => {
                dragging = t;
                currentTargetEl = el;
                currentEditingKeyPrefix = t.prefix;
                
                const rect = el.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;

                // Update side panel
                sidePanel.style.display = 'flex';
                document.getElementById('hud-panel-title').innerText = t.name;
                document.getElementById('hud-x-input').value = Math.round(rect.left);
                document.getElementById('hud-y-input').value = Math.round(rect.top);
                
                const currentOp = localStorage.getItem(t.prefix + '_opacity') || '1';
                const currentScale = localStorage.getItem(t.prefix + '_scale') || '1';
                
                document.getElementById('hud-op-slider').value = currentOp;
                document.getElementById('hud-op-val').innerText = Math.round(currentOp * 100) + '%';
                
                document.getElementById('hud-scale-slider').value = currentScale;
                document.getElementById('hud-scale-val').innerText = Math.round(currentScale * 100) + '%';

                e.stopPropagation();
                e.preventDefault();
            };

            el.addEventListener('mousedown', onMouseDown);
            
            cleanupFns.push(() => {
                el.style.border = originalBorder;
                el.style.boxShadow = originalBoxShadow;
                el.style.pointerEvents = originalPointerEvents;
                el.style.cursor = '';
                el.style.zIndex = originalZIndex;
                el.removeEventListener('mousedown', onMouseDown);
            });
        });

        const onMouseMove = (e) => {
            if (!dragging || !currentTargetEl) return;
            let x = e.clientX - dragOffsetX;
            let y = e.clientY - dragOffsetY;
            
            // Constrain to window
            x = Math.max(0, Math.min(x, window.innerWidth - currentTargetEl.offsetWidth));
            y = Math.max(0, Math.min(y, window.innerHeight - currentTargetEl.offsetHeight));

            currentTargetEl.style.left = x + 'px';
            currentTargetEl.style.top = y + 'px';
            currentTargetEl.style.bottom = 'auto';
            currentTargetEl.style.right = 'auto';

            document.getElementById('hud-x-input').value = Math.round(x);
            document.getElementById('hud-y-input').value = Math.round(y);
        };

        const onMouseUp = () => {
            if (dragging && currentTargetEl) {
                const rect = currentTargetEl.getBoundingClientRect();
                localStorage.setItem(dragging.prefix + '_x', Math.round(rect.left));
                localStorage.setItem(dragging.prefix + '_y', Math.round(rect.top));
                window.dispatchEvent(new StorageEvent('storage', { key: dragging.prefix + '_x' }));
            }
            dragging = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Inputs logic
        document.getElementById('hud-x-input').onchange = (e) => {
            if(!currentTargetEl) return;
            const val = e.target.value;
            currentTargetEl.style.left = val + 'px';
            localStorage.setItem(currentEditingKeyPrefix + '_x', val);
            window.dispatchEvent(new StorageEvent('storage', { key: currentEditingKeyPrefix + '_x' }));
        };
        document.getElementById('hud-y-input').onchange = (e) => {
            if(!currentTargetEl) return;
            const val = e.target.value;
            currentTargetEl.style.top = val + 'px';
            localStorage.setItem(currentEditingKeyPrefix + '_y', val);
            window.dispatchEvent(new StorageEvent('storage', { key: currentEditingKeyPrefix + '_y' }));
        };
        document.getElementById('hud-op-slider').oninput = (e) => {
            if(!currentTargetEl) return;
            const val = e.target.value;
            currentTargetEl.style.opacity = val;
            document.getElementById('hud-op-val').innerText = Math.round(val * 100) + '%';
            localStorage.setItem(currentEditingKeyPrefix + '_opacity', val);
            window.dispatchEvent(new StorageEvent('storage', { key: currentEditingKeyPrefix + '_opacity' }));
        };
        document.getElementById('hud-scale-slider').oninput = (e) => {
            if(!currentTargetEl) return;
            const val = e.target.value;
            currentTargetEl.style.transform = `scale(${val})`;
            document.getElementById('hud-scale-val').innerText = Math.round(val * 100) + '%';
            localStorage.setItem(currentEditingKeyPrefix + '_scale', val);
            window.dispatchEvent(new StorageEvent('storage', { key: currentEditingKeyPrefix + '_scale' }));
        };
        document.getElementById('hud-reset-btn').onclick = () => {
            if(!currentEditingKeyPrefix) return;
            localStorage.removeItem(currentEditingKeyPrefix + '_x');
            localStorage.removeItem(currentEditingKeyPrefix + '_y');
            localStorage.removeItem(currentEditingKeyPrefix + '_opacity');
            localStorage.removeItem(currentEditingKeyPrefix + '_scale');
            window.dispatchEvent(new StorageEvent('storage', { key: currentEditingKeyPrefix + '_x' }));
            sidePanel.style.display = 'none';
        };

        const closeEditor = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            cleanupFns.forEach(fn => fn());
            overlay.remove();
        };

        document.getElementById('hud-save-btn').onclick = closeEditor;
        
        // Kapatmak için ESC tuşu
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeEditor();
                window.removeEventListener('keydown', onKeyDown);
            }
        };
        window.addEventListener('keydown', onKeyDown);
    }

    window.addEventListener('vexa-hud-edit', enterHUDEditMode);

    // --- Keystroke Overlay ---
    (function initKeystrokesWidget() {
        let keystrokeWidget = null;
        let upKey = null, leftKey = null, downKey = null, rightKey = null, kickKey = null;

        const KEY_MAP = {
            UP: ['KeyW', 'ArrowUp'],
            DOWN: ['KeyS', 'ArrowDown'],
            LEFT: ['KeyA', 'ArrowLeft'],
            RIGHT: ['KeyD', 'ArrowRight'],
            KICK: ['KeyX', 'Space', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'Numpad0']
        };

        const ACTIVE_KEYS = new Set();

        function getAccent() {
            return localStorage.getItem('hax_theme_color') || '#10b981';
        }

        function setKeyActive(el, active) {
            if (!el) return;
            if (active) el.classList.add('active');
            else el.classList.remove('active');
        }

        let keyUIPending = false;
        function scheduleKeyUIUpdate() {
            if (keyUIPending) return;
            keyUIPending = true;
            requestAnimationFrame(() => {
                keyUIPending = false;
                updateKeyUI();
            });
        }

        function updateKeyUI() {
            if (!keystrokeWidget) return;
            const isUp = KEY_MAP.UP.some(k => ACTIVE_KEYS.has(k));
            const isDown = KEY_MAP.DOWN.some(k => ACTIVE_KEYS.has(k));
            const isLeft = KEY_MAP.LEFT.some(k => ACTIVE_KEYS.has(k));
            const isRight = KEY_MAP.RIGHT.some(k => ACTIVE_KEYS.has(k));
            const isKick = KEY_MAP.KICK.some(k => ACTIVE_KEYS.has(k));

            setKeyActive(upKey, isUp);
            setKeyActive(downKey, isDown);
            setKeyActive(leftKey, isLeft);
            setKeyActive(rightKey, isRight);
            setKeyActive(kickKey, isKick);
        }

        function createKeystrokes() {
            if (keystrokeWidget) { keystrokeWidget.remove(); keystrokeWidget = null; }
            if (localStorage.getItem('hax_keystrokes_widget') !== 'true') return;

            // Inject Style if not exists
            if (!document.getElementById('vexa-keystroke-css')) {
                const style = document.createElement('style');
                style.id = 'vexa-keystroke-css';
                style.textContent = `
                    #vexa-keystroke {
                        isolation: isolate;
                        will-change: transform;
                        transform: translateZ(0);
                    }
                    .vx-key {
                        width: 44px; height: 44px;
                        background: rgba(22, 24, 28, 0.9);
                        border: 1px solid rgba(255,255,255,0.05);
                        border-bottom: 4px solid rgba(0,0,0,0.6);
                        border-radius: 8px;
                        display: flex; align-items: center; justify-content: center;
                        color: rgba(255,255,255,0.35);
                        font-family: 'Inter', Tahoma, sans-serif;
                        font-weight: 800; font-size: 16px;
                        transition: none !important;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        user-select: none;
                    }
                    .vx-key.active {
                        background: var(--vx-accent);
                        color: #000000;
                        border-bottom-width: 0px;
                        border-top-width: 4px;
                        border-top-color: transparent;
                        border-color: var(--vx-accent);
                        box-shadow: 0 0 10px var(--vx-accent-glow);
                    }
                    .vx-key.kick {
                        width: 144px; height: 34px;
                        font-size: 13px; letter-spacing: 2px;
                    }
                `;
                document.head.appendChild(style);
            }

            const hudX = localStorage.getItem('hax_keys_x');
            const hudY = localStorage.getItem('hax_keys_y');
            const hudScale = localStorage.getItem('hax_keys_scale') || '1';
            let posCSS = '';
            
            if (hudX !== null && hudY !== null) {
                posCSS = `left: ${hudX}px; top: ${hudY}px; transform-origin: top left; transform: scale(${hudScale});`;
            } else {
                posCSS = `bottom:100px; left:18px; transform-origin: bottom left; transform: scale(${hudScale});`;
            }

            keystrokeWidget = document.createElement('div');
            keystrokeWidget.id = 'vexa-keystroke';
            keystrokeWidget.style.cssText = `
                position: fixed;
                ${posCSS}
                display: flex;
                flex-direction: column;
                gap: 6px;
                z-index: 99998;
                opacity: ${localStorage.getItem('hax_keys_opacity') || '1'};
                transition: opacity 0.3s ease;
                pointer-events: none;
            `;

            const topRow = document.createElement('div');
            topRow.style.cssText = 'display: flex; justify-content: center;';
            upKey = document.createElement('div');
            upKey.className = 'vx-key';
            upKey.innerHTML = 'W';
            topRow.appendChild(upKey);

            const midRow = document.createElement('div');
            midRow.style.cssText = 'display: flex; justify-content: center; gap: 6px;';
            
            leftKey = document.createElement('div');
            leftKey.className = 'vx-key'; leftKey.innerHTML = 'A';
            
            downKey = document.createElement('div');
            downKey.className = 'vx-key'; downKey.innerHTML = 'S';
            
            rightKey = document.createElement('div');
            rightKey.className = 'vx-key'; rightKey.innerHTML = 'D';
            
            midRow.appendChild(leftKey);
            midRow.appendChild(downKey);
            midRow.appendChild(rightKey);

            const botRow = document.createElement('div');
            botRow.style.cssText = 'display: flex; justify-content: center; margin-top: 2px;';
            kickKey = document.createElement('div');
            kickKey.className = 'vx-key kick';
            kickKey.innerHTML = 'KICK';
            botRow.appendChild(kickKey);

            keystrokeWidget.appendChild(topRow);
            keystrokeWidget.appendChild(midRow);
            keystrokeWidget.appendChild(botRow);
            const accent = getAccent();
            keystrokeWidget.style.setProperty('--vx-accent', accent);
            keystrokeWidget.style.setProperty('--vx-accent-glow', accent + '66');

            document.body.appendChild(keystrokeWidget);
            updateKeyUI();
        }

        function handleKeyDown(e) {
            if (e.code === 'F6' || e.key === 'F6') {
                const current = localStorage.getItem('hax_keystrokes_widget') === 'true';
                const nextState = (!current).toString();
                localStorage.setItem('hax_keystrokes_widget', nextState);
                window.dispatchEvent(new StorageEvent('storage', { key: 'hax_keystrokes_widget', newValue: nextState }));
                return;
            }

            if (e.repeat) return;
            if (e.code) ACTIVE_KEYS.add(e.code);
            if (e.key) {
                ACTIVE_KEYS.add(e.key);
                if (e.key.length === 1) ACTIVE_KEYS.add(e.key.toUpperCase());
            }
            scheduleKeyUIUpdate();
        }

        function handleKeyUp(e) {
            if (e.code) ACTIVE_KEYS.delete(e.code);
            if (e.key) {
                ACTIVE_KEYS.delete(e.key);
                if (e.key.length === 1) ACTIVE_KEYS.delete(e.key.toUpperCase());
            }
            scheduleKeyUIUpdate();
        }

        function hookWinKeys(win) {
            if (!win) return;
            try {
                if (!win._vexaKeysHooked) {
                    win.addEventListener('keydown', handleKeyDown, true);
                    win.addEventListener('keyup', handleKeyUp, true);
                    win._vexaKeysHooked = true;
                }
                if (win.document && !win.document._vexaKeysHooked) {
                    win.document.addEventListener('keydown', handleKeyDown, true);
                    win.document.addEventListener('keyup', handleKeyUp, true);
                    win.document._vexaKeysHooked = true;
                }
            } catch(e) {}
        }

        window._attachKeystrokeToIframe = function(iframeWin) {
            hookWinKeys(iframeWin);
        };

        // Continually ensure key listeners are attached to top window and any game iframe
        setInterval(() => {
            hookWinKeys(window);
            hookWebRTCWindow(window);
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.contentWindow) {
                    hookWinKeys(iframe.contentWindow);
                    hookWebRTCWindow(iframe.contentWindow);
                }
            });
        }, 200);

        window.addEventListener('storage', (e) => {
            if (['hax_keystrokes_widget', 'hax_theme_color'].includes(e.key)) {
                createKeystrokes();
            } else if (['hax_keys_x', 'hax_keys_y', 'hax_keys_scale', 'hax_keys_opacity'].includes(e.key)) {
                if (keystrokeWidget) {
                    const hudX = localStorage.getItem('hax_keys_x');
                    const hudY = localStorage.getItem('hax_keys_y');
                    const hudScale = localStorage.getItem('hax_keys_scale') || '1';
                    const hudOpacity = localStorage.getItem('hax_keys_opacity') || '1';
                    
                    if (hudX !== null && hudY !== null) {
                        keystrokeWidget.style.left = hudX + 'px';
                        keystrokeWidget.style.top = hudY + 'px';
                        keystrokeWidget.style.bottom = 'auto';
                        keystrokeWidget.style.transformOrigin = 'top left';
                    }
                    keystrokeWidget.style.transform = `scale(${hudScale})`;
                    keystrokeWidget.style.opacity = hudOpacity;
                }
            }
        });

        createKeystrokes();
    })();

    // --- VEXA LOGO PLAYER BADGE SYSTEM ---
    (function initVexaBadgeSystem() {
        const VEXA_LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAADm0lEQVR4nO1Wz6tVVRS+L3XWXxEIGRiBEEgO0iLLxAINbCLiwCaKFDSpQdBEnERUREXPNwjCiSMLnL1JwyZNnJVCSIkoL33vee9Z69ufrLXXPr/uOc9nKU1csNnn7nv2+tb61q8zmTyRDYTkFtun0+kOAJcBJAArAO6q6ioUqwDv2u/B5f/Xv+3ePQD/VFX1Uuh/aiPwrb4r3wFwA8A5U0CSKaWHWjDL874uIm8V8FEDCriqHk0prRsoyR9J/mQPUFUo0vzS+TNAzGZjQUQOFGbDgIVR2qk8Zpdb1t8m+SkU04RkRsyBa/ssh0vi7h2SrxXniudra2u7hmknjxsw1JdCoEH9DwCcBedgkIUGnMmZWxGRV1vgjiEihy2v5jxX1fdCgTMdSuHUEzdV9ROCwUIN1jdCwuDbIvJyH5zC/RHW7x18eXm5xPyUAzW+92NpsgTgUs6FQRbKezcrVnsGwN+0Ssgs6vttz88EuKi7Hma0QhGK/9akHxOsEsARz2+Q3D0CvppSKrreLvR/FAc5aiNSXwSWSF6uWSgxz/IXyRdb2V5ibuBrJVwJXl3Pl5hbnV+D6lXbU0q+NytdhfqznV8H8CvJk1BUURHF8+skd8177uDrBA28Cqbt3acnOtOjBC8C+A7AeQCLtpNcLM/1GbBI0NYSwS8B3CJQWPtzNpu9MOD5QfPce0HOGWcRqr8U+rcBuBBKPNs3K4X2lNI1kjv74BQeJBngnle2l1B90y7BBTsIpdNoQCOLeSmmUZp/kHyuVFOrl3jMg/aSJ7ZmYcCZNri3RQtDGFGNNpj8nGkEfif57ECTcdqjV9Tg+bGupr19Brw9Avg2YiTebjtNRtvgV0huH8r2hvamT0RT87uq+mHBnQwZQfLrwoSPsq73HkMAP495XoOXO9FJAvyDMg2HBtFCsQpAyYnKh0y75TY05jhm8AMkrcl0aG+DU3m6xdj8JOwzISI1E9ETCwulWlZIPkORV+xbISZfpj3AvXnlQj0Z+r3zbijs5sRXTWJ2RnDOhZR+s/Yc77Rng4PbUtUToddDtSnhqBGdyjAmEsr4asLkv5jnyrFNe/4AI77ohKM1JWNYlWxXaw4EZ1R996E970uvOmojOl8/TZJas7KI3xORI/8Z/IFM9L6AYrcpd+iRgY8w8XnXCLVks6M7IvLGIwcfYSIboZgNfftNHpewy8RnwcQtEdn32MFHOuZZkq//61J7IpP/We4DnFamlozRcPIAAAAASUVORK5CYII=";

        const BADGE_CSS = `
            .vexa-player-badge {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                vertical-align: middle !important;
                margin: 0 4px !important;
                line-height: 1 !important;
                pointer-events: none !important;
                user-select: none !important;
            }
            .vexa-player-badge img {
                height: 14px !important;
                width: auto !important;
                flex-shrink: 0 !important;
                filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.9)) !important;
                vertical-align: middle !important;
                display: inline-block !important;
            }
        `;

        function injectBadgeCSS(doc) {
            if (!doc || !doc.head) return;
            if (!doc.getElementById('vexa-badge-style')) {
                const style = doc.createElement('style');
                style.id = 'vexa-badge-style';
                style.textContent = BADGE_CSS;
                doc.head.appendChild(style);
            }
        }

        const VEXA_NICK_TAG = '\u200B\u200C\u200D';

        function ensureVexaNickTag(doc) {
            try {
                const targetDoc = doc || document;
                const nickInp = targetDoc.querySelector('.choose-nickname-view [data-hook="input"], .choose-nickname-view input');
                if (nickInp) {
                    if (nickInp.getAttribute('spellcheck') !== 'false') {
                        nickInp.setAttribute('spellcheck', 'false');
                        nickInp.setAttribute('autocomplete', 'off');
                        nickInp.setAttribute('autocorrect', 'off');
                        nickInp.setAttribute('autocapitalize', 'off');
                    }
                    if (nickInp.value && !nickInp.value.includes(VEXA_NICK_TAG)) {
                        nickInp.value = nickInp.value + VEXA_NICK_TAG;
                        nickInp.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
                
                let storedName = localStorage.getItem('player_name');
                if (storedName && !storedName.includes(VEXA_NICK_TAG)) {
                    localStorage.setItem('player_name', storedName + VEXA_NICK_TAG);
                }
            } catch(e) {}
        }

        function createBadgeNode() {
            const badge = document.createElement('span');
            badge.className = 'vexa-player-badge';
            badge.title = 'Vexa Client Kullanıcısı';
            badge.innerHTML = `<img src="${VEXA_LOGO_B64}" alt="V">`;
            return badge;
        }

        function getLocalPlayerName(doc) {
            let name = '';
            try {
                if (doc && doc.defaultView && doc.defaultView.localStorage) {
                    name = doc.defaultView.localStorage.getItem('player_name') || '';
                }
            } catch(e) {}
            if (!name) {
                try { name = localStorage.getItem('player_name') || ''; } catch(e) {}
            }
            if (!name && doc) {
                const nickInp = doc.querySelector('.choose-nickname-view input');
                if (nickInp && nickInp.value) name = nickInp.value;
            }
            return (name || '').replace(/[\u200B\u200C\u200D]/g, '').trim().toLowerCase();
        }

        function updateBadgesInDoc(doc) {
            if (!doc || !doc.body) return;
            injectBadgeCSS(doc);
            ensureVexaNickTag(doc);

            const isBadgeEnabled = localStorage.getItem('hax_vexa_badge') !== 'false';
            if (!isBadgeEnabled) {
                doc.querySelectorAll('.vexa-player-badge').forEach(el => el.remove());
                return;
            }

            const localName = getLocalPlayerName(doc);

            // 1. Oda Oyuncu Listesi (Vexa Client kullanan tüm oyuncuları işaretle)
            const playerItems = doc.querySelectorAll('.room-view .list .item, .room-view .player-list-item, [class*="player-list-item"], .player-list-view .item');
            playerItems.forEach(item => {
                if (item.querySelector('.vexa-player-badge')) return;
                const fullTextRaw = (item.textContent || '').trim();
                if (!fullTextRaw) return;

                const fullTextClean = fullTextRaw.replace(/[\u200B\u200C\u200D]/g, '').trim().toLowerCase();
                const isVexaUser = fullTextRaw.includes(VEXA_NICK_TAG) || (localName && fullTextClean.includes(localName));

                if (isVexaUser) {
                    const badge = createBadgeNode();
                    
                    const adminIcon = item.querySelector('.icon-admin, [class*="admin"]');
                    const flagIcon = item.querySelector('.flagico, [class*="flag"]');

                    if (adminIcon) {
                        adminIcon.insertAdjacentElement('beforebegin', badge);
                    } else if (flagIcon && flagIcon.nextSibling) {
                        flagIcon.insertAdjacentElement('afterend', badge);
                    } else {
                        item.insertBefore(badge, item.lastChild);
                    }
                }
            });

            // 2. Chat Logu (Sadece gerçek sohbet mesaj paragraflarına icon ekle)
            const chatLogs = doc.querySelectorAll('[data-hook="log"] p, .log p');
            chatLogs.forEach(log => {
                if (log.querySelector('.vexa-player-badge')) return;
                if (!log.parentElement || (!log.parentElement.classList.contains('log') && log.parentElement.getAttribute('data-hook') !== 'log')) return;

                const fullTextRaw = (log.textContent || '').trim();
                if (!fullTextRaw) return;

                const fullTextClean = fullTextRaw.replace(/[\u200B\u200C\u200D]/g, '').trim().toLowerCase();
                const isVexaUserChat = fullTextRaw.includes(VEXA_NICK_TAG) || (localName && fullTextClean.startsWith(localName + ':'));

                if (isVexaUserChat) {
                    const badge = createBadgeNode();
                    badge.style.margin = '0 4px 0 0';
                    log.prepend(badge);
                }
            });
        }

        // Intercept nickname OK button in capture phase to force tag into input.value before HaxBall reads it
        document.addEventListener('click', (e) => {
            try {
                const target = e.target;
                if (target && (target.matches('[data-hook="ok"]') || (target.closest && target.closest('.choose-nickname-view button')))) {
                    const doc = target.ownerDocument || document;
                    const nickInp = doc.querySelector('.choose-nickname-view [data-hook="input"], .choose-nickname-view input');
                    if (nickInp && nickInp.value && !nickInp.value.includes(VEXA_NICK_TAG)) {
                        nickInp.value = nickInp.value + VEXA_NICK_TAG;
                        nickInp.dispatchEvent(new Event('input', { bubbles: true }));
                        try { localStorage.setItem('player_name', nickInp.value); } catch(err) {}
                    }
                }
            } catch(err) {}
        }, true);

        function hookBadgeObserver(doc) {
            if (!doc || !doc.body || doc._vexaBadgeObserver) return;
            const obs = new MutationObserver(() => {
                updateBadgesInDoc(doc);
            });
            obs.observe(doc.body, { childList: true, subtree: true });
            doc._vexaBadgeObserver = obs;
            updateBadgesInDoc(doc);
        }

        // Ana döküman ve Iframe dökümanını sürekli senkronize et
        setInterval(() => {
            hookBadgeObserver(document);
            const iframe = document.querySelector(".gameframe") || document.querySelector("iframe");
            if (iframe && iframe.contentDocument) {
                hookBadgeObserver(iframe.contentDocument);
            }
        }, 300);

        window.addEventListener('storage', (e) => {
            if (e.key === 'hax_vexa_badge' || e.key === 'player_name') {
                updateBadgesInDoc(document);
                const iframe = document.querySelector(".gameframe") || document.querySelector("iframe");
                if (iframe && iframe.contentDocument) {
                    updateBadgesInDoc(iframe.contentDocument);
                }
            }
        });
    })();


})();
