const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    startDownload: (url) => ipcRenderer.invoke('start-download', url),
    startLauncherUpdate: (url) => ipcRenderer.invoke('start-launcher-update', url),
    extractAndInstall: (version) => ipcRenderer.invoke('extract-and-install', version),
    launchGame: (userId) => ipcRenderer.invoke('launch-game', userId),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
    onInstallerStatus: (callback) => ipcRenderer.on('installer-status', (event, data) => callback(data)),
    close: () => ipcRenderer.send('close-app'),
    minimize: () => ipcRenderer.send('minimize-app'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getConfig: () => ipcRenderer.invoke('get-config'),
    setConfig: (newConfig) => ipcRenderer.invoke('set-config', newConfig),
    showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
    setOffline: (data) => ipcRenderer.send('set-offline', data)
});
