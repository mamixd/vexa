require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vexa_uploads',
    allowed_formats: ['jpg', 'png', 'webp', 'gif']
  }
});
const upload = multer({ storage: storage });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vexa', {})
  .then(() => console.log('✅ MongoDB Baglantisi Basarili'))
  .catch(err => console.error('❌ MongoDB Hatasi:', err));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vexa API calisiyor!' });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Resim yuklenemedi' });
  }
  res.json({ url: req.file.path });
});

io.on('connection', (socket) => {
  console.log(`🔌 Yeni baglanti: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Baglanti koptu: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Vexa Backend API ${PORT} portunda calisiyor.`);
});
