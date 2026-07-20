<p align="center">
  <a href="https://vexa-client.github.io/">
    <img src="build/icon.png" alt="Vexa Client" width="118" />
  </a>
</p>

<h1 align="center">Vexa HaxBall Client</h1>

<p align="center">
  <strong>A modern Electron desktop client for HaxBall with performance tools, profiles, custom UI, and Discord Rich Presence.</strong>
</p>

<p align="center">
  <a href="https://vexa-client.github.io/"><img src="https://img.shields.io/badge/Website-vexa--client.github.io-00c853?style=for-the-badge" alt="Website" /></a>
  <a href="https://github.com/vexa-client/vexa/releases/latest"><img src="https://img.shields.io/github/v/release/vexa-client/vexa?style=for-the-badge&color=00c853&label=Latest%20Release" alt="Latest Release" /></a>
  <a href="https://github.com/vexa-client/vexa/actions/workflows/build-and-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/vexa-client/vexa/build-and-release.yml?style=for-the-badge&label=Build" alt="Build Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge" alt="License" /></a>
</p>

---

## Overview

Vexa is a desktop client for [HaxBall](https://www.haxball.com/) built with Electron. It keeps the original HaxBall experience intact while adding a launcher, update system, custom interface, performance controls, profile management, background customization, and Discord Rich Presence.

The project is split into two applications:

- `Vexa Launcher`: installs, updates, and starts the game client.
- `Vexa Client`: opens HaxBall and injects the Vexa interface and gameplay tools.

Website: [https://vexa-client.github.io/](https://vexa-client.github.io/)

## Features

| Area | Feature |
| --- | --- |
| Performance | FPS unlocker, configurable FPS cap, FPS overlay, optional latency-focused Chromium switches |
| Network | Ping display, NetGraph overlay, WebRTC/stat scraping helpers |
| Interface | Custom Vexa header, room browser styling, transparent UI mode, settings modal |
| Profiles | Multiple local profiles for nicknames, avatars, auth keys, country overrides, and preferences |
| Avatars | Static and animated avatar presets, custom frames, hotkey/reaction avatar support |
| Backgrounds | Built-in and custom backgrounds, upload history, video/image support |
| Discord | Launcher and in-game Discord Rich Presence support |
| Rooms | Room search, favorites, autojoin helpers, filter controls, HaxAllTool integration |
| Replays | `.hbr2` file association and replay loader support |
| Updates | GitHub Release based launcher/client update flow |

## Screenshots

Screenshots and download links are available on the project website:

[https://vexa-client.github.io/](https://vexa-client.github.io/)

## Project Structure

```text
vexa/
|-- launcher/                 # Launcher app: updater, installer, UI bootstrap
|   |-- main.js               # Launcher Electron main process
|   |-- installer.js          # Download, extraction, install, update handling
|   |-- preload.js            # Safe launcher IPC bridge
|   `-- ui/                   # Launcher HTML/CSS/renderer files
|-- electron/                 # Game client app
|   |-- main.js               # Client Electron main process and RPC
|   |-- window.js             # BrowserWindow creation and script injection
|   |-- preload.js            # Client IPC bridge
|   |-- settings.js           # Local config persistence
|   `-- splash.html           # Startup splash screen
|-- inject/                   # Scripts injected into the HaxBall page
|   |-- client.js             # FPS tools, room browser UI, NetGraph, background sync
|   |-- header.js             # Top bar, settings modal, background/profile tabs
|   |-- avatar.js             # Avatar helpers
|   |-- profiles.js           # Profile management
|   `-- ui.js                 # UI command bridge helpers
|-- hxalltool/                # Embedded HaxAllTool extension assets
|-- build/                    # Icons and installer resources
|-- .github/workflows/        # Automated release workflow
|-- electron-builder-client.json
|-- package.json
`-- versions.json
```

## Installation

### Recommended

Download the latest installer from GitHub Releases:

[Latest Vexa Release](https://github.com/vexa-client/vexa/releases/latest)

Run `vexa-launcher-setup-*.exe`, then open the launcher. The launcher checks the published client version, downloads `app.zip` when needed, installs it locally, and starts `vexa-client.exe` when you press Play.

### Development Setup

Requirements:

- Windows 10/11 x64
- Node.js 20+
- Git

```bash
git clone https://github.com/vexa-client/vexa.git
cd vexa
npm install
npm start
```

Run the client directly during development:

```bash
npm run start:client
```

## Build Commands

```bash
# Build launcher installer into dist/
npm run build

# Build portable client into dist/client/win-unpacked/
npm run build:client

# Build launcher, client, and app.zip
npm run build:full

# Package dist/client/win-unpacked as app.zip
npm run package:client
```

Build outputs:

- `dist/vexa-launcher-setup-<version>.exe`
- `dist/client/win-unpacked/vexa-client.exe`
- `app.zip`

## Release Flow

Releases are built by GitHub Actions from version tags.

1. Update `package.json`.
2. Update `versions.json`.
3. Commit the release changes.
4. Create and push a tag such as `v1.2.2`.
5. GitHub Actions builds the launcher installer and `app.zip`.
6. The workflow publishes both files to the GitHub Release.

```bash
git add package.json versions.json
git commit -m "Prepare 1.2.2 release"
git tag v1.2.2
git push origin main
git push origin v1.2.2
```

## Discord Rich Presence

Discord RPC uses `DISCORD_CLIENT_ID` from the runtime environment.

For local builds, create a `.env` file in the project root:

```env
DISCORD_CLIENT_ID=your_discord_application_client_id
```

`.env` is ignored by Git and should not be committed.

For GitHub Actions releases, add this repository secret:

```text
DISCORD_CLIENT_ID
```

During the release workflow, the secret is written into a temporary `.env` file before building so the packaged app can read it at runtime.

Note: Discord Client ID is a public application identifier, not a bot token or password. Still, this project keeps it out of source control to avoid exposing project-specific metadata in the repository.

## Configuration

Client settings are stored in Electron's user data directory as `config.json`. The exact path depends on how Electron resolves `app.getPath('userData')` on the user's machine.

Common settings include:

| Setting | Purpose |
| --- | --- |
| `fpsEnabled` | Enables FPS unlock behavior |
| `fpsShow` | Shows or hides the FPS counter |
| `rpcEnabled` | Enables Discord Rich Presence |
| `pingBoosterEnabled` | Enables latency-focused Chromium switches |
| `netGraphEnabled` | Shows or hides the network graph |
| `profiles` | Stores local profile data |
| `animatedAvatar` | Stores animated avatar configuration |

Custom backgrounds are copied into the app user data directory and referenced through local file URLs.

## Security Notes

- The client wraps the official HaxBall web app and injects UI scripts into that page.
- No Discord bot token is required or stored.
- `.env` is ignored by Git.
- Release builds should use GitHub repository secrets for environment-specific values.
- The updater downloads release assets from the official repository: `vexa-client/vexa`.

## Troubleshooting

### The launcher opens but Play does not start the client

Make sure the client is installed under the launcher's local `game/` folder. If it is missing, use the launcher update/download flow again or publish a fresh `app.zip` in the latest release.

### Discord RPC does not show

Check these points:

- Discord desktop app is running.
- `rpcEnabled` is true in Vexa settings.
- Local `.env` or GitHub Actions `DISCORD_CLIENT_ID` secret exists.
- The packaged build includes `.env` through the Electron builder `files` list.

### GitHub Actions release has no RPC

Add the repository secret `DISCORD_CLIENT_ID`, then rerun the release workflow or push a new version tag.

## Useful Links

- Website: [https://vexa-client.github.io/](https://vexa-client.github.io/)
- Releases: [https://github.com/vexa-client/vexa/releases](https://github.com/vexa-client/vexa/releases)
- Actions: [https://github.com/vexa-client/vexa/actions](https://github.com/vexa-client/vexa/actions)
- Issues: [https://github.com/vexa-client/vexa/issues](https://github.com/vexa-client/vexa/issues)
- HaxBall: [https://www.haxball.com/](https://www.haxball.com/)

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.
