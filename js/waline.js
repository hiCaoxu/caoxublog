/* ============================================
   CaoxuBlog - Waline 评论系统集成
   --------------------------------------------------
   在 data.js 中配置 WALINE_SERVER 即可启用 Waline：
     - 留空 ''  -> 使用本站内置本地评论
     - 填入地址  -> 使用 Waline（评论 / 点赞 / 阅读量统计）

   Waline 官方文档：https://waline.js.org/
   腾讯云部署可参考 README.md —— 将 Waline 服务端部署为云函数 / 容器，
   数据库使用 MySQL（云数据库）或 LeanCloud / 自建。
   ============================================ */

// 是否已加载过 Waline 脚本（全局只加载一次）
let walineScriptLoaded = false;
let walineInstance = null;

/**
 * 生成 Waline 容器 HTML
 * @param {string} pageId 文章/教程的唯一 ID，作为 Waline 的 path
 */
function renderWalineComments(pageId) {
    // 用文章 ID 作为 path，保证不同文章评论隔离
    const path = encodeURIComponent(pageId);
    return `
        <div class="waline-wrapper">
            <div id="waline" data-waline-path="${path}"></div>
        </div>
    `;
}

/**
 * 初始化 Waline（评论 + 点赞 reaction + 阅读量 pageview）
 * @param {string} pageId
 */
async function initWaline(pageId) {
    if (!isWalineEnabled()) return;

    const container = document.getElementById('waline');
    if (!container) return;

    // 设置 path（Waline 用它区分不同页面）
    container.setAttribute('data-path', '/' + pageId);

    // 动态加载 Waline 脚本（仅一次）
    if (!walineScriptLoaded) {
        await loadWalineScript();
        walineScriptLoaded = true;
    }

    if (typeof window.Waline === 'undefined') {
        console.error('Waline 脚本加载失败，请检查 WALINE_SERVER 配置或网络');
        return;
    }

    // 销毁旧实例后重建（切换文章时）
    if (walineInstance && typeof walineInstance.destroy === 'function') {
        try { walineInstance.destroy(); } catch (e) { /* ignore */ }
    }

    walineInstance = window.Waline.init({
        el: '#waline',
        serverURL: WALINE_SERVER,
        path: '/' + pageId,
        pageview: true,        // 开启阅读量统计（需服务端开启 pageview）
        reaction: true,        // 开启点赞 reaction（替代本地点赞按钮）
        comment: true,
        locale: {
            placeholder: '欢迎留下你的评论～'
        }
    });
}

/**
 * 加载 Waline 前端脚本
 */
function loadWalineScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // 自托管 UMD 构建（vendor/waline/），避免依赖境外 CDN（unpkg 在中国大陆经常不可达）。
        // 注意：必须使用 UMD 构建（waline.umd.js），ESM 构建（waline.js）无法直接用经典 <script> 加载。
        script.src = 'vendor/waline/waline.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Waline 脚本加载失败'));
        document.head.appendChild(script);

        // 加载 Waline 样式
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'vendor/waline/waline.css';
        document.head.appendChild(link);
    });
}
