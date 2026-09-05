# 🎯 Vexa HaxBall Sniper Bot [3-0 BAN & VIP SYSTEM]

Vexa Client için özel olarak geliştirilmiş, VDS (Sanal Sunucu) üzerinde 7/24 kesintisiz çalışabilen profesyonel HaxBall Sniper 1v1 Botu.

---

## 🌟 Öne Çıkan Özellikler

1. **3-0 Geçici Ban Sistemi:**
   - Maçı 3-0 kaybeden oyuncular otomatik olarak **10 dakika** (yapılandırılabilir) boyunca odadan geçici olarak banlanır ve atılır.
   - Ban süresi boyunca odaya tekrar giriş yapmaya çalışırlarsa bot kalan dakikayı bildirip odaya almaz.
   - Süre dolduğunda ban otomatik kalkar.
   - 3-1, 3-2 gibi skorlarda kaybeden banlanmaz, spectatore geçer ve kazanan sahada kalır ("Kazanan Kalır").

2. **Vexa Client VIP Ayrıcalıkları:**
   - **Otomatik Algılama:** Vexa Client ile bağlanan oyuncular odaya girdiklerinde otomatik tanınır.
   - **Özel Tag:** Chat ve duyurularda `⭐[VEXA]` unvanı gösterilir.
   - **VIP Sıra Önceliği (`!q`):** Vexa Client kullananlar bekleme sırasına girdiğinde normal oyuncuların önüne geçer!
   - **Giriş Duyurusu:** `"⭐ Vexa Client kullanıcısı [Oyuncu] odaya katıldı!"`

3. **Hesap ve İstatistik Sistemi (`data/users.json`):**
   - **Sadece hesabı olanların** istatistikleri kaydedilir (`!kayit <sifre>`).
   - Kayıtlı istatistikler: Galibiyet, Mağlubiyet, Kazanma Oranı (%), 3-0 Galibiyet Sayısı, 3-0 Yenilgi Sayısı, Galibiyet Serisi, En Yüksek Seri ve Rütbe (Bronz -> Efsane).
   - `!top`: Odadaki en iyi 5 Sniper'ı listeler.
   - `!stats`: Kişisel istatistikleri gösterir.

4. **AFK & Spam Koruması:**
   - **AFK Koruması:** Oyunda 15 saniye hareketsiz kalana sesli uyarı yapılır, 20 saniye AFK kalırsa spectatore atılır ve sıradaki oyuncu oyuna alınır.
   - **Spam Koruması:** 3 saniyede 4'ten fazla mesaj atanlar 30 saniye otomatik susturulur (mute).

5. **Otomatik Reklam ve Tanıtım (Broadcast):**
   - Her 3-4 dakikada bir sohbeti rahatsız etmeyecek aralıklarla Vexa Client tanıtım mesajları gönderilir.
   - `!client` veya `!indir`: İndirme bağlantısını ve avantajlarını yazar.
   - `!discord`: Discord davet bağlantısını yazar.
   - `!kurallar`: 3-0 ban kurallarını açıklar.

---

## 🚀 VDS Kurulum ve Çalıştırma

### 1. Adım: HaxBall Headless Token Alma
1. Tarayıcınızda [https://www.haxball.com/headlesstoken](https://www.haxball.com/headlesstoken) adresine gidin.
2. "Ben robot değilim" (hCaptcha) doğrulamasını geçin.
3. Size verilen uzun token kodunu kopyalayın.

### 2. Adım: Yapılandırma (`config.json`)
`config.json` dosyasını açın ve token alanına yapıştırın:
```json
{
  "roomName": "🎯 Vexa | SNIPER [3-0 BAN] | vexaclient.com",
  "playerName": "🎯 Vexa Bot",
  "maxPlayers": 16,
  "public": true,
  "token": "BURAYA_ALDIĞINIZ_TOKENI_YAPIŞTIRIN",
  "adminPassword": "vexa_admin_2026",
  "banDurationMinutes": 10,
  "afkTimeoutSeconds": 20,
  "broadcastIntervalMinutes": 3
}
```

### 3. Adım: VDS Üzerinde Başlatma

#### Seçenek A: Doğrudan Node.js ile
```bash
npm install
npm start
```
veya token'ı komut satırından vererek:
```bash
node index.js YOUR_TOKEN_HERE
```

#### Seçenek B: Linux VDS (PM2 ile 7/24 Arka Planda)
```bash
# PM2 kurulu değilse:
npm install -g pm2

# Gerekli kütüphaneler (Ubuntu/Debian için Chromium gereksinimleri):
sudo apt-get update
sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Botu arka planda başlat:
pm2 start index.js --name "vexa-sniper-bot"

# Sunucu yeniden başlasa bile otomatik açılması için:
pm2 save
pm2 startup
```

#### Seçenek C: Tarayıcı Konsolu (Kurulumsuz Hızlı Başlatma)
Eğer Puppeteer kullanmak istemiyorsanız:
1. Google Chrome ile [https://html5.haxball.com/headlessweb](https://html5.haxball.com/headlessweb) sayfasına gidin.
2. F12 tuşuna basıp **Console (Konsol)** sekmesini açın.
3. `bot.js` dosyasının içindeki kodları kopyalayıp konsola yapıştırın ve Enter'a basın!
4. Oda linkiniz konsolda görünecektir.

---

## 🎮 Oyuncu Komutları

| Komut | Açıklama |
|---|---|
| `!q` / `!sirayagir` | Maç sırasına girer (Vexa Client kullanıcıları VIP öncelik alır) |
| `!cık` | Sıradan çıkar |
| `!sira` | Güncel sıradaki kişileri listeler |
| `!kayit <şifre>` | Yeni hesap açar ve istatistik takibini başlatır |
| `!giris <şifre>` | Var olan hesaba giriş yapar |
| `!stats` | Kişisel galibiyet, 3-0 sayısı, seri ve rütbe istatistiğini gösterir |
| `!top` | Odadaki en çok galibiyeti olan ilk 5 oyuncuyu listeler |
| `!kurallar` | 1v1 Sniper ve 3-0 ban kurallarını açıklar |
| `!client` / `!indir` | Vexa Client indirme linki ve özelliklerini verir |
| `!discord` | Discord sunucusu davet linkini verir |

## 👑 Yönetici (Admin) Komutları

| Komut | Açıklama |
|---|---|
| `!admin <şifre>` | Yönetici yetkisi verir (`config.json` içindeki şifre) |
| `!restart` | Oyunu yeniden başlatır |
| `!clearbans` | Tüm geçici 3-0 banlarını sıfırlar |
| `!unban <isim/auth>` | Belirtilen oyuncunun banını kaldırır |

---

## 📁 Veri Dosyaları
- `data/users.json`: Kayıtlı oyuncuların istatistikleri ve şifreleri.
- `data/bans.json`: Aktif geçici ban kayıtları (bitiş süresi dolunca otomatik temizlenir).
- `stadium.hbs`: Özel neon tasarımlı, seken duvarlı Sniper 1v1 haritası.