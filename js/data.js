/* ============================================
   CaoxuBlog - 数据层
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
// 关于我数据（默认内容，about.md 加载失败时回退使用）
// 正常情况由 about.js 从根目录 about.md 加载
// ============================================
function getDefaultAbout() {
    return `# 关于我

你好！我是 **hicao**，一名测试工程师。

## 个人简介

我深耕软件测试 3-5 年，专注软件质量保障，方向覆盖**接口测试、Web 自动化测试**与**测试开发（质量平台）**。近几年重点关注 **AI 赋能软件测试**，持续探索如何用 AI 提升测试设计效率、自动化覆盖率与缺陷分析质量。

## 技术栈

- **接口测试**：Postman / Apifox，接口自动化与数据校验
- **Web 自动化**：Selenium / Playwright，UI 自动化与回归测试体系
- **测试开发**：Python / Pytest，自研测试工具与质量平台、CI 集成
- **数据库**：MySQL，测试数据构造与结果校验
- **环境**：Linux / Shell，测试环境搭建与运维脚本
- **AI 赋能测试**：AI 辅助用例生成、缺陷分析、测试提效实践

## 博客主题

这个博客主要分享以下内容：

1. **测试技术分享**：接口 / 自动化 / 性能测试的实战经验
2. **工具与效率**：测试工具与开发工具的使用教程
3. **学习笔记**：读书笔记、课程总结
4. **职业成长**：测试职业发展路径与面试经验

## 联系方式

- **GitHub**：[github.com/hiCaoxu](https://github.com/hiCaoxu)
- **邮箱**：hicaoxu@qq.com

## 关于本站

CaoxuBlog 是一个纯静态博客，使用原生 HTML、CSS 和 JavaScript 构建，无需任何框架或构建工具。

技术特点：
- 博客和教程以 Markdown 文件管理，直接修改文件即可更新内容
- 支持 Markdown 格式内容渲染（含代码高亮、暗色模式）
- 响应式设计，适配各种设备
- 简约线性图标风格、素雅清新的配色方案

---

> "Stay hungry, stay foolish." —— Steve Jobs

感谢你的访问！欢迎在博客和教程页面留言交流。`;
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
        flattenArchivedArticles
    };
}
