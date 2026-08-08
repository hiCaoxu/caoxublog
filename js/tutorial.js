/* ============================================
   CaoxuBlog - 教程页面逻辑
   ============================================ */

let currentTutorialId = null;
let tutorials = [];

(async function () {
    try {
        tutorials = await loadTutorials();
        sortTutorialTree(tutorials);
        renderFolderTree(tutorials);

        // 默认显示第一篇文章
        const firstArticle = findFirstArticle(tutorials);
        if (firstArticle) {
            openTutorialArticle(firstArticle.id);
            highlightTreeArticle(firstArticle.id);
        }
    } catch (e) {
        console.error('教程加载失败:', e);
        showLoadError('folderTree');
        showLoadError('tutorialContent');
    }
})();

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

async function openTutorialArticle(articleId) {
    const article = findArticleById(tutorials, articleId);
    if (!article) {
        alert('文章不存在');
        return;
    }

    currentTutorialId = articleId;

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
        document.getElementById('tutorialContent').innerHTML = `
            <div class="tutorial-article">
                <h1 class="article-title">${escapeHtml(article.name)}</h1>
                <div class="article-like-bar">
                    <button class="like-btn${likeState.liked ? ' liked' : ''}" id="tutorialLikeBtn" onclick="onTutorialLike('${article.id}')" aria-pressed="${likeState.liked}" title="${likeState.liked ? '已点赞' : '点赞'}">
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
                <div class="markdown-body">${contentHtml}</div>
            </div>
        `;
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
