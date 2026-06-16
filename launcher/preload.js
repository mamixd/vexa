const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    startDownload: (url) => ipcRenderer.invoke('start-download', url),
    startLauncherUpdate: (url) => ipcRenderer.invoke('start-launcher-update', url),
    extractAndInstall: (version) => ipcRenderer.invoke('extract-and-install', version),
    launchGame: () => ipcRenderer.invoke('launch-game'),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
    onInstallerStatus: (callback) => ipcRenderer.on('installer-status', (event, data) => callback(data)),
    close: () => ipcRenderer.send('close-app'),
    minimize: () => ipcRenderer.send('minimize-app')
});
