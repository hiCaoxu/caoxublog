# CSS 选择器详解

## 基础选择器

### 元素选择器

```css
p { color: #333; }
div { margin: 10px; }
```

### 类选择器

```css
.highlight { background: yellow; }
.card { border-radius: 8px; }
```

### ID 选择器

```css
#header { height: 60px; }
#main-content { padding: 20px; }
```

## 组合选择器

| 选择器 | 说明 | 示例 |
|--------|------|------|
| 后代 | 选择所有后代 | `div p` |
| 子元素 | 仅直接子元素 | `div > p` |
| 相邻兄弟 | 紧邻的兄弟 | `h1 + p` |
| 通用兄弟 | 所有后续兄弟 | `h1 ~ p` |

## 属性选择器

```css
/* 含有 title 属性 */
[title] { cursor: help; }

/* 精确匹配 */
[type="text"] { border: 1px solid; }

/* 开头匹配 */
[href^="https"] { color: green; }

/* 结尾匹配 */
[src$=".png"] { border: none; }
```

## 伪类和伪元素

```css
a:hover { color: blue; }
li:first-child { font-weight: bold; }
p::first-line { font-size: 1.2em; }
::selection { background: #5d7d61; }
```

## 优先级规则

1. !important > 内联 > ID > 类 > 元素
2. 相同优先级时，后定义的生效
3. 尽量使用类选择器，避免过度使用 ID
