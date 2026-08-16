/* ============================================
   CaoxuBlog - 教程页面逻辑
   ============================================ */

let currentTutorialId = null;
let tutorials = [];              // 未归档教程（目录树/导航使用）
let allTutorials = [];           // 全部教程（含已归档，用于归档页深链打开）

(async function () {
    try {
        allTutorials = await loadTutorials();
        sortTutorialTree(allTutorials);
        // 目录树只展示未归档教程；已归档内容仅在归档页（archive.html）展示
        tutorials = filterArchivedFromTree(allTutorials);
        renderFolderTree(tutorials);

        // 优先打开 URL 指定的文章（可能已归档，从全量数据查找）
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('id');
        const target = targetId ? findArticleById(allTutorials, targetId) : null;

        if (target) {
            openTutorialArticle(target.id);
        } else {
            // 默认显示第一篇未归档文章
            const firstArticle = findFirstArticle(tutorials);
            if (firstArticle) {
                openTutorialArticle(firstArticle.id);
                highlightTreeArticle(firstArticle.id);
            }
        }
    } catch (e) {
        console.error('教程加载失败:', e);
        showLoadError('folderTree');
        showLoadError('tutorialContent');
    }
})();

// 事件委托：处理点赞 / 上一篇下一篇（去除内联 onclick）
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action;
    if (act === 'like') {
        onTutorialLike(el.dataset.articleId);
    } else if (act === 'open-article') {
        e.preventDefault();
        openTutorialArticle(el.dataset.articleId);
        highlightTreeArticle(el.dataset.articleId);
    }
});

// 评论提交按钮监听（静态 HTML，去掉内联 onclick）
(function bindTutorialCommentSubmit() {
    const btn = document.getElementById('tutorialCommentSubmit');
    if (btn) btn.addEventListener('click', submitTutorialComment);
})();

// 过滤掉已归档文章（递归）；文件夹下无可见文章则整体隐藏
function filterArchivedFromTree(items) {
    const result = [];
    (items || []).forEach(item => {
        if (item.type === 'article') {
            if (!item.archived) result.push(item);
        } else if (item.type === 'folder') {
            const children = filterArchivedFromTree(item.children || []);
            if (children.length > 0) {
                result.push({ ...item, children });
            }
        }
    });
    return result;
}

// 按文件名正序排列文章（文件夹保持声明顺序在前）
function sortTutorialTree(items) {
    items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        const nameA = a.file || a.name;
        const nameB = b.file || b.name;
        return nameA.localeCompare(nameB, 'zh-CN');
    });
    items.forEach(item => {
        if (item.type === 'folder' && item.children) {
            sortTutorialTree(item.children);
        }
    });
}

// 深度优先找第一篇文章
function findFirstArticle(items) {
    for (const item of items) {
        if (item.type === 'article') return item;
        if (item.type === 'folder' && item.children) {
            const found = findFirstArticle(item.children);
            if (found) return found;
        }
    }
    return null;
}

function highlightTreeArticle(articleId) {
    const treeContainer = document.getElementById('folderTree');
    treeContainer.querySelectorAll('.tree-article').forEach(l => {
        l.classList.toggle('active', l.dataset.articleId === articleId);
    });
}

function renderFolderTree(tutorials) {
    const treeContainer = document.getElementById('folderTree');
    treeContainer.innerHTML = buildTreeHtml(tutorials, 0);

    // 绑定文件夹折叠事件
    treeContainer.querySelectorAll('.folder-header').forEach(header => {
        header.addEventListener('click', function () {
            const folderId = this.dataset.folderId;
            const children = document.getElementById('children-' + folderId);
            if (children) {
                toggleFolder(this, children);
            }
        });
    });

    // 绑定文章点击事件
    treeContainer.querySelectorAll('.tree-article').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const articleId = this.dataset.articleId;
            openTutorialArticle(articleId);
            highlightTreeArticle(articleId);
        });
    });

    // 初始化所有子文件夹的 maxHeight
    treeContainer.querySelectorAll('.folder-children').forEach(children => {
        if (!children.classList.contains('collapsed')) {
            children.style.maxHeight = children.scrollHeight + 'px';
        }
    });
}

function toggleFolder(header, children) {
    const isCollapsed = children.classList.contains('collapsed');
    // 同步 aria-expanded：当前折叠则即将展开（true），反之即将折叠（false）
    header.setAttribute('aria-expanded', String(isCollapsed));

    if (isCollapsed) {
        // 展开：先设高度为 scrollHeight，动画结束后设为 none
        children.classList.remove('collapsed');
        header.classList.remove('collapsed');
        children.style.maxHeight = children.scrollHeight + 'px';
        children.addEventListener('transitionend', function onExpand() {
            children.removeEventListener('transitionend', onExpand);
            children.style.maxHeight = 'none';
        });
    } else {
        // 折叠：先恢复具体高度（如果当前是 none），再过渡到 0
        if (children.style.maxHeight === 'none' || children.style.maxHeight === '') {
            children.style.maxHeight = children.scrollHeight + 'px';
            // 强制 reflow
            void children.offsetHeight;
        }
        children.classList.add('collapsed');
        header.classList.add('collapsed');
        children.style.maxHeight = '0px';
    }
}

function buildTreeHtml(items, depth) {
    if (depth > 2) return ''; // 最多三级

    return items.map(item => {
        if (item.type === 'folder') {
            const childHtml = item.children ? buildTreeHtml(item.children, depth + 1) : '';
            return `
                <div class="tree-folder">
                    <div class="folder-header" data-folder-id="${item.id}" role="button" tabindex="0" aria-expanded="true">
                        <svg class="icon icon-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        <span>${escapeHtml(item.name)}</span>
                    </div>
                    <div class="folder-children" id="children-${item.id}">
                        ${childHtml}
                    </div>
                </div>
            `;
        } else {
            return `
                <a class="tree-article" href="#" data-article-id="${item.id}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    ${escapeHtml(item.name)}
                </a>
            `;
        }
    }).join('');
}

function findArticleById(items, id) {
    for (const item of items) {
        if (item.type === 'article' && item.id === id) {
            return item;
        }
        if (item.type === 'folder' && item.children) {
            const found = findArticleById(item.children, id);
            if (found) return found;
        }
    }
    return null;
}

// 扁平化所有文章（按目录树展示顺序），用于上一篇/下一篇
function flattenArticles(items) {
    const result = [];
    items.forEach(item => {
        if (item.type === 'article') {
            result.push(item);
        } else if (item.type === 'folder' && item.children) {
            result.push(...flattenArticles(item.children));
        }
    });
    return result;
}

async function openTutorialArticle(articleId) {
    // 归档文章不在目录树中，需从全量数据中查找（支持归档页深链打开）
    const article = findArticleById(allTutorials, articleId) || findArticleById(tutorials, articleId);
    if (!article) {
        alert('文章不存在');
        return;
    }

    currentTutorialId = articleId;

    // 动态更新页面标题与描述（SEO / 分享预览）
    document.title = article.name + ' - CaoxuBlog';
    setMetaDescription('教程：' + article.name);

    // 先显示标题和加载提示
    document.getElementById('tutorialContent').innerHTML = `
        <div class="tutorial-article">
            <h1 class="article-title">${escapeHtml(article.name)}</h1>
            <p class="comment-empty">加载中...</p>
        </div>
    `;

    // 显示评论区：启用 Waline 则挂载 Waline，否则使用本地评论
    const commentSidebar = document.getElementById('tutorialCommentSidebar');
    commentSidebar.style.display = 'block';
    if (isWalineEnabled()) {
        commentSidebar.innerHTML = renderWalineComments(articleId);
        initWaline(articleId);
    } else {
        renderTutorialComments(articleId);
    }

    // 异步加载正文
    try {
        await loadTutorialContent(article);
        const contentHtml = renderMarkdown(article.content);
        const likeState = getLikeState(article.id);
        const viewCount = incrementViewCount(article.id);

        // 上一篇 / 下一篇（基于扁平化顺序）
        const flat = flattenArticles(tutorials);
        const idx = flat.findIndex(a => a.id === article.id);
        let prevHtml = '<span class="nav-placeholder"></span>';
        let nextHtml = '<span class="nav-placeholder"></span>';
        if (idx > 0) {
            const prev = flat[idx - 1];
            prevHtml = `<a class="post-nav-link prev" href="tutorial.html" data-action="open-article" data-article-id="${prev.id}">
                <span class="nav-dir">上一篇</span>
                <span class="nav-title">${escapeHtml(prev.name)}</span>
            </a>`;
        }
        if (idx >= 0 && idx < flat.length - 1) {
            const next = flat[idx + 1];
            nextHtml = `<a class="post-nav-link next" href="tutorial.html" data-action="open-article" data-article-id="${next.id}">
                <span class="nav-dir">下一篇</span>
                <span class="nav-title">${escapeHtml(next.name)}</span>
            </a>`;
        }

        document.getElementById('tutorialContent').innerHTML = `
            <div class="tutorial-article">
                <h1 class="article-title">${escapeHtml(article.name)}</h1>
                <div class="article-like-bar">
                    <button class="like-btn${likeState.liked ? ' liked' : ''}" id="tutorialLikeBtn" data-action="like" data-article-id="${article.id}" aria-pressed="${likeState.liked}" title="${likeState.liked ? '已点赞' : '点赞'}">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span class="like-count">${likeState.count}</span>
                    </button>
                    <span class="view-count" title="阅读量">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        阅读 ${viewCount}
                    </span>
                </div>
                <nav class="toc" id="tutorialToc" style="display:none;"></nav>
                <div class="markdown-body">${contentHtml}</div>
                <div class="post-nav tutorial-post-nav">${prevHtml}${nextHtml}</div>
            </div>
        `;

        // 代码高亮 + 复制按钮 + 文章目录
        const tutorialRoot = document.getElementById('tutorialContent');
        enhanceCodeBlocks(tutorialRoot);
        buildToc(tutorialRoot, document.getElementById('tutorialToc'));
    } catch (e) {
        console.error('正文加载失败:', e);
        document.getElementById('tutorialContent').innerHTML = `
            <div class="tutorial-article">
                <h1 class="article-title">${escapeHtml(article.name)}</h1>
                <p class="comment-empty">正文加载失败，请刷新重试</p>
            </div>
        `;
    }
}

function renderTutorialComments(articleId) {
    const allComments = loadTutorialComments();
    const comments = allComments[articleId] || [];
    const listContainer = document.getElementById('tutorialCommentList');

    if (comments.length === 0) {
        listContainer.innerHTML = '<p class="comment-empty">暂无评论，来说点什么吧</p>';
        return;
    }

    comments.sort((a, b) => a.createdAt - b.createdAt);

    listContainer.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(c.nickname || '匿名访客')}</div>
            <div class="comment-time">${formatTime(c.createdAt)}</div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
    `).join('');
}

// 点赞：每设备每篇仅 1 次，不可取消
function onTutorialLike(articleId) {
    const state = likeArticle(articleId);
    const btn = document.getElementById('tutorialLikeBtn');
    if (!btn) return;

    if (!state.changed) {
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

function submitTutorialComment() {
    const nickname = document.getElementById('tutorialCommentNickname').value.trim();
    const contentRaw = document.getElementById('tutorialCommentContent').value.trim();

    if (!contentRaw) {
        alert('请输入评论内容');
        return;
    }

    if (!currentTutorialId) return;

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

    const allComments = loadTutorialComments();
    if (!allComments[currentTutorialId]) {
        allComments[currentTutorialId] = [];
    }

    allComments[currentTutorialId].push({
        id: generateId(),
        nickname: nickname || '匿名访客',
        content: content,
        createdAt: Date.now()
    });

    saveTutorialComments(allComments);
    document.getElementById('tutorialCommentContent').value = '';
    renderTutorialComments(currentTutorialId);
}
