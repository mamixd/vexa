const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Helper: userId'yi JWT token'dan veya body/query'den al
function getUserId(req) {
    if (req.user && req.user.id) return req.user.id;
    return req.body?.userId || req.query?.userId || null;
}

// Opsiyonel auth middleware - token varsa kullan, yoksa devam et
function optionalAuth(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (e) {}
    }
    next();
}

// Arkadaş Ekleme İsteği Gönder
router.post('/add', optionalAuth, async (req, res) => {
    try {
        const senderId = getUserId(req);
        const targetUsername = req.body.targetUsername || req.body.username;

        if (!senderId) return res.status(400).json({ error: 'Giriş yapmalısınız.' });
        if (!targetUsername) return res.status(400).json({ error: 'Kullanıcı adı gerekli.' });

        const targetUser = await User.findOne({ username: targetUsername });
        if (!targetUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        if (targetUser._id.toString() === senderId) return res.status(400).json({ error: 'Kendinize istek gönderemezsiniz.' });
        if (targetUser.friends.includes(senderId)) return res.status(400).json({ error: 'Zaten arkadaşsınız.' });
        if (targetUser.friendRequests.includes(senderId)) return res.status(400).json({ error: 'İstek zaten gönderildi.' });

        targetUser.friendRequests.push(senderId);
        await targetUser.save();

        res.json({ message: 'Arkadaşlık isteği gönderildi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Arkadaşlık İsteğini Kabul Et
router.post('/accept', optionalAuth, async (req, res) => {
    try {
        const currentUserId = getUserId(req);
        const { senderId } = req.body;

        if (!currentUserId) return res.status(400).json({ error: 'Giriş yapmalısınız.' });

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        if (!currentUser.friendRequests.includes(senderId)) {
            return res.status(400).json({ error: 'Böyle bir istek yok.' });
        }

        // İstek listesinden çıkar, arkadaş listesine ekle
        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== senderId);
        currentUser.friends.push(senderId);
        await currentUser.save();

        // Karşı tarafın da arkadaş listesine ekle
        const sender = await User.findById(senderId);
        if (sender && !sender.friends.includes(currentUser._id)) {
            sender.friends.push(currentUser._id);
            await sender.save();
        }

        res.json({ message: 'İstek kabul edildi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Arkadaşlık İsteğini Reddet
router.post('/reject', optionalAuth, async (req, res) => {
    try {
        const currentUserId = getUserId(req);
        const { senderId } = req.body;

        if (!currentUserId) return res.status(400).json({ error: 'Giriş yapmalısınız.' });

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== senderId);
        await currentUser.save();

        res.json({ message: 'İstek reddedildi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Arkadaşları ve İstekleri Getir
router.get('/list', optionalAuth, async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(400).json({ error: 'Giriş yapmalısınız.' });

        const user = await User.findById(userId)
            .populate('friends', 'username avatar status')
            .populate('friendRequests', 'username avatar');

        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        // Client'ın beklediği formatta dön
        const friends = (user.friends || []).map(f => ({
            id: f._id,
            name: f.username,
            avatar: f.avatar || '',
            dot: f.status === 'online' ? 'online' : 'offline',
            activity: f.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'
        }));

        const requests = (user.friendRequests || []).map(r => ({
            id: r._id,
            name: r.username,
            avatar: r.avatar || ''
        }));

        res.json({ friends, requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Arkadaşı Sil
router.post('/remove', optionalAuth, async (req, res) => {
    try {
        const currentUserId = getUserId(req);
        const { friendId } = req.body;

        if (!currentUserId) return res.status(400).json({ error: 'Giriş yapmalısınız.' });

        const currentUser = await User.findById(currentUserId);
        if (currentUser) {
            currentUser.friends = currentUser.friends.filter(id => id.toString() !== friendId);
            await currentUser.save();
        }

        const friendUser = await User.findById(friendId);
        if (friendUser) {
            friendUser.friends = friendUser.friends.filter(id => id.toString() !== currentUserId);
            await friendUser.save();
        }

        res.json({ message: 'Arkadaş silindi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

module.exports = router;
