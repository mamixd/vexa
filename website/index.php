<?php
// Vexa Launcher - Premium Landing Page
$version = "1.0.0";
$download_link = "dist/vexa-launcher-setup-1.0.0.exe";
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vexa Launcher | Advanced Haxball Client</title>
    <meta name="description" content="Vexa Launcher, yapay zeka destekli ve modüler yapılı en gelişmiş Haxball istemcisidir.">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    
    <!-- Style -->
    <link rel="stylesheet" href="css/style.css">
    
    <!-- Favicon Placeholders -->
    <link rel="icon" type="image/png" href="assets/logo.png">
</head>
<body>
    <div class="blob-container">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
    </div>

    <!-- Navigation -->
    <nav class="glass-nav">
        <div class="nav-content">
            <div class="logo">VEXA<span>LAUNCHER</span></div>
            <div class="nav-links">
                <a href="#features">Özellikler</a>
                <a href="#tech">Teknoloji</a>
                <a href="https://discord.gg/vexa" class="btn-small">Discord</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <div class="hero-text animate-up">
                <span class="badge">Sürüm <?php echo $version; ?> Yayında</span>
                <h1>Haxball Deneyimini <span>Yeniden Tanımlayın</span></h1>
                <p>Yapay zeka entegrasyonu, modüler eklenti sistemi ve kusursuz performans. Vexa, sıradan bir istemciden çok daha fazlası.</p>
                <div class="cta-group">
                    <a href="<?php echo $download_link; ?>" class="btn-primary">Hemen İndir</a>
                    <a href="#features" class="btn-secondary">Keşfet</a>
                </div>
            </div>
            
            <div class="hero-mockup animate-up-large">
                <div class="mockup-screen">
                    <div class="mockup-header">
                        <div class="dots"><span></span><span></span><span></span></div>
                        <div class="title">Vexa Client v1.0</div>
                    </div>
                    <div class="mockup-body">
                        <!-- Abstract UI representation -->
                        <div class="ui-panel"></div>
                        <div class="ui-sidebar"></div>
                        <div class="ui-main">
                            <div class="pulse-circle"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="container">
            <div class="section-header">
                <h2>Neden <span>Vexa?</span></h2>
                <p>Oyunun kurallarını değiştiren özelliklerle donatıldı.</p>
            </div>
            
            <div class="feature-grid">
                <div class="feature-card">
                    <div class="icon">⌨️</div>
                    <h3>Akıllı Kısaltmalar</h3>
                    <p><code>/a</code>, <code>/e</code>, <code>/h</code> gibi akıllı komutlarla saniyeler kazanın. Uzun komutları tek harfle yönetin.</p>
                </div>
                <div class="feature-card">
                    <div class="icon">🚀</div>
                    <h3>Oda Yakalayıcı</h3>
                    <p>Dolu odalara girmek için beklemenize gerek yok. Yer açıldığı an Vexa sizi içeri otomatik sokar.</p>
                </div>
                <div class="feature-card">
                    <div class="icon">🌍</div>
                    <h3>Anlık Çeviri</h3>
                    <p>Yabancı odalarda dil engeline takılmayın. Gelen mesajları anında kendi dilinizde okuyun.</p>
                </div>
                <div class="feature-card">
                    <div class="icon">⚡</div>
                    <h3>FPS & Ad-Block</h3>
                    <p>144Hz+ desteği ve tamamen reklamsız, temiz bir oyun alanı ile rakipsiz performans.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Tech Stack Section -->
    <section id="tech" class="tech">
        <div class="container">
            <div class="glass-box tech-content">
                <div class="tech-text">
                    <h2>Güçlü <span>Teknoloji</span></h2>
                    <p>Vexa, modern yazılım mimarisi üzerine inşa edilmiştir. Güvenlik ve hız önceliğimizdir.</p>
                </div>
                <div class="tech-icons">
                    <div class="tech-pill">Node.js</div>
                    <div class="tech-pill">Electron</div>
                    <div class="tech-pill">JavaScript</div>
                    <div class="tech-pill">Chromium</div>
                    <div class="tech-pill">WebSocket</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-content">
                <p>&copy; 2026 Vexa Software. Tüm hakları saklıdır.</p>
                <div class="socials">
                    <a href="#">Discord</a>
                    <a href="#">GitHub</a>
                </div>
            </div>
        </div>
    </footer>

    <script src="js/app.js"></script>
</body>
</html>
