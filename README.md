# CaoxuBlog

一个纯静态的个人博客系统，使用原生 HTML、CSS 和 JavaScript 构建，零框架、零构建工具。博客与教程内容以 Markdown 文件管理，配合清单 JSON 和自动生成脚本，实现"改文件即发布"的轻量内容工作流。

## 功能特性

- **首页**：置顶博客区（最多 3 条）+ 最新博客区（按创建时间倒序 6 条，自动排除置顶避免重复）
- **博客页**：按创建时间倒序排列；支持**关键词搜索**、**标签筛选**与**分页**（每页 10 条）；详情页 Markdown 渲染，展示创建/修改时间、阅读量、点赞，并提供上一篇/下一篇导航；URL 参数（`?id=`）同步与返回按钮
- **教程页**：左侧三级目录树（文件夹可折叠，文章按文件名正序），默认打开第一篇并高亮当前文章；右侧评论区
- **关于我页**：Markdown 渲染个人信息
- **代码块**：语言标签 + 行号 + 一键复制按钮 + [highlight.js](https://highlightjs.org/) 语法高亮（CDN 引入，亮/暗两套样式随站点主题自动切换）
- **主题切换**：暗色 / 亮色一键切换；记忆用户选择，未手动设置时自动跟随系统偏好（`prefers-color-scheme`）
- **评论系统**：内置本地评论（localStorage 持久化、按文章 ID 隔离、时间正序、敏感词过滤）；可选接入 Waline 获得全网共享评论、点赞与真实阅读量
- **鼠标特效**：淡绿色半透明光点跟随鼠标、渐变消散；节流渲染、数量上限 100、支持触屏
- **设计风格**：素雅浅色系 + 暗色主题，黑白配色、简约线性 SVG 图标
- **响应式**：适配桌面端与移动端，超小屏自动隐藏导航标语，尊重 `prefers-reduced-motion`
- **错误提示**：`file://` 协议下数据请求被拦截时，页面内置友好提示并引导使用 HTTP 服务

## 技术栈

| 部分 | 技术 |
|------|------|
| 前端 | 原生 HTML5 / CSS3 / JavaScript（ES6+），零框架零依赖 |
| 内容 | Markdown 文件 + `index.json` 清单，浏览器端 `fetch` 实时加载（`cache: 'no-cache'` 保证发布即时生效） |
| Markdown 渲染 | 自研行扫描解析器（`js/utils.js`），支持标题、列表、代码块、表格、引用、图片、链接、行内格式 |
| 代码高亮 | highlight.js 11（jsDelivr CDN），亮/暗双主题随站点主题切换 |
| 主题系统 | CSS 变量 + `<html data-theme>` 属性，localStorage 记忆 + 跟随系统偏好 |
| 数据持久化 | 评论、点赞、阅读量、主题均存于访客浏览器 localStorage（`safeStorage*` 容错封装） |
| 评论（可选） | Waline v3（unpkg CDN 按需加载），需自建服务端 |
| 内容索引生成 | Node.js 脚本 `build-index.js`（零依赖，仅用 `fs` / `path`） |
| 部署 | 任意静态服务器（Nginx / COS / EdgeOne Pages / GitHub Pages 等） |

## 项目结构

```
caoxublog/
├── index.html              # 首页
├── blog.html               # 博客页
├── tutorial.html           # 教程页
├── about.html              # 关于我页
├── blogs/                  # 博客 Markdown 文件
│   ├── index.json          # 博客清单（标题/摘要/时间/置顶/可选标签）
│   ├── 01-static-blog.md
│   └── ...
├── tutorials/              # 教程 Markdown 文件（支持三级文件夹）
│   ├── index.json          # 目录树清单
│   ├── frontend-basics/
│   └── javascript/
├── css/
│   ├── style.css           # 全局样式（导航/卡片/Markdown/评论区/主题变量）
│   ├── blog.css            # 博客页布局
│   ├── tutorial.css        # 教程页布局
│   ├── about.css           # 关于我页
│   └── mouse-trail.css     # 鼠标光点特效
├── js/
│   ├── data.js             # 数据加载（fetch 清单和 md）+ 评论/点赞/阅读量存储 + Waline 配置
│   ├── utils.js            # Markdown 渲染器 + 代码块增强 + 敏感词过滤 + 工具函数
│   ├── theme.js            # 暗色/亮色主题切换
│   ├── home.js             # 首页逻辑（置顶 + 最新）
│   ├── blog.js             # 博客页逻辑（搜索/标签/分页/详情/评论）
│   ├── tutorial.js         # 教程页逻辑（目录树/文章切换/评论）
│   ├── about.js            # 关于我页逻辑
│   ├── waline.js           # Waline 评论系统集成（可选）
│   └── mouse-trail.js      # 鼠标光点特效
└── build-index.js          # index.json 自动生成脚本
```

## 快速开始

由于内容通过 `fetch` 加载，需要通过 HTTP 服务访问（**不能直接双击 HTML 文件**，浏览器会拦截 `file://` 下的数据请求）：

```bash
# 任选一种方式启动本地服务
python -m http.server 8080
# 或
npx serve .
```

浏览器打开 `http://localhost:8080` 即可。

## 内容管理

### 新增一篇博客

1. 在 `blogs/` 放入 `06-xxx.md`（数字前缀控制文件排序）
2. 运行 `node build-index.js`，脚本自动在清单中添加占位条目
3. 编辑 `blogs/index.json`，填写该条目的 `title` 和 `excerpt`
4. 需要置顶则将 `pinned` 改为 `true`（建议最多 3 篇）
5. （可选）添加 `tags` 字段，如 `"tags": ["CSS", "前端"]`，博客页会自动生成标签筛选栏

### 新增一篇教程

1. 在 `tutorials/` 对应文件夹放入 md 文件（新文件夹会自动识别，最多三级）
2. 运行 `node build-index.js`，自动挂载到目录树
3. 新文章/新文件夹可在 `tutorials/index.json` 中重命名显示名

### 修改 / 删除

- 修改：直接编辑 md 文件，运行脚本后 `updatedAt` 自动更新为文件修改时间
- 删除：删除 md 文件，运行脚本后清单条目自动移除

### `build-index.js` 的保留规则

- 博客按文件名匹配：`id`、`title`、`excerpt`、`createdAt`、`pinned` 全部保留，仅 `updatedAt` 跟随文件修改时间
- 教程按文件路径匹配：文件夹中文名、文章名保留
- 注意：git clone、解压 zip 等操作会刷新文件 mtime，导致所有 `updatedAt` 变为同一时间，此时需手动修正清单

## 评论与统计

### 内置本地评论（默认）

评论按文章 ID 隔离存储于访客浏览器 localStorage，时间正序展示，支持昵称。提交时会自动进行**敏感词过滤**：命中词替换为 `*` 并提示用户，过滤后内容正常发布。敏感词表维护在 `js/utils.js` 的 `SENSITIVE_WORDS` 数组中，可按运营规范自行增删。

### 点赞与阅读量

- **点赞**：每设备每篇文章仅可点赞 1 次，且不可取消（localStorage 记录；纯前端无真实 IP，如需基于真实 IP 限制请启用 Waline 或自建后端）。初始值为 0
- **阅读量**：使用 localStorage 记录本机累计访问次数，初始值为 0

### 启用 Waline 评论系统（可选）

如需全网共享评论、点赞与阅读量统计，可接入 [Waline](https://waline.js.org/)：

1. 按 Waline 官方文档部署服务端（数据可存 MySQL / LeanCloud 等）。**腾讯云**推荐方案：将 Waline 部署为云函数 / 容器，数据库使用云数据库 MySQL
2. 打开 `js/data.js`，将 `WALINE_SERVER` 改为你的 Waline 服务端地址，例如：

   ```js
   const WALINE_SERVER = 'https://waline.your-domain.com';
   ```

3. 留空 `''` 则自动回退到内置本地评论。启用后，博客 / 教程详情页的评论区、点赞 reaction 与阅读量（pageview）均由 Waline 接管（前端脚本与样式由 unpkg CDN 按需加载）

## 部署

本项目是纯静态站点，可部署到任何静态托管服务：

- **腾讯云轻量应用服务器 + Nginx**：上传整个目录到 `/var/www/caoxublog`，Nginx `root` 指向该目录即可
- **腾讯云 COS 静态网站托管** / **EdgeOne Pages** / **GitHub Pages**：直接上传全部文件

注意：发布前记得先运行 `node build-index.js` 更新清单。

## 开发历程

1. **页面骨架**：四个 HTML 页面 + 统一顶部导航栏 + 简约线性 SVG 图标
2. **全局样式**：米白/浅灰/淡绿的素雅配色与 CSS 变量体系（颜色/圆角/阴影/间距），卡片、按钮、Markdown 排版等基础组件
3. **自研 Markdown 渲染器**：占位符提取 → 行扫描分块 → 还原的三段式解析，支持代码块、表格、列表、引用等语法；后修复 CRLF 换行导致代码块匹配失败的关键 bug
4. **数据层演进**：从示例数据内嵌 + localStorage 缓存（含版本号自动刷新）重构为 `blogs/`、`tutorials/` 文件夹 + `index.json` 清单 + `fetch` 实时加载，内容更新即时生效
5. **博客页功能**：列表倒序、置顶标识、创建/修改时间展示、URL 参数同步、移动端滚动定位；后新增搜索、标签筛选与分页
6. **教程页功能**：三级目录树渲染与折叠动画（修复嵌套文件夹高度裁剪 bug）、文章按文件名正序、默认打开第一篇
7. **代码块增强**：highlight.js 语法高亮 + 语言标签 + 行号 + 一键复制（含 Clipboard API 降级方案）
8. **主题系统**：CSS 变量 + `data-theme` 的暗色/亮色切换，localStorage 记忆 + 跟随系统偏好，高亮样式随主题联动
9. **评论系统**：按文章 ID 隔离存储于 localStorage、时间正序、昵称、敏感词过滤
10. **鼠标特效**：节流 + 随机尺寸光点 + CSS 渐变消散动画，限制最大数量，支持触屏
11. **布局打磨与质量优化**：评论区重构为 flex 布局内嵌、正文宽度统一、容器最大宽度 1400px；修复表格渲染、列表重复包裹、图片语法失效等问题；补充可访问性（aria、键盘可达、语义化链接）、`prefers-reduced-motion`、meta description
12. **工程化**：`build-index.js` 自动扫描 md 文件生成清单，实现"改文件即发布"；集成可选 Waline

## AI 协作说明

本项目由 **WorkBuddy** 和 **DeepSeek-V4-Pro** 编写完成，并通过 **Kimi-K3** 做了较大的优化，包括：Markdown 渲染器重写与 CRLF 兼容修复、布局重构（评论区嵌入 flex 布局、正文宽度统一）、数据层从 localStorage 缓存重构为 md 文件实时加载、可访问性增强，以及 `build-index.js` 内容索引自动化脚本。

## License

MIT
