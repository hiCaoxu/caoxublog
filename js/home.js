/* ============================================
   CaoxuBlog - 首页逻辑
   ============================================ */

(async function () {
    try {
        const blogs = await loadBlogs();
        const pinnedBlogs = getPinnedBlogs(blogs);
        const latestBlogs = getLatestBlogs(blogs);

        // 渲染置顶博客
        const pinnedContainer = document.getElementById('pinnedBlogs');
        const pinnedEmpty = document.getElementById('pinnedEmpty');
        if (pinnedBlogs.length === 0) {
            pinnedContainer.innerHTML = '';
            pinnedEmpty.style.display = 'block';
        } else {
            pinnedEmpty.style.display = 'none';
            pinnedContainer.innerHTML = pinnedBlogs.map(blog => createBlogCard(blog, true)).join('');
        }

        // 渲染最新博客
        const latestContainer = document.getElementById('latestBlogs');
        const latestEmpty = document.getElementById('latestEmpty');
        if (latestBlogs.length === 0) {
            latestContainer.innerHTML = '';
            latestEmpty.style.display = 'block';
        } else {
            latestEmpty.style.display = 'none';
            latestContainer.innerHTML = latestBlogs.map(blog => createBlogCard(blog, false)).join('');
        }
    } catch (e) {
        console.error('博客加载失败:', e);
        showLoadError('pinnedBlogs');
    }
})();

function createBlogCard(blog, showPin) {
    const excerpt = blog.excerpt || '';
    const timeStr = formatTime(blog.createdAt);

    return `
        <a href="blog.html?id=${encodeURIComponent(blog.id)}" class="blog-card${showPin && blog.pinned ? ' pinned' : ''}">
            ${showPin && blog.pinned ? `
            <div class="pin-badge">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                置顶
            </div>
            ` : ''}
            <h3 class="card-title">${escapeHtml(blog.title)}</h3>
            <p class="card-excerpt">${escapeHtml(excerpt)}</p>
            <div class="card-meta">
                <span>
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    ${timeStr}
                </span>
            </div>
        </a>
    `;
}
