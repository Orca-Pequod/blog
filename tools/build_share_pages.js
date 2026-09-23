/**
 * 静态分享页构建脚本
 * ------------------------------------------------------------------
 * 背景：博客是 SPA（hash 路由 #/article/xxx），微信/搜索引擎爬虫不执行 JS，
 *       抓不到文章内容，也无法生成分享卡片预览。
 *
 * 方案：读取 data/articles.js，为每篇文章生成独立的静态 HTML
 *       articles/<id>.html，其中：
 *         - <head> 内嵌该文章专属的 Open Graph 标签（微信据此生成卡片）
 *         - <body> 内嵌渲染好的正文 HTML（爬虫可读，利于 SEO）
 *         - 页面可直接阅读，导航链接回到 SPA
 *
 * 用法：
 *   node tools/build_share_pages.js              # 生成全部文章
 *   node tools/build_share_pages.js --only=<id>  # 只生成指定文章（调试用）
 *   node tools/build_share_pages.js --site=<url> # 覆盖站点根地址
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const marked = require(path.join(__dirname, '..', 'js', 'marked.min.js'));
const sanitizeHtml = require('sanitize-html');
const ARTICLES = require(path.join(__dirname, '..', 'data', 'articles.js'));

const BASE = path.resolve(__dirname, '..');
const OUT_DIR = path.join(BASE, 'articles');
const DEFAULT_SITE = 'https://orca-pequod.github.io/blog';
const ARTICLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ARTICLE_ID_LENGTH = 100;
// 正方形封面：微信对话框/朋友圈缩略图均为 1:1 居中裁剪，方图可零损失显示
const COVER_IMAGE = '/images/og-cover-square.png';

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
const onlyArg = args.find(a => a.startsWith('--only='));
const siteArg = args.find(a => a.startsWith('--site='));
const ONLY_ID = onlyArg ? onlyArg.split('=')[1] : null;
const SITE = (siteArg ? siteArg.split('=').slice(1).join('=') : DEFAULT_SITE).replace(/\/$/, '');

// ---------- 工具函数 ----------
/** HTML 属性转义（用于 og 标签 content） */
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 2026-09-10 -> 2026年9月10日 */
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

/**
 * 文章 ID 会进入路由、URL 和输出文件名，因此只允许简洁的 ASCII slug。
 * 同时检查重复值，避免后生成的文章静默覆盖已有静态页。
 */
function validateArticleIds(articles) {
  const seenIds = new Set();

  articles.forEach((article, index) => {
    const id = article && article.id;

    if (typeof id !== 'string') {
      throw new Error(`第 ${index + 1} 篇文章的 id 必须是字符串`);
    }

    if (
      id.length === 0 ||
      id.length > MAX_ARTICLE_ID_LENGTH ||
      !ARTICLE_ID_PATTERN.test(id)
    ) {
      throw new Error(
        `非法文章 ID：${JSON.stringify(id)}。` +
        `仅允许小写字母、数字和单个连字符分隔，长度不得超过 ${MAX_ARTICLE_ID_LENGTH} 个字符`
      );
    }

    if (seenIds.has(id)) {
      throw new Error(`重复文章 ID：${id}`);
    }

    seenIds.add(id);
  });
}

/** 将文章 ID 转换为输出路径，并做目录边界二次检查。 */
function resolveArticleOutputFile(articleId) {
  const file = path.resolve(OUT_DIR, `${articleId}.html`);

  if (path.dirname(file) !== OUT_DIR) {
    throw new Error(`文章输出路径越界：${articleId}`);
  }

  return file;
}

/** 渲染单篇文章的静态页 */
function buildPage(article) {
  const encodedId = encodeURIComponent(article.id);
  const url = `${SITE}/articles/${encodedId}.html`;
  const image = `${SITE}${COVER_IMAGE}`;
  const rawBody = marked.parse(article.content);
  const body = sanitizeHtml(rawBody, {
    allowedTags: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4',
      'blockquote', 'ul', 'ol', 'li',
      'strong', 'em', 'code', 'pre', 'hr', 'a'
    ],
    allowedAttributes: {
      a: ['href', 'title']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel']
  });
  const dateText = formatDate(article.date);

  const tagsHtml = (article.tags || [])
    .map(t => `<span class="tag">${esc(t)}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(article.title)} | 陈思杰律师</title>
    <meta name="description" content="${esc(article.summary)}">
    <meta name="author" content="${esc(article.author)}">

    <!-- Open Graph：微信/社交平台分享卡片 -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="陈思杰律师 | 法律博客">
    <meta property="og:title" content="${esc(article.title)}">
    <meta property="og:description" content="${esc(article.summary)}">
    <meta property="og:image" content="${esc(image)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="1200">
    <meta property="og:image:alt" content="陈思杰律师 | 专注劳动争议、知识产权、人工智能法律">
    <meta property="og:url" content="${esc(url)}">
    <meta property="og:locale" content="zh_CN">
    <meta property="article:published_time" content="${esc(article.date)}">
    <meta property="article:author" content="${esc(article.author)}">
    ${(article.tags || []).map(t => `<meta property="article:tag" content="${esc(t)}">`).join('\n    ')}

    <!-- 其他平台卡片（兼容非微信场景） -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${esc(article.title)}">
    <meta name="twitter:description" content="${esc(article.summary)}">
    <meta name="twitter:image" content="${esc(image)}">

    <link rel="canonical" href="${esc(url)}">
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <nav class="navbar" id="navbar">
        <div class="nav-container">
            <a href="../index.html#/" class="nav-logo">
                <span class="logo-text">陈思杰</span>
                <span class="logo-sub">律师博客</span>
            </a>
            <ul class="nav-menu">
                <li><a href="../index.html#/">首页</a></li>
                <li><a href="../index.html#/practice">专业领域</a></li>
                <li><a href="../index.html#/tags">标签</a></li>
                <li><a href="../index.html#/about">关于</a></li>
            </ul>
        </div>
    </nav>

    <main class="main-content">
        <div class="article-detail">
            <a href="../index.html#/" class="back-link">&larr; 返回文章列表</a>
            <div class="article-header">
                <div class="category">${esc(article.category)}</div>
                <h1>${esc(article.title)}</h1>
                <div class="meta">
                    <span>${esc(article.author)}</span>
                    <span>${esc(dateText)}</span>
                    <div class="tags">${tagsHtml}</div>
                </div>
            </div>
            <div class="article-body">
${body}
            </div>
            <div class="share-bar">
                <span class="share-label">分享本文</span>
                <button type="button" class="btn-share" onclick="copyShareLink(this)">复制分享链接</button>
                <span class="share-hint">微信内直接从「收藏」转发才会显示图文卡片</span>
                <button type="button" class="share-steps-toggle" onclick="toggleShareSteps(this)">查看步骤</button>
            </div>
            <div class="share-steps" hidden>
                <ol>
                    <li>把链接发到微信任意对话框（此时只显示为纯文本）</li>
                    <li>在微信里<strong>点开</strong>这条链接</li>
                    <li>点右上角「···」→「收藏」</li>
                    <li>返回微信 →「我」→「收藏」→ 长按该条目 → 转发给朋友或分享到朋友圈</li>
                </ol>
                <p>这样转发出去，就是带标题、摘要与封面图的卡片。</p>
            </div>
            <div style="margin-top: 48px; padding: 24px 32px; background: var(--bg-card); border-radius: var(--radius); border-left: 4px solid var(--gold); box-shadow: var(--shadow);">
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">本文作者</p>
                <p style="font-family: var(--font-serif); font-size: 1.1rem; font-weight: 600; color: var(--navy); margin-bottom: 4px;">${esc(article.author)}</p>
                <p style="font-size: 0.88rem; color: var(--text-light);">浙江律凡律师事务所 AI+法律部负责人 | 执业证号：13301202110362404</p>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">如需专业法律服务，请联系：15990034784 | 1701397885@qq.com</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="footer-container">
            <div class="footer-section">
                <h3>陈思杰律师</h3>
                <p>浙江律凡律师事务所 AI+法律部负责人</p>
                <p>执业证号：13301202110362404</p>
                <p class="footer-tagline">平凡人做不平凡事</p>
            </div>
            <div class="footer-section">
                <h3>专业领域</h3>
                <ul class="footer-links">
                    <li><a href="../index.html#/practice">劳动争议</a></li>
                    <li><a href="../index.html#/practice">知识产权</a></li>
                    <li><a href="../index.html#/practice">人工智能法律</a></li>
                    <li><a href="../index.html#/practice">公司治理</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>网站导航</h3>
                <ul class="footer-links">
                    <li><a href="https://www.acla.org.cn/" target="_blank" rel="noopener">中华全国律师协会</a></li>
                    <li><a href="https://www.zjbar.com/" target="_blank" rel="noopener">浙江省律师协会</a></li>
                    <li><a href="https://www.hzlawyer.net/" target="_blank" rel="noopener">杭州市律师协会</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>联系方式</h3>
                <p>电话：15990034784</p>
                <p>邮箱：1701397885@qq.com</p>
                <p>地址：杭州市拱墅区湖州街168号美好国际大厦15A（14楼）02室</p>
                <p>办公：0571-86916961</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 陈思杰律师 · 保留所有权利</p>
            <p class="footer-slogan">专注劳动争议 · 知识产权 · 人工智能法律</p>
        </div>
    </footer>

    <script>
    // 复制本页的规范链接（canonical），保证粘贴出去的一定是带 og 标签的静态地址
    function toggleShareSteps(btn) {
        var bar = btn.closest('.share-bar');
        var panel = bar && bar.nextElementSibling;
        if (!panel || !panel.classList.contains('share-steps')) return;
        if (panel.hasAttribute('hidden')) {
            panel.removeAttribute('hidden');
            btn.textContent = '收起步骤';
        } else {
            panel.setAttribute('hidden', '');
            btn.textContent = '查看步骤';
        }
    }

    function copyShareLink(btn) {
        var link = document.querySelector('link[rel="canonical"]');
        var url = link ? link.href : location.href;
        var done = function () {
            if (!btn) return;
            var old = btn.getAttribute('data-text') || btn.innerText;
            btn.setAttribute('data-text', old);
            btn.classList.add('copied');
            btn.innerText = '已复制';
            setTimeout(function () {
                btn.classList.remove('copied');
                btn.innerText = old;
            }, 1800);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(done, function () {
                window.prompt('复制下方链接：', url);
            });
            return;
        }
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy') ? done() : window.prompt('复制下方链接：', url);
        } catch (e) {
            window.prompt('复制下方链接：', url);
        }
        document.body.removeChild(ta);
    }
    </script>
</body>
</html>
`;
}

// ---------- 主流程 ----------
function main() {
  validateArticleIds(ARTICLES);

  const targets = ONLY_ID ? ARTICLES.filter(a => a.id === ONLY_ID) : ARTICLES;

  if (targets.length === 0) {
    console.error(`未找到匹配的文章：${ONLY_ID}`);
    console.error('可用 id：' + ARTICLES.map(a => a.id).join(', '));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const report = [];
  for (const article of targets) {
    const file = resolveArticleOutputFile(article.id);
    fs.writeFileSync(file, buildPage(article), 'utf8');
    const size = fs.statSync(file).size;
    const encodedId = encodeURIComponent(article.id);
    report.push(`OK  ${article.id}.html  (${(size / 1024).toFixed(1)} KB)  -> ${SITE}/articles/${encodedId}.html`);
  }

  report.push('');
  report.push(`站点根地址: ${SITE}`);
  report.push(`输出目录  : ${OUT_DIR}`);
  report.push(`封面图    : ${SITE}${COVER_IMAGE}`);
  report.push(`共生成 ${targets.length} 个静态分享页`);

  console.log(report.join('\n'));
}

if (require.main === module) {
  main();
}

module.exports = {
  ARTICLE_ID_PATTERN,
  MAX_ARTICLE_ID_LENGTH,
  validateArticleIds,
  resolveArticleOutputFile
};
