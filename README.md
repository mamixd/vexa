# Vexa Client

HaxBall için "Vexa-Client" ekibi tarafından özel olarak geliştirilmiş resmi olmayan, modern ve gelişmiş masaüstü istemcisi. Electron tabanlıdır ve oyundan aldığınız keyfi en üst noktaya taşımak için özel araçlar ve optimizasyonlar içerir.

Mevcut sürüm yalnızca **Windows (64-bit)** için optimize edilmiştir.

Biz de Discord'dayız! [Buraya tıklayarak](https://vexaclient.rf.gd/discord) topluluğumuza katılabilirsiniz.

---

## ✨ Kısaca Özellikler

* Özel "Vexa" eklentisi (Add-on) ile entegre
* Reklamsız, saf oyun deneyimi
* **Sınırsız FPS desteği** (Tarayıcı hız limitlerine takılmaz)
* Otomatik istemci güncellemeleri
* Gelişmiş zengin "Discord Görünümü" (Discord RPC)
* Sohbet içi komut kısayolları (`/a`, `/e`, vb.)

---

## 📥 Nasıl Kurulur?

Web sitemizden veya [Releases](https://github.com/vexa-client/vexa/releases) sayfasından işletim sisteminize (Windows) uygun en son sürümü indirin.

Ardından:

**Windows kullanıyorsanız**, indirdiğiniz arşivi açın ve başlatıcı (`vexa-launcher-setup.exe`) dosyasını çalıştırın. Başlatıcı açıldıktan sonra **İNDİR** butonuna bir kez basmanız yeterlidir, geriye kalan tüm kurulum adımlarını Vexa halleder. 

> *Antivirüs yazılımınız çalışmayı engelliyorsa / uyarı veriyorsa, bunun sebebi istemcimizin veya kurulum dosyamızın henüz Microsoft tarafından resmi olarak imzalanmamış olmasıdır (False Positive). "Yine de Çalıştır" diyerek güvenle kullanabilirsiniz.*

🛡️ **Güvenlik (VirusTotal) Tarama Sonuçları:**
Şeffaflık adına, indirdiğiniz dosyaların VirusTotal tarama sonuçlarını aşağıdan inceleyebilirsiniz:
* [Vexa Setup (Kurulum Dosyası) - VirusTotal Raporu](https://www.virustotal.com/gui/file/ec4732e6b5932919b7fc08413d2a494df5cc678ecf69f60d9af2324b77abae7f/detection)
* [Vexa Launcher (vexa-launcher.exe) - VirusTotal Raporu](https://www.virustotal.com/gui/file/c809ca25db64eb1f3e4b52d153378fd64a90ef918f3d5ad09de8b311c717d677?nocache=1)
* [Vexa Client (vexa-client.exe) - VirusTotal Raporu](https://www.virustotal.com/gui/file/d73c2b66b9432f35106716f6f00eba57ec0054909fc673f798ab86574bd594cb?nocache=1)

---

## 🐛 Bilinen Sorunlar

* Oyunu ilk başlattığınızda veya odadan çıktığınızda reklam bloklayıcı tam randımanlı çalışmayabilir. (Bu sorun üzerinde çalışıyoruz).
* Karşılaştığınız farklı bir sorun varsa lütfen GitHub sayfamız üzerinden bir "Issue" veya Discord sunucumuzdan bize ulaşın!

---

## 🔍 Detaylı Özellikler

### ⚡️ Sınırsız / Yüksek FPS
Tarayıcınızın kısıtlamalarına katlanmak zorunda değilsiniz. Vexa, monitörünüzün donanımsal olarak desteklediği en yüksek tazeleme hızına (144Hz, 240Hz, vb.) tam uyum sağlar. Oyununuz saniye atlamadan ipek gibi akar.

*⚠ Not: Bu özellik bazı donanımlarda ufak yırtılmalara sebep olabilir. Hala test aşamasındadır.*

### 💬 Sohbet Kısayolları (Shortcuts)
Oyun içerisinde sık kullandığınız komutları uzun uzun yazmak yerine kısayollarla oyunun hızına ayak uydurabilirsiniz.

Vexa şu an önceden tanımlanmış temel kısayollarla gelir:
* `/e` veya `/e1` yazarak doğrudan **extrapolation** ayarlarınızı düzenleyebilirsiniz.
* `/a` yazarak **avatarınızı** hızlıca değiştirebilirsiniz.

### 🎮 Otomatik Güncelleme
Oyun zevkinizin yarıda kesilmesine izin vermemek için Vexa Launcher, her açılışta güncellemeleri otomatik olarak takip eder ve oyun dosyalarını güncel tutar. Sizin ek bir işlem yapmanıza gerek kalmaz.

### 👾 Discord Entegrasyonu
Arkadaşlarınız sizin HaxBall oynayıp oynamadığınızı anlık olarak görüntüleyebilir. Main Menu (Ana Menü), Oda arama, Oyun içi durumlar dahil olmak üzere tüm aktiviteleriniz Discord profilinize interaktif butonlarla birlikte anında yansır.

---

## 🛠 Kaynak Koddan Derleme (Geliştiriciler İçin)

Projeyi kendi bilgisayarınıza klonlayın. Ardından terminalinizden şu komutu girin:

```bash
npm install
```

Tüm kütüphaneler yüklendikten sonra, `package.json` içerisinde belirtilen derleme komutunu çalıştırabilirsiniz.

Örneğin, Windows (64bit) Sürümü oluşturmak için:
```bash
npm run build:full
```

*Not: Derleme işlemi sonrası `dist` klasörü içerisinde `vexa-launcher-setup` uygulamasını ve ilgili oyun klasörlerini bulabilirsiniz.*
