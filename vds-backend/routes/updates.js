const express = require('express');
const router = express.Router();

// Güncel versiyon numaralarını döndüren endpoint (eski versions.json)
router.get('/versions.json', (req, res) => {
    res.json({
        launcher: "1.3.0",
        client: "1.3.0"
    });
});

// Güncelleme notlarını döndüren endpoint (eski patch-notes.md)
router.get('/patch-notes', (req, res) => {
    const patchNotes = `
# ⚠️ Launcher hala test aşamasındadır!

> Bu sürüm aktif olarak geliştirilmektedir. Hatalar ve eksiklikler olabilir. Geri bildirimleriniz bizim için çok değerli!

---

# 🚀 Vexa v1.3.0 — Güncelleme Notları

## 🎬 Replay Sistemi
- **Dahili Replay İzleyici:** Artık üst menüde bulunan **"🎬 Replays"** butonuna tıklayarak direkt oyun penceresinde replay izleyebilirsiniz.
- **Çift Tıklama Desteği:** \`.hbr2\` dosyalarına çift tıkladığınızda Vexa otomatik olarak açılıp replay'i oynatır.

## 📦 Tek Setup Mimarisi
- Launcher ve Client artık **tek bir kurulum dosyasında** birleştirildi.
- "Oyna" butonuna basıldığında Launcher arka planda çalışmaya devam eder, görev çubuğundan tekrar erişilebilir.

## ⚡ Performans İyileştirmeleri
- Hareketli arka planlar (Video/GIF) geçici olarak devre dışı bırakıldı — oyun içi performans artışı.
- Ağır CSS blur efektleri kaldırıldı.
`;
    res.send(patchNotes);
});

module.exports = router;
