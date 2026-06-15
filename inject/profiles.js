(() => {
    const COMMAND_BAR_PLACEHOLDER = "Komut yazın veya sohbet edin...";

    function customAlert(title, messageHtml, buttons) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: '100000', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "Tahoma, Arial, sans-serif"
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: '#1c1c1e', padding: '20px', borderRadius: '4px', color: '#ccc', 
            maxWidth: '400px', width: '100%', border: '1px solid #333',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
        });

        box.innerHTML = `<h2 style="margin-top:0; font-size:16px; color:#fff; border-bottom:1px solid #333; padding-bottom:10px; font-weight:bold;">${title}</h2><div style="font-size:12px; line-height:1.5; color:#999; margin-top:15px;">${messageHtml}</div>`;
        const btnRow = document.createElement('div');
        btnRow.style.marginTop = '20px';
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.justifyContent = 'flex-end';

        if(buttons && buttons.length > 0) {
            buttons.forEach(b => {
                b.addEventListener('click', () => { setTimeout(() => overlay.remove(), 100); });
                btnRow.appendChild(b);
            });
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'İptal';
        Object.assign(closeBtn.style, {
            padding: '8px 15px', background: '#0a0a0a', color: '#888', border: '1px solid #222', 
            borderRadius: '1px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s'
        });
        closeBtn.onmouseover = () => { closeBtn.style.color = '#fff'; closeBtn.style.background = '#111'; };
        closeBtn.onmouseout = () => { closeBtn.style.color = '#888'; closeBtn.style.background = '#0a0a0a'; };
        closeBtn.onclick = () => overlay.remove();
        btnRow.appendChild(closeBtn);

        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
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
                background: #1c1c1e; border: 1px solid #333; border-radius: 4px;
                padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                color: #ccc; max-width: 480px; width: 90%; max-height: 85vh;
                text-align: center; opacity: 0; transform: scale(0.8) translate(-50%, -50%);
                transition: opacity 0.2s ease, transform 0.2s ease; display: flex; flex-direction: column;
                position: fixed; top: 50%; left: 50%; overflow: hidden; z-index: 10000; box-sizing: border-box;
                font-family: Tahoma, Arial, sans-serif;
            }
            #profile-list { overflow-y: auto; margin-bottom: 20px; flex-grow: 1; min-height: 100px; padding-right:5px; }
            #profile-list::-webkit-scrollbar { width: 5px; }
            #profile-list::-webkit-scrollbar-thumb { background: #333; border-radius: 0px; }
            #custom-modal h1 { margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-align: left; color: #fff; text-transform: none; background: none; -webkit-text-fill-color: initial; }
            #custom-modal hr { border: none; border-top: 1px solid #333; margin: 0 0 20px 0; }
            .profile-card { border: 1px solid #282828; border-radius: 2px; padding: 12px; margin-bottom: 12px; text-align: left; display: flex; flex-direction: column; gap: 4px; position: relative; background: #111; transition: 0.2s; }
            .profile-card:hover { border-color: #444; }
            .profile-card button { padding: 6px 10px; font-size: 11px; font-weight: bold; border: 1px solid #222; border-radius: 1px; background-color: #0a0a0a; color: #888; cursor: pointer; transition: 0.2s; margin-top: 8px; width: auto; min-width: 80px; text-transform: uppercase; }
            .profile-card button:hover { background-color: #1a1a1a; color: #fff; border-color: #444; }
            .button-row { display: flex; gap: 8px; margin-top: 5px; }
            .delete-badge { position: absolute; top: 12px; right: 12px; background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 2px 6px; border-radius: 1px; font-size: 10px; display: none; font-weight: bold; }
            .save-badge { position: absolute; top: 12px; right: 12px; background-color: rgba(40, 167, 69, 0.1); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.2); padding: 2px 6px; border-radius: 1px; font-size: 10px; display: none; font-weight: bold; }
            #custom-modal-buttons { display: flex; justify-content: flex-end; gap: 10px; }
            #custom-modal-buttons button { padding: 10px 20px; font-size: 13px; font-weight: bold; border: 1px solid #1e7e34; border-radius: 2px; background: #28a745; color: white; cursor: pointer; transition: 0.2s; box-shadow: none; text-transform: none; letter-spacing: 0px;}
            #custom-modal-buttons button:hover { background: #218838; transform: none; }
            #custom-modal-close { position: absolute; top: 12px; right: 15px; background: none; border: none; color: #555; font-size: 18px; cursor: pointer; transition: 0.2s;}
            #custom-modal-close:hover { color: #fff; transform: none; }
            #blur-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); z-index: 9999; display: none; opacity: 0; transition: opacity 0.2s ease; }
            .profile-field-label { font-weight: bold; font-size: 12px; color:#555; }
            .profile-field-label-mod { font-weight: bold; color: #10b981; font-size: 12px; }
            .profile-field-mod { color: #10b981; font-size:12px; font-weight: bold; }
            .profile-name { font-weight: bold; font-size: 15px; color:#eee; margin-bottom: 2px; }
            .profile-val { font-size:12px; color:#999; font-weight: normal; }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'blur-overlay';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.id = 'custom-modal';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'custom-modal-close'; closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', closeModal);
        modal.appendChild(closeBtn);

        const title = document.createElement('h1');
        title.textContent = 'Profil Yönetimi';
        modal.appendChild(title);
        modal.appendChild(document.createElement('hr'));

        const createNewBtn = document.createElement('button');
        createNewBtn.innerHTML = '<i class="fa fa-user-plus" aria-hidden="true"></i> Yeni Profil Oluştur';
        Object.assign(createNewBtn.style, { padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #333', borderRadius: '1px', backgroundColor: '#0a0a0a', color: '#888', cursor: 'pointer', margin: '0 0 20px 0', width:'100%', transition: '0.2s' });
        createNewBtn.onmouseover = () => { createNewBtn.style.color = '#fff'; createNewBtn.style.borderColor = '#555'; createNewBtn.style.backgroundColor = '#111'; };
        createNewBtn.onmouseout = () => { createNewBtn.style.color = '#888'; createNewBtn.style.borderColor = '#333'; createNewBtn.style.backgroundColor = '#0a0a0a'; };
        createNewBtn.addEventListener('click', () => { closeModal(); profileNew(); });
        modal.appendChild(createNewBtn);

        const profileList = document.createElement('div');
        profileList.id = 'profile-list';
        modal.appendChild(profileList);

        const selectButtons = new Map();

        profiles.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card';

            const nameEl = document.createElement('div');
            nameEl.className = "profile-name"; nameEl.textContent = profile.name;
            card.appendChild(nameEl);

            let storedGeo = localStorage.getItem("geo_override");
            try { storedGeo = JSON.parse(storedGeo); } catch(e){}

            const fields = [
                { label: 'İsim', value: (currentProfileId === profile.id) ? localStorage.getItem("player_name") : profile.player_name, modified: (currentProfileId === profile.id) && profile.player_name !== localStorage.getItem("player_name") },
                { label: 'Avatar', value: (currentProfileId === profile.id) ? (localStorage.getItem("avatar") || '(yok)') : profile.avatar || '(yok)', modified: (currentProfileId === profile.id) && profile.avatar !== localStorage.getItem("avatar") },
                { label: 'Extrapolation', value: (currentProfileId === profile.id) ? (localStorage.getItem("extrapolation") || '0') : profile.extrapolation || '0', modified: (currentProfileId === profile.id) && (profile.extrapolation || '0') !== (localStorage.getItem("extrapolation") || '0') },
                { label: 'Konum', value: (currentProfileId === profile.id) ? (storedGeo ? storedGeo.code.toUpperCase() : '(yok)') : (profile.geo_override ? profile.geo_override.code.toUpperCase() : '(yok)'), modified: (currentProfileId === profile.id) && ((profile.geo_override?.code || "") !== ((storedGeo || {})?.code || "")) },
                { label: 'Kimlik (Auth)', value: (currentProfileId === profile.id) ? (localStorage.getItem("player_auth_key") || "").split(".")[1] : (profile.player_auth_key || "").split(".")[1], modified: (currentProfileId === profile.id) && (profile.player_auth_key !== localStorage.getItem("player_auth_key")) }
            ];

            fields.forEach(pf => {
                const div = document.createElement('div');
                let valStr = pf.value || '(yok)';
                if (valStr.length > 30) valStr = valStr.substring(0, 30) + "...";
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
                btn.style.background = isSelected ? '#10b981' : '#0a0a0a';
                btn.style.color = isSelected ? '#fff' : '#888';
                btn.style.border = isSelected ? '1px solid #059669' : '1px solid #222';
            };
            styleSelectBtn(selectBtn, [selectedProfileId, currentProfileId].includes(profile.id));
            selectBtn.addEventListener('click', () => {
                selectedProfileId = profile.id;
                selectButtons.forEach((btn, pid) => styleSelectBtn(btn, pid === profile.id));
            });
            buttonRow.appendChild(selectBtn); selectButtons.set(profile.id, selectBtn);

            if (profile.id === currentProfileId) {
                const saveBtn = document.createElement('button'); saveBtn.textContent = 'Kaydet';
                saveBtn.addEventListener('click', () => {
                    if (saveSet.has(profile.id)) { saveSet.delete(profile.id); saveBtn.textContent = 'Kaydet'; saveBadge.style.display = 'none'; }
                    else { saveSet.add(profile.id); saveBtn.textContent = "Geri Al"; saveBadge.style.display = 'block'; }
                });
                buttonRow.appendChild(saveBtn);
            }

            if (profile.id !== 'default') {
                const removeBtn = document.createElement('button'); removeBtn.textContent = 'Sil';
                removeBtn.addEventListener('click', () => {
                    if (removalSet.has(profile.id)) { removalSet.delete(profile.id); removeBtn.textContent = 'Sil'; deletionBadge.style.display = 'none'; }
                    else { removalSet.add(profile.id); removeBtn.textContent = 'Geri Al'; deletionBadge.style.display = 'block'; }
                });
                buttonRow.appendChild(removeBtn);
            }

            card.appendChild(buttonRow); profileList.appendChild(card);
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
        requestAnimationFrame(() => { overlay.style.opacity = '1'; modal.style.opacity = '1'; modal.style.transform = 'scale(1) translate(-50%, -50%)'; });

        function closeModal() {
            overlay.style.opacity = '0'; modal.style.opacity = '0'; modal.style.transform = 'scale(0.8) translate(-50%, -50%)';
            setTimeout(() => { modal.remove(); overlay.remove(); }, 300);
        }
    }

    const profileNew = async () => {
        const prefs = await window.electronAPI.getAppPreferences();
        const profiles = prefs["profiles"];

        const restartButton = document.createElement('button');
        restartButton.innerText = 'Profil Oluştur'; restartButton.disabled = true;
        Object.assign(restartButton.style, { background: '#0a0a0a', cursor: 'not-allowed', color: '#444', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #222', borderRadius: '2px', transition: '0.2s' });

        const newProfile = { 
            id: null, name: null, autosave: true, avatar: null, extrapolation: null, fav_rooms: [], geo_override: null, player_name: null, player_auth_key: null,
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
            Object.assign(box.style, { display: 'flex', backgroundColor: '#111', alignItems: 'center', borderRadius: '1px', padding: '10px 15px', marginBottom: '12px', border:'1px solid #282828' });
            
            const label = document.createElement('label'); label.textContent = labelText; label.style.marginRight = '12px'; label.style.color = "#555"; label.style.fontSize="13px"; label.style.width="100px"; label.style.fontWeight = "bold";
            const input = document.createElement('input'); input.id = id; input.placeholder = placeholder; input.type = 'text'; input.maxLength = 25;
            Object.assign(input.style, { flex: '1', padding: '6px 10px', border: 'none', borderRadius: '1px', background: 'transparent', color: '#fff', fontSize: '13px', outline: 'none' });
            
            box.appendChild(label); box.appendChild(input); return { box, input };
        };

        const { box: nameBox, input: nameInput } = createLabelInput('profile-name-input', 'Profil Adı:', 'Profil adı girin...');
        const { box: nicknameBox, input: nicknameInput } = createLabelInput('nickname-input', 'Nick:', 'Bir nickname seçin...');

        const createToggleGroup = (labelText, options, defaultOption, onChange) => {
            const container = document.createElement('div'); container.style.marginBottom = '20px';
            const label = document.createElement('div'); label.textContent = labelText; label.style.marginBottom = '8px'; label.style.fontWeight = 'bold'; label.style.fontSize = "12px"; label.style.color="#555"; container.appendChild(label);
            const buttonContainer = document.createElement('div'); buttonContainer.style.display = 'flex'; buttonContainer.style.gap = '8px';
            
            options.forEach(option => {
                const btn = document.createElement('button'); btn.textContent = option;
                Object.assign(btn.style, { flex: '1', padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #222', borderRadius: '1px', cursor: 'pointer', transition: '0.2s', background: (option===defaultOption)? '#10b981':'#0a0a0a', color: (option===defaultOption)? 'white':'#888' });
                btn.addEventListener('click', () => {
                    Array.from(buttonContainer.children).forEach(b => {
                        b.style.background = '#0a0a0a';
                        b.style.color = '#888';
                        b.style.border = '1px solid #222';
                    });
                    btn.style.background = '#10b981';
                    btn.style.color = 'white';
                    btn.style.border = '1px solid #059669';
                    onChange(option);
                });
                buttonContainer.appendChild(btn);
            });
            container.appendChild(buttonContainer); return container;
        };

        const autosaveToggle = createToggleGroup('Oto-Kaydet', ['AÇIK', 'KAPALI'], 'AÇIK', (sel) => { newProfile.autosave = sel === 'AÇIK'; });
        const authToggle = createToggleGroup('Kimlik (Auth)', ['Yeni Kimlik', 'Mevcut Kimlik'], 'Yeni Kimlik', (sel) => {
            newProfile.player_auth_key = (sel === 'Mevcut Kimlik') ? localStorage.getItem("player_auth_key") : null;
        });

        const checkInputs = () => {
            const profileNameValue = nameInput.value.trim();
            const exists = profiles.some(p => p.id === profileNameValue.toLowerCase().replace(/\\s+/g, '-'));
            if (profileNameValue.length === 0 || nicknameInput.value.length === 0 || exists) {
                restartButton.disabled = true; restartButton.style.background = '#0a0a0a'; restartButton.style.color = '#444'; restartButton.style.cursor = 'not-allowed';
            } else {
                restartButton.disabled = false; restartButton.style.background = '#28a745'; restartButton.style.color = 'white'; restartButton.style.cursor = 'pointer'; restartButton.style.border = '1px solid #1e7e34';
            }
        };

        nameInput.addEventListener('input', checkInputs); nicknameInput.addEventListener('input', checkInputs);

        restartButton.onclick = async () => {
            const currentProfileId = localStorage.getItem("current_profile") || "default";
            const currentProf = profiles.find(p => p.id === currentProfileId);
            if (currentProf && currentProf.autosave) {
                await exportCurrentProfile();
            }

            const newProfileId = nameInput.value.trim().toLowerCase().replace(/\\s+/g, '-');
            newProfile.id = newProfileId; newProfile.name = nameInput.value.trim(); newProfile.player_name = nicknameInput.value;
            profiles.push(newProfile);

            const defaultProfileIdx = profiles.findIndex(p => p.id === "default");
            if (defaultProfileIdx !== -1 && profiles[defaultProfileIdx].player_name === null) {
                profiles[defaultProfileIdx].player_name = localStorage.getItem("player_name");
            }
            window.electronAPI.setAppPreference('profiles', profiles);

            customAlert("Yeni profil oluşturuldu!", "Değişiklikleri uygulamak için uygulama yeniden başlatılacak.", []);
            setTimeout(() => switchProfile(newProfileId), 2000);
        };

        customAlert("Yeni Profil Kurulumu", `Yeni bir profil oluşturuyorsunuz. Bu profil kendine ait Nickname, Avatar, Konum ve Auth anahtarına sahip olacaktır.<br><br><div id="profile-creation-container"></div>`, [restartButton]);

        setTimeout(() => {
            const container = document.querySelector('#profile-creation-container');
            if (container) { container.appendChild(nameBox); container.appendChild(nicknameBox); container.appendChild(autosaveToggle); container.appendChild(authToggle); }
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
            if (document.getElementById('vexa-profile-btn')) return;

            const rightWrapper = document.getElementById('vexa-hdr-right');
            if (!rightWrapper) return;

            const profileBtn = document.createElement('button');
            profileBtn.id = 'vexa-profile-btn';
            profileBtn.innerHTML = '👤 <span id="current-profile-name">...</span>';
            profileBtn.style.cssText = "background:#0a0a0a !important; color:#888 !important; border:1px solid #222 !important; border-radius:1px; padding:6px 14px; font-size:12px; font-weight:bold; cursor:pointer; transition:color 0.2s, background 0.2s; white-space:nowrap;";
            profileBtn.onmouseover = () => { profileBtn.style.color = '#fff'; profileBtn.style.background = '#111'; };
            profileBtn.onmouseout = () => { profileBtn.style.color = '#888'; profileBtn.style.background = '#0a0a0a'; };
            profileBtn.onclick = window.profileManage;

            rightWrapper.insertBefore(profileBtn, rightWrapper.firstChild);

            window.electronAPI.getAppPreferences().then(prefs => {
                const p = (prefs.profiles || []).find(x => x.id === currentProfileId);
                const nameEl = document.getElementById('current-profile-name');
                if (nameEl) nameEl.textContent = p ? p.name : 'Varsayılan';
            });
        }, 300);

        setTimeout(() => clearInterval(tryInjectProfile), 60000);
    }

    initProfileButton();

})();
