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

// Avatar Yükleme Endpointi
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

module.exports = router;
