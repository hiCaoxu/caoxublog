/* ============================================
   CaoxuBlog - index.json 自动生成脚本
   用法：node build-index.js
   作用：
   1. 扫描 blogs/*.md 和 tutorials/ 目录树
   2. updatedAt 自动取文件修改时间
   3. 新文件自动生成占位条目（标题/摘要需手动填写）
   4. 已删除的文件自动从清单中移除
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
// 执行
// ============================================
console.log('正在生成 index.json ...\n');
buildBlogsIndex();
buildTutorialsIndex();
console.log('\n完成！如有【待填写】占位内容，请编辑对应的 index.json 补充。');
