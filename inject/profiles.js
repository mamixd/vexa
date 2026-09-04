(() => {
    const COMMAND_BAR_PLACEHOLDER = "Komut yazın veya sohbet edin...";

    function getPublicIdFromAuth(authStr) {
        if (!authStr) return null;
        const str = String(authStr).trim();
        if (str.startsWith("idkey.")) {
            const parts = str.split(".");
            return parts[1] || str;
        }
        return str;
    }

    function customAlert(title, messageHtml, buttons) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(3,7,18,0.75)', backdropFilter: 'blur(6px)', zIndex: '100000', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
            opacity: '0', transition: 'opacity 0.2s ease'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: '#151619',
            padding: '22px 24px', borderRadius: '10px', color: '#d1d5db', 
            maxWidth: '480px', width: '92%', maxHeight: '92vh', overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.65)',
            transform: 'scale(0.94)', transition: 'transform 0.2s ease, opacity 0.2s ease', opacity: '0',
            boxSizing: 'border-box'
        });

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:10px; margin-bottom:12px;">
                <h2 style="margin:0; font-size:15px; color:var(--vexa-accent, #f59e0b); font-weight:800; text-transform:uppercase; letter-spacing:1px;">${title}</h2>
                <button id="custom-alert-close" style="background:transparent; border:none; color:#6b7280; font-size:16px; cursor:pointer; line-height:1; padding:2px 6px; outline:none; transition:color 0.15s;">✕</button>
            </div>
            <div style="font-size:12.5px; line-height:1.6; color:#d1d5db;">${messageHtml}</div>
        `;
        const closeIcon = box.querySelector('#custom-alert-close');
        if (closeIcon) {
            closeIcon.onmouseover = () => { closeIcon.style.color = '#fff'; };
            closeIcon.onmouseout = () => { closeIcon.style.color = '#6b7280'; };
            closeIcon.onclick = () => closeAlert();
        }

        const btnRow = document.createElement('div');
        btnRow.style.marginTop = '16px';
        btnRow.style.display = 'flex';
        btnRow.style.gap = '10px';
        btnRow.style.justifyContent = 'flex-end';

        const closeAlert = () => {
            box.style.opacity = '0';
            box.style.transform = 'scale(0.94)';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        };

        if (buttons && buttons.length > 0) {
            buttons.forEach(b => {
                b.addEventListener('click', () => { closeAlert(); });
                btnRow.appendChild(b);
            });
        } else {
            const closeBtn = document.createElement('button');
            closeBtn.innerText = 'TAMAM';
            Object.assign(closeBtn.style, {
                padding: '8px 20px', background: 'var(--vexa-accent, #f59e0b)', color: '#000000', border: 'none', 
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.3)'
            });
            closeBtn.onclick = closeAlert;
            btnRow.appendChild(closeBtn);
        }

        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        return overlay;
    }

    const loadProfileToLocalStorage = (profileId) => {
        window.electronAPI.getAppPreferences()
            .then((prefs) => {
                const profiles = prefs["profiles"] || [];
                const profile = profiles.find(p => p.id === profileId) || profiles[0];
                if (!profile) return;
                
                localStorage.setItem("current_profile", profile.id);

                Object.keys(profile)
                .filter(attr_name => !["id", "name", "autosave"].includes(attr_name))
                .forEach(attr_name => {
                    let attr_val = profile[attr_name];
                    if (attr_val === null){
                        localStorage.removeItem(attr_name);
                    } else {
                        if (attr_name === "geo_override" || attr_name === "animatedAvatar"){
                            attr_val = JSON.stringify(attr_val);
                        }
                        if (attr_name === "fav_rooms"){
                            attr_val = (attr_val.length !== 0) ? JSON.stringify(attr_val) : "[]";
                        }
                        localStorage.setItem(attr_name, attr_val);
                    }
                });
            })
            .catch(error => console.error('Failed to load settings:', error));
    }

    const switchProfile = (newProfileId) => {
        console.log(`Switching to profile: ${newProfileId}`);
        loadProfileToLocalStorage(newProfileId);
        sessionStorage.removeItem('profileInitialized');
        window.electronAPI.restartApp();
    };

    const exportCurrentProfile = () => {
        return window.electronAPI.getAppPreferences()
            .then((prefs) => {
                const profiles = prefs["profiles"];
                const currentProfile = localStorage.getItem("current_profile") || "default";
                const profileId = profiles.findIndex(p => p.id == currentProfile);
                if (profileId === -1) return;

                Object.keys(profiles[profileId])
                .filter(attr_name => !["id", "name", "autosave"].includes(attr_name))
                .forEach(attr_name => {
                    let attr_value = localStorage.getItem(attr_name);
                    if ((attr_name == "geo_override" || attr_name == "animatedAvatar") && attr_value) {
                        try { attr_value = JSON.parse(attr_value); } catch(e){}
                    }
                    if (attr_name == "fav_rooms" && attr_value) {
                        try { attr_value = JSON.parse(attr_value || "[]"); } catch(e){}
                    }
                    profiles[profileId][attr_name] = attr_value;
                });
                return window.electronAPI.setAppPreference("profiles", profiles);
            })
            .catch(error => console.error('Failed to export profile:', error));
    }

    const removeProfiles = (profileIds) => {
        return window.electronAPI.getAppPreferences()
            .then(prefs => {
                const profiles = prefs["profiles"].filter(p => !profileIds.includes(p.id));
                return window.electronAPI.setAppPreference("profiles", profiles);
            })
            .catch(error => console.error('Failed to remove profiles:', error));
    }

    function createProfileManagerDialog(profiles) {
        if (!document.getElementById('font-awesome-4')) {
            const fa = document.createElement('link');
            fa.id = 'font-awesome-4'; fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
            document.head.appendChild(fa);
        }

        const currentProfileId = localStorage.getItem("current_profile") || 'default';
        let selectedProfileId = currentProfileId;
        const removalSet = new Set();
        const saveSet = new Set();

        const styleId = 'custom-modal-style';
        document.getElementById(styleId)?.remove();
        document.getElementById('custom-modal')?.remove();
        document.getElementById('blur-overlay')?.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #custom-modal {
                background: #151619;
                border: 1px solid rgba(255,255,255,0.08);
                box-shadow: 0 24px 70px rgba(0,0,0,0.65);
                border-radius: 10px;
                padding: 22px; color: #d1d5db; max-width: 540px; width: 92%; max-height: 88vh;
                text-align: center; opacity: 0; transform: translate(-50%, -50%) scale(0.92);
                transition: opacity 0.2s ease, transform 0.2s ease; display: flex; flex-direction: column;
                position: fixed; top: 50%; left: 50%; overflow: hidden; z-index: 10000; box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            }
            #profile-list { overflow-y: auto; margin-bottom: 16px; flex-grow: 1; min-height: 120px; padding-right: 4px; }
            #profile-list::-webkit-scrollbar { width: 5px; }
            #profile-list::-webkit-scrollbar-track { background: transparent; }
            #profile-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
            #profile-list::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
            #custom-modal-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
            #custom-modal hr { display: none; }
            .profile-card { border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; text-align: left; display: flex; flex-direction: column; gap: 6px; position: relative; background: rgba(255, 255, 255, 0.02); transition: all 0.2s ease; }
            .profile-card:hover { border-color: rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.4); background: rgba(255, 255, 255, 0.035); }
            .profile-card button { padding: 6px 12px; font-size: 11px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; background: rgba(255, 255, 255, 0.04); color: #d1d5db; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px; }
            .profile-card button:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; border-color: rgba(255, 255, 255, 0.2); }
            .button-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
            .auth-button-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
            .delete-badge { position: absolute; top: 14px; right: 14px; background-color: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 3px 8px; border-radius: 4px; font-size: 10px; display: none; font-weight: bold; text-transform: uppercase; }
            .save-badge { position: absolute; top: 14px; right: 14px; background-color: rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.15); color: var(--vexa-accent, #f59e0b); border: 1px solid rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.3); padding: 3px 8px; border-radius: 4px; font-size: 10px; display: none; font-weight: bold; text-transform: uppercase; }
            #custom-modal-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
            #custom-modal-buttons button { padding: 10px 22px; font-size: 13px; font-weight: 700; border: none; border-radius: 8px; background: var(--vexa-accent, #f59e0b); color: #000000; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.3); text-transform: uppercase; letter-spacing: 0.6px;}
            #custom-modal-buttons button:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.5); }
            #custom-modal-close { background: transparent; border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; color: #6b7280; cursor: pointer; font-size: 14px; width: 26px; height: 26px; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; padding: 0; outline: none; }
            #custom-modal-close:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
            #blur-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(3,7,18,0.68); backdrop-filter: blur(6px); z-index: 9999; display: none; opacity: 0; transition: opacity 0.2s ease; }
            .profile-field-label { font-weight: 600; font-size: 12px; color: #6b7280; }
            .profile-field-label-mod { font-weight: 700; color: var(--vexa-accent, #f59e0b); font-size: 12px; }
            .profile-field-mod { color: var(--vexa-accent, #f59e0b); font-size: 12px; font-weight: 700; }
            .profile-name { font-weight: 700; font-size: 15px; color: #ffffff; margin-bottom: 4px; letter-spacing: 0.4px; }
            .profile-val { font-size: 12px; color: #d1d5db; font-weight: 500; word-break: break-all; }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'blur-overlay';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.id = 'custom-modal';

        const hdrBox = document.createElement('div');
        hdrBox.id = 'custom-modal-hdr';
        hdrBox.innerHTML = `
            <div style="text-align:left;">
                <div style="font-weight:900; color:var(--vexa-accent, #f59e0b); font-size:14px; letter-spacing:2px; line-height:1.2;">VEXA</div>
                <div style="font-weight:600; color:#374151; font-size:9px; letter-spacing:2.5px; margin-top:2px;">PROFILES</div>
            </div>
            <h2 style="margin:0; font-size:13px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Profil Yönetimi</h2>
        `;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'custom-modal-close'; closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', closeModal);
        hdrBox.appendChild(closeBtn);
        modal.appendChild(hdrBox);

        const createNewBtn = document.createElement('button');
        createNewBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; flex-shrink:0;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg> YENİ PROFİL OLUŞTUR';
        Object.assign(createNewBtn.style, { padding: '9px 16px', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)', color: '#e5e7eb', cursor: 'pointer', margin: '0 0 16px 0', width:'100%', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });
        createNewBtn.onmouseover = () => { createNewBtn.style.background = 'rgba(255, 255, 255, 0.08)'; createNewBtn.style.color = '#ffffff'; };
        createNewBtn.onmouseout = () => { createNewBtn.style.background = 'rgba(255, 255, 255, 0.04)'; createNewBtn.style.color = '#e5e7eb'; };
        createNewBtn.addEventListener('click', () => { closeModal(); profileNew(); });
        modal.appendChild(createNewBtn);

        const profileList = document.createElement('div');
        profileList.id = 'profile-list';
        modal.appendChild(profileList);

        const tipNote = document.createElement('div');
        tipNote.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--vexa-accent, #f59e0b)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span>Değişikliklerin kaydedilmesi için <b>DEĞİŞİKLİKLERİ UYGULA</b>\'ya basmalısınız.</span>';
        Object.assign(tipNote.style, {
            fontSize: '11px', color: '#9ca3af', margin: '0 0 14px 0',
            textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        });
        modal.appendChild(tipNote);

        const selectButtons = new Map();

        profiles.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card';

            const nameHeader = document.createElement('div');
            nameHeader.style.display = 'flex';
            nameHeader.style.alignItems = 'center';
            nameHeader.style.justifyContent = 'space-between';
            nameHeader.style.marginBottom = '6px';
            nameHeader.style.minHeight = '32px';

            const renderNameView = () => {
                nameHeader.innerHTML = '';

                const nameEl = document.createElement('div');
                nameEl.className = "profile-name";
                nameEl.textContent = profile.name;
                nameEl.style.margin = '0';
                nameEl.style.fontSize = '14px';
                nameEl.style.fontWeight = '800';

                const renameBtn = document.createElement('button');
                renameBtn.type = 'button';
                renameBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; flex-shrink:0;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> İSMİ DÜZENLE';
                Object.assign(renameBtn.style, {
                    padding: '3px 8px', fontSize: '10.5px', fontWeight: '700',
                    border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '5px',
                    background: 'rgba(255, 255, 255, 0.04)', color: '#9ca3af',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    display: 'inline-flex', alignItems: 'center'
                });
                renameBtn.onmouseover = () => { renameBtn.style.background = 'rgba(255, 255, 255, 0.08)'; renameBtn.style.color = '#ffffff'; };
                renameBtn.onmouseout = () => { renameBtn.style.background = 'rgba(255, 255, 255, 0.04)'; renameBtn.style.color = '#9ca3af'; };

                renameBtn.onclick = (e) => {
                    e.stopPropagation();
                    renderEditView();
                };

                nameHeader.appendChild(nameEl);
                nameHeader.appendChild(renameBtn);
            };

            const renderEditView = () => {
                nameHeader.innerHTML = '';

                const editWrap = document.createElement('div');
                editWrap.style.display = 'flex';
                editWrap.style.alignItems = 'center';
                editWrap.style.gap = '6px';
                editWrap.style.width = '100%';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = profile.name;
                input.maxLength = 25;
                Object.assign(input.style, {
                    flex: '1',
                    background: '#0d0f12',
                    border: '1px solid var(--vexa-accent, #f59e0b)',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'inherit'
                });

                const saveBtn = document.createElement('button');
                saveBtn.type = 'button';
                saveBtn.textContent = 'KAYDET';
                Object.assign(saveBtn.style, {
                    background: 'var(--vexa-accent, #f59e0b)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    letterSpacing: '0.4px'
                });

                const cancelBtn = document.createElement('button');
                cancelBtn.type = 'button';
                cancelBtn.textContent = 'İPTAL';
                Object.assign(cancelBtn.style, {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#9ca3af',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                });

                const doSave = async () => {
                    const val = input.value.trim();
                    if (val && val.length > 0) {
                        profile.name = val;
                        await window.electronAPI.setAppPreference("profiles", profiles);
                        if (profile.id === currentProfileId) {
                            const topNick = document.getElementById('current-profile-name');
                            if (topNick) topNick.textContent = val;
                        }
                    }
                    renderNameView();
                };

                saveBtn.onclick = (e) => {
                    e.stopPropagation();
                    doSave();
                };

                cancelBtn.onclick = (e) => {
                    e.stopPropagation();
                    renderNameView();
                };

                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        doSave();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        renderNameView();
                    }
                };

                editWrap.appendChild(input);
                editWrap.appendChild(saveBtn);
                editWrap.appendChild(cancelBtn);
                nameHeader.appendChild(editWrap);

                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 30);
            };

            renderNameView();
            card.appendChild(nameHeader);

            let storedGeo = localStorage.getItem("geo_override");
            try { storedGeo = JSON.parse(storedGeo); } catch(e){}

            const rawAuth = (currentProfileId === profile.id) ? (localStorage.getItem("player_auth_key") || "") : (profile.player_auth_key || "");
            const parsedPublicId = getPublicIdFromAuth(rawAuth);
            const displayAuth = parsedPublicId ? (parsedPublicId.length > 28 ? parsedPublicId.substring(0, 28) + "..." : parsedPublicId) : "(yok)";

            const fields = [
                { label: 'İsim', value: (currentProfileId === profile.id) ? localStorage.getItem("player_name") : profile.player_name, modified: (currentProfileId === profile.id) && profile.player_name !== localStorage.getItem("player_name") },
                { label: 'Avatar', value: (currentProfileId === profile.id) ? (localStorage.getItem("avatar") || '(yok)') : profile.avatar || '(yok)', modified: (currentProfileId === profile.id) && profile.avatar !== localStorage.getItem("avatar") },
                { label: 'Extrapolation', value: (currentProfileId === profile.id) ? (localStorage.getItem("extrapolation") || '0') : profile.extrapolation || '0', modified: (currentProfileId === profile.id) && (profile.extrapolation || '0') !== (localStorage.getItem("extrapolation") || '0') },
                { label: 'Konum', value: (currentProfileId === profile.id) ? (storedGeo ? storedGeo.code.toUpperCase() : '(yok)') : (profile.geo_override ? profile.geo_override.code.toUpperCase() : '(yok)'), modified: (currentProfileId === profile.id) && ((profile.geo_override?.code || "") !== ((storedGeo || {})?.code || "")) },
                { label: 'Kimlik (Auth)', value: displayAuth, modified: (currentProfileId === profile.id) && (profile.player_auth_key !== localStorage.getItem("player_auth_key")) }
            ];

            fields.forEach(pf => {
                const div = document.createElement('div');
                let valStr = pf.value || '(yok)';
                if (pf.modified) div.innerHTML = `<span class="profile-field-label-mod">${pf.label}:</span> <span class="profile-field-mod">${valStr}</span>`;
                else div.innerHTML = `<span class="profile-field-label">${pf.label}:</span> <span class="profile-val">${valStr}</span>`;
                card.appendChild(div);
            });

            const deletionBadge = document.createElement('div'); deletionBadge.className = 'delete-badge'; deletionBadge.textContent = 'Silinecek'; card.appendChild(deletionBadge);
            const saveBadge = document.createElement('div'); saveBadge.className = 'save-badge'; saveBadge.textContent = 'Kaydedilecek'; card.appendChild(saveBadge);

            const buttonRow = document.createElement('div'); buttonRow.className = 'button-row';

            const selectBtn = document.createElement('button');
            const styleSelectBtn = (btn, isSelected) => {
                btn.textContent = isSelected ? 'SEÇİLDİ' : 'SEÇ';
                btn.style.background = isSelected ? 'var(--vexa-accent, #f59e0b)' : 'rgba(255, 255, 255, 0.04)';
                btn.style.color = isSelected ? '#000000' : '#d1d5db';
                btn.style.border = isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.08)';
                btn.style.boxShadow = isSelected ? '0 4px 12px rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.3)' : 'none';
            };
            styleSelectBtn(selectBtn, [selectedProfileId, currentProfileId].includes(profile.id));
            selectBtn.addEventListener('click', () => {
                selectedProfileId = profile.id;
                selectButtons.forEach((btn, pid) => styleSelectBtn(btn, pid === profile.id));
            });
            buttonRow.appendChild(selectBtn); selectButtons.set(profile.id, selectBtn);

            if (profile.id === currentProfileId) {
                const saveBtn = document.createElement('button'); 
                saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px; flex-shrink:0;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> AYARLARI KAYDET';
                saveBtn.style.display = 'inline-flex'; saveBtn.style.alignItems = 'center';
                saveBtn.title = 'Mevcut oyun içi Nick, Avatar ve ayarları bu profile kaydet';
                saveBtn.addEventListener('click', () => {
                    if (saveSet.has(profile.id)) { saveSet.delete(profile.id); saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px; flex-shrink:0;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> AYARLARI KAYDET'; saveBadge.style.display = 'none'; }
                else { saveSet.add(profile.id); saveBtn.textContent = "GERİ AL"; saveBadge.style.display = 'block'; }
                });
                buttonRow.appendChild(saveBtn);
            }

            if (profile.id !== 'default') {
                const removeBtn = document.createElement('button'); removeBtn.textContent = 'SİL';
                removeBtn.addEventListener('click', () => {
                    if (removalSet.has(profile.id)) { removalSet.delete(profile.id); removeBtn.textContent = 'SİL'; deletionBadge.style.display = 'none'; }
                    else { removalSet.add(profile.id); removeBtn.textContent = 'GERİ AL'; deletionBadge.style.display = 'block'; }
                });
                buttonRow.appendChild(removeBtn);
            }

            card.appendChild(buttonRow);

            // Auth Management Row (Copy & Reset ONLY)
            const authRow = document.createElement('div'); authRow.className = 'auth-button-row';

            const copyAuthBtn = document.createElement('button');
            copyAuthBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px; flex-shrink:0;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> AUTH KOPYALA';
            copyAuthBtn.style.display = 'inline-flex'; copyAuthBtn.style.alignItems = 'center';
            copyAuthBtn.title = 'Auth kimliğini panoya kopyala';
            copyAuthBtn.addEventListener('click', () => {
                const targetKey = (currentProfileId === profile.id) ? localStorage.getItem("player_auth_key") : profile.player_auth_key;
                const pubId = getPublicIdFromAuth(targetKey);
                if (pubId) {
                    navigator.clipboard.writeText(pubId).then(() => {
                        customAlert("AUTH KOPYALANDI!", "Auth kimliği başarıyla kopyalandı.<br><br><code style='color:var(--vexa-accent, #f59e0b); word-break:break-all; font-weight:700;'>" + pubId + "</code>", []);
                    });
                } else {
                    customAlert("AUTH BULUNAMADI", "Bu profilde kayıtlı herhangi bir Auth kimliği bulunmuyor.", []);
                }
            });

            const resetAuthBtn = document.createElement('button');
            resetAuthBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px; flex-shrink:0;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> AUTH SIFIRLA';
            resetAuthBtn.style.display = 'inline-flex'; resetAuthBtn.style.alignItems = 'center';
            resetAuthBtn.title = 'Auth kimliğini sıfırla (yeni kimlik oluşturulacak)';
            resetAuthBtn.addEventListener('click', () => {
                if (profile.id !== currentProfileId) {
                    customAlert("PROFİL UYARISI", "Auth sıfırlayabilmek için şu an bu aktif profilde olmalısınız.<br><br>Lütfen önce profili <b>SEÇ</b>in ve değişiklikleri uygulayın.", []);
                    return;
                }
                localStorage.removeItem("player_auth_key");
                profile.player_auth_key = null;
                saveSet.add(profile.id);
                customAlert("AUTH SIFIRLANDI!", "Profilin Auth kimliği sıfırlandı. Odaya girerken HaxBall yeni bir hesap kimliği tanımlayacaktır.", []);
                closeModal();
                createProfileManagerDialog(profiles);
            });

            authRow.appendChild(copyAuthBtn);
            authRow.appendChild(resetAuthBtn);
            card.appendChild(authRow);

            profileList.appendChild(card);
        });

        const modalButtons = document.createElement('div'); modalButtons.id = 'custom-modal-buttons';
        const applyBtn = document.createElement('button'); applyBtn.textContent = 'Değişiklikleri Uygula';
        applyBtn.addEventListener('click', async () => {
            const currentProf = profiles.find(p => p.id === currentProfileId);
            if (currentProf && currentProf.autosave) {
                saveSet.add(currentProfileId); 
            }

            if (Array.from(saveSet).length !== 0) await exportCurrentProfile();
            if (Array.from(removalSet).length !== 0) await removeProfiles(Array.from(removalSet));
            if (Array.from(removalSet).includes(selectedProfileId)) selectedProfileId = "default";
            closeModal();

            if (selectedProfileId !== currentProfileId){
                customAlert("Değişiklikler Uygulandı!", "Profiller arası geçiş için uygulama yeniden başlatılacak.", []);
                setTimeout(() => switchProfile(selectedProfileId), 2000);
            }
        });
        modalButtons.appendChild(applyBtn); modal.appendChild(modalButtons); document.body.appendChild(modal);

        overlay.style.display = 'block';
        requestAnimationFrame(() => { overlay.style.opacity = '1'; modal.style.opacity = '1'; modal.style.transform = 'translate(-50%, -50%) scale(1)'; });

        function closeModal() {
            overlay.style.opacity = '0'; modal.style.opacity = '0'; modal.style.transform = 'translate(-50%, -50%) scale(0.92)';
            setTimeout(() => { modal.remove(); overlay.remove(); }, 200);
        }
    }

    const profileNew = async () => {
        const prefs = await window.electronAPI.getAppPreferences();
        const profiles = prefs["profiles"] || [];

        let selectedAutosave = true;
        let selectedAuthMode = 'new'; // 'new' or 'current'

        const restartButton = document.createElement('button');
        restartButton.innerText = 'PROFİL OLUŞTUR';
        restartButton.disabled = true;
        Object.assign(restartButton.style, { 
            background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: '#6b7280', 
            padding: '11px 24px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '8px', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '0.6px',
            width: '100%'
        });

        const newProfile = { 
            id: null, name: null, autosave: true, avatar: null, extrapolation: '0', fav_rooms: [], geo_override: null, player_name: null, player_auth_key: null,
            animatedAvatar: { 
                enabled: false, 
                defaultAvatar: 'VX', 
                resetDuration: 2000, 
                hotkeys: { "1": "🔥", "2": "🤮", "3": "💀", "4": "🧤" } 
            }
        };

        const createLabelInput = (id, labelText, placeholder) => {
            const box = document.createElement('div');
            box.className = 'label-input';
            Object.assign(box.style, { 
                display: 'flex', backgroundColor: '#0d0f12', alignItems: 'center', 
                borderRadius: '8px', padding: '9px 14px', marginBottom: '10px', 
                border:'1px solid rgba(255,255,255,0.08)' 
            });
            
            const label = document.createElement('label'); 
            label.textContent = labelText; label.style.marginRight = '12px'; 
            label.style.color = "#9ca3af"; label.style.fontSize = "12px"; 
            label.style.width = "85px"; label.style.fontWeight = "700";
            label.style.flexShrink = "0";
            
            const input = document.createElement('input'); 
            input.id = id; input.placeholder = placeholder; input.type = 'text'; input.maxLength = 25;
            Object.assign(input.style, { flex: '1', padding: '4px 6px', border: 'none', borderRadius: '4px', background: 'transparent', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' });
            
            box.appendChild(label); box.appendChild(input); return { box, input };
        };

        const { box: nameBox, input: nameInput } = createLabelInput('profile-name-input', 'Profil adı:', 'Profil adı girin...');
        const { box: nicknameBox, input: nicknameInput } = createLabelInput('nickname-input', 'Nick:', 'Bir takma ad seçin (daha sonra değiştirilebilir)');

        // Modern Segmented Toggle Controls
        const createToggleGroup = (title, option1, option2, onSelect) => {
            const wrap = document.createElement('div');
            wrap.style.marginBottom = '12px';
            wrap.style.textAlign = 'left';

            const titleEl = document.createElement('div');
            titleEl.textContent = title;
            titleEl.style.fontSize = '12px';
            titleEl.style.fontWeight = '700';
            titleEl.style.color = '#ffffff';
            titleEl.style.marginBottom = '6px';
            wrap.appendChild(titleEl);

            const btnRow = document.createElement('div');
            btnRow.style.display = 'grid';
            btnRow.style.gridTemplateColumns = '1fr 1fr';
            btnRow.style.gap = '8px';

            const btn1 = document.createElement('button');
            const btn2 = document.createElement('button');

            const styleBtn = (btn, label, active) => {
                btn.type = 'button';
                btn.textContent = label;
                btn.style.padding = '9px 12px';
                btn.style.borderRadius = '6px';
                btn.style.fontSize = '11.5px';
                btn.style.fontWeight = '800';
                btn.style.textTransform = 'uppercase';
                btn.style.letterSpacing = '0.5px';
                btn.style.cursor = 'pointer';
                btn.style.transition = 'all 0.15s ease';
                if (active) {
                    btn.style.background = 'var(--vexa-accent, #f59e0b)';
                    btn.style.color = '#000000';
                    btn.style.border = 'none';
                    btn.style.boxShadow = '0 2px 10px rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.35)';
                } else {
                    btn.style.background = 'rgba(255, 255, 255, 0.04)';
                    btn.style.color = '#9ca3af';
                    btn.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                    btn.style.boxShadow = 'none';
                }
            };

            styleBtn(btn1, option1.label, true);
            styleBtn(btn2, option2.label, false);

            btn1.onclick = () => {
                styleBtn(btn1, option1.label, true);
                styleBtn(btn2, option2.label, false);
                onSelect(option1.value);
            };

            btn2.onclick = () => {
                styleBtn(btn1, option1.label, false);
                styleBtn(btn2, option2.label, true);
                onSelect(option2.value);
            };

            btnRow.appendChild(btn1);
            btnRow.appendChild(btn2);
            wrap.appendChild(btnRow);
            return wrap;
        };

        const autosaveToggle = createToggleGroup('Otomatik kaydetme', 
            { label: 'AÇIK', value: true }, 
            { label: 'KAPALI', value: false }, 
            (val) => { selectedAutosave = val; }
        );

        const authToggle = createToggleGroup('Auth', 
            { label: 'Yeni Auth', value: 'new' }, 
            { label: 'Mevcut Auth', value: 'current' }, 
            (val) => { selectedAuthMode = val; }
        );

        const checkInputs = () => {
            const profileNameValue = nameInput.value.trim();
            const exists = profiles.some(p => p.id === profileNameValue.toLowerCase().replace(/\s+/g, '-'));
            if (profileNameValue.length === 0 || nicknameInput.value.trim().length === 0 || exists) {
                restartButton.disabled = true;
                restartButton.style.background = 'rgba(255,255,255,0.05)';
                restartButton.style.color = '#6b7280';
                restartButton.style.cursor = 'not-allowed';
                restartButton.style.border = '1px solid rgba(255,255,255,0.08)';
                restartButton.style.boxShadow = 'none';
            } else {
                restartButton.disabled = false;
                restartButton.style.background = 'var(--vexa-accent, #f59e0b)';
                restartButton.style.color = '#000000';
                restartButton.style.cursor = 'pointer';
                restartButton.style.border = 'none';
                restartButton.style.boxShadow = '0 4px 15px rgba(var(--vexa-accent-rgb, 245, 158, 11), 0.35)';
            }
        };

        nameInput.addEventListener('input', checkInputs);
        nicknameInput.addEventListener('input', checkInputs);

        restartButton.onclick = async () => {
            const currentProfileId = localStorage.getItem("current_profile") || "default";
            const currentProf = profiles.find(p => p.id === currentProfileId);
            if (currentProf && currentProf.autosave) {
                await exportCurrentProfile();
            }

            const newProfileId = nameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
            newProfile.id = newProfileId;
            newProfile.name = nameInput.value.trim();
            newProfile.player_name = nicknameInput.value.trim();
            newProfile.autosave = selectedAutosave;

            if (selectedAuthMode === 'current') {
                newProfile.player_auth_key = localStorage.getItem("player_auth_key") || null;
            } else {
                newProfile.player_auth_key = null; // Sıfırdan yeni auth oluşturur
            }

            profiles.push(newProfile);

            const defaultProfileIdx = profiles.findIndex(p => p.id === "default");
            if (defaultProfileIdx !== -1 && profiles[defaultProfileIdx].player_name === null) {
                profiles[defaultProfileIdx].player_name = localStorage.getItem("player_name");
            }
            await window.electronAPI.setAppPreference('profiles', profiles);

            customAlert("Yeni Profil Oluşturuldu!", "Profiller arası geçiş için uygulama yeni profilinizle yeniden başlatılacak.", []);
            setTimeout(() => switchProfile(newProfileId), 1600);
        };

        const infoHtml = `
            <div style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px 14px; margin-bottom:14px; font-size:12px; line-height:1.5; color:#9ca3af; text-align:left;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <span style="font-weight:800; font-size:12px; color:#ffffff;">Yeni Profil Özellikleri</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px;">
                    <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; font-size:10.5px; color:#e2e8f0; font-weight:600;">Nick</span>
                    <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; font-size:10.5px; color:#e2e8f0; font-weight:600;">Auth Kimliği</span>
                    <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; font-size:10.5px; color:#e2e8f0; font-weight:600;">Avatar</span>
                    <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; font-size:10.5px; color:#e2e8f0; font-weight:600;">Extrapolation</span>
                    <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; font-size:10.5px; color:#e2e8f0; font-weight:600;">Konum / Bayrak</span>
                    <span style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; font-size:10.5px; color:#e2e8f0; font-weight:600;">Favori Odalar</span>
                </div>
                <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; flex-direction:column; gap:6px;">
                    <div>
                        <b style="color:var(--vexa-accent, #f59e0b);">Otomatik Kaydetme:</b>
                        <span style="color:#cbd5e1;"> Açık olduğunda uygulamayı kapattığınızda veya profil değiştirdiğinizde oyun içi değişiklikler kaydedilir. Kapalıyken otomatik kaydedilmez.</span>
                    </div>
                    <div>
                        <b style="color:var(--vexa-accent, #f59e0b);">Kimlik (Auth):</b>
                        <span style="color:#cbd5e1;"> <b>Yeni Auth</b> bu profil için sıfır kimlik oluşturur. <b>Mevcut Auth</b> şu anki profilinizin kimliğini aktarır.</span>
                    </div>
                </div>
            </div>
            <div id="profile-creation-container"></div>
        `;

        customAlert("Yeni Profil", infoHtml, [restartButton]);

        setTimeout(() => {
            const container = document.querySelector('#profile-creation-container');
            if (container) {
                container.appendChild(nameBox);
                container.appendChild(nicknameBox);
                container.appendChild(autosaveToggle);
                container.appendChild(authToggle);
            }
        }, 50);
    };

    window.profileManage = () => {
        window.electronAPI.getAppPreferences()
            .then(prefs => {
                const profiles = prefs["profiles"] || [];
                createProfileManagerDialog(profiles);
            });
    };

    function initProfileButton() {
        const currentProfileId = localStorage.getItem('current_profile') || 'default';

        const tryInjectProfile = setInterval(() => {
            if (document.getElementById('vexa-profile-btn')) {
                clearInterval(tryInjectProfile);
                return;
            }

            const rightWrapper = document.getElementById('vexa-hdr-right');
            if (!rightWrapper) return;

            const profileBtn = document.createElement('button');
            profileBtn.id = 'vexa-profile-btn';
            profileBtn.innerHTML = '👤 <span id="current-profile-name" style="margin-left:3px;">...</span>';
            profileBtn.style.cssText = "background:#1a1c20 !important; color:#8b949e !important; border:1px solid #2d3035 !important; border-radius:6px; padding:8px 13px; font-size:12px; font-weight:700; cursor:pointer; transition:color 0.15s, background 0.15s; white-space:nowrap; display:flex; align-items:center;";
            profileBtn.onmouseover = () => { profileBtn.style.color = '#c9d1d9'; profileBtn.style.background = '#22252b'; profileBtn.style.borderColor = '#3d4149'; };
            profileBtn.onmouseout = () => { profileBtn.style.color = '#8b949e'; profileBtn.style.background = '#1a1c20'; profileBtn.style.borderColor = '#2d3035'; };
            profileBtn.onclick = window.profileManage;

            rightWrapper.insertBefore(profileBtn, rightWrapper.firstChild);
            clearInterval(tryInjectProfile);

            window.electronAPI.getAppPreferences().then(prefs => {
                const p = (prefs.profiles || []).find(x => x.id === currentProfileId);
                const nameEl = document.getElementById('current-profile-name');
                if (nameEl) nameEl.textContent = p ? p.name : 'Varsayılan';
            });
        }, 300);

        setTimeout(() => clearInterval(tryInjectProfile), 10000);
    }

    initProfileButton();

})();
