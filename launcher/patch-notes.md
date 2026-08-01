# ⚠️ Launcher hala test aşamasındadır!

> Bu sürüm aktif olarak geliştirilmektedir. Hatalar ve eksiklikler olabilir. Geri bildirimleriniz bizim için çok değerli!

---

# 🚀 Vexa v1.3.0 — Güncelleme Notları

## 🎬 Replay Sistemi
- **Dahili Replay İzleyici:** Artık üst menüde bulunan **"🎬 Replays"** butonuna tıklayarak direkt oyun penceresinde replay izleyebilirsiniz.
- **Çift Tıklama Desteği:** `.hbr2` dosyalarına çift tıkladığınızda Vexa otomatik olarak açılıp replay'i oynatır.
- Replay sayfası Vexa temasına uygun olarak reklamlardan arındırılmıştır.

## 📦 Tek Setup Mimarisi
- Launcher ve Client artık **tek bir kurulum dosyasında** birleştirildi.
- `app.zip` indirme sistemi tamamen kaldırıldı — daha hızlı ve güvenilir başlatma.
- "Oyna" butonuna basıldığında Launcher arka planda çalışmaya devam eder, görev çubuğundan tekrar erişilebilir.

## ⚡ Performans İyileştirmeleri
- Hareketli arka planlar (Video/GIF) geçici olarak devre dışı bırakıldı — oyun içi performans artışı.
- GPU hızlandırma flag'leri eklendi (`ignore-gpu-blocklist`, `enable-gpu-rasterization`).
- Ağır CSS blur efektleri kaldırıldı.

## 🔧 Diğer Düzeltmeler
- Launcher pencere boyutu düzeltildi (1400x820).
- Header buton tasarımları sadeleştirildi ve tutarlı hale getirildi.
- Ayarlar menüsünde arka plan yükleme sadece statik resimlerle sınırlandırıldı (PNG, JPG, WEBP).
