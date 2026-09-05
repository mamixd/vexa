const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
    startDownload: () => ipcRenderer.send('start-update-download'),
    onSplashUpdate: (callback) => {
        ipcRenderer.on('splash-update', (event, data) => callback(data));
    },
    onShowUpdatePrompt: (callback) => {
        ipcRenderer.on('show-update-prompt', (event, data) => callback(data));
    },
    onUpdateFailed: (callback) => {
        ipcRenderer.on('update-failed', (event, data) => callback(data));
    }
});
