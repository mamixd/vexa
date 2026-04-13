const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'config.json');
}

const defaultSettings = {
    fpsEnabled: true,
    rpcEnabled: true
};

function loadSettings() {
    try {
        const settingsPath = getSettingsPath();
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            return { ...defaultSettings, ...JSON.parse(data) };
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
    return defaultSettings;
}

function saveSettings(settings) {
    try {
        const current = loadSettings();
        const updated = { ...current, ...settings };
        const settingsPath = getSettingsPath();
        fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 4));
        return updated;
    } catch (err) {
        console.error('Failed to save settings:', err);
        return null;
    }
}

module.exports = { loadSettings, saveSettings };
