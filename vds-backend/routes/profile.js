const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const { authMiddleware } = require('./auth');

// Cloudinary Yapılandırması
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'vexa_avatars',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 150, height: 150, crop: 'fill' }]
    }
});

const upload = multer({ storage: storage });

// Avatar Yükleme Endpointi (multipart form)
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Lütfen bir resim seçin.' });
        }
        
        const avatarUrl = req.file.path;
        
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { avatar: avatarUrl }, 
            { new: true }
        ).select('-password');
        
        res.json({ message: 'Avatar başarıyla güncellendi', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Avatar yüklenirken bir hata oluştu.' });
    }
});

// Profil Bilgilerini Getir
router.get('/profile', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId gerekli.' });
        
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        
        res.json({ 
            success: true, 
            profile: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                banner: user.banner,
                bio: user.bio,
                playTime: user.playTime,
                dot: user.status === 'online' ? 'online' : 'offline',
                activity: 'Idle'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Profil Güncelle (bio, avatar, banner — base64 olarak Cloudinary'ye yükler)
router.post('/profile', async (req, res) => {
    try {
        const { userId, updates } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId gerekli.' });

        const updateData = {};

        // Bio güncelle
        if (updates.bio !== undefined) {
            updateData.bio = updates.bio;
        }

        // Avatar: base64 ise Cloudinary'ye yükle
        if (updates.avatar !== undefined) {
            if (updates.avatar && updates.avatar.startsWith('data:')) {
                try {
                    const result = await cloudinary.uploader.upload(updates.avatar, {
                        folder: 'vexa_avatars',
                        width: 250,
                        height: 250,
                        crop: 'fill',
                        overwrite: true,
                        public_id: `avatar_${userId}`
                    });
                    updateData.avatar = result.secure_url;
                } catch (uploadErr) {
                    console.error('Cloudinary avatar upload error:', uploadErr);
                }
            } else {
                updateData.avatar = updates.avatar;
            }
        }

        // Banner: base64 ise Cloudinary'ye yükle
        if (updates.banner !== undefined) {
            if (updates.banner && updates.banner.startsWith('data:')) {
                try {
                    const result = await cloudinary.uploader.upload(updates.banner, {
                        folder: 'vexa_banners',
                        width: 800,
                        height: 300,
                        crop: 'fill',
                        overwrite: true,
                        public_id: `banner_${userId}`
                    });
                    updateData.banner = result.secure_url;
                } catch (uploadErr) {
                    console.error('Cloudinary banner upload error:', uploadErr);
                }
            } else {
                updateData.banner = updates.banner;
            }
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
        
        res.json({ 
            success: true, 
            profile: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                banner: user.banner,
                bio: user.bio
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Profil güncellenirken hata oluştu.' });
    }
});

module.exports = router;
