# HTML 入门指南

## 什么是 HTML？

HTML（HyperText Markup Language）是构建网页的标准标记语言。它描述了网页的结构和内容。

## 基本结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>我的网页</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>这是我的第一个网页。</p>
</body>
</html>
```

## 常用标签

### 文本标签

- `<h1>` 到 `<h6>`：标题
- `<p>`：段落
- `<span>`：行内文本
- `<strong>`：加粗
- `<em>`：斜体

### 结构标签

- `<header>`：页头
- `<nav>`：导航
- `<main>`：主体内容
- `<footer>`：页脚
- `<section>`：区块
- `<article>`：文章

### 链接和图片

```html
<a href="https://example.com">访问链接</a>
<img src="image.jpg" alt="描述文字">
```

## 表单元素

```html
<form>
    <input type="text" placeholder="请输入">
    <input type="email" placeholder="邮箱">
    <textarea rows="3"></textarea>
    <button type="submit">提交</button>
</form>
```

## 学习建议

1. 先理解标签的语义，再学习样式
2. 多写多练，熟能生巧
3. 查看优秀网站的源码学习
