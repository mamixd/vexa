// Vexa HaxBall Client - Redesigned Animated Avatar & Emote Reaction System
(() => {
    let avatars = { "default": "VX", "1": "🔥", "2": "🤮", "3": "💀", "4": "🧤" };
    let duration = 2000;
    let reset = null;
    let config = { enabled: false };
    
    // Animation configuration
    let animationInterval = null;
    let animationIndex = 0;
    let isReactionActive = false;
    let animConfig = {
        enabled: false,
        preset: 'moon',
        customFrames: '',
        speed: 1000
    };

    const presets = {
        moon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
        clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '⑧', '⁹', '🕙', '🕚', '🕛'],
        loading: ['|', '/', '-', '\\'],
        hearts: ['❤️', '💖', '💗', '💓', '🖤', '💓', '💗', '💖'],
        vexa: ['V', 'VX', 'X', 'XV', 'V', ''],
        arrows: ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'],
        police: ['🔴', '🔵', '🔴', '🔵'],
        sayan: ['⚡', '🔥', '⚡', '🔥'],
        matrix: ['░', '▒', '▓', '▒'],
        faces: ['☺', '☻', '☺', '☻'],
        ball: ['⚽', '🥅', '⚽', '👑']
    };

    // --- ELEMENT HELPER FINDERS ---
    function findChatElements(doc) {
        let chatInput = doc.querySelector('[data-hook="input"]');
        if (!chatInput) {
            chatInput = doc.querySelector('.bottom-section input[type="text"]') || 
                        doc.querySelector('input[type="text"]') || 
                        doc.querySelector('input');
        }
        let sendBtn = doc.querySelector('[data-hook="send"]');
        return { chatInput, sendBtn };
    }

    // --- MULTI-METHOD CHAT SUBMISSION ---
    function submitChat(chatInput, sendBtn, doc, win) {
        if (sendBtn) {
            sendBtn.click();
        }
        const keyEvents = ['keydown', 'keypress', 'keyup'];
        keyEvents.forEach(evtType => {
            const ev = new KeyboardEvent(evtType, {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
                view: win
            });
            chatInput.dispatchEvent(ev);
        });
        const form = chatInput.closest('form');
        if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    }

    // --- NOTICE OBSERVER TO HIDE AVATAR SET NOTICE INSTANTLY ---
    function setupNoticeObserver(doc) {
        if (!doc || doc._avatarNoticeObserver) return;
        
        const observer = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                if (mutation.addedNodes) {
                    for (let j = 0; j < mutation.addedNodes.length; j++) {
                        const node = mutation.addedNodes[j];
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            if (node.classList && node.classList.contains('notice')) {
                                if (node.innerText === 'Avatar set' || node.textContent === 'Avatar set') {
                                    node.style.setProperty('display', 'none', 'important');
                                    node.remove();
                                }
                            } else if (node.getElementsByClassName) {
                                const subNotices = node.getElementsByClassName('notice');
                                for (let k = subNotices.length - 1; k >= 0; k--) {
                                    const subNotice = subNotices[k];
                                    if (subNotice.innerText === 'Avatar set' || subNotice.textContent === 'Avatar set') {
                                        subNotice.style.setProperty('display', 'none', 'important');
                                        subNotice.remove();
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (doc.body) {
            observer.observe(doc.body, {
                childList: true,
                subtree: true
            });
            doc._avatarNoticeObserver = observer;
        }
    }

    // --- CORE AVATAR API ---
    function setAvatar(avatar) {
        try {
            const gameframe = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
            if (!gameframe || !gameframe.contentWindow) {
                return;
            }
            
            const win = gameframe.contentWindow;
            const doc = win.document;
            
            // Instantly hide "Avatar set" notices
            setupNoticeObserver(doc);

            const { chatInput, sendBtn } = findChatElements(doc);

            if (chatInput) {
                const prevValue = chatInput.value;

                // Set React-compatible value without stealing keyboard focus
                const lastValue = chatInput.value;
                const newValue = "/avatar " + avatar;
                
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                if (setter) {
                    setter.call(chatInput, newValue);
                } else {
                    chatInput.value = newValue;
                }
                
                const tracker = chatInput._valueTracker;
                if (tracker) {
                    tracker.setValue(lastValue);
                }
                
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                chatInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                submitChat(chatInput, sendBtn, doc, win);

                // Restore state
                if (setter) {
                    setter.call(chatInput, prevValue);
                } else {
                    chatInput.value = prevValue;
                }
                if (tracker) {
                    tracker.setValue(newValue);
                }
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                chatInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Clean notice
                setTimeout(() => {
                    const notices = doc.getElementsByClassName("notice");
                    for (let i = notices.length - 1; i >= 0; i--) {
                        const notice = notices[i];
                        if (notice.innerHTML === "Avatar set" || notice.innerText === "Avatar set") {
                            notice.remove();
                        }
                    }
                }, 50);
            }
        } catch (e) {
            console.error("[Vexa Avatar] Error setting avatar:", e);
        }
    }

    // --- EMOTE REACTION KEYBOARD PROCESS ---
    function process(key) {
        if (!config.enabled) return;
        var avatar = avatars[key];
        if (avatar) {
            isReactionActive = true;
            setAvatar(avatar);
            if (reset != null) {
                clearTimeout(reset);
            }
            reset = setTimeout(function() {
                isReactionActive = false;
                if (animConfig.enabled) {
                    let frames = [];
                    if (animConfig.preset === 'custom') {
                        frames = animConfig.customFrames.split(',').map(f => f.trim()).filter(f => f.length > 0);
                    } else {
                        frames = presets[animConfig.preset] || [];
                    }
                    if (frames.length > 0) {
                        setAvatar(frames[(animationIndex - 1 + frames.length) % frames.length]);
                    }
                } else {
                    setAvatar(avatars["default"]);
                }
            }, duration);
        }
    }

    const listener = function(event) {
        const gameframe = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
        if (!gameframe || !gameframe.contentWindow) return;
        
        const doc = gameframe.contentWindow.document;
        const activeTag = doc.activeElement ? doc.activeElement.tagName : '';
        
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
            const key = event.key;
            process(key);
        }
    };

    function setupKeyListener() {
        const check = setInterval(() => {
            const gameframe = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
            if (gameframe && gameframe.contentWindow) {
                const doc = gameframe.contentWindow.document;
                doc.body.removeEventListener("keydown", listener, true);
                doc.body.addEventListener("keydown", listener, true);
                clearInterval(check);
            }
        }, 1000);
    }

    // --- ANIMATION CONTROLLER ---
    function startAvatarAnimation() {
        stopAvatarAnimation();
        if (!animConfig.enabled) return;

        let frames = [];
        if (animConfig.preset === 'custom') {
            frames = animConfig.customFrames.split(',').map(f => f.trim()).filter(f => f.length > 0);
        } else {
            frames = presets[animConfig.preset] || [];
        }

        if (frames.length === 0) return;

        animationIndex = 0;
        
        const isMatchActive = () => {
            const gameframe = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
            if (gameframe && gameframe.contentWindow) {
                const doc = gameframe.contentWindow.document;
                return doc.querySelector('.bar-container') !== null;
            }
            return false;
        };

        const isChatFocused = () => {
            const gameframe = document.querySelector('iframe.gameframe') || document.querySelector('iframe');
            if (gameframe && gameframe.contentWindow) {
                const doc = gameframe.contentWindow.document;
                const activeEl = doc.activeElement;
                if (activeEl) {
                    const tag = activeEl.tagName;
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                        return true;
                    }
                }
            }
            return false;
        };

        if (!isReactionActive && isMatchActive() && !isChatFocused()) {
            setAvatar(frames[animationIndex]);
            animationIndex = (animationIndex + 1) % frames.length;
        }

        const speed = Math.max(800, animConfig.speed || 1000);

        animationInterval = setInterval(() => {
            if (isReactionActive) return;
            if (!isMatchActive()) return;
            if (isChatFocused()) return;

            setAvatar(frames[animationIndex]);
            animationIndex = (animationIndex + 1) % frames.length;
        }, speed);
    }

    function stopAvatarAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }

    // --- CONFIG PERSISTENCE ---
    function loadConfig() {
        try {
            const stored = localStorage.getItem("animatedAvatar");
            if (stored) {
                const avatarConfig = JSON.parse(stored);
                
                // Reaction Emotes
                config.enabled = avatarConfig.enabled || false;
                avatars = { ...avatars, ...avatarConfig.hotkeys, "default": avatarConfig.defaultAvatar || "VX" };
                duration = avatarConfig.resetDuration || 2000;

                // Animated Avatar
                animConfig.enabled = avatarConfig.animEnabled || false;
                animConfig.preset = avatarConfig.preset || 'moon';
                animConfig.customFrames = avatarConfig.customFrames || '';
                animConfig.speed = avatarConfig.speed || 1000;
            }
        } catch (e) {
            console.error("[Vexa Avatar] Failed to load config:", e);
        }

        if (config.enabled) {
            setupKeyListener();
        }
        if (animConfig.enabled) {
            startAvatarAnimation();
        } else {
            stopAvatarAnimation();
        }
    }

    // --- EXPOSE CONFIG RELOADER ---
    window.loadAvatarConfig = loadConfig;

    // Initialize systems
    loadConfig();
})();
