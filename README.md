<p align="center">
  <a href="https://vexaclient.com/">
    <img src="inject/logo.png" alt="Vexa Client" width="130" />
  </a>
</p>

<h1 align="center">Vexa HaxBall Client</h1>

<p align="center">
  <strong>Gelişmiş Performans, Şeffaf Arayüz, 64-Bit & 32-Bit Desteği ve Zengin Araçlarla Donatılmış Modern HaxBall İstemcisi.</strong>
</p>

<p align="center">
  <a href="https://vexaclient.com/"><img src="https://img.shields.io/badge/Website-vexaclient.com-10b981?style=for-the-badge" alt="Website" /></a>
  <a href="https://github.com/vexa-client/vexa/releases/latest"><img src="https://img.shields.io/github/v/release/vexa-client/vexa?style=for-the-badge&color=f59e0b&label=Latest%20Release" alt="Latest Release" /></a>
  <a href="https://github.com/vexa-client/vexa/actions/workflows/build-and-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/vexa-client/vexa/build-and-release.yml?style=for-the-badge&label=Build" alt="Build Status" /></a>
  <img src="https://img.shields.io/badge/Windows-64--Bit%20%7C%2032--Bit-blue?style=for-the-badge&logo=windows" alt="Arch Support" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-gray?style=for-the-badge" alt="License" /></a>
</p>

---

## 📌 Genel Bakış (Overview)

**Vexa Client**, popüler çevrimiçi futbol oyunu [HaxBall](https://www.haxball.com/) için Electron tabanlı, yüksek performanslı ve modüler yeni nesil bir masaüstü istemcisidir.

Oyunun orijinal mekaniklerine ve özüne sadık kalarak; profesyonel oyuncuların ihtiyaç duyduğu **düşük gecikme (low-latency)**, **yüksek FPS**, **cam efektli şeffaf arayüz (Glassmorphism)**, **çoklu profil yönetimi**, **replay oynatıcı** ve **Discord Rich Presence** gibi özellikleri tek bir kurulum dosyasıyla sunar.

Hem **64-bit (`x64`)** hem de **32-bit (`ia32`)** Windows mimarileri için ayrı ayrı derlenmiş hafif paketlere sahiptir.

---

## ✨ Özellikler (Features)

| Kategori | Özellikler |
| :--- | :--- |
| **🚀 Performans & Gecikme** | FPS Kilit Açıcı (Unlocked FPS), Ayarlanabilir FPS Limiti, NetGraph Ping & Frame Gecikme Grafiği, GPU Rasterization & Sıfır Kopyalama Bayrakları |
| **🎨 Modern Arayüz & Tasarım** | Vexa Kristal Elmas Şeffaf Logo, HaxBall İkonik Kırmızı Başlık Çizgileri, Turuncu Kenarlık Hover Efekti, Şeffaf/Koyu Cam Teması, Scrollbar Düzeltmesi |
| **🖥️ Mimari Desteği** | Windows 64-bit (`vexa-setup-x64.exe`) ve Windows 32-bit (`vexa-setup-ia32.exe`) için iki ayrı optimize kurulum dosyası |
| **🖼️ Duvar Kağıtları & Efektler** | Dahili dinamik duvar kağıtları, özel görsel yükleme, arka plan opaklık ve bulanıklık kontrolleri |
| **👤 Çoklu Profil Sistemi** | Tek tıkla takma ad (nick), avatar, auth anahtarları, ülke bayrağı ve oyun tercihlerini değiştirme |
| **🎬 Replay Entegrasyonu** | `.hbr2` dosya ilişkilendirmesi — indirilen maç tekrarlarına çift tıklayarak doğrudan Vexa içinde izleme |
| **🔍 Oda ve Oyun Araçları** | Hızlı oda arama, favori odalar listesi, otomatik katılma (AutoJoin), oda filtreleri ve dahili HaxAllTool eklenti desteği |
| **🎧 Discord Rich Presence** | Discord profilinde oynanan odayı, takım durumunu ve maç süresini anlık olarak gösterme |
| **🔄 Mimari Uyumlu Güncelleyici**| Kullanıcının sistem mimarisini otomatik algılayan ve doğrudan CDN/VDS üzerinden güncellenen akıllı güncelleme motoru |

---

## 📥 Kurulum (Installation)

Sistem mimarinize uygun kurulum paketini GitHub Releases sayfasından indirebilirsiniz:

👉 **[En Son Vexa Sürümünü İndir](https://github.com/vexa-client/vexa/releases/latest)**

- **64-bit Windows Kullanıcıları İçin:** `vexa-setup-x64.exe`
- **32-bit Windows Kullanıcıları İçin:** `vexa-setup-ia32.exe`

> **Kurulum Notu:** Kurulumu çalıştırdığınızda Vexa Client otomatik olarak kurulur, masaüstünüze kısayol oluşturulur ve doğrudan açılır. Windows ilk açılışta *"Bilinmeyen Yayıncı"* uyarısı verirse *"Ek Bilgi"* ➔ *"Yine de Çalıştır"* seçeneğini tıklayabilirsiniz.

---

## 📂 Proje Mimarisi (Project Structure)

```text
vexa/
├── electron/                 # İstemci Electron Ana Süreci
│   ├── main.js               # Ana yaşam döngüsü, IPC köprüsü & Discord RPC
│   ├── window.js             # Chromium pencere optimizasyonları ve script enjeksiyonu
│   ├── updater.js            # Mimari algılayıcı (x64/ia32) otomatik güncelleme motoru
│   ├── settings.js           # Yerel ayar ve profil kalıcılığı
│   └── splash.html           # Başlangıç ve indirme durum ekranı
├── inject/                   # HaxBall içine enjekte edilen istemci modülleri
│   ├── client.js             # FPS kilit açıcı, oda listesi teması, NetGraph, kısayollar
│   ├── header.js             # Üst çubuk, ayarlar penceresi, arka plan yöneticisi
│   ├── roomlist_premium.css  # Şeffaf cam temalı lüks oda listesi tasarımı
│   ├── profiles.js           # Oyuncu profilleri ve yetkilendirme yönetimi
│   ├── avatar.js             # Hareketli & özel avatar yardımcıları
│   ├── logo.png              # Şeffaf Vexa elmas logosu
│   └── backgrounds/          # Dahili duvar kağıtları
├── hxalltool/                # Gömülü HaxAllTool eklenti modülü
├── build/                    # Simge (icon.ico) ve NSIS kurulum görsel kaynakları
├── build.bat                 # PC üzerinden tek tıkla 64-bit ve 32-bit derleme aracı
├── .github/workflows/        # Otomatik GitHub Actions derleme ve dağıtım iş akışı
├── package.json              # Proje bağımlılıkları ve mimari derleme tanımları
└── versions.json             # Güncel istemci sürüm takip dosyası
```

---

## 🛠️ Geliştirici ve Derleme Kılavuzu (Development & Build)

### Gereksinimler
- **İşletim Sistemi:** Windows 10 / 11 (64-bit veya 32-bit)
- **Node.js:** v18 veya v20+
- **npm:** v9+

### Kurulum Adımları
```bash
# Depoyu klonlayın
git clone https://github.com/vexa-client/vexa.git
cd vexa

# Bağımlılıkları yükleyin
npm install

# İstemciyi geliştirici modunda başlatın
npm start
```

### Derleme (Build) Komutları

Proje ana dizininde bulunan **`build.bat`** dosyasını çift tıklayarak interaktif Türkçe menüden seçim yapabilir ya da aşağıdaki komutları terminalden çalıştırabilirsiniz:

```bash
# Hem 64-bit hem 32-bit kurulum paketlerini aynı anda derler (dist/ altında üretilir)
npm run build

# Yalnızca 64-bit kurulum dosyası üretir (vexa-setup-x64.exe)
npm run build:x64

# Yalnızca 32-bit kurulum dosyası üretir (vexa-setup-ia32.exe)
npm run build:ia32
```

---

## 📄 Lisans (License)

Bu proje [GNU General Public License v3.0](LICENSE) kapsamında lisanslanmıştır.

---

<p align="center">
  <sub>Developed with ❤️ for the HaxBall Community by <b>Vexa Software</b>.</sub>
</p>
