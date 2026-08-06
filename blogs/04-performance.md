## 为什么性能优化很重要

页面加载速度直接影响用户体验和转化率。研究表明，加载时间每增加 1 秒，转化率可能下降 7%。

## 关键优化策略

### 1. 图片优化

- 使用 WebP 格式替代 JPEG/PNG
- 实现懒加载（lazy loading）
- 使用响应式图片（srcset）

```html
<img src="photo.webp" loading="lazy" alt="photo"
     srcset="photo-400.webp 400w, photo-800.webp 800w">
```

### 2. 代码分割

使用动态 import 实现按需加载：

```javascript
const module = await import('./heavy-module.js');
```

### 3. 缓存策略

合理设置 HTTP 缓存头，利用 CDN 加速静态资源分发。

### 4. 关键渲染路径优化

- 内联关键 CSS
- 延迟加载非关键 JavaScript
- 减少 DOM 深度

## 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| FCP | < 1.8s | 首次内容绘制 |
| LCP | < 2.5s | 最大内容绘制 |
| TTI | < 3.8s | 可交互时间 |
| CLS | < 0.1 | 累积布局偏移 |

## 总结

性能优化是一个持续的过程。定期使用 Lighthouse 等工具进行审计，持续改进网站性能。
