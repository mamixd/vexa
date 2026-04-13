const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process (Haxball DOM or Panel) to use
// the ipcRenderer without exposing the entire object

contextBridge.exposeInMainWorld('haxballAPI', {
    sendCommand: (command) => ipcRenderer.invoke('send-haxball-command', command),
    logEvent: (data) => ipcRenderer.invoke('log-haxball-event', data),
    updateRPC: (state, details, nick) => ipcRenderer.send('update-rpc', { state, details, nick }),
    
    // Receive commands sent from main process (or Panel -> Main -> HaxBall)
    onCommand: (callback) => ipcRenderer.on('execute-command', (event, ...args) => callback(...args)),
    
    // Receive replay files
    onLoadReplay: (callback) => ipcRenderer.on('load-replay', (event, data, filename) => callback(data, filename))
});

contextBridge.exposeInMainWorld('launcherAPI', {
    play: () => ipcRenderer.send('start-game'),
    toggleRPC: (state) => ipcRenderer.send('toggle-discord-rpc', state),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    getSettings: () => ipcRenderer.invoke('get-settings')
});
