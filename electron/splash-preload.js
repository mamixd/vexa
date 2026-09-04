const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
    startDownload: () => ipcRenderer.send('start-update-download'),
    skipUpdate: () => ipcRenderer.send('skip-update'),
    onSplashUpdate: (callback) => {
        ipcRenderer.on('splash-update', (event, data) => callback(data));
    },
    onShowUpdatePrompt: (callback) => {
        ipcRenderer.on('show-update-prompt', (event, data) => callback(data));
    }
});
