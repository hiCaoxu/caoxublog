/* ============================================
   CaoxuBlog - 博客页面逻辑
   ============================================ */

let currentBlogId = null;
let blogs = [];

(async function () {
    try {
        blogs = await loadBlogs();

        // 按创建时间倒序排列
        blogs.sort((a, b) => b.createdAt - a.createdAt);

        renderBlogList();

        // 检查 URL 参数，如果有 id 则打开对应博客
        const params = new URLSearchParams(window.location.search);
        const blogId = params.get('id');
        if (blogId) {
            openBlogDetail(blogId);
        }
    } catch (e) {
        console.error('博客加载失败:', e);
        showLoadError('blogList');
    }
})();

function renderBlogList() {
    const listContainer = document.getElementById('blogList');
    const emptyHint = document.getElementById('blogEmpty');

    if (blogs.length === 0) {
        listContainer.innerHTML = '';
        emptyHint.style.display = 'block';
        return;
    }

    emptyHint.style.display = 'none';
    listContainer.innerHTML = blogs.map(blog => {
        const excerpt = blog.excerpt || '';
        return `
            <div class="blog-card${blog.pinned ? ' pinned' : ''}">
                <a class="card-info" href="blog.html?id=${encodeURIComponent(blog.id)}" onclick="event.preventDefault(); openBlogDetail('${blog.id}')">
                    ${blog.pinned ? `
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
                            创建：${formatTime(blog.createdAt)}
                        </span>
                        <span>
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            修改：${formatTime(blog.updatedAt)}
                        </span>
                    </div>
                </a>
            </div>
        `;
    }).join('');
}

async function openBlogDetail(blogId) {
    const blog = blogs.find(b => b.id === blogId);
    if (!blog) {
        alert('文章不存在');
        return;
    }

    currentBlogId = blogId;

    document.getElementById('blogDetail').style.display = 'block';
    document.getElementById('commentSidebar').style.display = 'block';

    // 更新 URL 参数
    history.replaceState({}, '', 'blog.html?id=' + blogId);

    // 移动端滚动到详情区域
    if (window.innerWidth <= 1024) {
        document.getElementById('blogDetail').scrollIntoView({ behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 先显示标题和骨架，再异步加载正文
    renderBlogDetail(blog, true);
    try {
        await loadBlogContent(blog);
        renderBlogDetail(blog, false);
    } catch (e) {
        console.error('正文加载失败:', e);
        document.getElementById('blogArticleContent').innerHTML =
            '<p class="comment-empty">正文加载失败，请刷新重试</p>';
    }

    renderComments(blogId);
}

function closeBlogDetail() {
    currentBlogId = null;
    document.getElementById('blogDetail').style.display = 'none';
    document.getElementById('commentSidebar').style.display = 'none';
    // 清除 URL 参数
    history.replaceState({}, '', 'blog.html');
}

function renderBlogDetail(blog, loading) {
    const contentHtml = loading
        ? '<p class="comment-empty">加载中...</p>'
        : renderMarkdown(blog.content);

    const likeState = getLikeState(blog.id);

    document.getElementById('blogArticleContent').innerHTML = `
        <div class="article-header">
            <h1 class="article-title">${escapeHtml(blog.title)}</h1>
            <div class="article-meta">
                <span>
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    创建时间：${formatTime(blog.createdAt)}
                </span>
                <span>
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    修改时间：${formatTime(blog.updatedAt)}
                </span>
                ${blog.pinned ? `
                <span style="color: var(--pin-color);">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                    已置顶
                </span>
                ` : ''}
                <button class="like-btn${likeState.liked ? ' liked' : ''}" id="blogLikeBtn" onclick="onBlogLike('${blog.id}')" aria-pressed="${likeState.liked}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span class="like-count">${likeState.count}</span>
                </button>
            </div>
        </div>
        <div class="markdown-body">${contentHtml}</div>
    `;
}

// 点赞切换
function onBlogLike(blogId) {
    const state = toggleLike(blogId);
    const btn = document.getElementById('blogLikeBtn');
    if (btn) {
        btn.classList.toggle('liked', state.liked);
        btn.setAttribute('aria-pressed', state.liked);
        btn.querySelector('.like-count').textContent = state.count;
    }
}

// ============================================
// 评论功能
// ============================================

function renderComments(blogId) {
    const allComments = loadComments();
    const comments = allComments[blogId] || [];
    const listContainer = document.getElementById('commentList');

    if (comments.length === 0) {
        listContainer.innerHTML = '<p class="comment-empty">暂无评论，来说点什么吧</p>';
        return;
    }

    // 按时间正序显示
    comments.sort((a, b) => a.createdAt - b.createdAt);

    listContainer.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(c.nickname || '匿名访客')}</div>
            <div class="comment-time">${formatTime(c.createdAt)}</div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
    `).join('');
}

function submitComment() {
    const nickname = document.getElementById('commentNickname').value.trim();
    const content = document.getElementById('commentContent').value.trim();

    if (!content) {
        alert('请输入评论内容');
        return;
    }

    if (!currentBlogId) return;

    const allComments = loadComments();
    if (!allComments[currentBlogId]) {
        allComments[currentBlogId] = [];
    }

    allComments[currentBlogId].push({
        id: generateId(),
        nickname: nickname || '匿名访客',
        content: content,
        createdAt: Date.now()
    });

    saveComments(allComments);
    document.getElementById('commentContent').value = '';
    renderComments(currentBlogId);
}
