const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

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
            webSecurity: false
        }
    });
    win.setMenuBarVisibility(false);

    session.defaultSession.clearCache();

    if (options.url) {
        win.loadURL(options.url);
        
        // Skriptleri HaxBall tam yüklendikten sonra enjekte et
        win.webContents.on('did-finish-load', () => {
            const { screen } = require('electron');
            const hz = screen.getPrimaryDisplay().displayFrequency || 60;

            // List of core Vexa scripts
            const vexaScripts = ['hx_polyfill.js', 'header.js', 'profiles.js', 'avatar.js', 'ui.js', 'client.js'];
            
            let allScripts = [];
            vexaScripts.forEach(script => {
                const sp = path.join(__dirname, '../inject', script);
                if (fs.existsSync(sp)) allScripts.push(fs.readFileSync(sp, 'utf-8'));
            });

            const injectBaseUrl = 'file:///' + path.join(__dirname, '../inject').replace(/\\/g, '/');
            const payload = `window.ELECTRON_SCREEN_HZ = ${hz};\nwindow.VEXA_INJECT_BASE_URL = ${JSON.stringify(injectBaseUrl)};\n${allScripts.join('\n')}\n;void 0;`;

            win.webContents.executeJavaScript(payload).catch(err => {
                console.error("Failed to inject bundled scripts:", err);
            });

            // Don't show window until Vexa systems are fully ready
            if (!win.isVisible()) {
                const checkReady = setInterval(() => {
                    if (win.isDestroyed()) { clearInterval(checkReady); return; }
                    win.webContents.executeJavaScript(`!!document.getElementById('vexa-hdr-right')`)
                        .then(ready => {
                            if (ready && !win.isDestroyed() && !win.isVisible()) {
                                clearInterval(checkReady);
                                win.maximize(); // Tam ekran yap
                                if (options.onReady) {
                                    options.onReady();
                                } else {
                                    win.show();
                                }
                            }
                        })
                        .catch(() => {});
                }, 300);

                // Safety: show after 15 seconds no matter what
                setTimeout(() => {
                    clearInterval(checkReady);
                    if (!win.isDestroyed() && !win.isVisible()) {
                        win.maximize();
                        if (options.onReady) options.onReady();
                        else win.show();
                    }
                }, 15000);
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
