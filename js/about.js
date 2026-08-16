/* ============================================
   点工Caoxu - 关于我页面逻辑
   内容从根目录 about.md 加载（改文件即发布），
   加载失败时回退到 data.js 内置的默认内容
   ============================================ */

(async function () {
    const container = document.getElementById('aboutContent');
    if (!container) return;

    try {
        const resp = await fetch('about.md', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('about.md 加载失败: HTTP ' + resp.status);
        const text = await resp.text();
        container.innerHTML = renderMarkdown(text);
    } catch (e) {
        console.warn('about.md 加载失败，使用内置默认内容:', e);
        container.innerHTML = renderMarkdown(getDefaultAbout());
    }
})();
