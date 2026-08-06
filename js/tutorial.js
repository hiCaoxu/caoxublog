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

    // 显示评论区
    document.getElementById('tutorialCommentSidebar').style.display = 'block';
    renderTutorialComments(articleId);

    // 异步加载正文
    try {
        await loadTutorialContent(article);
        const contentHtml = renderMarkdown(article.content);
        document.getElementById('tutorialContent').innerHTML = `
            <div class="tutorial-article">
                <h1 class="article-title">${escapeHtml(article.name)}</h1>
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

function submitTutorialComment() {
    const nickname = document.getElementById('tutorialCommentNickname').value.trim();
    const content = document.getElementById('tutorialCommentContent').value.trim();

    if (!content) {
        alert('请输入评论内容');
        return;
    }

    if (!currentTutorialId) return;

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
