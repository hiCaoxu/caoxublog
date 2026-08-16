/* ============================================
   CaoxuBlog - 博客页面逻辑
   ============================================ */

let currentBlogId = null;
let blogs = [];                  // 未归档博客（列表/搜索/标签/分页使用）
let allBlogs = [];               // 全部博客（含已归档，用于详情页与深链打开）
let filteredBlogs = [];          // 经过搜索/标签筛选后的列表
let activeTag = '';              // 当前选中的标签（'' 表示全部）
let searchKeyword = '';          // 当前搜索关键词
let currentPage = 1;             // 当前分页
const PAGE_SIZE = 10;            // 每页显示数量
const sessionViewed = {};        // 本会话已计阅读量的文章（避免前进/后退重复计数）

(async function () {
    try {
        allBlogs = await loadBlogs();
        // 列表只展示未归档博客；已归档内容仅在归档页（archive.html）展示
        blogs = getActiveBlogs(allBlogs);

        // 按创建时间倒序排列
        blogs.sort((a, b) => b.createdAt - a.createdAt);

        filteredBlogs = blogs.slice();

        renderTagFilter();
        renderSearchAndList();

        // 检查 URL 参数，如果有 id 则打开对应博客
        const params = new URLSearchParams(window.location.search);
        const blogId = params.get('id');
        if (blogId) {
            openBlogDetail(blogId, false);
        }
    } catch (e) {
        console.error('博客加载失败:', e);
        showLoadError('blogList');
    }
})();

// 收集所有标签
function collectTags() {
    const tagSet = new Set();
    blogs.forEach(b => {
        (b.tags || []).forEach(t => tagSet.add(t));
    });
    return [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

// 渲染标签筛选栏
function renderTagFilter() {
    const container = document.getElementById('tagFilter');
    if (!container) return;
    const tags = collectTags();

    const tagHtml = [`<button class="tag-chip${activeTag === '' ? ' active' : ''}" data-tag="">全部</button>`]
        .concat(tags.map(t => `
            <button class="tag-chip${activeTag === t ? ' active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>
        `)).join('');

    container.innerHTML = tagHtml;
    container.querySelectorAll('.tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeTag = chip.dataset.tag;
            currentPage = 1;
            renderTagFilter();
            applyFilterAndRender();
        });
    });
}

// 应用搜索 + 标签筛选，并更新列表 + 分页
function applyFilterAndRender() {
    const kw = searchKeyword.trim().toLowerCase();
    filteredBlogs = blogs.filter(b => {
        const matchTag = activeTag === '' || (b.tags || []).includes(activeTag);
        const matchKw = kw === '' ||
            b.title.toLowerCase().includes(kw) ||
            (b.excerpt || '').toLowerCase().includes(kw) ||
            (b.tags || []).some(t => t.toLowerCase().includes(kw));
        return matchTag && matchKw;
    });
    renderBlogList();
}

// 渲染搜索框 + 列表 + 分页
function renderSearchAndList() {
    const searchInput = document.getElementById('blogSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchKeyword = e.target.value;
            currentPage = 1;
            applyFilterAndRender();
        });
    }
    renderBlogList();
}

// 渲染博客列表（含分页）
function renderBlogList() {
    const listContainer = document.getElementById('blogList');
    const emptyHint = document.getElementById('blogEmpty');
    const pagination = document.getElementById('blogPagination');

    if (!listContainer) return;

    if (filteredBlogs.length === 0) {
        listContainer.innerHTML = '';
        if (emptyHint) emptyHint.style.display = 'block';
        if (pagination) pagination.innerHTML = '';
        return;
    }

    if (emptyHint) emptyHint.style.display = 'none';

    const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredBlogs.slice(start, start + PAGE_SIZE);

    listContainer.innerHTML = pageItems.map(blog => {
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

    // 分页
    if (pagination) {
        if (totalPages <= 1) {
            pagination.innerHTML = '';
        } else {
            let pages = '';
            for (let p = 1; p <= totalPages; p++) {
                pages += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
            }
            pagination.innerHTML = pages;
            pagination.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentPage = parseInt(btn.dataset.page);
                    renderBlogList();
                    if (window.innerWidth <= 1024) {
                        document.getElementById('blogListSection').scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        }
    }
}

// 打开博客详情
// push=true：用户主动点击（列表/上一篇下一篇），压入历史栈，支持浏览器后退回到列表
// push=false：初始化深链打开或前进/后退回放，仅替换当前历史状态
async function openBlogDetail(blogId, push = true) {
    // 归档文章不在列表中，需从全量数据中查找（支持归档页深链打开）
    const blog = allBlogs.find(b => b.id === blogId) || blogs.find(b => b.id === blogId);
    if (!blog) {
        alert('文章不存在');
        return;
    }

    currentBlogId = blogId;

    document.getElementById('blogDetail').style.display = 'block';
    document.getElementById('commentSidebar').style.display = 'block';

    // 更新 URL 参数（pushState 压栈以支持后退，replaceState 仅替换）
    const url = 'blog.html?id=' + blogId;
    if (push) {
        history.pushState({ blog: blogId }, '', url);
    } else {
        history.replaceState({ blog: blogId }, '', url);
    }

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

    // 评论区：启用 Waline 则挂载 Waline，否则使用本地评论
    const sidebar = document.getElementById('commentSidebar');
    if (isWalineEnabled()) {
        sidebar.innerHTML = renderWalineComments(blogId);
        initWaline(blogId);
    } else {
        renderComments(blogId);
    }
}

// 关闭详情回到列表
// push=true：用户点击「返回列表」，压入列表历史
// push=false：前进/后退回放时仅替换状态
function closeBlogDetail(push = true) {
    currentBlogId = null;
    document.getElementById('blogDetail').style.display = 'none';
    document.getElementById('commentSidebar').style.display = 'none';
    if (push) {
        history.pushState({}, '', 'blog.html');
    } else {
        history.replaceState({}, '', 'blog.html');
    }
}

// 浏览器前进/后退时同步 UI 与 URL
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('id');
    if (blogId) {
        openBlogDetail(blogId, false);
    } else {
        closeBlogDetail(false);
    }
});

// 本会话内每篇文章只计一次阅读量（首次打开时 +1，之后返回缓存值）
function getViewCountOnce(blogId) {
    if (!sessionViewed[blogId]) {
        sessionViewed[blogId] = true;
        return incrementViewCount(blogId);
    }
    return getViewCount(blogId);
}

function renderBlogDetail(blog, loading) {
    const contentHtml = loading
        ? '<p class="comment-empty">加载中...</p>'
        : renderMarkdown(blog.content);

    // 阅读量 +1（本机累计，初始 0；本会话内每篇只计一次，避免前进/后退重复计数）
    const viewCount = loading ? 0 : getViewCountOnce(blog.id);
    const likeState = getLikeState(blog.id);

    // 上一篇 / 下一篇（基于未归档列表；归档文章不提供导航，避免跳回普通列表）
    let prevHtml = '<span class="nav-placeholder"></span>';
    let nextHtml = '<span class="nav-placeholder"></span>';
    if (!loading && !blog.archived) {
        const idx = blogs.findIndex(b => b.id === blog.id);
        if (idx > 0) {
            const prev = blogs[idx - 1];
            prevHtml = `<a class="post-nav-link prev" href="blog.html?id=${encodeURIComponent(prev.id)}" onclick="event.preventDefault(); openBlogDetail('${prev.id}')">
                <span class="nav-dir">上一篇</span>
                <span class="nav-title">${escapeHtml(prev.title)}</span>
            </a>`;
        }
        if (idx >= 0 && idx < blogs.length - 1) {
            const next = blogs[idx + 1];
            nextHtml = `<a class="post-nav-link next" href="blog.html?id=${encodeURIComponent(next.id)}" onclick="event.preventDefault(); openBlogDetail('${next.id}')">
                <span class="nav-dir">下一篇</span>
                <span class="nav-title">${escapeHtml(next.title)}</span>
            </a>`;
        }
    }

    document.getElementById('blogArticleContent').innerHTML = `
        <div class="article-header">
            <button class="back-btn" onclick="closeBlogDetail()">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                返回列表
            </button>
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
                <span>
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    阅读 ${viewCount}
                </span>
                ${blog.pinned ? `
                <span style="color: var(--pin-color);">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                    已置顶
                </span>
                ` : ''}
                <button class="like-btn${likeState.liked ? ' liked' : ''}" id="blogLikeBtn" onclick="onBlogLike('${blog.id}')" aria-pressed="${likeState.liked}" title="${likeState.liked ? '已点赞' : '点赞'}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span class="like-count">${likeState.count}</span>
                </button>
            </div>
        </div>
        <div class="markdown-body">${contentHtml}</div>
        <div class="post-nav">${prevHtml}${nextHtml}</div>
    `;

    if (!loading) {
        // 代码高亮 + 复制按钮
        const root = document.getElementById('blogArticleContent');
        enhanceCodeBlocks(root);
    }
}

// 点赞：每设备每篇仅 1 次，不可取消
function onBlogLike(blogId) {
    const state = likeArticle(blogId);
    const btn = document.getElementById('blogLikeBtn');
    if (!btn) return;

    if (!state.changed) {
        // 已点过赞，提示不可重复
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 400);
        return;
    }

    btn.classList.add('liked');
    btn.setAttribute('aria-pressed', 'true');
    btn.querySelector('.like-count').textContent = state.count;
    btn.style.transform = 'scale(1.1)';
    setTimeout(() => { btn.style.transform = ''; }, 150);
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
    const contentRaw = document.getElementById('commentContent').value.trim();

    if (!contentRaw) {
        alert('请输入评论内容');
        return;
    }

    if (!currentBlogId) return;

    // 敏感词过滤
    const filtered = filterSensitiveWords(contentRaw);
    const content = filtered.text.trim();
    if (!content) {
        alert('评论内容不合法，请修改后重试');
        return;
    }
    if (filtered.hit) {
        alert('评论中包含敏感词，已自动过滤，过滤后内容将正常发布');
    }

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
