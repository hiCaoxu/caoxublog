/* ============================================
   点工Caoxu - 鼠标移动特效
   淡绿色半透明小光点，渐变消散效果
   ============================================ */

(function () {
    const container = document.getElementById('mouseTrail');
    if (!container) return;

    let lastTime = 0;
    const throttleMs = 30;
    const dotSize = 18;
    const maxDots = 100;

    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastTime < throttleMs) return;
        lastTime = now;
        createDot(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        const now = Date.now();
        if (now - lastTime < throttleMs) return;
        lastTime = now;
        createDot(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    function createDot(x, y) {
        const dot = document.createElement('div');
        dot.className = 'trail-dot';
        const size = dotSize * (0.6 + Math.random() * 0.4);
        dot.style.width = size + 'px';
        dot.style.height = size + 'px';
        dot.style.left = (x - size / 2) + 'px';
        dot.style.top = (y - size / 2) + 'px';
        dot.setAttribute('aria-hidden', 'true');

        container.appendChild(dot);

        dot.addEventListener('animationend', () => {
            dot.remove();
        });

        const dots = container.querySelectorAll('.trail-dot');
        if (dots.length > maxDots) {
            dots[0].remove();
        }
    }
})();
