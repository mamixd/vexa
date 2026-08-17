// UI Injection logic for specific Menus and Chat shortcuts
(() => {
    // Listen for commands from the Main Electron process 
    // (e.g. User clicked a button on the Admin Panel window)
    if(window.haxballAPI) {
        window.haxballAPI.onCommand((cmd) => {
            if(cmd.action === 'change_title') {
                const titleNode = document.querySelector('.hax-custom-header div');
                if(titleNode) titleNode.innerText = cmd.payload;
            }
            if(cmd.action === 'send_chat') {
                // Here we would hook into Haxball's chat input natively via DOM manipulation
                // e.g. finding the input iframe, setting value, and dispatching keyboard event
                console.log("Executing send_chat:", cmd.payload);
            }
        });
    }
    function installFavoriteFallback() {
        const getDoc = () => {
            const frame = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
            try { return frame && frame.contentWindow ? frame.contentWindow.document : null; } catch (err) { return null; }
        };

        const readFavs = () => {
            try {
                const value = JSON.parse(localStorage.getItem('fav_rooms') || '[]');
                return Array.isArray(value) ? value : [];
            } catch (err) {
                return [];
            }
        };

        const writeFavs = (rooms) => {
            const favRooms = Array.from(new Set(rooms.filter(Boolean)));
            localStorage.setItem('fav_rooms', JSON.stringify(favRooms));
            try {
                if (!window.electronAPI?.getAppPreferences || !window.electronAPI?.setAppPreference) return;
                window.electronAPI.getAppPreferences().then((prefs) => {
                    const profiles = prefs.profiles || [];
                    const currentProfile = localStorage.getItem('current_profile') || 'default';
                    const profile = profiles.find((item) => item.id === currentProfile) || profiles[0];
                    if (!profile) return null;
                    profile.fav_rooms = favRooms;
                    return window.electronAPI.setAppPreference('profiles', profiles);
                }).catch(() => {});
            } catch (err) {}
        };

        const cleanName = (row) => {
            const cell = row?.children?.[0];
            return cell ? cell.textContent.replace(/^\*\s*/, '').trim() : '';
        };

        let showOnlyFavorites = false;

        const decorateRooms = () => {
            const doc = getDoc();
            if (!doc) return;

            const favorites = new Set(readFavs());
            doc.querySelectorAll('tbody tr').forEach((row) => {
                const cell = row.children?.[0];
                const roomName = cleanName(row);
                if (!cell || !roomName) return;

                const isFavorite = favorites.has(roomName);
                row.style.display = showOnlyFavorites && !isFavorite ? 'none' : '';
                row.style.fontWeight = isFavorite ? '700' : '';
                cell.style.color = isFavorite ? '#ffd166' : '';
                cell.textContent = isFavorite ? `* ${roomName}` : roomName;
            });

            const selectedRoom = cleanName(doc.querySelector('tr.selected'));
            const favButton = doc.querySelector('button[data-hook="vexaFavRoom"]');
            if (favButton) {
                const label = favButton.querySelector('div') || favButton;
                label.textContent = selectedRoom && favorites.has(selectedRoom) ? 'Unfav' : 'Favorite';
            }
        };

        const createButton = (doc, hook, iconClass, label, onClick) => {
            const button = doc.createElement('button');
            button.setAttribute('data-hook', hook);
            button.className = 'vexa-custom-btn';
            button.addEventListener('click', onClick);

            const icon = doc.createElement('i');
            icon.className = iconClass;
            button.appendChild(icon);

            const text = doc.createElement('div');
            text.textContent = label;
            button.appendChild(text);
            return button;
        };

        const ensureButtons = () => {
            const doc = getDoc();
            if (!doc) return;
            if (doc.querySelector('button[data-hook="favRoom"]') || doc.querySelector('button[data-hook="vexaFavRoom"]')) return;

            let anchor = doc.querySelector('button[data-hook="autoJoin"]');
            if (!anchor) {
                const createBtn = doc.querySelector('button[data-hook="create"]');
                if (createBtn && createBtn.closest('.dialog') && createBtn.closest('.dialog').querySelector('table.header')) {
                    anchor = createBtn;
                }
            }
            if (!anchor?.parentNode) return;

            const favButton = createButton(doc, 'vexaFavRoom', 'icon-star-empty', 'Favorite', () => {
                const selectedRoom = cleanName(doc.querySelector('tr.selected'));
                if (!selectedRoom) {
                    if (window.showVexaAlert) window.showVexaAlert('Notice', 'You must select a room first');
                    return;
                }
                const favorites = new Set(readFavs());
                if (favorites.has(selectedRoom)) favorites.delete(selectedRoom);
                else favorites.add(selectedRoom);
                writeFavs(Array.from(favorites));
                decorateRooms();
            });

            const filterButton = createButton(doc, 'vexaFavFilter', 'icon-star', 'Filter Favs', () => {
                showOnlyFavorites = !showOnlyFavorites;
                const label = filterButton.querySelector('div') || filterButton;
                label.textContent = showOnlyFavorites ? 'Show All' : 'Filter Favs';
                decorateRooms();
            });

            anchor.parentNode.insertBefore(favButton, anchor.nextSibling);
            anchor.parentNode.insertBefore(filterButton, favButton.nextSibling);

            const tbody = doc.querySelector('tbody');
            if (tbody) {
                tbody.addEventListener('click', () => setTimeout(decorateRooms, 50));
                new MutationObserver(decorateRooms).observe(tbody, { childList: true, subtree: true, characterData: true });
            }
            decorateRooms();
        };

        setInterval(() => {
            ensureButtons();
            decorateRooms();
        }, 1000);
    }

    installFavoriteFallback();

    // =============================================
    // Maç İçi Buton Gizle/Göster Toggle (Ok ile)
    // =============================================
    function installGameButtonsToggle() {
        const getDoc = () => {
            const frame = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
            try { return frame && frame.contentWindow ? frame.contentWindow.document : null; } catch (e) { return null; }
        };

        let buttonsHidden = false;

        function injectToggle() {
            const doc = getDoc();
            if (!doc) return;

            // Sadece maç içinde (.buttons div varsa) göster
            const buttonsDiv = doc.querySelector('.buttons');
            if (!buttonsDiv) {
                // Maç dışındaysa varsa kaldır
                const old = doc.getElementById('vexa-game-toggle');
                if (old) old.remove();
                buttonsHidden = false;
                return;
            }

            // Zaten enjekte edildiyse tekrar ekleme
            if (doc.getElementById('vexa-game-toggle')) return;

            // Butonlar container'ına geçiş efekti ekle
            buttonsDiv.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            buttonsDiv.style.transformOrigin = 'top right';

            // Ok butonu - butonların hemen soluna yapışık küçük tab
            const arrowBtn = doc.createElement('div');
            arrowBtn.id = 'vexa-game-toggle';
            arrowBtn.style.cssText = [
                'position:fixed',
                'top:0',
                'right:0',
                'width:18px',
                'height:32px',
                'background:rgba(0,0,0,0.5)',
                'border:1px solid rgba(255,255,255,0.1)',
                'border-top:none',
                'border-right:none',
                'border-radius:0 0 0 6px',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'cursor:pointer',
                'z-index:999999',
                'color:rgba(255,255,255,0.55)',
                'font-size:10px',
                'transition:background 0.2s, color 0.2s',
                'user-select:none'
            ].join(';');
            arrowBtn.innerText = '◀';

            arrowBtn.onmouseover = () => { arrowBtn.style.background = 'rgba(255,255,255,0.15)'; arrowBtn.style.color = '#fff'; };
            arrowBtn.onmouseout = () => { arrowBtn.style.background = 'rgba(0,0,0,0.5)'; arrowBtn.style.color = 'rgba(255,255,255,0.55)'; };

            arrowBtn.onclick = () => {
                buttonsHidden = !buttonsHidden;
                const btn = doc.getElementById('vexa-game-toggle');
                if (buttonsHidden) {
                    buttonsDiv.style.opacity = '0';
                    buttonsDiv.style.transform = 'translateY(-100%)';
                    buttonsDiv.style.pointerEvents = 'none';
                    if (btn) btn.innerText = '▶';
                } else {
                    buttonsDiv.style.opacity = '1';
                    buttonsDiv.style.transform = 'translateY(0)';
                    buttonsDiv.style.pointerEvents = '';
                    if (btn) btn.innerText = '◀';
                }
            };

            doc.body.appendChild(arrowBtn);
        }

        setInterval(injectToggle, 1200);
    }

    installGameButtonsToggle();
})();
