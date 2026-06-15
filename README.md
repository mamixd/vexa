<p align="center">
  <img src="build/icon.png" alt="Vexa Logo" width="120" />
</p>

<h1 align="center">Vexa HaxBall Client</h1>

<p align="center">
  <strong>Advanced Modular HaxBall Desktop Client</strong><br/>
  <em>Unlock FPS • Custom Avatars • Discord RPC • Background Customization • And More</em>
</p>

<p align="center">
  <a href="https://github.com/vexa-client/vexa/releases/latest"><img src="https://img.shields.io/github/v/release/vexa-client/vexa?style=for-the-badge&color=00c853&label=Download" alt="Latest Release" /></a>
  <a href="https://github.com/vexa-client/vexa/actions"><img src="https://img.shields.io/github/actions/workflow/status/vexa-client/vexa/build-and-release.yml?style=for-the-badge&label=Build" alt="Build Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge" alt="License" /></a>
  <a href="https://vexaclient.rf.gd/discord"><img src="https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

## 📖 About

Vexa is a feature-rich desktop client for [HaxBall](https://www.haxball.com), built on Electron. It wraps the official HaxBall web game and injects powerful quality-of-life enhancements, performance optimizations, and a modern settings UI — all without modifying the game's core code.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Unlocked FPS** | Bypass the browser's 60 FPS cap — sync to your monitor's native refresh rate (144Hz, 240Hz, etc.) |
| 📊 **FPS Counter & Net Graph** | Real-time FPS display and network performance graph overlay |
| 🎨 **Custom Avatars** | 10-slot avatar carousel with quick-switch — use any emoji, text, or symbol |
| 🖼️ **Custom Backgrounds** | Upload your own wallpapers with a 5-item history grid — persisted across sessions |
| 🎮 **Discord Rich Presence** | Show your HaxBall activity on Discord with room info and player count |
| ⚡ **Ping Booster** | Optional TCP_NODELAY optimization for reduced input latency |
| ⌨️ **Chat Shortcuts** | `/a <text>` to change avatar, `/e <value>` to set extrapolation, and more |
| 👤 **Player Profiles** | Multi-profile system — save and switch between different nicknames, avatars, and settings |
| 🔧 **HaxAllTool Integration** | Built-in browser extension tools: room search, auto-join, favorites, emoji chat, admin tools |
| 🚀 **Auto-Updater** | Launcher automatically checks for and installs updates from GitHub Releases |

## 🏗️ Architecture

```
vexa/
├── launcher/          # Vexa Launcher (updater & game bootstrapper)
│   ├── main.js        # Launcher Electron main process
│   ├── installer.js   # Download & update manager
│   ├── preload.js     # Launcher preload bridge
│   └── ui/            # Launcher frontend (HTML/CSS/JS)
├── electron/          # Game Client (core Electron wrapper)
│   ├── main.js        # Client main process, IPC handlers
│   ├── window.js      # BrowserWindow factory & script injection
│   ├── preload.js     # Client preload API (settings, backgrounds)
│   ├── settings.js    # Persistent settings manager (JSON file)
│   ├── splash.html    # Splash screen
│   └── customSign.js  # Custom code signing utility
├── inject/            # Injected scripts (run inside HaxBall page)
│   ├── client.js      # FPS engine, limiter, counter, net graph
│   ├── header.js      # Settings UI, top bar, tabs (General/Shortcuts/Profiles/Backgrounds)
│   ├── avatar.js      # 10-slot avatar carousel system
│   ├── profiles.js    # Multi-profile management
│   ├── ui.js          # UI utilities
│   └── hx_polyfill.js # HaxBall API polyfills
├── hxalltool/         # HaxAllTool browser extension (embedded)
├── build/             # Build resources (icons, installer images)
├── .github/workflows/ # GitHub Actions CI/CD
└── package.json       # Project manifest & build configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)
- **Windows 10/11** (x64)

### Installation

```bash
# Clone the repository
git clone https://github.com/vexa-client/vexa.git
cd vexa

# Install dependencies
npm install

# Run in development mode
npm start
```

### Building

```bash
# Build Launcher installer (.exe)
npm run build

# Build Client package (portable)
npm run build:client

# Build everything (Launcher + Client + Package)
npm run build:full
```

Build artifacts are output to the `dist/` directory.

## 📦 Project Components

### Launcher (`launcher/`)
The entry point of Vexa. It checks GitHub Releases for the latest client version, downloads and extracts it, then launches the game client as a child process. Features a sleek dark UI with progress tracking.

### Game Client (`electron/`)
The core Electron wrapper that loads `html5.haxball.com` and injects Vexa's enhancement scripts. Handles IPC for settings persistence, custom background file management, and Discord RPC.

### Inject Scripts (`inject/`)
JavaScript files injected into the HaxBall page at runtime:
- **client.js** — FPS unlocking via `requestAnimationFrame` override, real-time FPS counter, network graph
- **header.js** — Complete settings UI with 4 tabs (General, Shortcuts, Profiles, Backgrounds)
- **avatar.js** — 10-slot avatar system with drag-and-click selection
- **profiles.js** — Save/load player profiles (nick, avatar, country, settings)

### HaxAllTool (`hxalltool/`)
An embedded browser extension providing room search, auto-join, favorites, admin tools, emoji support, and chat translation.

## ⚙️ Configuration

Settings are persisted in `%APPDATA%/vexa-client/settings.json` and include:

| Setting | Default | Description |
|---------|---------|-------------|
| `fpsEnabled` | `true` | Enable/disable FPS limiter (unlocked when disabled) |
| `fpsShow` | `true` | Show FPS counter overlay |
| `rpcEnabled` | `true` | Enable Discord Rich Presence |
| `pingBoosterEnabled` | `false` | Enable TCP_NODELAY for lower latency |
| `netGraphEnabled` | `true` | Show network performance graph |

Custom backgrounds are stored in `%APPDATA%/vexa-client/backgrounds/`.

## 🔄 CI/CD

The project uses **GitHub Actions** for automated builds and releases:

- **Trigger**: Push a version tag (e.g., `v1.1.14`)
- **Pipeline**: Install → Build Launcher → Build Client → Package → Create GitHub Release
- **Output**: NSIS installer (`.exe`) + portable client package (`app.zip`)

```bash
# Create a new release
git tag v1.1.14
git push origin v1.1.14
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- 🌐 **Website**: [vexa.gg](https://vexa.gg)
- 💬 **Discord**: [Join Server](https://vexaclient.rf.gd/discord)
- 📦 **Releases**: [GitHub Releases](https://github.com/vexa-client/vexa/releases)
- 🐛 **Issues**: [Report a Bug](https://github.com/vexa-client/vexa/issues)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/vexa-client">Vexa</a>
</p>
