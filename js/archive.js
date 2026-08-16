/* ============================================
   点工Caoxu - 归档页逻辑
   展示已归档的博客与教程（archive.html?type=blog|tutorial）
   ============================================ */

(function () {
    // 当前激活的 Tab：优先读 URL 参数，默认博客
    let activeType = 'blog';
    try {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        if (type === 'tutorial' || type === 'blog') {
            activeType = type;
        }
    } catch (e) { /* 忽略 URL 解析异常 */ }

    const tabBlog = document.getElementById('tabBlog');
    const tabTutorial = document.getElementById('tabTutorial');
    const panelBlog = document.getElementById('panelBlog');
    const panelTutorial = document.getElementById('panelTutorial');
    const blogCountEl = document.getElementById('blogCount');
    const tutorialCountEl = document.getElementById('tutorialCount');

    // 切换 Tab
    function switchTab(type) {
        activeType = type;
        const isBlog = type === 'blog';
        tabBlog.classList.toggle('active', isBlog);
        tabTutorial.classList.toggle('active', !isBlog);
        tabBlog.setAttribute('aria-selected', String(isBlog));
        tabTutorial.setAttribute('aria-selected', String(!isBlog));
        panelBlog.hidden = !isBlog;
        panelTutorial.hidden = isBlog;
        document.title = '点工Caoxu - ' + (isBlog ? '博客归档' : '教程归档');
        // 更新 URL（replaceState 保持返回行为）
        try {
            history.replaceState({}, '', 'archive.html?type=' + type);
        } catch (e) { /* ignore */ }
    }

    tabBlog.addEventListener('click', () => switchTab('blog'));
    tabTutorial.addEventListener('click', () => switchTab('tutorial'));

    // 渲染博客归档卡片（样式复用首页 blog-card）
    function renderBlogArchive(blogs) {
        const list = document.getElementById('archiveBlogList');
        const empty = document.getElementById('archiveBlogEmpty');
        if (blogs.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        list.innerHTML = blogs.map(blog => `
            <a href="blog.html?id=${encodeURIComponent(blog.id)}" class="blog-card">
                <h3 class="card-title">${escapeHtml(blog.title)}</h3>
                <p class="card-excerpt">${escapeHtml(blog.excerpt || '')}</p>
                <div class="card-meta">
                    <span>
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        归档于 ${formatTime(blog.createdAt)}
                    </span>
                </div>
            </a>
        `).join('');
    }

    // 渲染教程归档列表（含所属文件夹路径）
    function renderTutorialArchive(articles) {
        const list = document.getElementById('archiveTutorialList');
        const empty = document.getElementById('archiveTutorialEmpty');
        if (articles.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        list.innerHTML = articles.map(article => `
            <a class="tutorial-archive-item" href="tutorial.html?id=${encodeURIComponent(article.id)}">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span class="tutorial-archive-name">${escapeHtml(article.name)}</span>
                ${article.folderPath
                    ? `<span class="tutorial-archive-path">${escapeHtml(article.folderPath)}</span>`
                    : ''}
            </a>
        `).join('');
    }

    // 加载数据并渲染
    (async function () {
        try {
            const [blogs, tutorials] = await Promise.all([loadBlogs(), loadTutorials()]);
            const archivedBlogs = getArchivedBlogs(blogs);
            const archivedTutorials = flattenArchivedArticles(tutorials);

            blogCountEl.textContent = archivedBlogs.length;
            tutorialCountEl.textContent = archivedTutorials.length;

            renderBlogArchive(archivedBlogs);
            renderTutorialArchive(archivedTutorials);
            switchTab(activeType);
        } catch (e) {
            console.error('归档数据加载失败:', e);
            showLoadError('archiveBlogList');
        }
    })();
})();
