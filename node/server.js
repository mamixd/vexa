const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const setupAPI = require('./api');

// Load shared config
const configPath = path.join(__dirname, '../shared/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());

// Setup REST API routes
setupAPI(app, io);

// WebSocket event handling
io.on('connection', (socket) => {
  console.log(`[Frontend] User connected: ${socket.id}`);

  // Send current configuration and state
  socket.emit('init', { config: config.haxball });

  // Handle header updates from admin
  socket.on('update_header', (data) => {
    // Validate admin token (simple example)
    if (data.token === config.security.adminToken) {
      console.log('[Admin] Header update received.');
      // Broadcast to everyone else
      socket.broadcast.emit('header_updated', data.payload);
    } else {
      socket.emit('error', { message: 'Unauthorized header update.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Frontend] User disconnected: ${socket.id}`);
  });
});

const PORT = config.ports.nodejs;
server.listen(PORT, () => {
  console.log(`🚀 Node.js server running on port ${PORT}`);
  console.log(`📁 Serving frontend from ${path.join(__dirname, '../frontend')}`);
});
