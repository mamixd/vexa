// Vexa HaxBall Client - FPS Engine & Counter
(() => {
    console.log("[Vexa HaxBall Client] Injecting Smart Client Logic...");

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

        // 2. FPS Sayacı Değişkenleri (Global)
        let lastTime = performance.now();
        let frames = 0;
        let lastKnownFps = targetFps;
        let fpsTextNode = null;
        let fpsDot = null;

        // 3. FPS UI - Ana sayfaya (üst document) ekle, iframe'e DEĞİL
        // Böylece iframe değişse bile sayaç kaybolmaz
        function ensureFpsUI() {
            if (document.getElementById('vexa-fps-counter')) return; // Zaten var

            const fpsContainer = document.createElement('div');
            fpsContainer.id = 'vexa-fps-counter';
            Object.assign(fpsContainer.style, {
                position: 'fixed', top: '50px', left: '10px',
                background: 'rgba(15, 15, 20, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px', padding: '4px 10px', color: '#10b981',
                fontFamily: 'monospace', fontSize: '12px', fontWeight: '900',
                zIndex: '999999', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                display: 'flex', alignItems: 'center', gap: '5px'
            });
            
            fpsDot = document.createElement('div');
            fpsDot.style.cssText = "width:7px; height:7px; background:#10b981; border-radius:50%; box-shadow:0 0 6px #10b981;";
            
            fpsTextNode = document.createElement('span');
            fpsTextNode.innerText = "FPS: ...";

            fpsContainer.appendChild(fpsDot);
            fpsContainer.appendChild(fpsTextNode);
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

                // UI güncellemesi (element hala varsa)
                if (!fpsTextNode) {
                    const el = document.getElementById('vexa-fps-counter');
                    if (el) {
                        fpsDot = el.children[0];
                        fpsTextNode = el.children[1];
                    }
                }

                if (fpsTextNode) {
                    fpsTextNode.innerText = "FPS: " + realFps;
                    
                    if(realFps < 60) {
                        fpsTextNode.style.color = '#fca5a5';
                        fpsDot.style.background = '#ef4444'; 
                        fpsDot.style.boxShadow = '0 0 6px #ef4444';
                    } else if(realFps < 200) {
                        fpsTextNode.style.color = '#fde047';
                        fpsDot.style.background = '#eab308';
                        fpsDot.style.boxShadow = '0 0 6px #eab308';
                    } else {
                        fpsTextNode.style.color = '#a7f3d0';
                        fpsDot.style.background = '#10b981';
                        fpsDot.style.boxShadow = '0 0 6px #10b981';
                    }
                }

                frames = 0;
                lastTime = now;
            }
            originalRAF(measureFPS);
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