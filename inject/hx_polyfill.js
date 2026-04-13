// Haxball-Room-Extension (hxalltool) Chrome API Polyfill
(() => {
    console.log("[Vexa Client] Initializing Chrome API Polyfill for HaxBall tool...");

    const EXT_CSS = `
#dropdown-content {
  display: none;
  position: absolute;
  background-color: #3a4952;
  min-width: 80%;
  z-index: 99999;
  max-height: 300px;
  overflow-y:scroll;
}
.dropdown:hover #dropdown-content {display: block;}
    `;

    window.chrome = window.chrome || {};

    window.chrome.runtime = {
        getManifest: () => ({ version: "1.0.0 (Vexa Client)" }),
        getURL: (path) => {
            if (path.includes('filter_button.css')) {
                return 'data:text/css;base64,' + btoa(EXT_CSS);
            }
            return path;
        },
        sendMessage: (msg) => {
            console.log("[Vexa Client] Intercepted Chrome Message:", msg);
        },
        onMessage: { addListener: () => {} }
    };

    window.chrome.storage = {
        local: {
            get: (keys, callback) => {
                let defaults = {};
                if (typeof keys === 'object' && !Array.isArray(keys)) {
                    defaults = keys;
                    keys = Object.keys(keys);
                }
                if (typeof keys === 'string') keys = [keys];
                
                let result = {};
                keys.forEach(k => {
                    let val = localStorage.getItem('ext_' + k);
                    try {
                        result[k] = val !== null ? JSON.parse(val) : (defaults[k] !== undefined ? defaults[k] : null);
                    } catch (e) {
                        console.warn("[Vexa Client] Polyfill Parse Error for " + k + ":", e);
                        result[k] = defaults[k] !== undefined ? defaults[k] : null;
                    }
                });
                if (callback) callback(result);
            },
            set: (items, callback) => {
                Object.entries(items).forEach(([k, v]) => {
                    localStorage.setItem('ext_' + k, JSON.stringify(v));
                });
                if (callback) callback();
            }
        }
    };

    // Prevent notification errors
    window.chrome.notifications = window.chrome.notifications || {
        create: (id, options, cb) => {
            console.log("[Vexa] Suppressed notification:", id, options);
            if (cb) cb();
        },
        clear: (id, cb) => {
            if (cb) cb();
        },
        onClicked: { addListener: () => {} }
    };

    // Helper for regex escape attached globally since hxalltool uses it
    RegExp.escape = function(s) {
        return s.replace(/[-\/\\^$*+!?.()[\]{}]/g, '\\$&');
    };

    // Global variables required by the extension scripts
    window.chatTimer = undefined;
    window.chatShortcuts = {};
    window.expandRe = / /;
    window.muted = new Set();
    window.muteAllToggle = false;
    window.autoJoinObserver = undefined;
    window.refreshCycle = undefined;
    window.myNick = undefined;

    // Global warning modal mimicking HaxBall's native dialogs
    window.showVexaAlert = function(title, msg) {
        let doc = document;
        const gameframe = document.querySelector('iframe.gameframe');
        if (gameframe && gameframe.contentWindow) {
            doc = gameframe.contentWindow.document;
        }

        const overlay = doc.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const dialog = doc.createElement('div');
        dialog.className = 'dialog';
        dialog.style.minWidth = '250px';

        const h1 = doc.createElement('h1');
        h1.innerText = title || 'Notice';
        dialog.appendChild(h1);

        const p = doc.createElement('p');
        p.innerText = msg;
        p.style.margin = '15px 0';
        p.style.textAlign = 'center';
        dialog.appendChild(p);

        const btnDiv = doc.createElement('div');
        btnDiv.style.textAlign = 'center';
        const okBtn = doc.createElement('button');
        okBtn.innerText = 'Ok';
        okBtn.onclick = function() {
            overlay.remove();
        };
        btnDiv.appendChild(okBtn);
        dialog.appendChild(btnDiv);

        overlay.appendChild(dialog);
        doc.body.appendChild(overlay);
    };

})();
