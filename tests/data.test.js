/* ============================================
   点工Caoxu - 归档数据工具函数单元测试
   运行：node --test tests/
   ============================================ */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    getActiveBlogs,
    getArchivedBlogs,
    flattenArchivedArticles
} = require('../js/data.js');

test('getActiveBlogs / getArchivedBlogs: 按 archived 字段过滤', () => {
    const blogs = [
        { id: 'a', archived: true },
        { id: 'b', archived: false },
        { id: 'c' } // 无字段视为未归档
    ];
    assert.deepEqual(getActiveBlogs(blogs).map(b => b.id), ['b', 'c']);
    assert.deepEqual(getArchivedBlogs(blogs).map(b => b.id), ['a']);
});

test('getActiveBlogs / getArchivedBlogs: 空数组与空对象', () => {
    assert.deepEqual(getActiveBlogs([]), []);
    assert.deepEqual(getArchivedBlogs([]), []);
    assert.deepEqual(getActiveBlogs([{ id: 'x' }]).map(b => b.id), ['x']);
    assert.deepEqual(getArchivedBlogs([{ id: 'x' }]), []);
});

test('flattenArchivedArticles: 深度遍历并携带文件夹路径', () => {
    const tree = [
        { type: 'folder', name: '前端基础', children: [
            { type: 'article', id: 'tut-1-1', name: 'HTML 入门', file: 'frontend-basics/01-html-intro.md', archived: true },
            { type: 'article', id: 'tut-1-2', name: 'CSS 选择器详解', file: 'frontend-basics/02-css-selectors.md' }
        ]},
        { type: 'folder', name: 'JavaScript', children: [
            { type: 'folder', name: 'ES6+ 新特性', children: [
                { type: 'article', id: 'tut-2-1-1', name: '箭头函数', file: 'javascript/es6/01-arrow-template.md', archived: true }
            ]},
            { type: 'article', id: 'tut-2-2', name: 'DOM 操作基础', file: 'javascript/01-dom-basics.md', archived: true }
        ]},
        { type: 'article', id: 'tut-3', name: '顶层文章', file: 'top.md', archived: true }
    ];

    const list = flattenArchivedArticles(tree);
    assert.deepEqual(list.map(x => x.name), ['HTML 入门', '箭头函数', 'DOM 操作基础', '顶层文章']);
    assert.equal(list[0].folderPath, '前端基础');
    assert.equal(list[1].folderPath, 'JavaScript / ES6+ 新特性');
    assert.equal(list[2].folderPath, 'JavaScript');
    assert.equal(list[3].folderPath, '');
    // 每条都携带 id 与 file 供跳转使用
    assert.equal(list[0].id, 'tut-1-1');
    assert.equal(list[0].file, 'frontend-basics/01-html-intro.md');
    assert.equal(list[2].id, 'tut-2-2');
});

test('flattenArchivedArticles: 空树与无归档', () => {
    assert.deepEqual(flattenArchivedArticles([]), []);
    assert.deepEqual(flattenArchivedArticles(null), []);
    assert.deepEqual(flattenArchivedArticles([{ type: 'article', name: 'A' }]), []);
});
