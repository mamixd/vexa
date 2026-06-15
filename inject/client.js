// Vexa HaxBall Client - FPS Engine & Counter
(() => {
    console.log("[Vexa HaxBall Client] Injecting Smart Client Logic...");

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

    const checkIframe = setInterval(() => {
        const gameIframe = document.querySelector('iframe');
        
        if (gameIframe && gameIframe.contentWindow) {
            clearInterval(checkIframe);
            applyLimiter(gameIframe.contentWindow);
        } else if (window.HBInit) {
            clearInterval(checkIframe);
            applyLimiter(window);
        }
    }, 100);

    function applyLimiter(targetWindow) {
        const isFpsUnlocked = localStorage.getItem('hax_fps_limit') !== 'false';
        const monitorHz = window.ELECTRON_SCREEN_HZ || 60;
        
        // --- WebRTC PeerConnection Hook ---
        targetWindow._activePCs = targetWindow._activePCs || new Set();
        const OriginalRTCPeerConnection = targetWindow.RTCPeerConnection || targetWindow.webkitRTCPeerConnection;
        if (OriginalRTCPeerConnection) {
            const HookedRTCPeerConnection = function(config, constraints) {
                const pc = new OriginalRTCPeerConnection(config, constraints);
                targetWindow._activePCs.add(pc);
                pc.addEventListener('connectionstatechange', () => {
                    if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
                        targetWindow._activePCs.delete(pc);
                    }
                });
                return pc;
            };
            HookedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
            for (let key in OriginalRTCPeerConnection) {
                if (OriginalRTCPeerConnection.hasOwnProperty(key)) {
                    HookedRTCPeerConnection[key] = OriginalRTCPeerConnection[key];
                }
            }
            targetWindow.RTCPeerConnection = HookedRTCPeerConnection;
        }

        // 1. Orijinal HaxBall FPS/Ping Saklayıcı + Vexa Arka Plan Logo + Transparency Control
        const hideNativeStatsCSS = `
            .game-view .stats-view { 
                opacity: 0 !important; 
                pointer-events: none !important; 
            }
            body::before {
                content: "";
                position: fixed;
                top: -50%; left: -50%; width: 200%; height: 200%;
                background-image: url('file:///c:/Vexa/inject/background.png');
                background-repeat: no-repeat;
                background-position: center;
                background-size: 2000px;
                opacity: 0.6;
                z-index: -1;
                pointer-events: none;
                transform: rotate(-25deg);
            }

            /* Custom Background Glassmorphic Overrides */
            body.vexa-has-custom-bg::before {
                display: none !important;
            }
            
            body.vexa-has-custom-bg .choose-nickname-view {
                background-color: transparent !important;
            }
            
            body.vexa-has-custom-bg .choose-nickname-view .dialog,
            body.vexa-has-custom-bg .room-view .container,
            body.vexa-has-custom-bg .dialog,
            body.vexa-has-custom-bg .chatbox-view-contents,
            body.vexa-has-custom-bg .game-state-view {
                background: rgba(15, 15, 18, 0.55) !important;
                backdrop-filter: blur(12px) saturate(160%) !important;
                -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
            }
            
            body.vexa-has-custom-bg .dialog .list, 
            body.vexa-has-custom-bg .dialog .filters,
            body.vexa-has-custom-bg .label-input,
            body.vexa-has-custom-bg .section {
                background-color: transparent !important;
            }
            
            body.vexa-has-custom-bg .dialog button,
            body.vexa-has-custom-bg .dialog .bool,
            body.vexa-has-custom-bg .dialog .dropdown,
            body.vexa-has-custom-bg .dialog .file-btn,
            body.vexa-has-custom-bg .dialog .file-btn label,
            body.vexa-has-custom-bg .choose-nickname-view button,
            body.vexa-has-custom-bg .lobby-view .sidebar button,
            body.vexa-has-custom-bg select {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                color: #fff !important;
            }
            
            body.vexa-has-custom-bg .dialog button:hover,
            body.vexa-has-custom-bg .dialog .bool:hover,
            body.vexa-has-custom-bg .lobby-view .sidebar button:hover,
            body.vexa-has-custom-bg select:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Global Dialog Transparency Class */
            body.vexa-ui-transparent .choose-nickname-view {
                background-color: transparent !important;
            }
            
            body.vexa-ui-transparent .choose-nickname-view .dialog {
                background-color: rgba(10, 10, 10, 0.7) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
            }

            body.vexa-ui-transparent .choose-nickname-view img {
                display: block !important;
                max-width: 350px !important;
                width: auto !important;
                margin: 0 auto 10px auto !important;
            }
 
            body.vexa-ui-transparent .dialog {
                background-color: rgba(10, 10, 10, 0.7) !important; /* "Uyarı yerleri" - darker */
                backdrop-filter: none !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
            }
            body.vexa-ui-transparent .dialog .list, 
            body.vexa-ui-transparent .dialog .filters,
            body.vexa-ui-transparent .label-input,
            body.vexa-ui-transparent .section {
                background-color: transparent !important;
            }
            
            /* Button & Element Transparency */
            body.vexa-ui-transparent .dialog button,
            body.vexa-ui-transparent .dialog .bool,
            body.vexa-ui-transparent .dialog .dropdown,
            body.vexa-ui-transparent .dialog .file-btn,
            body.vexa-ui-transparent .dialog .file-btn label,
            body.vexa-ui-transparent .choose-nickname-view button,
            body.vexa-ui-transparent .lobby-view .sidebar button,
            body.vexa-ui-transparent select {
                background-color: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                color: #fff !important;
            }
            
            body.vexa-ui-transparent select option {
                background-color: #1c1c1e !important;
                color: #fff !important;
            }
            
            /* Search & Text input transparency */
            body.vexa-ui-transparent .dialog input[type="search"],
            body.vexa-ui-transparent .dialog input[type="text"],
            body.vexa-ui-transparent .choose-nickname-view input,
            body.vexa-ui-transparent .label-input input {
                background-color: rgba(255, 255, 255, 0.03) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
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
        `;
        const styleEl = document.createElement('style');
        styleEl.innerHTML = hideNativeStatsCSS;
        document.head.appendChild(styleEl);

        // Iframe içine de enjekte et (Transparency ve Buton Enjeksiyonu)
        function injectIframeContent() {
            const iframe = document.querySelector(".gameframe");
            if (iframe && iframe.contentDocument) {
                const doc = iframe.contentDocument;

                // CSS Enjeksiyonu
                if (!doc.getElementById('vexa-iframe-css')) {
                    const s = doc.createElement('style');
                    s.id = 'vexa-iframe-css';
                    s.innerHTML = hideNativeStatsCSS;
                    doc.head.appendChild(s);
                }

                // Custom Background Senkronizasyonu
                try { syncCustomBackgroundForDoc(doc); } catch(e) {}


                // Her zaman şeffaflık durumunu senkronize et (HaxBall sayfayı veya class'ları ezse bile)
                const isTransparentStored = localStorage.getItem('vexa-ui-transparent') === 'true';
                if (doc.body) {
                    const hasClass = doc.body.classList.contains('vexa-ui-transparent');
                    if (isTransparentStored && !hasClass) {
                        doc.body.classList.add('vexa-ui-transparent');
                    } else if (!isTransparentStored && hasClass) {
                        doc.body.classList.remove('vexa-ui-transparent');
                    }
                }

                // Buton Enjeksiyonu (Oda listesi altındaki filtreler)
                const filters = doc.querySelector('.filters');
                if (filters) {
                    // 1. Şeffaflık Butonu
                    if (!doc.getElementById('vexa-trans-btn')) {
                        const btn = doc.createElement('span');
                        btn.id = 'vexa-trans-btn';
                        btn.className = 'bool vexa-custom-btn';
                        btn.innerHTML = `
                            <span>Transparent</span>
                            <i class="${isTransparentStored ? 'icon-ok' : 'icon-cancel'}"></i>
                        `;
                        filters.appendChild(btn);
                        
                        btn.addEventListener('click', () => {
                            const icon = btn.querySelector('i');
                            const active = doc.body.classList.toggle('vexa-ui-transparent');
                            icon.className = active ? 'icon-ok' : 'icon-cancel';
                            localStorage.setItem('vexa-ui-transparent', active);
                        });
                    } else {
                        // Buton ikonunu da her zaman senkronize et
                        const transBtn = doc.getElementById('vexa-trans-btn');
                        if (transBtn) {
                            const icon = transBtn.querySelector('i');
                            if (icon) {
                                const hasOkClass = icon.classList.contains('icon-ok');
                                if (isTransparentStored && !hasOkClass) {
                                    icon.className = 'icon-ok';
                                } else if (!isTransparentStored && hasOkClass) {
                                    icon.className = 'icon-cancel';
                                }
                            }
                        }
                    }
                }
            }
        }
        setInterval(injectIframeContent, 100);

        const targetFps = isFpsUnlocked ? 999 : monitorHz; 
        const frameTime = 1000 / targetFps;

        const originalRAF = targetWindow.requestAnimationFrame.bind(targetWindow);

        // 1. Oyunu Kandırma (Engine Hack)
        targetWindow.requestAnimationFrame = function(callback) {
            return setTimeout(() => callback(performance.now()), frameTime);
        };
        targetWindow.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };

        if(isFpsUnlocked) {
            console.log("[Vexa HaxBall Client] FPS Unlocker AKTİF");
        } else {
            console.log("[Vexa HaxBall Client] FPS Unlocker KAPALI (" + monitorHz + " Hz)");
        }

        // --- Custom Background Engine ---
        function syncCustomBackgroundForDoc(doc) {
            if (!doc || !doc.body) return;
            const currentBgPath = localStorage.getItem('hax_custom_bg');

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
                        Object.assign(img.style, {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        });
                        container.appendChild(img);
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
                if (!targetWindow._activePCs || targetWindow._activePCs.size === 0) return null;
                for (const pc of targetWindow._activePCs) {
                    if (pc.connectionState !== 'connected') continue;
                    try {
                        const stats = await pc.getStats();
                        let ping = null;
                        stats.forEach(report => {
                            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                if (report.currentRoundTripTime !== undefined) {
                                    ping = Math.round(report.currentRoundTripTime * 1000);
                                }
                            }
                        });
                        if (ping !== null) return ping;
                    } catch(e) {}
                }
            } catch(e) {}
            return null;
        }

        // 2.2 Scrape Ping & Loss from Haxball DOM
        function getScrapedPingAndLoss() {
            let pingVal = null;
            let maxPingVal = null;
            const iframe = document.querySelector(".gameframe");
            
            try {
                if (iframe) {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const text = doc.body.innerText;
                    
                    let match = text.match(/Ping[: ]+(\d+)\s*-\s*(\d+)/i);
                    if (match) {
                        pingVal = parseInt(match[1]);
                        maxPingVal = parseInt(match[2]);
                    } else {
                        match = text.match(/Ping[: ]+(\d+)/i);
                        if (match) pingVal = parseInt(match[1]);
                    }
                }
                
                if (pingVal === null) {
                    const statsView = document.querySelector('.stats-view');
                    if (statsView) {
                        const match = statsView.innerText.match(/Ping:\s*(\d+)/i);
                        if (match) pingVal = parseInt(match[1]);
                    }
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
        function ensureFpsUI() {
            if (document.getElementById('vexa-fps-counter')) return; 

            const fpsShow = localStorage.getItem('hax_fps_show') !== 'false';

            const fpsContainer = document.createElement('div');
            fpsContainer.id = 'vexa-fps-counter';
            Object.assign(fpsContainer.style, {
                position: 'fixed', top: '65px', left: '15px',
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
                transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            });
            
            const statusLabel = document.createElement('span');
            statusLabel.innerText = "STATUS";
            statusLabel.style.color = '#555';
            statusLabel.style.borderRight = '1px solid #222';
            statusLabel.style.paddingRight = '8px';
            
            fpsTextNode = document.createElement('span');
            fpsTextNode.innerText = "FPS: ...";
            fpsTextNode.style.color = '#10b981';

            const divider = document.createElement('span');
            divider.innerText = "|";
            divider.style.color = '#222';

            pingTextNode = document.createElement('span');
            pingTextNode.innerText = "PING: ...";
            pingTextNode.style.color = '#888';

            fpsContainer.appendChild(statusLabel);
            fpsContainer.appendChild(fpsTextNode);
            fpsContainer.appendChild(divider);
            fpsContainer.appendChild(pingTextNode);
            document.body.appendChild(fpsContainer);
        }

        // İlk oluştur
        ensureFpsUI();
        // Her 2 saniyede kontrol et, kaybolmuşsa tekrar oluştur
        setInterval(ensureFpsUI, 2000);

        // 4. Gerçek FPS Ölçüm Döngüsü (Chromium Native)
        function measureFPS() {
            frames++;
            const now = performance.now();
            const delta = now - lastTime;

            if (delta >= 1000) { 
                const realFps = Math.round((frames / delta) * 1000);
                lastKnownFps = realFps; 

                // Header görünürlüğüne göre pozisyonu güncelle (Sadece saniyede bir kontrol et, performans için)
                const fpsEl = document.getElementById('vexa-fps-counter');
                if (fpsEl) {
                    const header = document.querySelector('.header') || document.querySelector('header') || document.querySelector('#header');
                    const isHeaderVisible = header && header.offsetHeight > 0;
                    const targetTop = isHeaderVisible ? '65px' : '15px';
                    if (fpsEl.style.top !== targetTop) fpsEl.style.top = targetTop;
                }

                // UI güncellemesi (element hala varsa)
                if (!fpsTextNode || !pingTextNode) {
                    const el = document.getElementById('vexa-fps-counter');
                    if (el) {
                        fpsTextNode = el.children[1];
                        pingTextNode = el.children[3];
                    }
                }

                if (fpsTextNode) {
                    fpsTextNode.innerText = "FPS: " + realFps;
                    
                    if(realFps < 60) {
                        fpsTextNode.style.color = '#ef4444'; 
                    } else if(realFps < 200) {
                        fpsTextNode.style.color = '#eab308';
                    } else {
                        fpsTextNode.style.color = '#10b981';
                    }
                }

                // PING Güncelleme (User Iframe Scraper Logic)
                if (pingTextNode) {
                    try {
                        const networkStats = getScrapedPingAndLoss();
                        const ping = lastKnownWebRTCPing !== null ? lastKnownWebRTCPing : networkStats.ping;
                        const maxPing = networkStats.maxPing;

                        if (ping !== null) {
                            if (maxPing !== null && maxPing > ping) {
                                pingTextNode.innerText = "PING: " + ping + "-" + maxPing + "ms";
                            } else {
                                pingTextNode.innerText = "PING: " + ping + "ms";
                            }
                            if (ping < 60) pingTextNode.style.color = '#10b981';
                            else if (ping < 120) pingTextNode.style.color = '#eab308';
                            else pingTextNode.style.color = '#ef4444';
                        } else {
                            pingTextNode.innerText = "PING: --";
                            pingTextNode.style.color = '#444';
                        }
                    } catch (e) {
                        pingTextNode.innerText = "PING: ERR";
                        pingTextNode.style.color = '#ef4444';
                    }
                }

                lastTime = now;
                frames = 0;
            }
            requestAnimationFrame(measureFPS);
        }
        originalRAF(measureFPS);

        // 5. HaxBall Native FPS Spoof (MutationObserver)
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

        // 6. NetGraph & WebRTC Stats Update Interval (500ms)
        setInterval(async () => {
            try {
                const webRTCPing = await getWebRTCPing();
                if (webRTCPing !== null) {
                    lastKnownWebRTCPing = webRTCPing;
                }
            } catch(e) {}
            
            const showNetGraph = localStorage.getItem('hax_net_graph') !== 'false';
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

})();