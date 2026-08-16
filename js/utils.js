/* ============================================
   CaoxuBlog - 工具函数
   ============================================ */

/**
 * Markdown 到 HTML 转换器 - 行扫描模式
 */
function renderMarkdown(text) {
    if (!text) return '';

    // 0. 统一换行符：兼容 Windows CRLF 和旧 Mac CR
    //    否则 ```(\w*)\n 这类正则在 CRLF 文本上无法匹配代码块
    text = text.replace(/\r\n?/g, '\n');

    // 1. 预处理：提取代码块，用占位符替代
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang, code: code.trim() });
        return `%%CODEBLOCK_${index}%%`;
    });

    // 2. 预处理：提取行内代码（不允许跨行，防止误吞多行内容）
    const inlineCodes = [];
    text = text.replace(/`([^`\n]+)`/g, (_, code) => {
        const index = inlineCodes.length;
        inlineCodes.push(code);
        return `%%INLINECODE_${index}%%`;
    });

    // 3. 行内格式（在文本级别做，不碰行结构）
    //    图片必须在链接之前处理；URL 均经过安全白名单校验，标签文本做 HTML 转义
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
        const safe = sanitizeUrl(url);
        const altHtml = escapeHtml(alt);
        return safe
            ? `<img src="${escapeHtml(safe)}" alt="${altHtml}" loading="lazy">`
            : `<span class="blocked-image">[不安全的图片地址，已拦截]</span>`;
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
        const safe = sanitizeUrl(url);
        const labelHtml = escapeHtml(label);
        return safe
            ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener">${labelHtml}</a>`
            : `<a rel="noopener">${labelHtml}</a>`;
    });

    // 粗体和斜体
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 4. 按行解析块级结构
    const lines = text.split('\n');
    const output = [];
    let paragraphLines = [];   // 普通段落行缓存
    let blockquoteLines = [];  // 引用行缓存
    let tableRows = [];        // 表格行缓存
    let listState = null;      // { type: 'ul'|'ol', items: [] }
    let headingCount = 0;      // 标题锚点自增序号

    function flushParagraph() {
        if (paragraphLines.length > 0) {
            output.push('<p>' + paragraphLines.join('<br>') + '</p>');
            paragraphLines = [];
        }
    }

    function flushBlockquote() {
        if (blockquoteLines.length > 0) {
            output.push('<blockquote>' + blockquoteLines.join('<br>') + '</blockquote>');
            blockquoteLines = [];
        }
    }

    function flushTable() {
        if (tableRows.length > 0) {
            // tableRows: [{ cells: [], isHeader: bool }]
            const isSeparator = tableRows.every(r => r.isSeparator);
            if (!isSeparator && tableRows.length > 0) {
                let tableHtml = '<table>';
                const headerRows = tableRows.filter(r => r.isHeader);
                const bodyRows = tableRows.filter(r => !r.isHeader && !r.isSeparator);
                if (headerRows.length > 0) {
                    tableHtml += '<thead>' + headerRows.map(r =>
                        '<tr>' + r.cells.map(c => '<th>' + c + '</th>').join('') + '</tr>'
                    ).join('') + '</thead>';
                }
                if (bodyRows.length > 0) {
                    tableHtml += '<tbody>' + bodyRows.map(r =>
                        '<tr>' + r.cells.map(c => '<td>' + c + '</td>').join('') + '</tr>'
                    ).join('') + '</tbody>';
                }
                tableHtml += '</table>';
                output.push(tableHtml);
            }
            tableRows = [];
        }
    }

    function flushList() {
        if (listState) {
            const tag = listState.type;
            output.push(`<${tag}>` + listState.items.map(item => `<li>${item}</li>`).join('') + `</${tag}>`);
            listState = null;
        }
    }

    function flushAll() {
        flushParagraph();
        flushBlockquote();
        flushTable();
        flushList();
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 空行 → 结束当前所有块
        if (trimmed === '') {
            flushAll();
            continue;
        }

        // 代码块占位符
        if (/^%%CODEBLOCK_\d+%%$/.test(trimmed)) {
            flushAll();
            output.push(trimmed);
            continue;
        }

        // 标题
        const headingMatch = trimmed.match(/^(#{1,6}) (.+)$/);
        if (headingMatch) {
            flushAll();
            const level = headingMatch[1].length;
            headingCount += 1;
            output.push(`<h${level} id="heading-${headingCount}">${headingMatch[2]}</h${level}>`);
            continue;
        }

        // 水平线
        if (trimmed === '---') {
            flushAll();
            output.push('<hr>');
            continue;
        }

        // 表格行
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            flushParagraph();
            flushBlockquote();
            flushList();

            const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
            const isSeparator = cells.every(c => /^[-:]+$/.test(c));
            tableRows.push({ cells, isSeparator, isHeader: false });
            continue;
        }
        // 非表格行则 flush 表格
        if (tableRows.length > 0) {
            flushTable();
        }

        // 无序列表
        const ulMatch = trimmed.match(/^[\*\-] (.+)$/);
        if (ulMatch) {
            flushParagraph();
            flushBlockquote();
            if (!listState || listState.type !== 'ul') {
                flushList();
                listState = { type: 'ul', items: [] };
            }
            listState.items.push(ulMatch[1]);
            continue;
        }

        // 有序列表
        const olMatch = trimmed.match(/^\d+\. (.+)$/);
        if (olMatch) {
            flushParagraph();
            flushBlockquote();
            if (!listState || listState.type !== 'ol') {
                flushList();
                listState = { type: 'ol', items: [] };
            }
            listState.items.push(olMatch[1]);
            continue;
        }

        // 引用
        const bqMatch = trimmed.match(/^> (.+)$/);
        if (bqMatch) {
            flushParagraph();
            flushList();
            blockquoteLines.push(bqMatch[1]);
            continue;
        }

        // 已有 HTML 标签（图片）
        if (trimmed.startsWith('<img')) {
            flushAll();
            output.push(trimmed);
            continue;
        }

        // 普通文本行
        paragraphLines.push(trimmed);
    }

    // 循环结束，flush 所有剩余内容
    flushAll();

    let html = output.join('\n');

    // 5. 恢复代码块（带语言标签、行号、复制按钮）
    html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_, i) => {
        const block = codeBlocks[parseInt(i)];
        const lang = block.lang || 'text';
        const langAttr = ` class="language-${lang}"`;
        const codeLines = block.code.split('\n');
        const lineNums = codeLines.map((_, idx) => idx + 1).join('\n');
        const safeCode = escapeHtml(block.code);
        return (
            `<div class="code-block">` +
                `<div class="code-header">` +
                    `<span class="code-lang">${escapeHtml(lang)}</span>` +
                    `<button class="code-copy-btn" type="button">复制</button>` +
                `</div>` +
                `<div class="code-body">` +
                    `<div class="code-lines">${lineNums}</div>` +
                    `<pre><code${langAttr}>${safeCode}</code></pre>` +
                `</div>` +
            `</div>`
        );
    });

    // 6. 恢复行内代码
    html = html.replace(/%%INLINECODE_(\d+)%%/g, (_, i) => {
        return `<code>${escapeHtml(inlineCodes[parseInt(i)])}</code>`;
    });

    return html;
}

// ============================================
// URL 安全白名单（防 XSS）
// ============================================

// 允许的显式协议（其余如 javascript: / data: / vbscript: / file: 一律拦截）
const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * 解码 HTML 实体（数字 + 常见命名实体），最多 3 轮防止双重编码绕过
 * 覆盖 URL 走私常用实体：空白（Tab/NewLine/nbsp）与 URL 语法字符（: / ( ) ? = 等）
 */
function decodeHtmlEntities(str) {
    const named = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
        nbsp: ' ', Tab: '\t', NewLine: '\n',
        colon: ':', semi: ';', sol: '/', lpar: '(', rpar: ')',
        comma: ',', period: '.', quest: '?', equals: '=',
        num: '#', dollar: '$', percent: '%', excl: '!',
        ast: '*', plus: '+', lowbar: '_', hyphen: '-', dash: '-'
    };
    let out = String(str);
    for (let round = 0; round < 3; round++) {
        const next = out.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
            if (body[0] === '#') {
                const isHex = body[1] === 'x' || body[1] === 'X';
                const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
                if (Number.isFinite(code) && code > 0 && code <= 0x10FFFF) {
                    try { return String.fromCodePoint(code); } catch (e) { return match; }
                }
                return match;
            }
            return Object.prototype.hasOwnProperty.call(named, body) ? named[body] : match;
        });
        if (next === out) break;
        out = next;
    }
    return out;
}

/**
 * URL 安全校验：仅允许白名单协议或站内相对路径。
 * 不安全的 URL 返回 ''，调用方据此跳过 href/src 属性。
 * @param {string} url
 * @returns {string}
 */
function sanitizeUrl(url) {
    if (!url) return '';
    // 去首尾空白与控制字符（防止换行/制表符拆断属性）
    let u = String(url).trim().replace(/[\u0000-\u001f\u007f]/g, '');

    // 先解码 HTML 实体（含双重编码），再校验，防止实体混淆绕过
    u = decodeHtmlEntities(u);
    // 解码可能还原出制表符/换行等控制字符（如 &Tab;），需二次清理
    u = u.trim().replace(/[\u0000-\u001f\u007f]/g, '');

    // 拒绝可能破坏双引号属性的字符
    if (/["'<>]/.test(u)) return '';

    // 显式协议：仅白名单放行（大小写不敏感）
    const schemeMatch = u.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase() + ':';
        return SAFE_URL_PROTOCOLS.includes(scheme) ? u : '';
    }

    // 无协议：相对路径 / 锚点 / 协议相对地址（//cdn...）均视为站内安全链接
    return u;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, c => map[c]);
}

/**
 * 获取纯文本摘要
 */
function getExcerpt(content, maxLength = 120) {
    if (!content) return '';
    let text = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\n/g, ' ')
        .trim();

    if (text.length > maxLength) {
        text = text.slice(0, maxLength) + '...';
    }
    return text;
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + ' 分钟前';
    if (diff < day) return Math.floor(diff / hour) + ' 小时前';
    if (diff < 7 * day) return Math.floor(diff / day) + ' 天前';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
}

/**
 * 生成唯一 ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 评论敏感词过滤
 * 命中敏感词的字符将被替换为 '*'（按词长占位）。
 * 可在下方 SENSITIVE_WORDS 中按需增删敏感词。
 * @param {string} text
 * @returns {{ text: string, hit: boolean, words: string[] }}
 */
const SENSITIVE_WORDS = [
    // 示例敏感词，请按运营规范自行补充
    '垃圾', '傻逼', '操你', 'fuck', 'shit', '广告', '代开发票', '色情', '赌博', '诈骗'
];

// 构建正则（长词优先，避免短词先匹配）
const SENSITIVE_REGEX = (() => {
    const sorted = [...SENSITIVE_WORDS].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp('(' + escaped.join('|') + ')', 'gi');
})();

function filterSensitiveWords(text) {
    if (!text || typeof text !== 'string') {
        return { text: '', hit: false, words: [] };
    }
    const found = new Set();
    const filtered = text.replace(SENSITIVE_REGEX, (match) => {
        found.add(match.toLowerCase());
        return '*'.repeat(match.length);
    });
    return { text: filtered, hit: found.size > 0, words: [...found] };
}

/**
 * 代码块增强：语法高亮 + 复制按钮
 * 在 Markdown 渲染注入 DOM 后调用，传入容器元素。
 * highlight.js 按需懒加载：仅当存在代码块时才从 CDN 加载（避免全站首屏下载数百 KB）。
 * @param {HTMLElement} root
 */
function enhanceCodeBlocks(root) {
    if (!root) return;

    const codeEls = root.querySelectorAll('.code-block pre code');

    // 语法高亮（highlight.js 已加载则立即高亮，否则按需加载后再高亮）
    const highlightAll = () => {
        if (!window.hljs) return;
        codeEls.forEach(block => {
            try { window.hljs.highlightElement(block); } catch (e) { /* 忽略单块高亮失败 */ }
        });
    };
    if (window.hljs) {
        highlightAll();
    } else if (codeEls.length > 0) {
        loadHighlightJs().then(highlightAll).catch(() => { /* 高亮加载失败则跳过 */ });
    }

    // 复制按钮
    root.querySelectorAll('.code-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const codeBlock = btn.closest('.code-block');
            const codeEl = codeBlock ? codeBlock.querySelector('pre code') : null;
            if (!codeEl) return;
            const text = codeEl.textContent;
            const done = () => {
                const original = '复制';
                btn.textContent = '已复制';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
            } else {
                fallbackCopy(text, done);
            }
        });
    });
}

// highlight.js 脚本懒加载（全局只加载一次）
let highlightScriptPromise = null;
function loadHighlightJs() {
    if (window.hljs) return Promise.resolve();
    if (!highlightScriptPromise) {
        highlightScriptPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            // 自托管（vendor/），避免依赖境外 CDN（jsDelivr 在中国大陆经常不可达）
            s.src = 'vendor/highlightjs/highlight.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('highlight.js 加载失败'));
            document.head.appendChild(s);
        });
    }
    return highlightScriptPromise;
}

/**
 * 将 Markdown 转为纯文本（用于全文搜索索引）。
 * 去掉代码块、标题标记、强调、链接/图片语法、列表标记等。
 * @param {string} md
 * @returns {string}
 */
function stripMarkdown(md) {
    if (!md) return '';
    return String(md)
        .replace(/```[\s\S]*?```/g, ' ')       // 代码块
        .replace(/`([^`]+)`/g, '$1')           // 行内代码
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 图片 -> alt
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 链接 -> 文本
        .replace(/^#{1,6}\s+/gm, '')           // 标题标记
        .replace(/^\s*>\s?/gm, '')             // 引用标记
        .replace(/^\s*[-*+]\s+/gm, '')         // 无序列表标记
        .replace(/^\s*\d+\.\s+/gm, '')         // 有序列表标记
        .replace(/^\s*\|.*$/gm, ' ')           // 表格行
        .replace(/\*\*([^*]+)\*\*/g, '$1')     // 加粗
        .replace(/\*([^*]+)\*/g, '$1')         // 斜体
        .replace(/~{1,2}([^~]+)~{1,2}/g, '$1') // 删除线
        .replace(/\s+/g, ' ')
        .trim();
}

// 兼容不支持 Clipboard API 的环境
function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
}

/**
 * 根据正文标题生成文章目录（TOC）。
 * 依赖 renderMarkdown 已为标题添加 id（heading-N）。
 * @param {HTMLElement} contentRoot 包含 .markdown-body 的容器
 * @param {HTMLElement} tocEl 目录容器（<nav class="toc">）
 */
function buildToc(contentRoot, tocEl) {
    if (!contentRoot || !tocEl) return;
    const headings = contentRoot.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3');
    if (headings.length < 2) {
        tocEl.style.display = 'none';
        return;
    }
    const items = Array.from(headings).map((h, i) => {
        if (!h.id) h.id = 'heading-' + (i + 1);
        return { level: parseInt(h.tagName[1], 10), id: h.id, text: h.textContent };
    });
    tocEl.innerHTML =
        '<div class="toc-title">目录</div>' +
        '<ul class="toc-list">' +
        items.map(it => `<li class="toc-item toc-l${it.level}"><a href="#${it.id}">${escapeHtml(it.text)}</a></li>`).join('') +
        '</ul>';
    tocEl.style.display = 'block';
}

/**
 * 动态更新页面 meta description（SEO / 分享预览）
 * @param {string} text
 */
function setMetaDescription(text) {
    const el = document.querySelector('meta[name="description"]');
    if (el && text) el.setAttribute('content', text);
}

// 兼容 Node.js 测试环境（浏览器中 module 未定义，不影响原有行为）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderMarkdown,
        sanitizeUrl,
        decodeHtmlEntities,
        escapeHtml,
        getExcerpt,
        formatTime,
        generateId,
        filterSensitiveWords,
        buildToc,
        setMetaDescription,
        stripMarkdown,
        SENSITIVE_WORDS
    };
}
