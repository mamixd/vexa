<p align="center">
  <a href="https://vexaclient.com/">
    <img src="inject/logo.png" alt="Vexa Client" width="130" />
  </a>
</p>

<h1 align="center">Vexa HaxBall Client</h1>

<p align="center">
  <strong>Gelişmiş, Yüksek Performanslı ve Özelleştirilebilir HaxBall Masaüstü İstemcisi</strong><br />
  <em>Advanced High-Performance Desktop Client for HaxBall (x64 & 32-bit)</em>
</p>

<p align="center">
  <a href="https://vexaclient.com/"><img src="https://img.shields.io/badge/Website-vexaclient.com-10b981?style=for-the-badge" alt="Website" /></a>
  <a href="https://github.com/vexa-client/vexa/releases/latest"><img src="https://img.shields.io/github/v/release/vexa-client/vexa?style=for-the-badge&color=10b981&label=Latest%20Release" alt="Latest Release" /></a>
  <a href="https://github.com/vexa-client/vexa/actions/workflows/build-and-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/vexa-client/vexa/build-and-release.yml?style=for-the-badge&label=Build" alt="Build Status" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20(64--bit%20%7C%2032--bit)-0284c7?style=for-the-badge" alt="Platform" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge" alt="License" /></a>
</p>

---

## 🌟 Genel Bakış (Overview)

**Vexa Client**, [HaxBall](https://www.haxball.com/) deneyimini masaüstüne taşıyan modern bir Electron istemcisidir. Doğrudan tek kurulum dosyası (`vexa-setup`) ile çalışır; ekstra launcher veya karmaşık kurulum adımları gerektirmez.

Oyunculara ultra düşük giriş gecikmesi, FPS kilit kaldırıcı, HaxBall'un nostaljik imza arayüz detayları (kırmızı başlık çizgisi), modern yarı saydam cam teması (Transparent mode), Discord Zengin Varlık (RPC) ve otomatik arka plan güncelleme sistemi sunar.

---

## 📦 İndirme & Desteklenen Mimariler (Downloads)

Vexa, hem modern **64-bit** hem de eski nesil **32-bit** Windows sistemlerini tam olarak destekler:

| Dosya Adı | Mimari | Desteklenen Sistemler | İndirme |
| :--- | :--- | :--- | :--- |
| **`vexa-setup-x64.exe`** | 64-bit (`x64`) | Windows 10, Windows 11 (64-bit) | [İndir (x64)](https://github.com/vexa-client/vexa/releases/latest) |
| **`vexa-setup-ia32.exe`** | 32-bit (`ia32 / x86`) | Windows 7, 8.1, 10, 11 (32-bit) | [İndir (32-bit)](https://github.com/vexa-client/vexa/releases/latest) |

> **Kurulum:** Sistem mimarinize uygun setup dosyasını indirin ve çalıştırın. Kurulum bittiğinde istemci otomatik olarak açılır ve doğrudan HaxBall'a bağlanır.

---

## 🚀 Öne Çıkan Özellikler (Key Features)

### ⚡ Performans & Ağ
- **FPS Kilidi Kaldırma (FPS Unlocker):** Monitör yenileme hızına (144Hz, 240Hz, 360Hz+) tam uyum.
- **Ultra Düşük Gecikme:** Özel Chromium bayrakları (`enable-gpu-rasterization`, `enable-zero-copy`, `disable-renderer-backgrounding`).
- **Canlı Göstergeler:** Canlı FPS sayacı ve NetGraph ağ grafiği.

### 🎨 Görsel Tasarım & Arayüz
- **HaxBall İmza Kırmızı Başlık Çizgisi:** Takma ad ekranı, oda listesi ve oda başlıklarında klasik kırmızı HaxBall vurgusu.
- **Şeffaf Mod (Transparent UI):** Tek tıkla arka plan duvar kağıdı ile bütünleşen cam efektli yarı saydam tema. Kırmızı çizgiler ve oyuncu panelleri şeffaflıkla dinamik olarak senkronize olur.
- **Yenilenen Kristal Logo & Butonlar:** Şeffaf Vexa elmas logosu, yeşil artıklardan arındırılmış temiz cam butonlar ve fareyle üzerine gelindiğinde parlayan turuncu (`#f59e0b`) kenarlıklar.
- **Arka Plan Yöneticisi:** Dahili yüksek kaliteli futbol ve Vexa duvar kağıtları arasında anında geçiş.

### 🎧 Entegrasyonlar & Araçlar
- **Discord Rich Presence (RPC):** Discord profilinizde *"Vexa Client Oynuyor"*, bulunulan oda adı ve oynama süresi gösterimi.
- **Şimdi Çalıyor (Now Playing):** Windows Medya Oturumları ile Spotify vb. şarkı durumunu oda içine aktarma desteği.
- **Replay Sistemi:** `.hbr2` uzantılı HaxBall tekrar dosyaları ile tam Windows ilişkilendirmesi; çift tıklayarak doğrudan istemci içinde izleme.
- **HaxAllTool Entegre Eklentisi:** Oda filtreleri, otomatik katılma (autojoin), favori odalar ve gelişmiş arama çubuğu.

### 🔄 Akıllı Otomatik Güncelleme (Auto-Updater)
- İstemci açılışında VDS API üzerinden yeni sürümü kontrol eder.
- Güncelleme varsa, şık splash ekranı üzerinden indirme yüzdesini, hızını ve boyutunu canlı olarak gösterir.
- 64-bit ve 32-bit mimariyi otomatik algılar ve oyuncunun sistemine uygun kurulum paketini arka planda kurar.

---

## 💻 Geliştirici Kurulumu (Development)

### Gereksinimler
- **İşletim Sistemi:** Windows 10 / 11
- **Node.js:** v18 veya v20 LTS
- **Paket Yöneticisi:** `npm`

### Projeyi Çalıştırma
```bash
# Depoyu klonlayın
git clone https://github.com/vexa-client/vexa.git
cd vexa

# Bağımlılıkları yükleyin
npm install

# İstemciyi doğrudan geliştirme modunda başlatın
npm start
```

---

## 🛠️ Derleme Komutları (Build Commands)

Projede hem komut satırı hem de tek tıkla çalışan Türkçe menülü derleme aracı bulunmaktadır:

### 1. `build.bat` ile Tek Tıkla Derleme (Önerilen)
Proje kök dizinindeki **`build.bat`** dosyasına çift tıklayarak menüden seçim yapabilirsiniz:
- `[1]` Hem 64-bit hem 32-bit Setup Üret (x64 + ia32)
- `[2]` Sadece 64-bit Setup Üret
- `[3]` Sadece 32-bit Setup Üret

### 2. NPM Komutları ile Derleme
```bash
# Hem 64-bit hem 32-bit kurulum dosyalarını derler (dist/ altında üretilir)
npm run build

# Sadece 64-bit setup derler
npm run build:x64

# Sadece 32-bit setup derler
npm run build:ia32
```

Oluşan kurulum dosyaları `dist/` klasöründe yer alır:
- `dist/vexa-setup-x64.exe` (~133 MB)
- `dist/vexa-setup-ia32.exe` (~130 MB)

---

## 📁 Proje Dizin Yapısı (Project Structure)

```text
vexa/
├── electron/                 # Electron ana süreci ve yerel servisler
│   ├── main.js               # Ana yaşam döngüsü, pencere yönetimi, Discord RPC
│   ├── window.js             # BrowserWindow yapılandırması ve script enjeksiyonu
│   ├── updater.js            # Mimariye duyarlı otomatik güncelleme motoru
│   ├── settings.js           # Kullanıcı ayarları kalıcılığı (config.json)
│   └── splash.html           # Başlangıç ve indirme durumu yükleme ekranı
├── inject/                   # HaxBall web sayfasına enjekte edilen modüller
│   ├── client.js             # FPS araçları, oda listesi teması, NetGraph
│   ├── header.js             # Üst menü barı, ayarlar modalı, duvar kağıdı seçici
│   ├── roomlist_premium.css  # Premium cam oda listesi stilleri ve buton efektleri
│   ├── avatar.js             # Avatar ve reaksiyon araçları
│   ├── profiles.js           # Profil yönetimi
│   ├── logo.png              # Şeffaf kristal Vexa logosu
│   └── backgrounds/          # Dahili duvar kağıtları
├── hxalltool/                # Gömülü HaxAllTool eklenti varlıkları
├── build/                    # İkonlar, bannerlar ve NSIS kurulum kaynakları
├── build.bat                 # Yerel Windows derleme yöneticisi
├── .github/workflows/        # Otomatik GitHub Actions Release iş akışı
├── package.json              # Proje bağımlılıkları ve electron-builder ayarları
└── versions.json             # Güncel istemci sürüm tanımı
```

---

## 🔐 Güvenlik & Gizlilik Notları

- Vexa Client, resmi HaxBall web uygulamasını güvenli bir Chromium kapsayıcısında çalıştırır ve yalnızca arayüz/performans scriptlerini enjekte eder.
- `.env` ve sunucu tarafı kodları (`vds-backend/`) Git takibinden muaftır ve depoya yüklenmez.
- Discord RPC için bot jetonu gerekmez; yalnızca standart istemci kimliği kullanılır.
- Tüm güncellemeler yalnızca resmi GitHub deposundan (`vexa-client/vexa`) indirilir.

---

## 🔗 Bağlantılar & Topluluk

- **Resmi Web Sitesi:** [https://vexaclient.com/](https://vexaclient.com/)
- **Son Sürüm İndirmeleri:** [GitHub Releases](https://github.com/vexa-client/vexa/releases)
- **Hata Bildirimi & İstekler:** [GitHub Issues](https://github.com/vexa-client/vexa/issues)
- **HaxBall Resmi Sayfası:** [https://www.haxball.com/](https://www.haxball.com/)

---

## 📄 Lisans

Bu proje **GNU General Public License v3.0 (GPLv3)** lisansı altında geliştirilmektedir. Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
