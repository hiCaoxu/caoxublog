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
    //    图片必须在链接之前处理
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

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
            output.push(`<h${level}>${headingMatch[2]}</h${level}>`);
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

    // 5. 恢复代码块
    html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (_, i) => {
        const block = codeBlocks[parseInt(i)];
        const langAttr = block.lang ? ` class="language-${block.lang}"` : '';
        return `<pre><code${langAttr}>${escapeHtml(block.code)}</code></pre>`;
    });

    // 6. 恢复行内代码
    html = html.replace(/%%INLINECODE_(\d+)%%/g, (_, i) => {
        return `<code>${escapeHtml(inlineCodes[parseInt(i)])}</code>`;
    });

    return html;
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
