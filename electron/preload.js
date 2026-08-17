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

// Expose explicitly for the Profile Manager
contextBridge.exposeInMainWorld('electronAPI', {
    getAppPreferences: () => ipcRenderer.invoke('get-settings'),
    setAppPreference: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    generatePlayerAuthKey: () => Promise.resolve(null), // Returning null forces HaxBall to auto-generate a new auth!
    restartApp: () => ipcRenderer.send('restart-app'),
    saveCustomBackground: (filePath) => ipcRenderer.invoke('save-custom-bg', filePath),
    deleteCustomBackground: (fileUrl) => ipcRenderer.invoke('delete-custom-bg', fileUrl),
    windowControl: (action) => ipcRenderer.send('window-control', action),
    openReplayViewer: () => ipcRenderer.send('open-replay-viewer'),
    getVersion: () => ipcRenderer.invoke('get-app-version')
});

