const express = require('express');

function setupAPI(app, io) {
  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'nodejs' });
  });

  // Receive commands from Python AI
  app.post('/api/action', express.json(), (req, res) => {
    const { action, payload } = req.body;
    
    // Validate request
    if (!action) return res.status(400).json({ error: 'Missing action' });
    
    // Example: Python tells Node.js to broadcast a message
    if (action === 'broadcast') {
      io.emit('server_message', payload);
      res.json({ success: true, message: 'Message broadcasted' });
    }
    else if (action === 'kick_player') {
      // Logic to communicate with headless bot
      console.log(`[Python Request] Kick Player: ${payload.id}`);
      // Usually you would call functions from bot.js here
      io.emit('bot_action', { action: 'kick', id: payload.id });
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  });

  // More REST routes can be added here
}

module.exports = setupAPI;
