const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'config.json');
}

const defaultSettings = {
    fpsEnabled: true,
    fpsShow: false,
    rpcEnabled: true,
    pingBoosterEnabled: false,
    lowGraphicsEnabled: false,
    perfBgEnabled: false,
    thinLinesEnabled: false,
    autoRecEnabled: false,
    nowPlayingEnabled: false,
    keyOverlayEnabled: false,
    animatedAvatar: {
        enabled: false,
        defaultAvatar: 'VX',
        resetDuration: 2000,
        hotkeys: { "1": "🔥", "2": "🤮", "3": "💀", "4": "🧤" }
    },
    profiles: [
        {
            id: 'default',
            name: 'Default',
            autosave: true,
            avatar: null,
            extrapolation: '0',
            fav_rooms: [],
            geo_override: null,
            player_auth_key: null,
            player_name: null,
            animatedAvatar: {
                enabled: false,
                preset: 'moon',
                customFrames: '',
                speed: 500
            }
        }
    ]
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
