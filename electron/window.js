const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow(options) {
    const win = new BrowserWindow({
        width: options.width || 1200,
        height: options.height || 800,
        title: options.title || 'HaxBall Client',
        show: false, // Yükleme bitene kadar gizle
        backgroundColor: '#1c1c1e', // Arka plan rengi (açılışta beyaz flash önler)
        webPreferences: {
            preload: options.preload,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false
        }
    });

    session.defaultSession.clearCache();

    if (options.url) {
        win.loadURL(options.url);
        
        // DOM hazır olur olmaz enjekte et (reklam/resim yüklenmesini BEKLEMEz)
        win.webContents.on('dom-ready', () => {
            const { screen } = require('electron');
            const hz = screen.getPrimaryDisplay().displayFrequency || 60;

            // List of core Vexa scripts
            const vexaScripts = ['hx_polyfill.js', 'header.js', 'ui.js', 'client.js'];
            
            // List of hxalltool scripts from manifest.json
            const extUtilityPath = path.join(__dirname, '../hxalltool/js/content_utility');
            const extScripts = [
                'copyright.js', 'search_bar.js', 'auto_join.js', 'room_favorites.js', 'admin_kick_or_ban.js',
                'toggle_chat.js', 'addon_settings.js', 'transparent_chat.js',
                'chat_properties.js', 'emojis.js', 'translate_disclaimer.js'
            ];

            let allScripts = [];
            vexaScripts.forEach(script => {
                const sp = path.join(__dirname, '../inject', script);
                if (fs.existsSync(sp)) allScripts.push(fs.readFileSync(sp, 'utf-8'));
            });

            extScripts.forEach(script => {
                const sp = path.join(extUtilityPath, script);
                if (fs.existsSync(sp)) allScripts.push(fs.readFileSync(sp, 'utf-8'));
            });

            const contentJsPath = path.join(__dirname, '../hxalltool/js/content.js');
            if (fs.existsSync(contentJsPath)) allScripts.push(fs.readFileSync(contentJsPath, 'utf-8'));

            const payload = `window.ELECTRON_SCREEN_HZ = ${hz};\n${allScripts.join('\n')}\n;void 0;`;

            win.webContents.executeJavaScript(payload).catch(err => {
                console.error("Failed to inject bundled scripts:", err);
            });
            setTimeout(() => {
                if (win.isDestroyed()) return;
                if (options.onReady) {
                    options.onReady();
                } else {
                    win.show();
                }
            }, 500);
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
