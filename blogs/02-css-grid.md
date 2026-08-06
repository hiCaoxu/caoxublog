## CSS Grid 简介

CSS Grid Layout 是 CSS 中最强大的布局系统。它是一个二维系统，可以同时处理列和行。

## 基本概念

### 网格容器

通过设置 `display: grid` 来创建一个网格容器：

```css
.container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto;
    gap: 20px;
}
```

### 网格项目

网格容器的直接子元素会自动成为网格项目。

## 常用属性

| 属性 | 说明 |
|------|------|
| `grid-template-columns` | 定义列轨道 |
| `grid-template-rows` | 定义行轨道 |
| `gap` | 设置网格间距 |
| `grid-column` | 控制项目跨列 |
| `grid-row` | 控制项目跨行 |

## 实战示例

### 博客卡片布局

```css
.blog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
}
```

使用 `auto-fill` 和 `minmax()` 可以自动适配不同屏幕尺寸，无需编写媒体查询。

## 总结

CSS Grid 是现代 Web 布局的基石，掌握它可以大大提升布局效率和灵活性。
