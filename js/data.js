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
        pinned: !!item.pinned
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
// 关于我数据
// ============================================
function getDefaultAbout() {
    return `# 关于我

你好！我是 **Caoxu**，一名热爱技术的前端开发者。

---

## 个人简介

我专注于 Web 前端开发，热衷于探索新技术和构建优雅的用户界面。我相信好的代码应该简洁、可读、可维护。

## 技术栈

- **前端**：HTML5、CSS3、JavaScript（ES6+）、React、Vue
- **工具**：Git、VS Code、Figma
- **后端**：Node.js、Python（基础）
- **其他**：Markdown、Linux 基础操作

## 博客主题

这个博客主要分享以下内容：

1. **前端技术**：CSS 技巧、JavaScript 深入、框架使用经验
2. **开发工具**：效率工具推荐、环境配置指南
3. **学习笔记**：读书笔记、课程总结
4. **项目实践**：实战项目经验分享

## 联系方式

- **GitHub**：[github.com/caoxu](https://github.com)
- **邮箱**：caoxu@example.com

## 关于本站

CaoxuBlog 是一个纯静态博客，使用原生 HTML、CSS 和 JavaScript 构建，无需任何框架或构建工具。

技术特点：
- 博客和教程以 Markdown 文件管理，直接修改文件即可更新内容
- 支持 Markdown 格式内容渲染
- 响应式设计，适配各种设备
- 简约线性图标风格
- 素雅清新的配色方案

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
// 博客筛选工具
// ============================================

// 获取置顶博客（最多3条）
function getPinnedBlogs(blogs) {
    return blogs
        .filter(b => b.pinned)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3);
}

// 获取最新博客（按时间倒序，6条，排除置顶避免重复展示）
function getLatestBlogs(blogs) {
    return [...blogs]
        .filter(b => !b.pinned)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6);
}
