const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 1. FILE PATHS
const configPath = path.join(__dirname, 'config.json');
const stadiumPath = path.join(__dirname, 'stadium.hbs');
const usersPath = path.join(__dirname, 'data', 'users.json');
const bansPath = path.join(__dirname, 'data', 'bans.json');
const botScriptPath = path.join(__dirname, 'bot.js');

// 2. READ ASSETS & CONFIG
if (!fs.existsSync(configPath)) {
    console.error('❌ config.json dosyası bulunamadı!');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Command line token or ENV token overrides config
const argToken = process.argv[2] || process.env.HAXBALL_TOKEN;
if (argToken) {
    config.token = argToken;
}

if (!config.token || config.token === 'BURAYA_HEADLESS_TOKEN_YAZIN') {
    console.warn('\n⚠️ DİKKAT: HaxBall Headless Token ayarlanmamış!');
    console.warn('👉 Token almak için tarayıcınızda açın: https://www.haxball.com/headlesstoken');
    console.warn('👉 Aldığınız tokenı config.json içindeki "token" alanına yapıştırın');
    console.warn('👉 VEYA şu şekilde çalıştırın: npm start -- <token>\n');
}

let stadiumData = null;
if (fs.existsSync(stadiumPath)) {
    try {
        stadiumData = fs.readFileSync(stadiumPath, 'utf8');
    } catch (e) {
        console.error('⚠️ Stadyum dosyası okunamadı:', e.message);
    }
}

// Ensure data folder and files exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '{}', 'utf8');
if (!fs.existsSync(bansPath)) fs.writeFileSync(bansPath, '{}', 'utf8');

const initialUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8') || '{}');
const initialBans = JSON.parse(fs.readFileSync(bansPath, 'utf8') || '{}');
const botScript = fs.readFileSync(botScriptPath, 'utf8');

// 3. START PUPPETEER RUNNER
async function runBot() {
    console.log('🚀 [Vexa VDS Runner] HaxBall Headless Host başlatılıyor...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();

    // Pipe browser console messages to Node terminal
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[Vexa Bot]') || text.includes('🔗 ODA LİNKİ')) {
            console.log(text);
        }
    });

    page.on('pageerror', err => {
        console.error('❌ Sayfa Hatası:', err.message);
    });

    // Bridge functions from Page -> Node.js FS
    await page.exposeFunction('nodeSaveUsers', (dataStr) => {
        try {
            fs.writeFileSync(usersPath, dataStr, 'utf8');
        } catch (e) {
            console.error('❌ Kullanıcı verisi kaydedilemedi:', e.message);
        }
    });

    await page.exposeFunction('nodeSaveBans', (dataStr) => {
        try {
            fs.writeFileSync(bansPath, dataStr, 'utf8');
        } catch (e) {
            console.error('❌ Ban verisi kaydedilemedi:', e.message);
        }
    });

    await page.exposeFunction('nodeLog', (msg) => {
        const logFile = path.join(__dirname, 'bot.log');
        try {
            fs.appendFileSync(logFile, msg + '\n', 'utf8');
        } catch (e) {}
    });

    await page.exposeFunction('nodeOnRoomLink', (url) => {
        console.log('\n================================================================');
        console.log('🎉 VEXA SNIPER ODASI BAŞARIYLA YAYINDA!');
        console.log('👉 ODA BAĞLANTISI: ' + url);
        console.log('👉 Oyuncular bu linkle odaya katılabilir.');
        console.log('================================================================\n');
    });

    console.log('🌐 HaxBall Headless Web sayfası yükleniyor...');
    await page.goto('https://html5.haxball.com/headlessweb', {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('💉 Bot mantığı ve stadyum enjekte ediliyor...');

    // Inject data and execute bot
    await page.evaluate((cfg, std, usrs, bns, scriptContent) => {
        window.__BOT_CONFIG__ = cfg;
        window.__BOT_STADIUM__ = std;
        window.__INITIAL_USERS__ = usrs;
        window.__INITIAL_BANS__ = bns;

        const scriptEl = document.createElement('script');
        scriptEl.textContent = scriptContent;
        document.body.appendChild(scriptEl);
    }, config, stadiumData, initialUsers, initialBans, botScript);

    console.log('✅ Bot başarıyla çalıştırıldı! VDS üzerinde 7/24 çalışıyor...');
}

// Graceful exit
process.on('SIGINT', async () => {
    console.log('\n🛑 Bot kapatılıyor...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Bot sonlandırılıyor...');
    process.exit(0);
});

runBot().catch(err => {
    console.error('❌ Bot başlatılırken kritik hata:', err);
    process.exit(1);
});