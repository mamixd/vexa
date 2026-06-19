const REPO_RELEASE_API = "https://api.github.com/repos/vexa-client/vexa/releases/latest";
const LATEST_RELEASE_PAGE = "https://github.com/vexa-client/vexa/releases/latest";

function formatDate(value) {
    if (!value) return "Yayın tarihi bekleniyor.";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date(value));
}

function pickAsset(assets, matcher) {
    return assets.find((asset) => matcher.test(asset.name));
}

async function hydrateLatestRelease() {
    const version = document.getElementById("releaseVersion");
    const releaseDate = document.getElementById("releaseDate");
    const downloadButton = document.getElementById("downloadButton");
    const status = document.getElementById("downloadStatus");

    if (!version || !releaseDate || !downloadButton || !status) return;

    try {
        const response = await fetch(REPO_RELEASE_API, {
            headers: { Accept: "application/vnd.github+json" },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`GitHub ${response.status}`);
        }

        const release = await response.json();
        const assets = Array.isArray(release.assets) ? release.assets : [];
        const installer = pickAsset(assets, /^vexa-launcher-setup-.*\.exe$/i);

        version.textContent = release.tag_name || "Son sürüm";
        releaseDate.textContent = `${formatDate(release.published_at)} tarihinde yayınlandı.`;

        if (installer?.browser_download_url) {
            downloadButton.href = installer.browser_download_url;
            downloadButton.textContent = "HaxBall Client indir";
            downloadButton.classList.remove("is-loading");
            status.textContent = `${installer.name} otomatik seçildi.`;
        } else {
            downloadButton.href = release.html_url || LATEST_RELEASE_PAGE;
            downloadButton.textContent = "Release sayfasını aç";
            downloadButton.classList.remove("is-loading");
            status.textContent = "Setup dosyası bulunamadı, release sayfasına yönlendirilecek.";
        }
    } catch (error) {
        version.textContent = "Son release";
        releaseDate.textContent = "GitHub bilgisi şu an alınamadı.";
        downloadButton.href = LATEST_RELEASE_PAGE;
        downloadButton.textContent = "Release sayfasını aç";
        downloadButton.classList.remove("is-loading");
        status.textContent = "Bağlantı sorunu olursa GitHub release sayfasından indirebilirsin.";
        console.warn("Release bilgisi alınamadı:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px"
    });

    document.querySelectorAll("[data-anime]").forEach((element) => observer.observe(element));
    hydrateLatestRelease();
});
