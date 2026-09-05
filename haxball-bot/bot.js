/**
 * 🎯 VEXA HAXBALL SNIPER BOT [3-0 BAN & VIP SYSTEM]
 * -------------------------------------------------------------
 * Features:
 * - 1v1 Sniper Matchmaking with Winner-Stays logic
 * - 3-0 Temporary Ban System (5-10 min auto-ban upon 3-0 sweep)
 * - Vexa Client Auto-Detection & VIP Queue Priority ([VEXA] Tag)
 * - Account & Stats Tracking for Registered Users (!kayit / !giris)
 * - Anti-AFK & Anti-Spam / Flood Protection
 * - Periodic Promotion Broadcasts & Rich Commands
 * -------------------------------------------------------------
 */

(function() {
    // 1. CONFIGURATION & STADIUM
    const config = window.__BOT_CONFIG__ || {
        roomName: "🎯 Vexa | SNIPER [3-0 BAN] | vexaclient.com",
        playerName: "🎯 Vexa Bot",
        maxPlayers: 16,
        public: true,
        token: "BURAYA_HEADLESS_TOKEN_YAZIN",
        geo: { code: "tr", lat: 41.0082, lon: 28.9784 },
        adminPassword: "vexa_admin_2026",
        banDurationMinutes: 10,
        afkTimeoutSeconds: 20,
        broadcastIntervalMinutes: 3,
        discordUrl: "https://discord.gg/vexa",
        clientUrl: "https://vexaclient.com",
        broadcastMessages: [
            "💡 0 Gecikme, özel temalar ve odada [VEXA] VIP ayrıcalıkları için Vexa Client indir: vexaclient.com",
            "🎯 Sniper Odası Kuralları: 3-0 kaybeden oyuncular 10 dakika geçici banlanır! Bilgi için: !kurallar",
            "⭐ Vexa Client kullananlar odada otomatik [VEXA] tagi ve Sniper sırasında VIP öncelik kazanır!",
            "💬 Discord sunucumuza katılıp toplulukla sohbet etmek için: !discord",
            "🏆 İstatistiklerini kaydetmek ve sıralamaya girmek için: !kayit <sifre>"
        ]
    };

    const stadiumData = window.__BOT_STADIUM__ || null;

    // 2. DATA STORAGE (Bridge to Node.js or LocalStorage)
    let users = window.__INITIAL_USERS__ || {};
    let bans = window.__INITIAL_BANS__ || {};

    function saveUsers() {
        try {
            const dataStr = JSON.stringify(users, null, 2);
            if (window.nodeSaveUsers) {
                window.nodeSaveUsers(dataStr);
            } else {
                localStorage.setItem('vexa_users', dataStr);
            }
        } catch (e) {
            console.error('[Vexa Bot] Error saving users:', e);
        }
    }

    function saveBans() {
        try {
            const dataStr = JSON.stringify(bans, null, 2);
            if (window.nodeSaveBans) {
                window.nodeSaveBans(dataStr);
            } else {
                localStorage.setItem('vexa_bans', dataStr);
            }
        } catch (e) {
            console.error('[Vexa Bot] Error saving bans:', e);
        }
    }

    function logMsg(msg) {
        const time = new Date().toLocaleTimeString();
        const formatted = '[' + time + '] ' + msg;
        console.log(formatted);
        if (window.nodeLog) window.nodeLog(formatted);
    }

    // 3. BOT STATE
    const queue = [];              // Array of player IDs waiting for turn
    const vexaUsers = new Set();    // Set of player IDs verified as Vexa Client users
    const loggedInUsers = {};      // Map: playerId -> username
    const lastActivity = {};       // Map: playerId -> timestamp
    const afkWarned = new Set();   // Set of player IDs currently warned for AFK
    const chatTimestamps = {};     // Map: playerId -> [timestamps]
    const mutedPlayers = {};       // Map: playerId -> unmuteTimestamp
    let matchInProgress = false;
    let nextMatchTimeout = null;

    // 4. INITIALIZE HAXBALL ROOM
    const room = HBInit({
        roomName: config.roomName,
        maxPlayers: config.maxPlayers || 16,
        public: config.public !== false,
        token: config.token,
        geo: config.geo || { code: "tr", lat: 41.0082, lon: 28.9784 },
        playerName: config.playerName || "🎯 Vexa Bot",
        noPlayer: true
    });

    logMsg('🎯 Vexa Sniper Bot başlatılıyor...');

    // Load custom sniper stadium if provided
    if (stadiumData) {
        try {
            room.setCustomStadium(typeof stadiumData === 'string' ? stadiumData : JSON.stringify(stadiumData));
            logMsg('✅ Sniper 1v1 Stadyumu başarıyla yüklendi.');
        } catch (err) {
            logMsg('⚠️ Stadyum yüklenirken hata: ' + err.message);
        }
    }

    room.setScoreLimit(3);
    room.setTimeLimit(3);
    room.setTeamsLock(true);

    // 5. HELPER FUNCTIONS
    function getPlayerNameWithTag(player) {
        if (!player) return 'Bilinmeyen';
        const isVexa = vexaUsers.has(player.id) || (player.name && player.name.includes('[VEXA]'));
        return (isVexa ? '⭐[VEXA] ' : '') + player.name;
    }

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return 'vh_' + Math.abs(hash).toString(36);
    }

    function calculateRank(acc) {
        const wins = acc.wins || 0;
        if (wins >= 100) return '👑 Sniper Efsanesi';
        if (wins >= 50)  return '💎 Elmas Keskin Nişancı';
        if (wins >= 25)  return '🥇 Altın Nişancı';
        if (wins >= 10)  return '🥈 Gümüş Nişancı';
        return '🥉 Bronz Çaylak';
    }

    function checkActivePlayers() {
        const players = room.getPlayerList();
        const red = players.find(p => p.team === 1);
        const blue = players.find(p => p.team === 2);
        return { red, blue };
    }

    function cleanExpiredBans() {
        const now = Date.now();
        let changed = false;
        for (const [key, ban] of Object.entries(bans)) {
            if (ban.expireAt && now >= ban.expireAt) {
                delete bans[key];
                changed = true;
                logMsg('🔓 Geçici ban süresi doldu: ' + ban.name);
            }
        }
        if (changed) saveBans();
    }

    function getPlayerBan(player) {
        cleanExpiredBans();
        const now = Date.now();
        for (const [key, ban] of Object.entries(bans)) {
            if ((player.auth && ban.auth === player.auth) || (player.conn && ban.conn === player.conn)) {
                if (ban.expireAt > now) {
                    return ban;
                }
            }
        }
        return null;
    }

    // 6. QUEUE & MATCHMAKING
    function addPlayerToQueue(player) {
        if (queue.includes(player.id)) {
            const pos = queue.indexOf(player.id) + 1;
            room.sendChat('ℹ️ Zaten sıradasın! Sıra numaran: #' + pos, player.id);
            return;
        }

        const active = checkActivePlayers();
        if ((active.red && active.red.id === player.id) || (active.blue && active.blue.id === player.id)) {
            room.sendChat('ℹ️ Şu anda zaten maçtasın!', player.id);
            return;
        }

        const isVexa = vexaUsers.has(player.id) || (player.name && player.name.includes('[VEXA]'));

        if (isVexa) {
            // VIP Priority: Place ahead of regular players
            let insertIdx = queue.length;
            for (let i = 0; i < queue.length; i++) {
                if (!vexaUsers.has(queue[i])) {
                    insertIdx = i;
                    break;
                }
            }
            queue.splice(insertIdx, 0, player.id);
            const pos = insertIdx + 1;
            room.sendAnnouncement('⭐ [VEXA VIP] ' + player.name + ' VIP öncelikle sıraya girdi! (Sıra: #' + pos + ')', null, 0xFFD700, 'bold', 1);
        } else {
            queue.push(player.id);
            const pos = queue.length;
            room.sendAnnouncement('🎯 ' + player.name + ' sıraya girdi. (Sıra: #' + pos + '). VIP öncelik için: !client', null, 0x00E5FF, 'normal', 0);
        }

        checkAndStartNextGame();
    }

    function removePlayerFromQueue(playerId) {
        const idx = queue.indexOf(playerId);
        if (idx !== -1) {
            queue.splice(idx, 1);
            return true;
        }
        return false;
    }

    function checkAndStartNextGame() {
        if (nextMatchTimeout) return;

        const { red, blue } = checkActivePlayers();
        const scores = room.getScores();

        // If both slots full and game active, do nothing
        if (red && blue && scores !== null) {
            return;
        }

        // Fill Red if empty
        if (!red && queue.length > 0) {
            const nextRedId = queue.shift();
            const p = room.getPlayer(nextRedId);
            if (p) {
                room.setPlayerTeam(nextRedId, 1);
                room.sendAnnouncement('🔴 ' + getPlayerNameWithTag(p) + ' Kırmızı tarafa geçti!', null, 0xFF4444, 'bold', 0);
            }
        }

        // Fill Blue if empty
        const currentActive = checkActivePlayers();
        if (!currentActive.blue && queue.length > 0) {
            const nextBlueId = queue.shift();
            const p = room.getPlayer(nextBlueId);
            if (p) {
                room.setPlayerTeam(nextBlueId, 2);
                room.sendAnnouncement('🔵 ' + getPlayerNameWithTag(p) + ' Mavi tarafa geçti!', null, 0x4488FF, 'bold', 0);
            }
        }

        // Ready to start match
        const readyActive = checkActivePlayers();
        if (readyActive.red && readyActive.blue) {
            room.sendAnnouncement('⚔️ 1v1 MAÇ BAŞLIYOR: ' + getPlayerNameWithTag(readyActive.red) + ' VS ' + getPlayerNameWithTag(readyActive.blue) + '!', null, 0xFFFF00, 'bold', 1);
            room.sendAnnouncement('⚠️ Skor 3-0 biterse kaybeden 10 DAKİKA BANLANIR! Başarılar!', null, 0xFF5555, 'small-bold', 0);

            nextMatchTimeout = setTimeout(() => {
                nextMatchTimeout = null;
                try {
                    room.stopGame();
                    room.startGame();
                    matchInProgress = true;
                } catch (e) {
                    console.error('Error starting game:', e);
                }
            }, 2500);
        }
    }

    // 7. EVENT HANDLERS
    room.onRoomLink = function(url) {
        logMsg('🔗 ODA LİNKİ: ' + url);
        if (window.nodeOnRoomLink) window.nodeOnRoomLink(url);
    };

    room.onPlayerJoin = function(player) {
        logMsg('👤 Katıldı: ' + player.name + ' (ID: ' + player.id + ', Auth: ' + player.auth + ')');
        lastActivity[player.id] = Date.now();

        // Check 3-0 Ban
        const ban = getPlayerBan(player);
        if (ban) {
            const remainingMins = Math.max(1, Math.ceil((ban.expireAt - Date.now()) / 60000));
            logMsg('🚫 Banlı giriş engellendi: ' + player.name + ' (Kalan: ' + remainingMins + ' dk)');
            room.kickPlayer(player.id, '🎯 3-0 Ban! Kalan: ' + remainingMins + ' dk. (' + ban.reason + ')', false);
            room.sendAnnouncement('🚫 ' + player.name + ' (3-0 Banlı) odaya alınmadı! Kalan süre: ' + remainingMins + ' dk', null, 0xFF4444, 'small', 0);
            return;
        }

        // Check Vexa Tag
        if (player.name && (player.name.includes('[VEXA]') || player.name.includes('[vexa]'))) {
            vexaUsers.add(player.id);
            room.sendAnnouncement('⭐ Vexa Client kullanıcısı ' + player.name + ' odaya katıldı!', null, 0xFFD700, 'bold', 1);
        }

        // Auto-Login via Auth
        if (player.auth) {
            for (const [key, acc] of Object.entries(users)) {
                if (acc.authList && acc.authList.includes(player.auth)) {
                    loggedInUsers[player.id] = key;
                    if (acc.isVexaUser) vexaUsers.add(player.id);
                    setTimeout(() => {
                        room.sendChat('🔑 Otomatik giriş yapıldı! Hoş geldin ' + acc.username + ' | ' + calculateRank(acc) + ' (W: ' + acc.wins + ' / L: ' + acc.losses + ')', player.id);
                    }, 1000);
                    break;
                }
            }
        }

        setTimeout(() => {
            room.sendChat('🎯 Vexa Sniper 1v1 Odasına Hoş Geldin! Sıraya girmek için: !q | Kurallar: !kurallar', player.id);
            room.sendChat('💡 Vexa Client ile VIP sıra önceliği kazanmak için: !client', player.id);
        }, 1200);
    };

    room.onPlayerLeave = function(player) {
        logMsg('🚪 Ayrıldı: ' + player.name + ' (ID: ' + player.id + ')');
        removePlayerFromQueue(player.id);
        vexaUsers.delete(player.id);
        delete loggedInUsers[player.id];
        delete lastActivity[player.id];
        delete chatTimestamps[player.id];
        delete mutedPlayers[player.id];
        afkWarned.delete(player.id);

        const scores = room.getScores();
        if (scores !== null) {
            const active = checkActivePlayers();
            if (player.team === 1 || player.team === 2) {
                const winnerTeam = player.team === 1 ? 2 : 1;
                const winnerPlayer = winnerTeam === 1 ? active.red : active.blue;
                room.sendAnnouncement('⚠️ ' + player.name + ' maç sırasında oyundan kaçtı!', null, 0xFF5555, 'bold', 1);

                if (winnerPlayer) {
                    room.sendAnnouncement('🏆 ' + getPlayerNameWithTag(winnerPlayer) + ' hükmen kazandı!', null, 0x00FF88, 'bold', 1);
                    const winnerAccKey = loggedInUsers[winnerPlayer.id];
                    if (winnerAccKey && users[winnerAccKey]) {
                        users[winnerAccKey].wins = (users[winnerAccKey].wins || 0) + 1;
                        users[winnerAccKey].winStreak = (users[winnerAccKey].winStreak || 0) + 1;
                        if (users[winnerAccKey].winStreak > (users[winnerAccKey].bestStreak || 0)) {
                            users[winnerAccKey].bestStreak = users[winnerAccKey].winStreak;
                        }
                        saveUsers();
                    }
                }
                room.stopGame();
                matchInProgress = false;
                setTimeout(checkAndStartNextGame, 2000);
            }
        }
    };

    room.onPlayerActivity = function(player) {
        lastActivity[player.id] = Date.now();
        afkWarned.delete(player.id);
    };

    // 8. VICTORY & 3-0 BAN CALCULATION
    room.onTeamVictory = function(scores) {
        matchInProgress = false;
        const active = checkActivePlayers();

        const winnerTeam = scores.red > scores.blue ? 1 : 2;
        const loserTeam = winnerTeam === 1 ? 2 : 1;
        const winnerScore = Math.max(scores.red, scores.blue);
        const loserScore = Math.min(scores.red, scores.blue);

        const winnerPlayer = winnerTeam === 1 ? active.red : active.blue;
        const loserPlayer = loserTeam === 1 ? active.red : active.blue;

        if (!winnerPlayer || !loserPlayer) {
            setTimeout(checkAndStartNextGame, 2000);
            return;
        }

        const isThreeZero = winnerScore === 3 && loserScore === 0;

        // Update stats only if player has an account
        const winnerAccKey = loggedInUsers[winnerPlayer.id];
        const loserAccKey = loggedInUsers[loserPlayer.id];

        if (winnerAccKey && users[winnerAccKey]) {
            const acc = users[winnerAccKey];
            acc.wins = (acc.wins || 0) + 1;
            acc.goals = (acc.goals || 0) + winnerScore;
            acc.winStreak = (acc.winStreak || 0) + 1;
            if (isThreeZero) acc.threeZeroWins = (acc.threeZeroWins || 0) + 1;
            if (acc.winStreak > (acc.bestStreak || 0)) acc.bestStreak = acc.winStreak;
        } else {
            room.sendChat('💡 Galibiyetlerinin kaydedilmesi ve sıralamaya girmek için hesap aç: !kayit <şifre>', winnerPlayer.id);
        }

        if (loserAccKey && users[loserAccKey]) {
            const acc = users[loserAccKey];
            acc.losses = (acc.losses || 0) + 1;
            acc.goals = (acc.goals || 0) + loserScore;
            acc.winStreak = 0;
            if (isThreeZero) acc.threeZeroLosses = (acc.threeZeroLosses || 0) + 1;
        }

        saveUsers();

        // 3-0 BAN LOGIC
        if (isThreeZero) {
            const banMins = config.banDurationMinutes || 10;
            const expireAt = Date.now() + (banMins * 60 * 1000);
            const banKey = loserPlayer.auth || ('conn_' + loserPlayer.conn) || loserPlayer.name;

            bans[banKey] = {
                name: loserPlayer.name,
                auth: loserPlayer.auth || '',
                conn: loserPlayer.conn || '',
                bannedAt: Date.now(),
                expireAt: expireAt,
                durationMinutes: banMins,
                reason: '3-0 Yenilgi'
            };
            saveBans();

            room.sendAnnouncement('💥 3-0 SWEEP! ' + getPlayerNameWithTag(winnerPlayer) + ' rakibini 3-0 mağlup etti!', null, 0xFF2222, 'bold', 2);
            room.sendAnnouncement('🚫 ' + loserPlayer.name + ' 3-0 YENİLDİĞİ İÇİN ' + banMins + ' DAKİKA BANLANDI! 🎯', null, 0xFF0000, 'bold', 2);

            logMsg('🚫 3-0 Ban uygulandı: ' + loserPlayer.name + ' (' + banMins + ' dakika)');
            room.kickPlayer(loserPlayer.id, '🎯 3-0 Yenildin! ' + banMins + ' Dakika Boyunca Odaya Girişin Yasaklandı.', false);
        } else {
            // Standard outcome: loser to spectator, winner stays!
            room.sendAnnouncement('🏆 ' + getPlayerNameWithTag(winnerPlayer) + ' maçı kazandı! (' + winnerScore + ' - ' + loserScore + ')', null, 0x00FF88, 'bold', 1);
            room.setPlayerTeam(loserPlayer.id, 0);
            room.sendChat('ℹ️ Maçı kaybettin. Tekrar sıraya girmek için: !q', loserPlayer.id);
        }

        // Winner stays on field. Pull next opponent!
        setTimeout(checkAndStartNextGame, 2500);
    };

    // 9. CHAT COMMANDS & ANTI-SPAM
    room.onPlayerChat = function(player, message) {
        lastActivity[player.id] = Date.now();
        afkWarned.delete(player.id);
        message = (message || '').trim();

        // Vexa Silent Handshake
        if (message === '!vexa_auth' || message === '!vexa_handshake') {
            vexaUsers.add(player.id);
            room.sendAnnouncement('⭐ Vexa Client kullanıcısı ' + player.name + ' odaya katıldı!', null, 0xFFD700, 'bold', 1);
            room.sendChat('👑 Hoş geldin! Vexa Client VIP ayrıcalıkların (Öncelikli Sıra & [VEXA] Tagı) aktif.', player.id);
            return false; // Suppress handshake from chat
        }

        // Anti-Spam
        const now = Date.now();
        if (mutedPlayers[player.id] && now < mutedPlayers[player.id]) {
            const rem = Math.ceil((mutedPlayers[player.id] - now) / 1000);
            room.sendChat('🔇 Susturuldun! Kalan süre: ' + rem + ' sn', player.id);
            return false;
        }

        chatTimestamps[player.id] = (chatTimestamps[player.id] || []).filter(t => now - t < 3000);
        chatTimestamps[player.id].push(now);

        if (chatTimestamps[player.id].length > 4) {
            mutedPlayers[player.id] = now + 30000;
            room.sendChat('🔇 Çok hızlı yazdığın için 30 saniye susturuldun!', player.id);
            return false;
        }

        // COMMAND PROCESSOR
        if (message.startsWith('!')) {
            const parts = message.slice(1).split(' ');
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);

            switch (cmd) {
                // Queue commands
                case 'q':
                case 'sirayagir':
                case 'siraal':
                    addPlayerToQueue(player);
                    return false;

                case 'cık':
                case 'cik':
                case 'ayril':
                    if (removePlayerFromQueue(player.id)) {
                        room.sendChat('ℹ️ Sıradan çıktın.', player.id);
                    } else {
                        room.sendChat('ℹ️ Zaten sırada değilsin.', player.id);
                    }
                    return false;

                case 'sira':
                case 'queue':
                    if (queue.length === 0) {
                        room.sendChat('ℹ️ Sıra şu an boş. Sıraya girmek için: !q', player.id);
                    } else {
                        const queueNames = queue.map((id, i) => {
                            const p = room.getPlayer(id);
                            const tag = p && vexaUsers.has(p.id) ? '⭐' : '';
                            return '#' + (i + 1) + ' ' + tag + (p ? p.name : 'Ayrıldı');
                        }).join(', ');
                        room.sendChat('📋 Bekleme Sırası (' + queue.length + ' kişi): ' + queueNames, player.id);
                    }
                    return false;

                // Account & Stats
                case 'kayit':
                case 'register':
                    if (args.length < 1 || args[0].length < 3) {
                        room.sendChat('❌ Hatalı kullanım! Şifre en az 3 karakter olmalı: !kayit <şifre>', player.id);
                        return false;
                    }
                    const cleanUsername = player.name.replace(/\[VEXA\]/g, '').trim().toLowerCase();
                    if (!cleanUsername) {
                        room.sendChat('❌ Geçerli bir kullanıcı adın yok.', player.id);
                        return false;
                    }
                    if (users[cleanUsername]) {
                        room.sendChat('❌ Bu isimle zaten bir hesap var! Giriş yapmak için: !giris <şifre>', player.id);
                        return false;
                    }
                    users[cleanUsername] = {
                        username: player.name,
                        passwordHash: simpleHash(args[0]),
                        authList: player.auth ? [player.auth] : [],
                        wins: 0,
                        losses: 0,
                        threeZeroWins: 0,
                        threeZeroLosses: 0,
                        goals: 0,
                        winStreak: 0,
                        bestStreak: 0,
                        isVexaUser: vexaUsers.has(player.id),
                        createdAt: Date.now()
                    };
                    saveUsers();
                    loggedInUsers[player.id] = cleanUsername;
                    room.sendChat('✅ Tebrikler ' + player.name + '! Hesabın oluşturuldu. İstatistiklerin artık kaydedilecek!', player.id);
                    return false;

                case 'giris':
                case 'login':
                    if (args.length < 1) {
                        room.sendChat('❌ Kullanım: !giris <şifre>', player.id);
                        return false;
                    }
                    const enteredPass = simpleHash(args[0]);
                    const loginUsername = player.name.replace(/\[VEXA\]/g, '').trim().toLowerCase();
                    const acc = users[loginUsername];

                    if (!acc || acc.passwordHash !== enteredPass) {
                        room.sendChat('❌ Kullanıcı adı veya şifre hatalı!', player.id);
                        return false;
                    }

                    if (player.auth && (!acc.authList || !acc.authList.includes(player.auth))) {
                        acc.authList = acc.authList || [];
                        acc.authList.push(player.auth);
                        saveUsers();
                    }

                    loggedInUsers[player.id] = loginUsername;
                    room.sendChat('🔑 Başarıyla giriş yapıldı! Hoş geldin ' + acc.username + ' | ' + calculateRank(acc), player.id);
                    return false;

                case 'stats':
                case 'istatistik':
                case 'bilgi':
                    const currentAccKey = loggedInUsers[player.id];
                    if (!currentAccKey || !users[currentAccKey]) {
                        room.sendChat('⚠️ Kayıtlı hesabın yok veya giriş yapmadın! İstatistiklerini kaydetmek için: !kayit <şifre>', player.id);
                        return false;
                    }
                    const u = users[currentAccKey];
                    const totalMatches = (u.wins || 0) + (u.losses || 0);
                    const winrate = totalMatches > 0 ? Math.round((u.wins / totalMatches) * 100) : 0;
                    room.sendChat('📊 [' + u.username + '] Rütbe: ' + calculateRank(u), player.id);
                    room.sendChat('🏆 G: ' + u.wins + ' | M: ' + u.losses + ' (%' + winrate + ') | 3-0 G: ' + u.threeZeroWins + ' | 3-0 M: ' + u.threeZeroLosses + ' | Seri: ' + u.winStreak + ' (En İyi: ' + u.bestStreak + ')', player.id);
                    return false;

                case 'top':
                case 'siralama':
                case 'liderler':
                    const sorted = Object.values(users)
                        .sort((a, b) => (b.wins || 0) - (a.wins || 0))
                        .slice(0, 5);

                    if (sorted.length === 0) {
                        room.sendChat('ℹ️ Henüz kayıtlı oyuncu istatistiği bulunmuyor.', player.id);
                    } else {
                        room.sendChat('🏆 --- EN İYİ 5 SNIPER --- 🏆', player.id);
                        sorted.forEach((item, idx) => {
                            const star = item.isVexaUser ? '⭐' : '';
                            room.sendChat('#' + (idx + 1) + ' ' + star + item.username + ' -> ' + item.wins + ' Galibiyet (' + item.threeZeroWins + ' defa 3-0)', player.id);
                        });
                    }
                    return false;

                // Promotion & Info
                case 'client':
                case 'indir':
                case 'vexa':
                    room.sendChat('🚀 Vexa Client İndir: ' + config.clientUrl, player.id);
                    room.sendChat('⭐ Ayrıcalıklar: 0 Gecikme, Sniper VIP Öncelik Sırası, Otomatik [VEXA] Tagı!', player.id);
                    return false;

                case 'discord':
                case 'dc':
                    room.sendChat('💬 Vexa Discord Topluluğu: ' + config.discordUrl, player.id);
                    return false;

                case 'kurallar':
                case 'kural':
                    room.sendChat('🎯 SNIPER 3-0 BAN KURALLARI:', player.id);
                    room.sendChat('1. Maçlar 1v1 şeklinde ve 3 golde biter.', player.id);
                    room.sendChat('2. 3-0 YENİLEN OYUNCU 10 DAKİKA GEÇİCİ BANLANIR!', player.id);
                    room.sendChat('3. Kazanan sahada kalır, sıradaki meydan okuyucu gelir.', player.id);
                    room.sendChat('4. 20 saniye hareketsiz duran AFK spectatore atılır.', player.id);
                    return false;

                case 'yardim':
                case 'help':
                case 'komutlar':
                    room.sendChat('📌 Komutlar: !q, !cık, !sira, !stats, !top, !kayit <şifre>, !giris <şifre>, !kurallar, !client, !discord', player.id);
                    return false;

                // Admin commands
                case 'admin':
                    if (args.length > 0 && args[0] === config.adminPassword) {
                        room.setPlayerAdmin(player.id, true);
                        room.sendChat('🔑 Yönetici yetkisi verildi!', player.id);
                    } else {
                        room.sendChat('❌ Hatalı admin şifresi!', player.id);
                    }
                    return false;

                case 'restart':
                    if (player.admin) {
                        room.stopGame();
                        room.startGame();
                        room.sendAnnouncement('🔄 Oyun yönetici tarafından yeniden başlatıldı.', null, 0xFFFF00, 'bold', 0);
                    }
                    return false;

                case 'clearbans':
                    if (player.admin) {
                        bans = {};
                        saveBans();
                        room.clearBans();
                        room.sendAnnouncement('🔓 Tüm geçici ve kalıcı banlar temizlendi.', null, 0x00FF88, 'bold', 1);
                    }
                    return false;

                case 'unban':
                    if (player.admin && args.length > 0) {
                        const target = args.join(' ').toLowerCase();
                        let found = false;
                        for (const [k, b] of Object.entries(bans)) {
                            if (b.name.toLowerCase().includes(target) || b.auth === target) {
                                delete bans[k];
                                found = true;
                            }
                        }
                        if (found) {
                            saveBans();
                            room.sendChat('✅ Ban kaldırıldı: ' + target, player.id);
                        } else {
                            room.sendChat('❌ Ban bulunamadı.', player.id);
                        }
                    }
                    return false;
            }
        }

        return true;
    };

    // 10. AFK CHECKER (Every 5 seconds)
    setInterval(() => {
        const now = Date.now();
        const active = checkActivePlayers();
        const playing = [active.red, active.blue].filter(Boolean);

        playing.forEach(p => {
            const idleSec = Math.floor((now - (lastActivity[p.id] || now)) / 1000);
            const timeout = config.afkTimeoutSeconds || 20;

            if (idleSec >= timeout - 5 && idleSec < timeout && !afkWarned.has(p.id)) {
                afkWarned.add(p.id);
                room.sendAnnouncement('⚠️ ' + p.name + ' AFK Uyarısı! 5 saniye içinde hareket etmezsen spectatore atılacaksın.', p.id, 0xFFAA00, 'bold', 1);
            } else if (idleSec >= timeout) {
                room.sendAnnouncement('💤 ' + p.name + ' ' + timeout + ' saniye AFK kaldığı için spectatore alındı!', null, 0xFF4444, 'normal', 0);
                room.setPlayerTeam(p.id, 0);
                afkWarned.delete(p.id);
                checkAndStartNextGame();
            }
        });
    }, 5000);

    // 11. PERIODIC PROMOTION BROADCASTS (Every 3 minutes)
    let broadcastIdx = 0;
    const broadcastIntervalMs = (config.broadcastIntervalMinutes || 3) * 60 * 1000;

    setInterval(() => {
        const msgs = config.broadcastMessages || [];
        if (msgs.length === 0) return;
        const msg = msgs[broadcastIdx % msgs.length];
        broadcastIdx++;
        room.sendAnnouncement(msg, null, 0x00FFAA, 'bold', 0);
    }, broadcastIntervalMs);

    logMsg('🚀 Vexa Sniper Bot başarıyla yüklendi ve hazır!');
})();