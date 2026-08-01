require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Rotalar
const authRoutes = require('./routes/auth').router;
const profileRoutes = require('./routes/profile');
const friendsRoutes = require('./routes/friends');
const updatesRoutes = require('./routes/updates');

const app = express();
const server = http.createServer(app);

// Socket.io Ayarları
const io = new Server(server, {
    cors: {
        origin: '*', // Production'da sadece izin verilen domainler olmalı
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Veritabanı Bağlantısı
connectDB();

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/updates', updatesRoutes); // Launcher için güncellemeler

// Socket.io İşlemleri
const connectedUsers = new Map(); // userId -> socketId eşleştirmesi

io.on('connection', (socket) => {
    console.log(`Yeni bağlantı: ${socket.id}`);

    // Kullanıcı online olduğunda (Giriş yaptığında)
    socket.on('register_user', async (userId) => {
        connectedUsers.set(userId, socket.id);
        console.log(`Kullanıcı ${userId} online oldu.`);
        
        // Veritabanında status'u online yap
        const User = require('./models/User');
        try {
            await User.findByIdAndUpdate(userId, { status: 'online' });
            socket.userId = userId; // socket içine userId kaydet
            
            // Arkadaşlarına bildir (Gerçek projede sadece arkadaşlarına emit edilir)
            io.emit('user_status_change', { userId, status: 'online' });
        } catch (err) {
            console.error(err);
        }
    });

    // Mesaj Gönderme
    socket.on('send_message', async (data) => {
        const { senderId, receiverId, content } = data;
        
        // 1. Mesajı veritabanına kaydet
        const Message = require('./models/Message');
        try {
            const newMessage = new Message({ sender: senderId, receiver: receiverId, content });
            await newMessage.save();

            // 2. Eğer alıcı online ise mesajı anında ilet
            const receiverSocketId = connectedUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive_message', newMessage);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Bağlantı Koptuğunda
    socket.on('disconnect', async () => {
        console.log(`Bağlantı koptu: ${socket.id}`);
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
            
            // Veritabanında offline yap
            const User = require('./models/User');
            try {
                await User.findByIdAndUpdate(socket.userId, { 
                    status: 'offline', 
                    lastSeen: new Date() 
                });
                io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
            } catch (err) {
                console.error(err);
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Vexa VDS Backend sunucusu port ${PORT} üzerinde çalışıyor.`);
});
