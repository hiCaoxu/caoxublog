# CaoxuBlog

一个纯静态的个人博客系统，使用原生 HTML、CSS 和 JavaScript 构建，零框架、零构建工具。博客与教程内容以 Markdown 文件管理，配合清单 JSON 和自动生成脚本，实现"改文件即发布"的轻量内容工作流。

## 功能特性

- **首页**：置顶博客区（最多 3 条）+ 最新博客区（按创建时间倒序 6 条，自动排除置顶避免重复）
- **博客页**：按创建时间倒序排列；支持**全文搜索**（标题/摘要/标签/正文）、**标签筛选**与**分页**（每页 10 条）；详情页 Markdown 渲染，展示创建/修改时间、阅读量、点赞，并提供上一篇/下一篇导航；URL 参数（`?id=`）同步，详情页支持浏览器前进/后退（`pushState`/`popstate`）
- **教程页**：左侧三级目录树（文件夹可折叠，文章按文件名正序）+ 教程全文搜索；默认打开第一篇并高亮当前文章；右侧评论区
- **归档页**：集中展示已归档内容；博客/教程页均有归档按钮（`archive.html?type=blog|tutorial` 预选 Tab）；归档后文章自动从首页、博客列表、教程目录中隐藏，仅在归档页可见
- **关于我页**：Markdown 渲染个人信息，内容由根目录 `about.md` 管理，改文件即发布
- **代码块**：语言标签 + 行号 + 一键复制按钮 + [highlight.js](https://highlightjs.org/) 语法高亮（脚本按需懒加载，仅在存在代码块时引入；亮/暗两套样式随站点主题切换）
- **文章目录（TOC）**：详情页根据正文标题自动生成可点击目录（带锚点平滑滚动）；正文图片懒加载（`loading="lazy"`）
- **SEO 友好**：`build-index.js` 生成每篇文章的静态页（`post/*.html`，含 `canonical` / Open Graph）+ `sitemap.xml` / `robots.txt` / `feed.xml`（RSS）+ 全文搜索索引 `search-index.json`，正文可被搜索引擎收录；详情页标题与描述随文章动态更新
- **主题切换**：暗色 / 亮色一键切换；记忆用户选择，未手动设置时自动跟随系统偏好（`prefers-color-scheme`）
- **评论系统**：内置本地评论（localStorage 持久化、按文章 ID 隔离、时间正序、敏感词过滤、单篇条数上限）；可选接入 Waline 获得全网共享评论、点赞与真实阅读量
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
| 代码高亮 | highlight.js 11（**自托管于 `vendor/highlightjs/`**，不再依赖境外 CDN），脚本按需懒加载，亮/暗双主题随站点主题切换 |
| 主题系统 | CSS 变量 + `<html data-theme>` 属性，localStorage 记忆 + 跟随系统偏好 |
| 数据持久化 | 评论、点赞、阅读量、主题均存于访客浏览器 localStorage（`safeStorage*` 容错封装） |
| 评论（可选） | Waline v3（**自托管 UMD 构建于 `vendor/waline/`**，不再依赖 unpkg），需自建服务端 |
| 内容索引生成 | Node.js 脚本 `build-index.js`（零依赖），生成清单 + 静态页 + 搜索索引 + `sitemap.xml`/`robots.txt`/`feed.xml` |
| 单元测试 | Node 内置 test runner（`node:test`，零第三方依赖） |
| CI | GitHub Actions（push/PR 触发 `node --test` + `build-index.js` 冒烟） |
| 部署 | 任意静态服务器（Nginx / COS / EdgeOne Pages / GitHub Pages 等） |

## 项目结构

```
caoxublog/
├── index.html              # 首页
├── blog.html               # 博客页
├── tutorial.html           # 教程页
├── archive.html            # 归档页（已归档博客/教程）
├── about.html              # 关于我页
├── about.md                # 关于我页内容（Markdown，改文件即发布）
├── blogs/                  # 博客 Markdown 文件
│   ├── index.json          # 博客清单（标题/摘要/时间/置顶/归档/可选标签）
│   ├── 01-static-blog.md
│   └── ...
├── tutorials/              # 教程 Markdown 文件（支持三级文件夹）
│   ├── index.json          # 目录树清单
│   ├── frontend-basics/
│   └── javascript/
├── post/                   # 生成的静态文章页（build-index.js 自动生成，供收录）
│   ├── blog-1.html
│   ├── tut-1-1.html
│   └── ...
├── sitemap.xml             # 站点地图（自动生成）
├── robots.txt              # 爬虫规则（自动生成）
├── feed.xml                # RSS 订阅源（自动生成）
├── search-index.json       # 全文搜索索引（自动生成）
├── nginx.conf.example      # Nginx 部署示例（含 gzip/缓存/安全头）
├── .gitignore              # Git 忽略规则
├── .github/workflows/      # GitHub Actions CI（测试 + build-index 冒烟）
├── css/
│   ├── style.css           # 全局样式（导航/卡片/Markdown/评论区/主题变量/归档按钮）
│   ├── blog.css            # 博客页布局
│   ├── tutorial.css        # 教程页布局
│   ├── archive.css         # 归档页布局
│   ├── about.css           # 关于我页
│   └── mouse-trail.css     # 鼠标光点特效
├── js/
│   ├── data.js             # 数据加载（fetch 清单和 md）+ 评论/点赞/阅读量存储 + 归档筛选工具 + Waline 配置
│   ├── utils.js            # Markdown 渲染器 + 代码块增强 + 敏感词过滤 + 目录生成 + 工具函数
│   ├── theme.js            # 暗色/亮色主题切换
│   ├── home.js             # 首页逻辑（置顶 + 最新）
│   ├── blog.js             # 博客页逻辑（搜索/标签/分页/详情/评论/目录）
│   ├── tutorial.js         # 教程页逻辑（目录树/文章切换/评论/目录）
│   ├── archive.js          # 归档页逻辑（Tab 切换/归档列表渲染）
│   ├── about.js            # 关于我页逻辑（加载根目录 about.md）
│   ├── waline.js           # Waline 评论系统集成（可选）
│   └── mouse-trail.js      # 鼠标光点特效
└── build-index.js          # 清单 + 静态页 + sitemap/robots/feed 生成脚本
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

> 每次运行 `node build-index.js` 都会同步重新生成每篇文章的静态页（`post/*.html`）、全文搜索索引（`search-index.json`）与 `sitemap.xml` / `robots.txt` / `feed.xml`，并自动清理已删除文章的残留静态页，无需手动维护。

### 关于我页

关于我页内容由根目录 `about.md` 管理：直接编辑该文件保存后刷新即可生效（无需运行脚本）。`js/data.js` 中保留了同名默认内容，仅作为 `about.md` 加载失败时的回退。

### 归档文章

将文章从公开列表（首页 / 博客列表 / 教程目录）中隐藏，仅在归档页（`archive.html`）可见：

1. 博客：在 `blogs/index.json` 中将该条目 `archived` 改为 `true`
2. 教程：在 `tutorials/index.json` 中将该文章节点的 `archived` 改为 `true`
3. 运行 `node build-index.js` 后标记保留（不会因重新生成清单而丢失）

取消归档改为 `false` 即可。归档文章仍可通过归档页点击阅读（跳转 `blog.html?id=` / `tutorial.html?id=`），但不再出现在列表与导航中。

### `build-index.js` 的保留规则

- 博客按文件名匹配：`id`、`title`、`excerpt`、`createdAt`、`pinned`、`archived`、`tags` 全部保留，仅 `updatedAt` 跟随文件修改时间
- 教程按文件路径匹配：文件夹中文名、文章名、`archived` 保留
- 注意：git clone、解压 zip 等操作会刷新文件 mtime，导致所有 `updatedAt` 变为同一时间，此时需手动修正清单

## 测试

Markdown 渲染器（含 XSS 协议白名单）与归档数据工具函数使用 Node 内置 test runner 做单元测试，零第三方依赖：

```bash
npm test          # 等价于 node --test
```

覆盖：协议白名单（http/https/mailto/tel + 站内相对路径）、危险协议拦截（javascript/data/vbscript/file）、HTML 实体与双重编码混淆绕过、属性引号逃逸、标签/alt 文本转义、标题锚点 id 生成、归档过滤（`getActiveBlogs` / `getArchivedBlogs` / `flattenArchivedArticles`）、Markdown 转纯文本（`stripMarkdown`，全文搜索索引用），以及标题、列表、引用、表格、代码块（CRLF 兼容）等基础语法回归。

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

3. 留空 `''` 则自动回退到内置本地评论。启用后，博客 / 教程详情页的评论区、点赞 reaction 与阅读量（pageview）均由 Waline 接管。Waline 前端脚本与样式已**自托管在 `vendor/waline/`**（UMD 构建），不再从 unpkg 加载，中国大陆访问稳定。

## 部署

本项目是纯静态站点，**所有前端依赖（highlight.js、Waline）均已自托管在 `vendor/` 目录，不再依赖任何境外 CDN（jsDelivr / unpkg）**，因此在中国大陆（含腾讯云）网络环境下可稳定加载。可部署到任意静态托管服务：

- **腾讯云轻量应用服务器 / CVM + Nginx**：上传整个目录到 `/var/www/caoxublog`，参考 `nginx.conf.example` 配置（已含 HTTPS 跳转、gzip、安全头、自托管 CSP）。
- **腾讯云 COS 静态网站托管** / **EdgeOne Pages**：直接上传全部文件（含 `vendor/`、`post/` 生成产物）。EdgeOne Pages 构建命令填 `node build-index.js`、输出目录为项目根；COS 在控制台配置缓存规则（见 `nginx.conf.example` 末尾说明）。
- **GitHub Pages** 等：同样适用。

发布前必须运行一次 `node build-index.js` 更新清单、静态页与 SEO 文件（见下文环境变量）。

### 站点域名配置（sitemap / canonical / RSS）

`build-index.js` 通过环境变量读取站点域名，**不再硬编码**：

```bash
SITE_URL=https://blog.your-domain.com node build-index.js
```

`sitemap.xml`、`robots.txt`、`feed.xml` 以及每篇文章的 `canonical` / `og:url` 都基于它生成**绝对地址**。未设置 `SITE_URL` 时脚本会告警并使用占位域名，请在部署前务必指定真实域名后重新运行。

### 资源版本与缓存刷新

`build-index.js` 的 `ASSET_VERSION` 默认取**当前日期（YYYYMMDD）**，每次构建自动变化，并会把 5 个主 HTML 页面里的 `?v=` 统一替换为该版本号（无需手动递增）。如需强制刷新，可用环境变量覆盖：`ASSET_VERSION=20260816 node build-index.js`。带版本号的 JS/CSS 走长缓存，页面与数据 `no-cache`，发布即时生效。

### 索引文件防丢失

运行 `build-index.js` 时，若 `blogs/index.json` / `tutorials/index.json` 可正常解析，会先备份为同名 `.bak`；若文件损坏无法解析，会备份为 `.corrupt` 并基于 md 文件重新生成（此时手填的标题/标签等会丢失）。恢复方式：用最近的 `.bak` 覆盖原文件后重新运行脚本即可。`.bak` / `.corrupt` 已被 `.gitignore` 忽略，不会提交。

### Nginx 部署参考

项目根目录提供了 `nginx.conf.example`（已针对腾讯云优化）：包含 HTTP→HTTPS 跳转、gzip、静态资源长缓存与数据不缓存、安全响应头（`X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `X-XSS-Protection`，以及可开启的 HSTS 与严格 CSP）。由于依赖已全部自托管，CSP 可设为 `default-src 'self'`；注意 `post/*.html` 静态文章页含一段内联脚本，故 `script-src` 保留 `'unsafe-inline'`。部署时按需修改 `server_name` 与证书路径，复制为 `/etc/nginx/conf.d/caoxublog.conf` 后 `nginx -t && systemctl reload nginx`。

### 持续集成（CI）

`.github/workflows/ci.yml` 在 push / PR 到 `main` 时自动运行 `node --test`（单元测试）与 `node build-index.js`（生成脚本冒烟测试），用于在合并前发现回归。

### 浏览器缓存

更新代码后访客浏览器可能仍使用缓存的旧版脚本/样式。本站所有本地 CSS/JS 引用均带版本号参数（如 `css/style.css?v=20260816`）。**每次运行 `node build-index.js` 会自动把 5 个主 HTML 页面里的 `?v=` 统一刷新为当天日期**（可用 `ASSET_VERSION=20260816` 环境变量强制指定），无需手动逐个修改即可强制访客拉取新版资源；带版本号的 JS/CSS 走长缓存，页面与数据 `no-cache`，发布即时生效。开发者本机调试时，直接 Ctrl+F5 强制刷新即可。

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
13. **安全加固**：Markdown 渲染器增加 URL 协议白名单（防 XSS）+ 单元测试；补充标签筛选与归档功能
14. **交互完善**：详情页改用 `pushState`/`popstate` 支持浏览器前进后退；去除内联 `onclick` 改为事件委托；补齐 aria（`aria-current` / `aria-expanded` / `aria-pressed` / `aria-hidden`）
15. **SEO 与阅读体验**：生成静态文章页 + sitemap/RSS；详情页动态 title/meta；文章目录（TOC）与图片懒加载
16. **性能与工程化收尾**：highlight.js 改为按需懒加载；新增全文搜索（博客正文 + 教程搜索）；本地评论加条数上限；消除 about.md 双写；补充 `.gitignore`、Nginx 示例、GitHub Actions CI
17. **腾讯云适配（依赖自托管与构建可配置化）**：将 highlight.js 与 Waline 自托管至 `vendor/`，彻底移除 jsDelivr / unpkg 等境外 CDN 依赖（其中 Waline 由错误的 ESM 构建改为 UMD 构建，修复经典 `<script>` 加载报错）；`build-index.js` 的 `SITE_URL` / `ASSET_VERSION` 改为环境变量驱动并自动刷新 HTML 版本戳；`blogs/index.json` / `tutorials/index.json` 增加损坏备份（`.bak` / `.corrupt`）；`nginx.conf.example` 针对腾讯云加固（HTTPS 跳转、安全响应头、自托管 CSP）；部署与 README 文档同步更新

## AI 协作说明

本项目由 **WorkBuddy** 和 **DeepSeek-V4-Pro** 编写完成，并通过 **Kimi-K3** 做了较大的优化，包括：Markdown 渲染器重写与 CRLF 兼容修复、布局重构（评论区嵌入 flex 布局、正文宽度统一）、数据层从 localStorage 缓存重构为 md 文件实时加载、可访问性增强，以及 `build-index.js` 内容索引自动化脚本。

项目上线后的持续迭代由 **DeepSeek Harness**（基于 DeepSeek-V4 的智能体框架）协助完成，包括：导航标语与鼠标光点特效的视觉微调、README 文档的全面优化，以及 Markdown 渲染器 XSS 协议白名单安全加固与其单元测试（`node --test`，零依赖）。

## License

MIT
