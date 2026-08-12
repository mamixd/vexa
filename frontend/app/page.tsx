"use client";

import React, { useState, useEffect } from "react";

const REPO_RELEASE_API = "https://api.github.com/repos/vexa-client/vexa/releases/latest";
const LATEST_RELEASE_PAGE = "https://github.com/vexa-client/vexa/releases/latest";
const API_ENDPOINTS = [
  "https://api.vexaclient.com/api/ping/public",
  "https://193.164.4.245:5000/api/ping/public"
];

interface GithubRelease {
  tagName: string;
  publishedAt: string;
  downloadUrl: string;
  installerName: string;
}

export default function Home() {
  // Mobile Nav State
  const [isNavOpen, setIsNavOpen] = useState(false);

  // FAQ Accordion State (Index of open FAQ, default first one open)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; desc: string } | null>(null);

  // Live Stats State
  const [liveUsers, setLiveUsers] = useState<number>(0);
  const [hasFetchedStats, setHasFetchedStats] = useState(false);

  // Github Release State
  const [releaseInfo, setReleaseInfo] = useState<GithubRelease>({
    tagName: "v1.2.3",
    publishedAt: "GitHub release bilgisi yükleniyor.",
    downloadUrl: LATEST_RELEASE_PAGE,
    installerName: "Setup dosyası otomatik seçilecek.",
  });
  const [isReleaseLoading, setIsReleaseLoading] = useState(true);

  // Format Date Helper
  const formatDate = (value: string) => {
    if (!value) return "Yayın tarihi bekleniyor.";
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date(value));
    } catch {
      return "Geçersiz tarih";
    }
  };

  // Poll Live Stats
  useEffect(() => {
    const fetchLiveUsers = async () => {
      let targetCount: number | null = null;

      for (const url of API_ENDPOINTS) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json();
            if (data.onlineUsers !== undefined) {
              targetCount = data.onlineUsers;
              break;
            } else if (data.activeUsers !== undefined) {
              targetCount = data.activeUsers;
              break;
            }
          }
        } catch {
          // try next
        }
      }

      const finalCount = targetCount !== null ? targetCount : 1;
      setLiveUsers(finalCount);
      setHasFetchedStats(true);
    };

    fetchLiveUsers();
    const interval = setInterval(fetchLiveUsers, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch GitHub Releases
  useEffect(() => {
    const fetchRelease = async () => {
      try {
        const response = await fetch(REPO_RELEASE_API, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store"
        });

        if (!response.ok) throw new Error("GitHub error");

        const release = await response.json();
        const assets = Array.isArray(release.assets) ? release.assets : [];
        const installer = assets.find((asset: { name: string; browser_download_url: string }) =>
          /^vexa-launcher-setup-.*\.exe$/i.test(asset.name)
        );

        if (installer?.browser_download_url) {
          setReleaseInfo({
            tagName: release.tag_name || "Son sürüm",
            publishedAt: `${formatDate(release.published_at)} tarihinde yayınlandı.`,
            downloadUrl: installer.browser_download_url,
            installerName: `${installer.name} otomatik seçildi.`,
          });
        } else {
          setReleaseInfo({
            tagName: release.tag_name || "Son sürüm",
            publishedAt: `${formatDate(release.published_at)} tarihinde yayınlandı.`,
            downloadUrl: release.html_url || LATEST_RELEASE_PAGE,
            installerName: "Setup dosyası bulunamadı, release sayfasına yönlendirilecek.",
          });
        }
      } catch {
        setReleaseInfo({
          tagName: "Son release",
          publishedAt: "GitHub bilgisi şu an alınamadı.",
          downloadUrl: LATEST_RELEASE_PAGE,
          installerName: "Bağlantı sorunu olursa GitHub release sayfasından indirebilirsin.",
        });
      } finally {
        setIsReleaseLoading(false);
      }
    };

    fetchRelease();
  }, []);

  // FAQ Content Array
  const faqItems = [
    {
      q: "Launcher açılıyor ama Oyna butonu client'ı başlatmıyorsa ne kontrol edilmeli?",
      a: "Launcher'ın yanında kurulu `game/vexa-client.exe` dosyası olmalı. Dosya eksikse launcher yeniden `app.zip` indirip kurmalı; release içinde güncel `app.zip` bulunduğundan emin olun."
    },
    {
      q: "Discord RPC neden görünmeyebilir?",
      a: "Discord masaüstü uygulaması açık olmalı, Vexa ayarlarında RPC kapalı olmamalı ve release build'i `DISCORD_CLIENT_ID` secret'ı ile alınmış olmalı. Secret eksikse client çalışır ama RPC aktifleşmez."
    },
    {
      q: "Yeni sürüm yayınlandığında kullanıcılar ne indirir?",
      a: "Kullanıcı normalde sadece launcher installer'ı indirir. Launcher, yayınlanan `versions.json` ve GitHub Release asset'lerini kontrol ederek client paketini otomatik günceller."
    },
    {
      q: "FPS unlocker her bilgisayarda aynı sonucu verir mi?",
      a: "Hayır. Sonuç monitör Hz değeri, ekran kartı, Chromium ayarları ve oyun içi yük durumuna göre değişir. Vexa hedef FPS'i yükseltir ama donanım sınırını aşamaz."
    },
    {
      q: "Ayarlar ve profiller silinir mi?",
      a: "Normal güncellemede kullanıcı ayarları korunur. FPS, RPC, profil, avatar ve arka plan tercihleri Electron userData klasöründeki yerel config dosyasında tutulur."
    },
    {
      q: "Windows bilinmeyen yayıncı uyarısı neden çıkar?",
      a: "Installer resmi kod imzalama sertifikasıyla imzalanmadığında Windows bu uyarıyı gösterebilir. Güvenli indirme için yalnızca bu siteyi veya GitHub Releases sayfasını kullanın."
    }
  ];

  // Screenshots Array
  const screenshots = [
    {
      src: "/assets/screenshots/launcher-home.png",
      title: "Launcher",
      desc: "Güncelleme durumu, yama notları, profil ve tek tıkla başlatma akışı.",
      wide: true
    },
    {
      src: "/assets/screenshots/room-browser.png",
      title: "Room Browser",
      desc: "Filtreler, favoriler, autojoin, HaxAllTool kontrolleri ve okunabilir oda listesi.",
      wide: true
    },
    {
      src: "/assets/screenshots/settings-general.png",
      title: "Genel Ayarlar",
      desc: "FPS Unlocker, Discord RPC, ping booster ve NetGraph kontrolleri.",
      wide: false
    },
    {
      src: "/assets/screenshots/backgrounds.png",
      title: "Arka Planlar",
      desc: "Hazır arka planlar, özel görsel yükleme ve kayıtlı seçimler.",
      wide: false
    },
    {
      src: "/assets/screenshots/avatar.png",
      title: "Avatar",
      desc: "Döngü animasyonu, hazır şablonlar, özel kareler ve hız ayarı.",
      wide: false
    },
    {
      src: "/assets/screenshots/shortcuts.png",
      title: "Kısayollar",
      desc: "Sohbet mesajlarını hızlı genişleten kişisel kısa komutlar.",
      wide: false
    },
    {
      src: "/assets/screenshots/launcher-update.png",
      title: "Güncelleme",
      desc: "Launcher indirme ilerlemesi ve otomatik client paket kurulumu.",
      wide: false
    },
    {
      src: "/assets/screenshots/client-header.png",
      title: "Üst Bar",
      desc: "Oda linki, giriş, profil seçimi ve ayarlar kısayolu.",
      wide: false
    }
  ];

  return (
    <>
      {/* HEADER */}
      <header className={`site-header ${isNavOpen ? "is-open" : ""}`}>
        <a className="brand" href="/" aria-label="Vexa Client ana sayfa">
          <img src="/assets/logo.png" alt="Vexa Client logosu" className="brand-mark" />
          <span className="brand-copy">
            <strong>Vexa</strong>
            <small>Client</small>
          </span>
        </a>

        <button
          className="nav-toggle"
          type="button"
          aria-label="Menüyü aç"
          aria-expanded={isNavOpen}
          onClick={() => setIsNavOpen(!isNavOpen)}
        >
          <span></span>
          <span></span>
        </button>

        <nav className="header-links" aria-label="Ana bağlantılar">
          {hasFetchedStats && (
            <div className="live-users-badge" id="liveUsersBadge">
              <span className="pulsing-dot"></span>
              <strong id="liveUsersCount">{liveUsers}</strong>
              <span>aktif</span>
            </div>
          )}
          <a href="#screenshots" onClick={() => setIsNavOpen(false)}>Görüntüler</a>
          <a href="#features" onClick={() => setIsNavOpen(false)}>Özellikler</a>
          <a href="#download" onClick={() => setIsNavOpen(false)}>İndir</a>
          <a href="#faq" onClick={() => setIsNavOpen(false)}>SSS</a>
          <a href="/discord">Discord</a>
          <a href="https://github.com/vexa-client/vexa" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">HaxBall için modern Windows client</p>
            <h1>Daha akıcı, daha düzenli, daha hızlı bir HaxBall deneyimi.</h1>
            <p className="hero-text">
              Vexa Client; launcher, otomatik güncelleme, FPS araçları, Discord Rich Presence,
              profil sistemi, özel arka planlar ve geliştirilmiş oda tarayıcısını tek masaüstü uygulamasında toplar.
            </p>

            <div className="hero-actions" id="download">
              <a
                id="downloadButton"
                className={`btn-primary ${isReleaseLoading ? "is-loading" : ""}`}
                href={releaseInfo.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                Son sürümü indir
              </a>
              <a className="btn-secondary" href={LATEST_RELEASE_PAGE} target="_blank" rel="noreferrer">
                Release notları
              </a>
            </div>

            <div className="release-card">
              <span>Son release</span>
              <strong id="releaseVersion">{releaseInfo.tagName}</strong>
              <p id="releaseDate">{releaseInfo.publishedAt}</p>
              <small id="downloadStatus">{releaseInfo.installerName}</small>
            </div>
          </div>

          <div className="hero-visual" aria-label="Vexa Client arayüz önizlemesi">
            <div className="desktop-window launcher-window">
              <div className="window-top">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="launcher-body">
                <div className="launcher-status">
                  <img src="/assets/logo.png" alt="" aria-hidden="true" />
                  <div>
                    <strong>Vexa Launcher</strong>
                    <small id="launcherReleaseStatus">
                      {isReleaseLoading ? "Sürüm bilgisi alınıyor..." : `${releaseInfo.tagName} hazır`}
                    </small>
                  </div>
                </div>
                <div className="progress-shell">
                  <span style={{ width: "86%" }}></span>
                </div>
                <div className="launcher-grid">
                  <span>FPS Unlocker</span>
                  <span>Discord RPC</span>
                  <span>Auto Update</span>
                </div>
              </div>
            </div>

            <div className="desktop-window room-window">
              <div className="client-bar">
                <strong>Room Browser</strong>
                <span>461 players</span>
              </div>
              <div className="room-search"></div>
              <div className="room-list">
                <span className="active"></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <aside>
                <button>Join Room</button>
                <button>Favorite</button>
                <button>Settings</button>
              </aside>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="metrics" aria-label="Vexa öne çıkanlar">
          <article>
            <strong>240+</strong>
            <span>FPS hedefi</span>
          </article>
          <article>
            <strong>1 tık</strong>
            <span>kurulum ve güncelleme</span>
          </article>
          <article>
            <strong>RPC</strong>
            <span>Discord durum entegrasyonu</span>
          </article>
          <article>
            <strong>Profil</strong>
            <span>kişisel ayar yönetimi</span>
          </article>
        </section>

        {/* SCREENSHOTS */}
        <section className="section screenshots" id="screenshots">
          <div className="section-heading">
            <p className="eyebrow">Ekran görüntüleri</p>
            <h2>Client’ın en önemli bölümleri tek bakışta.</h2>
            <p>Gerçek uygulama akışını temsil eden temiz önizlemeler: launcher, oda tarayıcı ve ayarlar paneli.</p>
          </div>

          <div className="screenshot-grid real-shots">
            {screenshots.map((shot, idx) => (
              <figure
                key={idx}
                className={`shot-card ${shot.wide ? "shot-wide" : ""} is-visible`}
              >
                <a
                  className="shot-frame"
                  href={shot.src}
                  onClick={(e) => {
                    e.preventDefault();
                    setLightboxImage({ src: shot.src, title: shot.title, desc: shot.desc });
                  }}
                >
                  <img src={shot.src} alt={shot.title} loading="lazy" />
                </a>
                <figcaption>
                  <strong>{shot.title}</strong>
                  <span>{shot.desc}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="section feature-section" id="features">
          <div className="section-heading">
            <p className="eyebrow">Özellikler</p>
            <h2>Oyuna girerken değil, oynarken fark ettiren detaylar.</h2>
          </div>

          <div className="feature-grid">
            <article className="is-visible">
              <span>01</span>
              <h3>FPS ve performans</h3>
              <p>FPS unlocker, sayaç, NetGraph ve düşük gecikme odaklı Chromium ayarları.</p>
            </article>
            <article className="is-visible">
              <span>02</span>
              <h3>Otomatik güncelleme</h3>
              <p>Launcher GitHub Releases üzerinden client paketini indirir, kurar ve güncel tutar.</p>
            </article>
            <article className="is-visible">
              <span>03</span>
              <h3>Discord RPC</h3>
              <p>Launcher ve oyun içi durum bilgisini Discord üzerinde göstermek için Rich Presence desteği.</p>
            </article>
            <article className="is-visible">
              <span>04</span>
              <h3>Profil sistemi</h3>
              <p>Nick, avatar, auth key, ülke ve kişisel oyun ayarlarını profillerde sakla.</p>
            </article>
            <article className="is-visible">
              <span>05</span>
              <h3>Özel arka planlar</h3>
              <p>Görsel veya video arka planlar, geçmiş listesi ve maç sırasında performans koruması.</p>
            </article>
            <article className="is-visible">
              <span>06</span>
              <h3>HaxAllTool entegrasyonu</h3>
              <p>Oda arama, favoriler, autojoin ve ek araçlarla daha pratik lobby kullanımı.</p>
            </article>
          </div>
        </section>

        {/* DOWNLOAD PANEL */}
        <section className="section download-panel">
          <div>
            <p className="eyebrow">Kurulum</p>
            <h2>Windows için indir, launcher gerisini halletsin.</h2>
            <p>
              En güncel installer GitHub Releases üzerinden gelir. İlk açılışta client paketini indirmemişse launcher otomatik olarak `app.zip` indirip hazırlar.
            </p>
          </div>
          <div className="install-steps">
            <article>
              <strong>1</strong>
              <span>Setup dosyasını indir</span>
            </article>
            <article>
              <strong>2</strong>
              <span>Launcher’ı kur ve aç</span>
            </article>
            <article>
              <strong>3</strong>
              <span>Oyna butonuyla client’ı başlat</span>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section className="section faq" id="faq">
          <div className="section-heading">
            <p className="eyebrow">SSS</p>
            <h2>Kısa cevaplar.</h2>
          </div>
          <div className="faq-list">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <details
                  key={idx}
                  open={isOpen}
                  className={isOpen ? "is-open" : ""}
                >
                  <summary
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenFaqIndex(isOpen ? null : idx);
                    }}
                  >
                    {item.q}
                  </summary>
                  <div className="faq-panel">
                    <p>{item.a}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div>
          <strong>Vexa Client</strong>
          <span>HaxBall için modern masaüstü deneyimi.</span>
        </div>
        <nav aria-label="Alt bağlantılar">
          <a href="/">Website</a>
          <a href={LATEST_RELEASE_PAGE} target="_blank" rel="noreferrer">
            Download
          </a>
          <a href="https://github.com/vexa-client/vexa" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="/discord">Discord</a>
        </nav>
      </footer>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <div
          className="image-lightbox is-open"
          aria-hidden="false"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="lightbox-close"
            type="button"
            aria-label="Görseli kapat"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>
          <figure
            className="lightbox-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <img className="lightbox-image" src={lightboxImage.src} alt={lightboxImage.title} />
            <figcaption className="lightbox-caption">
              <strong>{lightboxImage.title}</strong>
              {lightboxImage.desc && <span>{lightboxImage.desc}</span>}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
