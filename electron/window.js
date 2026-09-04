const { BrowserWindow, session, app } = require('electron');
const path = require('path');
const fs = require('fs');

// Pre-cache bundled scripts in memory so there is 0ms disk read delay on launch
const vexaScripts = ['hx_polyfill.js', 'header.js', 'profiles.js', 'avatar.js', 'ui.js', 'client.js'];
const CACHED_SCRIPTS = vexaScripts
    .map(script => path.join(__dirname, '../inject', script))
    .filter(fs.existsSync)
    .map(scriptPath => fs.readFileSync(scriptPath, 'utf-8'))
    .join('\n');
const INJECT_BASE_URL = 'file:///' + path.join(__dirname, '../inject').replace(/\\/g, '/');

function createWindow(options) {
    const win = new BrowserWindow({
        width: options.width || 1200,
        height: options.height || 800,
        title: options.title || 'HaxBall Client',
        autoHideMenuBar: true,
        show: false,
        backgroundColor: '#1c1c1e',
        webPreferences: {
            preload: options.preload,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            backgroundThrottling: false
        }
    });
    win.setMenuBarVisibility(false);

    // Dış bağlantıları (href="_blank") sistem tarayıcısında aç
    win.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Silent Automatic Match Recording (.hbr2) Downloader
    session.defaultSession.on('will-download', (event, item, webContents) => {
        if (item.getFilename().endsWith('.hbr2')) {
            const downloadsPath = app.getPath('downloads');
            const vexaRecDir = path.join(downloadsPath, 'Vexa Recordings');
            if (!fs.existsSync(vexaRecDir)) {
                fs.mkdirSync(vexaRecDir, { recursive: true });
            }

            // Oda adı + tarih/saat ile kaydet
            const { currentRoomName } = require('./main');
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
            const timeStr = `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
            const roomPart = currentRoomName ? `${currentRoomName} - ` : '';
            const fileName = `${roomPart}${dateStr} ${timeStr}.hbr2`;
            const savePath = path.join(vexaRecDir, fileName);
            item.setSavePath(savePath);
        }
    });

    if (options.url) {
        win.loadURL(options.url);
        
        // Skriptleri DOM hazır olur olmaz 0ms içinde enjekte et
        win.webContents.on('dom-ready', () => {
            const { screen } = require('electron');
            const hz = screen.getPrimaryDisplay().displayFrequency || 60;

            const userBgDir = path.join(app.getPath('userData'), 'backgrounds').replace(/\\/g, '/');
            const defaultBgUrl = 'file:///' + path.join(app.getPath('userData'), 'backgrounds', 'vexa-default.png').replace(/\\/g, '/');
            const bgDirUrl = 'file:///' + userBgDir;

            const payload = `
                window.ELECTRON_SCREEN_HZ = ${hz};
                window.VEXA_INJECT_BASE_URL = ${JSON.stringify(INJECT_BASE_URL)};
                window.VEXA_BG_DIR_URL = ${JSON.stringify(bgDirUrl)};
                window.VEXA_DEFAULT_BG = ${JSON.stringify(defaultBgUrl)};
                (function() {
                    if (window.__vexaBundleInjected) return;
                    window.__vexaBundleInjected = true;
                    ${CACHED_SCRIPTS}
                })();
                ;void 0;
            `;

            win.webContents.executeJavaScript(payload).then(() => {
                if (!win.isDestroyed() && !win.isVisible()) {
                    if (options.onReady) {
                        options.onReady();
                    } else {
                        win.maximize();
                        win.show();
                    }
                }
            }).catch(err => {
                console.error("Failed to inject bundled scripts:", err);
                if (!win.isDestroyed() && !win.isVisible()) {
                    if (options.onReady) options.onReady();
                    else { win.maximize(); win.show(); }
                }
            });
        });

        // HaxBall oyun iframe'ine toggle butonu inject et
        win.webContents.on('did-frame-finish-load', (event, isMainFrame) => {
            if (isMainFrame) return;
            const toggleScript = `
(function() {
    if (window.__vexaToggleInstalled) return;
    window.__vexaToggleInstalled = true;
    var hidden = false;
    function tryInject() {
        if (document.getElementById('vexa-game-toggle')) return;
        // Sadece Menu/Add-on butonlarını içeren .buttons div'ini hedefle
        var menuBtn = document.querySelector('button[data-hook="menu"]');
        if (!menuBtn) return;
        var buttonsDiv = menuBtn.closest('.buttons');
        if (!buttonsDiv) return;
        var allChildren = Array.from(buttonsDiv.children);
        var btn = document.createElement('div');
        btn.id = 'vexa-game-toggle';
        btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:20px;height:28px;cursor:pointer;color:rgba(255,255,255,0.5);font-size:12px;font-weight:bold;transition:color 0.2s;user-select:none;flex-shrink:0;padding:0 2px;';
        btn.innerText = '◀';
        btn.title = 'Butonları Gizle';
        btn.onmouseover = function() { btn.style.color = '#fff'; };
        btn.onmouseout = function() { btn.style.color = 'rgba(255,255,255,0.5)'; };
        btn.onclick = function(e) {
            e.stopPropagation();
            hidden = !hidden;
            allChildren.forEach(function(c) {
                if (hidden) {
                    c.style.transition = 'max-width 0.3s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease';
                    c.style.maxWidth = '0';
                    c.style.overflow = 'hidden';
                    c.style.opacity = '0';
                    c.style.padding = '0';
                    c.style.margin = '0';
                    c.style.pointerEvents = 'none';
                } else {
                    c.style.transition = 'max-width 0.3s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease';
                    c.style.maxWidth = '200px';
                    c.style.overflow = '';
                    c.style.opacity = '1';
                    c.style.padding = '';
                    c.style.margin = '';
                    c.style.pointerEvents = '';
                }
            });
            btn.innerText = hidden ? '▶' : '◀';
            btn.title = hidden ? 'Butonları Göster' : 'Butonları Gizle';
        };
        buttonsDiv.insertBefore(btn, buttonsDiv.firstChild);
    }
    setInterval(tryInject, 1000);
})();
            `;
            try {
                const frames = win.webContents.mainFrame.frames;
                const gameFrame = frames.find(frame => {
                    try {
                        return frame !== win.webContents.mainFrame && new URL(frame.url).hostname.endsWith('haxball.com');
                    } catch (_) {
                        return false;
                    }
                });
                if (gameFrame) gameFrame.executeJavaScript(toggleScript).catch(() => {});
            } catch(e) {
                win.webContents.executeJavaScript(`
                    (function() {
                        var frames = document.querySelectorAll('iframe.gameframe, #gameframe');
                        frames.forEach(function(f) {
                            try { f.contentWindow.eval(${JSON.stringify(toggleScript)}); } catch(e) {}
                        });
                    })();
                `).catch(() => {});
            }
        });


        // HaxBall'ın "Emin misiniz?" uyarısını devre dışı bırak, direkt kapansın
        win.webContents.on('will-prevent-unload', (event) => {
            event.preventDefault();
        });
    }

    // Enable F12 to toggle DevTools dynamically
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
            win.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

    return win;
}

module.exports = { createWindow };