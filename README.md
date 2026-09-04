<p align="center">
  <a href="https://vexaclient.com/">
    <img src="build/icon.png" alt="Vexa Client" width="118" />
  </a>
</p>

<h1 align="center">Vexa HaxBall Client</h1>

<p align="center">
  <strong>A modern Electron desktop client for HaxBall with performance tools, profiles, custom UI, and Discord Rich Presence.</strong>
</p>

<p align="center">
  <a href="https://vexaclient.com/"><img src="https://img.shields.io/badge/Website-vexaclient.com-00c853?style=for-the-badge" alt="Website" /></a>
  <a href="https://github.com/vexa-client/vexa/releases/latest"><img src="https://img.shields.io/github/v/release/vexa-client/vexa?style=for-the-badge&color=00c853&label=Latest%20Release" alt="Latest Release" /></a>
  <a href="https://github.com/vexa-client/vexa/actions/workflows/build-and-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/vexa-client/vexa/build-and-release.yml?style=for-the-badge&label=Build" alt="Build Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge" alt="License" /></a>
</p>

---

## Overview

Vexa is a high-performance desktop client for [HaxBall](https://www.haxball.com/) built with Electron. It delivers a fast, low-latency gameplay experience with an integrated splash/updater, custom glassmorphic UI, performance tools, profile management, background customization, and Discord Rich Presence.

Website: [https://vexaclient.com/](https://vexaclient.com/)

---

## 🚀 Yenilikler / Sürüm Notları (v1.4.5)

- **⚡ 64-Bit ve 32-Bit Ayrı Kurulum Paketleri:**
  - Hem 64-bit (`vexa-setup-x64.exe`) hem de 32-bit (`vexa-setup-ia32.exe`) Windows sistemler için özel optimize edilmiş bağımsız kurulum dosyaları.
- **💎 Yeni Şeffaf Kristal Logo:**
  - Başlık barındaki ve oyun içi rozetlerdeki logo arka plansız, temiz şeffaf kristal tasarım ile yenilendi; eski yeşil gölge/parlama artıkları tamamen temizlendi.
- **🎨 HaxBall İkonik Kırmızı Başlık Çizgisi:**
  - Takma ad ekranı, oda listesi ve oda içi başlıklarına HaxBall'un imza kırmızı alt çizgisi eklendi. Transparent modu açıldığında çizgi cam temasına uyumlu yarı saydam kırmızıya (`rgba(225, 60, 60, 0.45)`) otomatik olarak geçiş yapar.
- **🖱️ Geliştirilmiş Butonlar & Turuncu Hover Efekti:**
  - `Join Room` butonundaki yeşil renk kaldırıldı; tüm butonlar koyu şeffaf cam zeminine kavuşturuldu.
  - Butonların üzerine fareyle gelindiğinde kenarlıklar şık turuncu çerçeve (`#f59e0b`) ile vurgulanır.
- **🧹 Filtreler Altındaki Yatay Scrollbar Kaldırıldı:**
  - Oda listesi filtre kutularının altında oluşan çirkin Windows yatay kaydırma çubuğu tamamen kaldırıldı.
- **🔄 Transparent Butonu Kalıcılığı & Oda İçi Senkronizasyon:**
  - Ayarlar veya Oda Kur ekranlarına girip geri dönüldüğünde Transparent butonunun kaybolması sorunu çözüldü.
  - Oda içerisindeki oyuncu/izleyici panelleri Transparent moduyla uyumlu cam efektine kavuşturuldu.
- **🎧 Discord RPC & Medya:**
  - Discord Rich Presence ve Windows Media Sessions arka plan entegrasyonu optimize edildi.
- **🏎️ Kod & Depo Temizliği:**
  - Projeden 2.5 GB'lık eski test kalıntıları ve atıl dosyalar temizlenerek istemci hafifletildi.

---

## Features

| Area | Feature |
| --- | --- |
| Architecture | Dedicated 64-bit and 32-bit Windows installers (`vexa-setup-x64.exe`, `vexa-setup-ia32.exe`) |
| Performance | FPS unlocker, configurable FPS cap, FPS overlay, optional latency-focused Chromium switches |
| Network | Ping display, NetGraph overlay, WebRTC/stat scraping helpers |
| Interface | Custom Vexa header, transparent UI mode, signature HaxBall red lines, orange hover highlights |
| Profiles | Multiple local profiles for nicknames, avatars, auth keys, country overrides, and preferences |
| Avatars | Static and animated avatar presets, custom frames, hotkey/reaction avatar support |
| Backgrounds | Built-in and custom backgrounds, upload history, video/image support |
| Discord | In-game Discord Rich Presence and media session display |
| Rooms | Room search, favorites, autojoin helpers, filter controls, HaxAllTool integration |
| Replays | `.hbr2` file association and replay loader support |
| Updates | Automatic in-app update check and background download engine |

## Installation

Download the latest installer matching your Windows architecture from GitHub Releases:

🔗 **[Latest Vexa Release (v1.4.5)](https://github.com/vexa-client/vexa/releases/latest)**

- **64-bit Windows:** `vexa-setup-x64.exe`
- **32-bit Windows:** `vexa-setup-ia32.exe`

Kurulum dosyasını çalıştırın; kurulum tamamlandığında istemci otomatik olarak açılır ve doğrudan oyuna bağlanır.

## Build Commands

```bash
# Hem 64-bit hem 32-bit kurulum dosyalarını derle (dist/ klasörüne):
npm run build

# Sadece 64-bit kurulum dosyasını derle:
npm run build:x64

# Sadece 32-bit kurulum dosyasını derle:
npm run build:ia32

# Veya proje ana dizinindeki 'build.bat' dosyasına çift tıklayarak menüden seçim yapın.
```

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

### Discord RPC does not show

Check these points:

- Discord desktop app is running.
- `rpcEnabled` is true in Vexa settings.
- Local `.env` or GitHub Actions `DISCORD_CLIENT_ID` secret exists.
- The packaged build includes `.env` through the Electron builder `files` list.

### GitHub Actions release has no RPC

Add the repository secret `DISCORD_CLIENT_ID`, then rerun the release workflow or push a new version tag.

## Useful Links

- Website: [https://vexaclient.com/](https://vexaclient.com/)
- Releases: [https://github.com/vexa-client/vexa/releases](https://github.com/vexa-client/vexa/releases)
- Actions: [https://github.com/vexa-client/vexa/actions](https://github.com/vexa-client/vexa/actions)
- Issues: [https://github.com/vexa-client/vexa/issues](https://github.com/vexa-client/vexa/issues)
- HaxBall: [https://www.haxball.com/](https://www.haxball.com/)

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.
