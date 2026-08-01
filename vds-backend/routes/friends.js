const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('./auth');

// Arkadaş Ekleme İsteği Gönder
router.post('/add', authMiddleware, async (req, res) => {
    try {
        const { username } = req.body;
        const targetUser = await User.findOne({ username });

        if (!targetUser) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        if (targetUser._id.toString() === req.user.id) return res.status(400).json({ error: 'Kendinize istek gönderemezsiniz.' });
        if (targetUser.friends.includes(req.user.id)) return res.status(400).json({ error: 'Zaten arkadaşsınız.' });
        if (targetUser.friendRequests.includes(req.user.id)) return res.status(400).json({ error: 'İstek zaten gönderildi.' });

        targetUser.friendRequests.push(req.user.id);
        await targetUser.save();

        res.json({ message: 'Arkadaşlık isteği gönderildi.' });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Arkadaşlık İsteğini Kabul Et
router.post('/accept', authMiddleware, async (req, res) => {
    try {
        const { senderId } = req.body;
        const currentUser = await User.findById(req.user.id);

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
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Arkadaşları ve İstekleri Getir
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', 'username avatar status')
            .populate('friendRequests', 'username avatar');
        
        res.json({
            friends: user.friends,
            requests: user.friendRequests
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

module.exports = router;
