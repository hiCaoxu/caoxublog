/* ============================================
   点工Caoxu - 主题（暗色模式）切换
   ============================================ */

const THEME_KEY = 'caoxublog_theme';

// 应用主题到 <html data-theme>
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

// 获取当前主题：localStorage > 系统偏好 > light
function getInitialTheme() {
    const saved = safeStorageGet(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

// 绑定所有主题切换按钮
function initThemeToggle() {
    const theme = getInitialTheme();
    applyTheme(theme);

    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            swapHighlightTheme(next);
            safeStorageSet(THEME_KEY, next);
            document.querySelectorAll('.theme-toggle').forEach(b => {
                b.setAttribute('aria-label', next === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
            });
        });
    });
}

// 监听系统主题变化（未手动设置过时）
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const saved = safeStorageGet(THEME_KEY);
        if (saved !== 'dark' && saved !== 'light') {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// 根据主题切换 highlight.js 样式表
function swapHighlightTheme(theme) {
    const light = document.getElementById('hljs-light');
    const dark = document.getElementById('hljs-dark');
    if (!light || !dark) return;
    if (theme === 'dark') {
        light.disabled = true;
        dark.disabled = false;
    } else {
        light.disabled = false;
        dark.disabled = true;
    }
}

// 页面加载即应用，避免闪烁
(function () {
    const saved = (function () {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    })();
    let theme = saved;
    if (theme !== 'dark' && theme !== 'light') {
        theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(theme);
    swapHighlightTheme(theme);
})();

// DOM 就绪后绑定所有主题切换按钮
function bindThemeToggleOnReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
}
bindThemeToggleOnReady();
