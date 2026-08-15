/* ============================================
   CaoxuBlog - Markdown 渲染器单元测试
   运行：node --test tests/
   （使用 Node 内置 test runner，零第三方依赖）
   ============================================ */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    renderMarkdown,
    sanitizeUrl,
    decodeHtmlEntities
} = require('../js/utils.js');

// ============================================
// sanitizeUrl：协议白名单
// ============================================

test('sanitizeUrl: 允许 http/https', () => {
    assert.equal(sanitizeUrl('https://example.com/path?a=1&b=2'), 'https://example.com/path?a=1&b=2');
    assert.equal(sanitizeUrl('http://example.com'), 'http://example.com');
});

test('sanitizeUrl: 允许 mailto / tel', () => {
    assert.equal(sanitizeUrl('mailto:hi@example.com'), 'mailto:hi@example.com');
    assert.equal(sanitizeUrl('tel:+8613800000000'), 'tel:+8613800000000');
});

test('sanitizeUrl: 允许站内相对路径与锚点', () => {
    assert.equal(sanitizeUrl('/blog.html?id=1'), '/blog.html?id=1');
    assert.equal(sanitizeUrl('./about.html'), './about.html');
    assert.equal(sanitizeUrl('../guide/start.md'), '../guide/start.md');
    assert.equal(sanitizeUrl('#section-2'), '#section-2');
    assert.equal(sanitizeUrl('about.html'), 'about.html');
    assert.equal(sanitizeUrl('//cdn.example.com/lib.js'), '//cdn.example.com/lib.js');
});

test('sanitizeUrl: 拦截 javascript: 协议（含大小写混淆）', () => {
    assert.equal(sanitizeUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeUrl('JaVaScRiPt:alert(1)'), '');
    assert.equal(sanitizeUrl(' javascript:alert(1) '), '');
    assert.equal(sanitizeUrl('javascript:\nalert(1)'), '');
});

test('sanitizeUrl: 拦截 data / vbscript / file / ftp 等危险协议', () => {
    assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(sanitizeUrl('vbscript:msgbox(1)'), '');
    assert.equal(sanitizeUrl('file:///etc/passwd'), '');
    assert.equal(sanitizeUrl('ftp://example.com/x'), '');
});

test('sanitizeUrl: 拦截 HTML 实体混淆绕过', () => {
    // &#106; = j，解码后为 javascript:alert(1)
    assert.equal(sanitizeUrl('&#106;avascript:alert(1)'), '');
    assert.equal(sanitizeUrl('&#x6A;avascript:alert(1)'), '');
    // &Tab; / &NewLine; 解码为空白，URL 解析会忽略前导空白 → 仍是 javascript:
    assert.equal(sanitizeUrl('&Tab;javascript:alert(1)'), '');
    assert.equal(sanitizeUrl('&NewLine;javascript:alert(1)'), '');
    // &colon; 解码为冒号
    assert.equal(sanitizeUrl('javascript&colon;alert(1)'), '');
    // 双重编码 &amp;#106; → &#106; → j
    assert.equal(sanitizeUrl('&amp;#106;avascript:alert(1)'), '');
});

test('sanitizeUrl: 拦截可破坏属性引号的字符', () => {
    assert.equal(sanitizeUrl('https://a.com/" onmouseover="alert(1)'), '');
    assert.equal(sanitizeUrl("https://a.com/' onmouseover='alert(1)"), '');
    assert.equal(sanitizeUrl('https://a.com/<script>'), '');
});

test('sanitizeUrl: 空值与纯空白返回空串', () => {
    assert.equal(sanitizeUrl(''), '');
    assert.equal(sanitizeUrl('   '), '');
    assert.equal(sanitizeUrl(null), '');
    assert.equal(sanitizeUrl(undefined), '');
});

// ============================================
// decodeHtmlEntities
// ============================================

test('decodeHtmlEntities: 解码数字与命名实体', () => {
    assert.equal(decodeHtmlEntities('&#106;avascript'), 'javascript');
    assert.equal(decodeHtmlEntities('&#x6A;avascript'), 'javascript');
    assert.equal(decodeHtmlEntities('&amp;&lt;&gt;&quot;&apos;'), '&<>"\'');
    assert.equal(decodeHtmlEntities('无实体'), '无实体');
    assert.equal(decodeHtmlEntities('&unknown;'), '&unknown;');
});

// ============================================
// renderMarkdown：链接/图片安全性
// ============================================

test('renderMarkdown: 安全链接正常渲染', () => {
    const html = renderMarkdown('[官网](https://example.com)');
    assert.match(html, /<a href="https:\/\/example\.com" target="_blank" rel="noopener">官网<\/a>/);
});

test('renderMarkdown: 站内相对链接正常渲染', () => {
    const html = renderMarkdown('[关于我](/about.html)');
    assert.match(html, /<a href="\/about\.html"/);
});

test('renderMarkdown: javascript: 链接被拦截且不输出 href', () => {
    const html = renderMarkdown('[点我](javascript:alert(1))');
    assert.doesNotMatch(html, /javascript/i);
    assert.doesNotMatch(html, /href=/);
    assert.match(html, /<a rel="noopener">点我<\/a>/);
});

test('renderMarkdown: 实体混淆的 javascript: 链接被拦截', () => {
    const html = renderMarkdown('[点我](&#106;avascript:alert(1))');
    assert.doesNotMatch(html, /javascript/i);
    assert.doesNotMatch(html, /href=/);
});

test('renderMarkdown: data: 链接被拦截', () => {
    const html = renderMarkdown('[下载](data:text/html,<script>alert(1)</script>)');
    assert.doesNotMatch(html, /href=/);
    assert.doesNotMatch(html, /data:/i);
});

test('renderMarkdown: 链接标签文本被 HTML 转义（防标签注入）', () => {
    const html = renderMarkdown('[<b>加粗</b>](https://example.com)');
    assert.match(html, /&lt;b&gt;加粗&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<b>加粗<\/b>/);
});

test('renderMarkdown: 链接 URL 内含引号不会逃逸出属性', () => {
    const html = renderMarkdown('[x](https://a.com/" onmouseover="alert(1))');
    assert.doesNotMatch(html, /onmouseover/);
    assert.doesNotMatch(html, /href=/);
});

test('renderMarkdown: 安全图片正常渲染', () => {
    const html = renderMarkdown('![封面](https://example.com/cover.png)');
    assert.match(html, /<img src="https:\/\/example\.com\/cover\.png" alt="封面">/);
});

test('renderMarkdown: 危险协议图片被拦截且不输出 src', () => {
    const html = renderMarkdown('![图](javascript:alert(1))');
    assert.doesNotMatch(html, /javascript/i);
    assert.doesNotMatch(html, /src=/);
    assert.match(html, /不安全的图片地址，已拦截/);
});

test('renderMarkdown: 图片 alt 文本被转义（防属性逃逸）', () => {
    const html = renderMarkdown('![a" onerror="alert(1)](https://example.com/a.png)');
    // 引号已被转义为 &quot;，属性不会逃逸；
    // onerror 仅作为转义后的纯文本出现在属性值内，不构成事件属性
    assert.doesNotMatch(html, /" onerror="/);
    assert.match(html, /alt="a&quot; onerror=&quot;alert\(1\)"/);
});

// ============================================
// renderMarkdown：基础语法回归测试
// ============================================

test('renderMarkdown: 标题/列表/引用/表格正常渲染', () => {
    const md = [
        '# 标题一',
        '',
        '- 条目 A',
        '- 条目 B',
        '',
        '> 引用内容',
        '',
        '| 列1 | 列2 |',
        '| --- | --- |',
        '| a | b |'
    ].join('\n');
    const html = renderMarkdown(md);
    assert.match(html, /<h1>标题一<\/h1>/);
    assert.match(html, /<ul><li>条目 A<\/li><li>条目 B<\/li><\/ul>/);
    assert.match(html, /<blockquote>引用内容<\/blockquote>/);
    assert.match(html, /<table>/);
    // 注：当前渲染器把首行（表头）也渲染为 <td> 放入 <tbody>，此为既有行为
    assert.match(html, /<td>列1<\/td>/);
});

test('renderMarkdown: 代码块与行内代码正常渲染（CRLF 兼容回归）', () => {
    const md = '```js\r\nconst a = 1;\r\n```\r\n\r\n这是 `inline` 代码';
    const html = renderMarkdown(md);
    assert.match(html, /class="language-js"/);
    assert.match(html, /const a = 1;/);
    assert.match(html, /<code>inline<\/code>/);
});

test('renderMarkdown: 代码块内的危险链接不被渲染为链接', () => {
    const md = '```\n[点我](javascript:alert(1))\n```';
    const html = renderMarkdown(md);
    assert.doesNotMatch(html, /<a /);
    assert.match(html, /\[点我\]\(javascript:alert\(1\)\)/);
});

test('renderMarkdown: 图片与链接的渲染顺序正确', () => {
    const md = '![图](https://example.com/a.png) 和 [链接](https://example.com/b)';
    const html = renderMarkdown(md);
    assert.match(html, /<img src="https:\/\/example\.com\/a\.png"/);
    assert.match(html, /<a href="https:\/\/example\.com\/b"/);
});
