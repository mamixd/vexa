// Vexa Client - Website Scripts (Human Touch Version)

document.addEventListener('DOMContentLoaded', () => {
    // Sayfa aşağı kayınca öğelerin belirmesi (Sağ panel için)
    const observers = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('[data-anime]').forEach(el => {
        observers.observe(el);
    });

    // İndirme butonu tıklandığında ufak bir log (Opsiyonel)
    const dlBtn = document.querySelector('.btn-primary');
    if (dlBtn) {
        dlBtn.addEventListener('click', () => {
            console.log("Vexa Client indiriliyor... Sahalarda görüşmek üzere!");
        });
    }

    // Mobil menü veya ek etkileşim gerekirse buraya eklenebilir.
    // Şu anki sade yapı için bu kadarı "doğal ve temiz" hissettiriyor.
});
