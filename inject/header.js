// OEM HaxBall Designed Header + LocalStorage Settings
(() => {
    let isFpsEnabled = localStorage.getItem('hax_fps_limit') !== 'false';
    let isRpcEnabled = localStorage.getItem('hax_discord_rpc') !== 'false';

    // Ayarları başlangıçta merkezi config'den yükle (Eğer varsa)
    if (window.launcherAPI) {
        window.launcherAPI.getSettings().then(settings => {
            if (settings) {
                isFpsEnabled = settings.fpsEnabled;
                isRpcEnabled = settings.rpcEnabled;
                localStorage.setItem('hax_fps_limit', isFpsEnabled);
                localStorage.setItem('hax_discord_rpc', isRpcEnabled);
            }
        });
    }

    const tryInject = setInterval(() => {
        let nativeHeader = document.querySelector('.header') || document.querySelector('header') || document.querySelector('#header');
        
        if (nativeHeader) {
            clearInterval(tryInject);
            hijackNativeHeader(nativeHeader);
        }
    }, 100);

    setTimeout(() => { clearInterval(tryInject); }, 10000);

    function hijackNativeHeader(headerElement) {
        headerElement.innerHTML = '';
        
        // ==========================================
        // 1. Orijinal HaxBall Tasarımına Sadık Kalınan CSS
        // ==========================================
        Object.assign(headerElement.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px',
            height: '45px', // Orijinal kısa yükseklik
            backgroundColor: '#1c1c1e', // Klasik koyu gri ton
            borderBottom: '2px solid #000',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontFamily: 'Tahoma, Arial, sans-serif' // Haxball Orijinal Fontu
        });

        // --- SOL: Orijinal Tarz Başlık ---
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<span style="color:#eee; font-size:15px; font-weight:bold; letter-spacing:0.5px;">Vexa</span> <span style="color:#777; font-size:10px;">CLIENT</span>';
        titleDiv.style.cssText = 'cursor:pointer; white-space:nowrap; flex-shrink:0;';
        titleDiv.onclick = () => window.location.href = 'https://www.haxball.com/play'; 

        // --- ORTA: Oda Linki Yapıştırma Alanı ---
        const centerWrapper = document.createElement('div');
        centerWrapper.style.cssText = "display:flex; align-items:center; background:#111; border:1px solid #282828; border-radius:1px; padding:2px; margin:0 20px; flex:1; max-width:500px;";
        
        const linkInput = document.createElement('input');
        linkInput.type = 'text';
        linkInput.placeholder = 'Oda linkini buraya yapıştırın...';
        linkInput.style.cssText = "flex:1; background:transparent; border:none; color:#ddd; font-size:12px; padding:4px 8px; outline:none;";
        
        const joinBtn = document.createElement('button');
        joinBtn.innerText = "GİRİŞ";
        joinBtn.style.cssText = "background:#0a0a0a !important; color:#ccc !important; border:1px solid #333 !important; border-radius:1px; padding:4px 15px; font-size:11px; font-weight:bold; cursor:pointer; white-space:nowrap; transition: background 0.2s;";
        joinBtn.onmouseover = () => joinBtn.style.background = '#1a1a1a';
        joinBtn.onmouseout = () => joinBtn.style.background = '#0a0a0a';
        
        joinBtn.onclick = () => {
            const url = linkInput.value.trim();
            if(url) window.location.href = url;
        };

        linkInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') joinBtn.click();
        });

        centerWrapper.appendChild(linkInput);
        centerWrapper.appendChild(joinBtn);

        // --- SAĞ: Ayarlar ---
        const settingsBtn = document.createElement('button');
        settingsBtn.innerText = '⚙ Ayarlar';
        settingsBtn.style.cssText = "background:#0a0a0a !important; color:#888 !important; border:1px solid #222 !important; border-radius:1px; padding:4px 12px; font-size:11px; font-weight:bold; cursor:pointer; transition:color 0.2s, background 0.2s; white-space:nowrap; flex-shrink:0;";
        settingsBtn.onmouseover = () => { settingsBtn.style.color = '#fff'; settingsBtn.style.background = '#111'; };
        settingsBtn.onmouseout = () => { settingsBtn.style.color = '#888'; settingsBtn.style.background = '#0a0a0a'; };
        settingsBtn.onclick = openSettingsModal;

        headerElement.appendChild(titleDiv);
        headerElement.appendChild(centerWrapper);
        headerElement.appendChild(settingsBtn);
        
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

    // ==========================================
    // 2. Ayarlar Modal'ı ve Aç-Kapa (Toggle) Sistemi
    // ==========================================
    function openSettingsModal() {
        if (document.getElementById('haxclient-settings-modal')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'haxclient-settings-modal';
        Object.assign(modalOverlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            zIndex: '999999', display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontFamily: 'Tahoma, Arial, sans-serif'
        });

        const modalBox = document.createElement('div');
        Object.assign(modalBox.style, {
            width: '360px', backgroundColor: '#1c1c1e', border: '1px solid #333',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)', padding: '20px', color: '#ccc', borderRadius: '4px'
        });

        modalBox.innerHTML = "" +
            "<div style='display:flex; justify-content:space-between; border-bottom:1px solid #333; padding-bottom:12px; margin-bottom:20px;'>" +
                "<h2 style='margin:0; font-size:16px; color:#fff;'>İstemci Ayarları</h2>" +
                "<button id='close-modal-btn' style='background:none; border:none; color:#888; cursor:pointer; font-size:18px; line-height:1;'>✕</button>" +
            "</div>" +
            "" +
            "<div style='display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;'>" +
                "<div>" +
                    "<div style='color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;'>FPS Unlocker</div>" +
                    "<div style='color:#777; font-size:11px; line-height:1.3;'>Sınırsız FPS hızını açar. (Yenileme Gerektirir)</div>" +
                "</div>" +
                "<div style='position:relative; width:44px; height:22px; flex-shrink:0;'>" +
                    "<div id='fps-slider' style='position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:" + (isFpsEnabled ? '#10b981' : '#444') + "; border-radius:24px; transition:0.3s;'></div>" +
                    "<div id='fps-knob' style='position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:" + (isFpsEnabled ? 'translateX(22px)' : 'translateX(0)') + ";'></div>" +
                "</div>" +
            "</div>" +
            "" +
            "<div style='display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; background:#111; padding:12px 15px; border-radius:4px; border:1px solid #282828;'>" +
                "<div>" +
                    "<div style='color:#eee; font-size:14px; margin-bottom:5px; font-weight:bold;'>Discord RPC</div>" +
                    "<div style='color:#777; font-size:11px; line-height:1.3;'>Discord'daki durum bilgisini açar/kapatır.</div>" +
                "</div>" +
                "<div style='position:relative; width:44px; height:22px; flex-shrink:0;'>" +
                    "<div id='rpc-slider' style='position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:" + (isRpcEnabled ? '#10b981' : '#444') + "; border-radius:24px; transition:0.3s;'></div>" +
                    "<div id='rpc-knob' style='position:absolute; height:16px; width:16px; left:3px; bottom:3px; background-color:white; border-radius:50%; transition:0.3s; transform:" + (isRpcEnabled ? 'translateX(22px)' : 'translateX(0)') + ";'></div>" +
                "</div>" +
            "</div>" +
            "" +
            "<div style='text-align:right;'>" +
                "<button id='save-modal-btn' style='background:#28a745; color:#fff; border:1px solid #1e7e34; padding:8px 20px; font-size:13px; font-weight:bold; cursor:pointer; border-radius:3px; transition:0.2s;'>Kaydet</button>" +
            "</div>";

        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        // Interaction Codes
        document.getElementById('close-modal-btn').onclick = () => modalOverlay.remove();
        
        let switchFps = isFpsEnabled;
        let switchRpc = isRpcEnabled;

        // FPS Toggle
        const fpsSlider = document.getElementById('fps-slider');
        const fpsKnob = document.getElementById('fps-knob');
        fpsSlider.parentElement.onclick = () => {
            switchFps = !switchFps;
            fpsSlider.style.backgroundColor = switchFps ? '#10b981' : '#444';
            fpsKnob.style.transform = switchFps ? 'translateX(22px)' : 'translateX(0)';
        };

        // RPC Toggle
        const rpcSlider = document.getElementById('rpc-slider');
        const rpcKnob = document.getElementById('rpc-knob');
        rpcSlider.parentElement.onclick = () => {
            switchRpc = !switchRpc;
            rpcSlider.style.backgroundColor = switchRpc ? '#10b981' : '#444';
            rpcKnob.style.transform = switchRpc ? 'translateX(22px)' : 'translateX(0)';
        };

        // Save
        document.getElementById('save-modal-btn').onclick = () => {
            // Yerel hafızayı güncelle
            localStorage.setItem('hax_fps_limit', switchFps);
            localStorage.setItem('hax_discord_rpc', switchRpc);

            // Global değişkenleri güncelle (Modal tekrar açıldığında doğru görünmesi için)
            const fpsChanged = isFpsEnabled !== switchFps;
            isFpsEnabled = switchFps;
            isRpcEnabled = switchRpc;

            // Merkezi Config Kaydı
            if (window.launcherAPI) {
                window.launcherAPI.saveSettings({
                    fpsEnabled: switchFps,
                    rpcEnabled: switchRpc
                });
                window.launcherAPI.toggleRPC(switchRpc);
            }

            if (fpsChanged) {
                // FPS ayarı değiştiyse yeniden başlatma uyarısı veya otomatik yenileme
                window.location.reload();
            } else {
                modalOverlay.remove();
            }
        };
    }
})();
