/* ============================================
   点工Caoxu - 数据层
   博客/教程内容从 md 文件实时加载，评论存于访客本地
   ============================================ */

const COMMENTS_KEY = 'caoxublog_comments';
const TUTORIAL_COMMENTS_KEY = 'caoxublog_tutorial_comments';

// ============================================
// 博客数据（从 blogs/ 文件夹加载）
// ============================================
let blogsCache = null;

async function loadBlogs() {
    if (blogsCache) return blogsCache;

    // cache: 'no-cache' 确保发布后访客能获取到最新清单
    const resp = await fetch('blogs/index.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('博客清单加载失败');
    const list = await resp.json();

    blogsCache = list.map(item => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        file: item.file,
        createdAt: new Date(item.createdAt.replace(' ', 'T')).getTime(),
        updatedAt: new Date(item.updatedAt.replace(' ', 'T')).getTime(),
        pinned: !!item.pinned,
        archived: !!item.archived,
        tags: Array.isArray(item.tags) ? item.tags : []
    }));
    return blogsCache;
}

async function loadBlogContent(blog) {
    if (blog.content) return blog.content;
    const resp = await fetch('blogs/' + blog.file, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('博客内容加载失败');
    blog.content = await resp.text();
    return blog.content;
}

// ============================================
// 教程数据（从 tutorials/ 文件夹加载）
// ============================================
let tutorialsCache = null;

async function loadTutorials() {
    if (tutorialsCache) return tutorialsCache;

    const resp = await fetch('tutorials/index.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('教程清单加载失败');
    tutorialsCache = await resp.json();
    return tutorialsCache;
}

async function loadTutorialContent(article) {
    if (article.content) return article.content;
    const resp = await fetch('tutorials/' + article.file, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('教程内容加载失败');
    article.content = await resp.text();
    return article.content;
}

// ============================================
// 全文搜索索引（build-index.js 生成的 search-index.json）
// ============================================
let searchIndexCache = null;

async function loadSearchIndex() {
    if (searchIndexCache) return searchIndexCache;
    const resp = await fetch('search-index.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('搜索索引加载失败');
    searchIndexCache = await resp.json();
    return searchIndexCache;
}

// ============================================
// 关于我数据（about.md 加载失败时的极简回退，避免与 about.md 双写漂移）
// 正常情况由 about.js 从根目录 about.md 加载
// ============================================
function getDefaultAbout() {
    return `# 关于我

内容加载失败，请刷新页面重试。`;
}

// ============================================
// 评论数据（访客本地存储）
// ============================================

function safeStorageGet(key) {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.warn('localStorage 读取失败:', key, e);
    }
    return null;
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage 写入失败:', key, e);
    }
}

function loadComments() {
    const data = safeStorageGet(COMMENTS_KEY);
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
}

function saveComments(comments) {
    safeStorageSet(COMMENTS_KEY, comments);
}

function loadTutorialComments() {
    const data = safeStorageGet(TUTORIAL_COMMENTS_KEY);
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
}

function saveTutorialComments(comments) {
    safeStorageSet(TUTORIAL_COMMENTS_KEY, comments);
}

// ============================================
// 配置项
// ============================================

// Waline 评论系统配置
// 留空字符串 '' 表示不启用 Waline，使用本站内置的本地评论；
// 填入你的 Waline 服务端地址即可切换到 Waline（评论与点赞统计由 Waline 接管）。
// 例如：const WALINE_SERVER = 'https://waline.your-domain.com';
const WALINE_SERVER = '';

// 是否启用 Waline
function isWalineEnabled() {
    return typeof WALINE_SERVER === 'string' && WALINE_SERVER.trim() !== '';
}

// ============================================
// 点赞数据（访客本地存储）
// 纯前端无真实 IP，此处用 localStorage 记录“本设备是否已点赞”，
// 实现“每设备每篇仅可点赞 1 次且不可取消”的限制（等价于每访客 1 次）。
// 如需基于真实 IP 限制，需配合后端，可使用上方 Waline / 自建接口。
// ============================================
const LIKES_KEY = 'caoxublog_likes';

// 各文章初始点赞数（仅首次展示用）
const INITIAL_LIKE_COUNTS = {};

function loadLikes() {
    const data = safeStorageGet(LIKES_KEY);
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
}

function saveLikes(likes) {
    safeStorageSet(LIKES_KEY, likes);
}

// 获取某篇文章的点赞状态和显示计数
function getLikeState(articleId) {
    const likes = loadLikes();
    const record = likes[articleId];
    const initial = INITIAL_LIKE_COUNTS[articleId] || 0;
    if (record) {
        return { liked: !!record.liked, count: record.count };
    }
    return { liked: false, count: initial };
}

// 点赞：每设备每篇仅可点赞 1 次，且不可取消
// 返回新的状态和计数；若已点赞则返回原状态（不做任何修改）
function likeArticle(articleId) {
    const likes = loadLikes();
    const initial = INITIAL_LIKE_COUNTS[articleId] || 0;
    const record = likes[articleId] || { liked: false, count: initial };

    // 已经点过赞，直接返回，不允许重复/取消
    if (record.liked) {
        return { liked: true, count: record.count, changed: false };
    }

    record.liked = true;
    record.count = record.count + 1;

    likes[articleId] = record;
    saveLikes(likes);
    return { liked: true, count: record.count, changed: true };
}

// 兼容旧调用名
function toggleLike(articleId) {
    return likeArticle(articleId);
}

// ============================================
// 阅读量数据（访客本地存储）
// 纯前端统计：记录本设备对每篇文章的访问次数（初始为 0）。
// 注意：这是“本机累计访问”，并非全网真实阅读量；
// 全网真实阅读量请启用 Waline（其自带 Pageview 统计）或接入后端统计。
// key: 文章ID, value: number
// ============================================
const VIEWS_KEY = 'caoxublog_views';

function loadViews() {
    const data = safeStorageGet(VIEWS_KEY);
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
}

function saveViews(views) {
    safeStorageSet(VIEWS_KEY, views);
}

// 获取某篇文章的阅读量（本机累计，初始 0）
function getViewCount(articleId) {
    const views = loadViews();
    return views[articleId] || 0;
}

// 增加一次阅读量，返回最新计数
function incrementViewCount(articleId) {
    const views = loadViews();
    views[articleId] = (views[articleId] || 0) + 1;
    saveViews(views);
    return views[articleId];
}

// ============================================
// 加载失败提示（file:// 协议下 fetch 会被浏览器拦截）
// ============================================
function showLoadError(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const isFile = location.protocol === 'file:';
    el.innerHTML = `
        <div class="comment-empty" style="padding: 40px 20px;">
            <p style="margin-bottom: 8px; font-weight: 600;">内容加载失败</p>
            ${isFile
                ? '<p>当前以 file:// 协议直接打开，浏览器会拦截数据请求。<br>请在项目目录运行 <code>python -m http.server 8080</code>，然后访问 <code>http://localhost:8080</code></p>'
                : '<p>请检查网络后刷新重试</p>'}
        </div>
    `;
}

// ============================================
// 博客筛选工具
// ============================================

// 获取置顶博客（最多3条，排除已归档）
function getPinnedBlogs(blogs) {
    return blogs
        .filter(b => b.pinned && !b.archived)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3);
}

// 获取最新博客（按时间倒序，6条，排除置顶与已归档避免重复展示）
function getLatestBlogs(blogs) {
    return [...blogs]
        .filter(b => !b.pinned && !b.archived)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6);
}

// 获取未归档博客（正常列表/搜索/标签/分页使用）
function getActiveBlogs(blogs) {
    return blogs.filter(b => !b.archived);
}

// 获取已归档博客（归档页展示）
function getArchivedBlogs(blogs) {
    return blogs.filter(b => b.archived);
}

// 深度遍历教程树，收集已归档文章（携带所属文件夹路径，用于归档页展示）
function flattenArchivedArticles(items, folderPath) {
    const result = [];
    (items || []).forEach(item => {
        if (item.type === 'article') {
            if (item.archived) {
                result.push({
                    id: item.id,
                    name: item.name,
                    file: item.file,
                    folderPath: folderPath || ''
                });
            }
        } else if (item.type === 'folder' && item.children) {
            const path = folderPath ? folderPath + ' / ' + item.name : item.name;
            result.push(...flattenArchivedArticles(item.children, path));
        }
    });
    return result;
}

// 兼容 Node.js 测试环境（浏览器中 module 未定义，不影响原有行为）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPinnedBlogs,
        getLatestBlogs,
        getActiveBlogs,
        getArchivedBlogs,
        flattenArchivedArticles,
        loadSearchIndex
    };
}
