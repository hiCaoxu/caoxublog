/* ============================================
   CaoxuBlog - 内容索引与静态页生成脚本
   用法：node build-index.js
   作用：
   1. 扫描 blogs/*.md 和 tutorials/ 目录树
   2. updatedAt 自动取文件修改时间
   3. 新文件自动生成占位条目（标题/摘要需手动填写）
   4. 已删除的文件自动从清单中移除
   5. 生成静态文章页（post/*.html，供搜索引擎收录）
   6. 生成 sitemap.xml / robots.txt / feed.xml（RSS）
   ============================================ */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BLOGS_DIR = path.join(ROOT, 'blogs');
const TUTORIALS_DIR = path.join(ROOT, 'tutorials');

// 格式化为 "2026-08-05 14:30"
function formatDateTime(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readJsonSafe(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return fallback;
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 4) + '\n', 'utf8');
}

// 去掉文件名中的数字前缀和扩展名："01-html-intro" -> "html-intro"
function stripPrefix(fileBase) {
    return fileBase.replace(/^\d+-/, '');
}

// ============================================
// 博客清单
// ============================================
function buildBlogsIndex() {
    const indexFile = path.join(BLOGS_DIR, 'index.json');
    const existing = readJsonSafe(indexFile, []);
    const byFile = new Map(existing.map(e => [e.file, e]));

    const mdFiles = fs.readdirSync(BLOGS_DIR)
        .filter(f => f.endsWith('.md'))
        .sort();

    const result = mdFiles.map(file => {
        const stat = fs.statSync(path.join(BLOGS_DIR, file));
        const base = file.replace(/\.md$/, '');
        const old = byFile.get(file);
        const isNew = !old;

        if (isNew) {
            console.log(`  [新增博客] ${file} —— 请填写标题和摘要`);
        }

        return {
            id: old ? old.id : 'blog-' + base,
            title: old ? old.title : '【待填写标题】' + stripPrefix(base),
            excerpt: old ? old.excerpt : '【待填写摘要】',
            file: file,
            // 已有条目保留原创建时间，新条目取文件创建时间
            createdAt: old ? old.createdAt : formatDateTime(stat.birthtimeMs ? stat.birthtime : stat.mtime),
            // 修改时间始终跟随文件修改时间
            updatedAt: formatDateTime(stat.mtime),
            pinned: old ? !!old.pinned : false,
            archived: old ? !!old.archived : false,
            tags: old && Array.isArray(old.tags) ? old.tags : []
        };
    });

    // 检测被删除的博客
    const removed = existing.filter(e => !mdFiles.includes(e.file));
    removed.forEach(e => console.log(`  [移除博客] ${e.file}`));

    writeJson(indexFile, result);
    console.log(`blogs/index.json 已更新，共 ${result.length} 篇`);
}

// ============================================
// 教程清单
// ============================================

// 收集已有树中每个文件夹节点的路径（用其后代文章路径的公共前缀推断）
function collectExistingMeta(items, folderMap, articleMap, parentPath) {
    for (const item of items) {
        if (item.type === 'article') {
            articleMap.set(item.file, { id: item.id, name: item.name, archived: item.archived });
        } else if (item.type === 'folder') {
            // 先递归收集后代文章路径
            const files = [];
            collectFiles(item.children || [], files);
            const dirPath = commonDirPrefix(files) || (parentPath ? parentPath + '/' + item.name : item.name);
            folderMap.set(dirPath, { id: item.id, name: item.name });
            collectExistingMeta(item.children || [], folderMap, articleMap, dirPath);
        }
    }
}

function collectFiles(items, out) {
    for (const item of items) {
        if (item.type === 'article') out.push(item.file);
        else if (item.children) collectFiles(item.children, out);
    }
}

// 多个文件路径的公共目录前缀
function commonDirPrefix(files) {
    if (files.length === 0) return '';
    const parts = files.map(f => f.split('/').slice(0, -1));
    let prefix = parts[0];
    for (const p of parts.slice(1)) {
        let i = 0;
        while (i < prefix.length && i < p.length && prefix[i] === p[i]) i++;
        prefix = prefix.slice(0, i);
    }
    return prefix.join('/');
}

// 递归扫描 tutorials 目录，生成目录树
function scanTutorialDir(dirAbs, dirRel, folderMap, articleMap, depth, logs) {
    if (depth > 2) return []; // 最多三级

    const entries = fs.readdirSync(dirAbs, { withFileTypes: true })
        .filter(e => e.name !== 'index.json' && !e.name.startsWith('.'));

    const folders = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter(e => e.isFile() && e.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name));

    const result = [];

    for (const folder of folders) {
        const rel = dirRel ? dirRel + '/' + folder.name : folder.name;
        const old = folderMap.get(rel);
        if (!old) logs.push(`  [新增文件夹] ${rel} —— 可在 index.json 中重命名`);
        result.push({
            id: old ? old.id : 'tut-folder-' + rel.replace(/\//g, '-'),
            name: old ? old.name : folder.name,
            type: 'folder',
            children: scanTutorialDir(path.join(dirAbs, folder.name), rel, folderMap, articleMap, depth + 1, logs)
        });
    }

    for (const file of files) {
        const rel = dirRel ? dirRel + '/' + file.name : file.name;
        const old = articleMap.get(rel);
        if (!old) logs.push(`  [新增教程] ${rel} —— 可在 index.json 中重命名`);
        result.push({
            id: old ? old.id : 'tut-' + rel.replace(/\.md$/, '').replace(/\//g, '-'),
            name: old ? old.name : stripPrefix(file.name.replace(/\.md$/, '')),
            type: 'article',
            file: rel,
            archived: old ? !!old.archived : false
        });
    }

    return result;
}

function buildTutorialsIndex() {
    const indexFile = path.join(TUTORIALS_DIR, 'index.json');
    const existing = readJsonSafe(indexFile, []);

    const folderMap = new Map();
    const articleMap = new Map();
    collectExistingMeta(existing, folderMap, articleMap, '');

    const logs = [];
    const tree = scanTutorialDir(TUTORIALS_DIR, '', folderMap, articleMap, 0, logs);
    logs.forEach(l => console.log(l));

    writeJson(indexFile, tree);

    let articleCount = 0;
    collectFiles(tree, { push: () => articleCount++ });
    console.log(`tutorials/index.json 已更新，共 ${articleCount} 篇教程`);
}

// ============================================
// 静态文章页 + SEO 文件（sitemap / robots / RSS）
// ============================================

const utils = require('./js/utils.js');

// 站点域名（部署后改为实际地址，用于 sitemap / canonical / og 的绝对 URL）
const SITE_URL = 'https://hiCaoxu.github.io/caoxublog';
// 静态资源版本号（与各 HTML 页面中的 ?v= 保持一致）
const ASSET_VERSION = '20260809';
const POST_DIR = path.join(ROOT, 'post');

// 教程树扁平化：收集文章并携带所属文件夹路径
function flattenTreeArticles(items, folderPath) {
    const result = [];
    (items || []).forEach(item => {
        if (item.type === 'article') {
            result.push({ ...item, folderPath: folderPath || '' });
        } else if (item.type === 'folder') {
            const p = folderPath ? folderPath + ' / ' + item.name : item.name;
            result.push(...flattenTreeArticles(item.children || [], p));
        }
    });
    return result;
}

// 生成单篇静态文章页 HTML
function renderArticlePage(article) {
    const { id, title, excerpt, contentHtml, createdAt, updatedAt, tags, folderPath, prev, next, type } = article;
    const desc = excerpt || title;
    const backHref = type === 'blog' ? '../blog.html' : '../tutorial.html';
    const backText = type === 'blog' ? '返回博客列表' : '返回教程目录';
    const commentHref = type === 'blog' ? '../blog.html?id=' + id : '../tutorial.html?id=' + id;
    const canonical = SITE_URL + '/post/' + id + '.html';

    const tagHtml = (tags && tags.length)
        ? tags.map(t => `<span class="article-tag">${utils.escapeHtml(t)}</span>`).join('')
        : '';
    const breadcrumbHtml = folderPath ? `<span class="article-breadcrumb">${utils.escapeHtml(folderPath)}</span>` : '';
    const prevHtml = prev
        ? `<a class="post-nav-link prev" href="${prev.id}.html"><span class="nav-dir">上一篇</span><span class="nav-title">${utils.escapeHtml(prev.title || prev.name)}</span></a>`
        : '<span class="nav-placeholder"></span>';
    const nextHtml = next
        ? `<a class="post-nav-link next" href="${next.id}.html"><span class="nav-dir">下一篇</span><span class="nav-title">${utils.escapeHtml(next.title || next.name)}</span></a>`
        : '<span class="nav-placeholder"></span>';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${utils.escapeHtml(desc)}">
    <title>${utils.escapeHtml(title)} - CaoxuBlog</title>
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${utils.escapeHtml(title)}">
    <meta property="og:description" content="${utils.escapeHtml(desc)}">
    <meta property="og:url" content="${canonical}">
    <link rel="stylesheet" href="../css/style.css?v=${ASSET_VERSION}">
    <link rel="stylesheet" href="../css/blog.css?v=${ASSET_VERSION}">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css" id="hljs-light">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css" id="hljs-dark" disabled>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="../index.html" class="nav-logo">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span class="logo-text">
                    <span class="logo-name">CaoxuBlog</span>
                    <span class="logo-tagline">代码永远在等待一个它从未通过的测试</span>
                </span>
            </a>
            <ul class="nav-links">
                <li><a href="../index.html">首页</a></li>
                <li><a href="../blog.html">博客</a></li>
                <li><a href="../tutorial.html">教程</a></li>
                <li><a href="../about.html">关于我</a></li>
                <li>
                    <button class="theme-toggle" type="button" aria-label="切换主题">
                        <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                        <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    </button>
                </li>
            </ul>
        </div>
    </nav>

    <main class="static-article-page">
        <article class="blog-article">
            <div class="article-header">
                <a class="back-btn" href="${backHref}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    ${backText}
                </a>
                <h1 class="article-title">${utils.escapeHtml(title)}</h1>
                <div class="article-meta">
                    ${createdAt ? `<span>创建：${utils.escapeHtml(createdAt)}</span>` : ''}
                    ${updatedAt ? `<span>修改：${utils.escapeHtml(updatedAt)}</span>` : ''}
                    ${breadcrumbHtml}
                    ${tagHtml}
                </div>
            </div>
            <nav class="toc" id="articleToc" style="display:none;"></nav>
            <div class="markdown-body">${contentHtml}</div>
            <div class="post-nav">${prevHtml}${nextHtml}</div>
            <p class="article-comment-link"><a href="${commentHref}">参与评论（互动版）→</a></p>
        </article>
    </main>

    <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
    <script src="../js/data.js?v=${ASSET_VERSION}"></script>
    <script src="../js/utils.js?v=${ASSET_VERSION}"></script>
    <script src="../js/theme.js?v=${ASSET_VERSION}"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            if (window.enhanceCodeBlocks) enhanceCodeBlocks(document.body);
            if (window.buildToc) buildToc(document.body, document.getElementById('articleToc'));
        });
    </script>
</body>
</html>`;
}

function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function buildArticlePages() {
    fs.mkdirSync(POST_DIR, { recursive: true });

    const blogs = readJsonSafe(path.join(BLOGS_DIR, 'index.json'), []);
    const tree = readJsonSafe(path.join(TUTORIALS_DIR, 'index.json'), []);
    const tutorialArticles = flattenTreeArticles(tree);

    // 归档文章不参与 prev/next 与 sitemap，但仍生成静态页（供归档页深链）
    const activeBlogs = blogs.filter(b => !b.archived).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const activeTuts = tutorialArticles.filter(a => !a.archived);

    const expectedIds = new Set();

    blogs.forEach(blog => {
        const md = fs.readFileSync(path.join(BLOGS_DIR, blog.file), 'utf8');
        const contentHtml = utils.renderMarkdown(md);
        const idx = activeBlogs.findIndex(b => b.id === blog.id);
        const page = renderArticlePage({
            id: blog.id, title: blog.title, excerpt: blog.excerpt, contentHtml,
            createdAt: blog.createdAt, updatedAt: blog.updatedAt, tags: blog.tags,
            prev: idx > 0 ? activeBlogs[idx - 1] : null,
            next: (idx >= 0 && idx < activeBlogs.length - 1) ? activeBlogs[idx + 1] : null,
            type: 'blog'
        });
        fs.writeFileSync(path.join(POST_DIR, blog.id + '.html'), page, 'utf8');
        expectedIds.add(blog.id + '.html');
    });

    tutorialArticles.forEach(a => {
        const md = fs.readFileSync(path.join(TUTORIALS_DIR, a.file), 'utf8');
        const contentHtml = utils.renderMarkdown(md);
        const idx = activeTuts.findIndex(x => x.id === a.id);
        const prev = idx > 0 ? activeTuts[idx - 1] : null;
        const next = (idx >= 0 && idx < activeTuts.length - 1) ? activeTuts[idx + 1] : null;
        const page = renderArticlePage({
            id: a.id, title: a.name, excerpt: '', contentHtml,
            tags: [], folderPath: a.folderPath,
            prev: prev ? { id: prev.id, name: prev.name } : null,
            next: next ? { id: next.id, name: next.name } : null,
            type: 'tutorial'
        });
        fs.writeFileSync(path.join(POST_DIR, a.id + '.html'), page, 'utf8');
        expectedIds.add(a.id + '.html');
    });

    // 清理已删除文章的残留静态页
    fs.readdirSync(POST_DIR).forEach(f => {
        if (f.endsWith('.html') && !expectedIds.has(f)) {
            fs.unlinkSync(path.join(POST_DIR, f));
            console.log(`  [移除静态页] ${f}`);
        }
    });

    // sitemap
    const sitemapUrls = ['index.html', 'blog.html', 'tutorial.html', 'about.html', 'archive.html']
        .concat(activeBlogs.map(b => 'post/' + b.id + '.html'))
        .concat(activeTuts.map(a => 'post/' + a.id + '.html'));
    const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + sitemapUrls.map(u => '  <url><loc>' + SITE_URL + '/' + u + '</loc></url>').join('\n')
        + '\n</urlset>\n';
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml, 'utf8');

    // robots.txt
    fs.writeFileSync(path.join(ROOT, 'robots.txt'),
        'User-agent: *\nAllow: /\nSitemap: ' + SITE_URL + '/sitemap.xml\n', 'utf8');

    // RSS
    const rssItems = activeBlogs.map(b => {
        const pubDate = new Date(b.createdAt.replace(' ', 'T') + ':00').toUTCString();
        return '    <item>\n      <title>' + escapeXml(b.title) + '</title>\n      <link>' + SITE_URL + '/post/' + b.id + '.html</link>\n      <description>' + escapeXml(b.excerpt || '') + '</description>\n      <pubDate>' + pubDate + '</pubDate>\n      <guid>' + SITE_URL + '/post/' + b.id + '.html</guid>\n    </item>';
    }).join('\n');
    const feedXml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>CaoxuBlog</title>\n    <link>' + SITE_URL + '/</link>\n    <description>CaoxuBlog - 测试技术与前端开发经验分享</description>\n' + rssItems + '\n  </channel>\n</rss>\n';
    fs.writeFileSync(path.join(ROOT, 'feed.xml'), feedXml, 'utf8');

    console.log(`静态页已生成：博客 ${blogs.length} 篇，教程 ${tutorialArticles.length} 篇；sitemap.xml / robots.txt / feed.xml 已更新`);
}

// ============================================
// 执行
// ============================================
console.log('正在生成 index.json 与静态页 ...\n');
buildBlogsIndex();
buildTutorialsIndex();
buildArticlePages();
console.log('\n完成！如有【待填写】占位内容，请编辑对应的 index.json 补充。');
