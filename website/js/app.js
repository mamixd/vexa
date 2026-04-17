document.addEventListener('DOMContentLoaded', () => {
    // Bento Box Mouse Glow Effect
    const cards = document.querySelectorAll('.bento-card');
    
    document.querySelector('.bento-grid').addEventListener('mousemove', (e) => {
        for(const card of cards) {
            const rect = card.getBoundingClientRect(),
                  x = e.clientX - rect.left,
                  y = e.clientY - rect.top;

            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        }
    });

    const dlBtn = document.querySelector('.cyber-btn');
    if (dlBtn) {
        dlBtn.addEventListener('click', () => {
            console.log("Downloading Vexa Client... Welcome to the Grid!");
        });
    }
});
