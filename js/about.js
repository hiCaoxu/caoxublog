/* ============================================
   CaoxuBlog - 关于我页面逻辑
   ============================================ */

(function () {
    const aboutContent = getDefaultAbout();
    const html = renderMarkdown(aboutContent);
    document.getElementById('aboutContent').innerHTML = html;
})();
