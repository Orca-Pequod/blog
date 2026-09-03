/**
 * 陈思杰律师博客 - 核心应用逻辑
 * 客户端路由 + 页面渲染 + Markdown 渲染
 */

// ===== 配置 marked =====
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

// ===== 路由系统 =====
// 将外部输入转换为安全的 HTML 文本，防止 XSS
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

// ===== 统一单色 SVG 图标 =====
const ICONS = {
    labor: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>',
    ip: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16a1 1 0 0 0 1 1h3.2a1 1 0 0 0 1-1v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/></svg>',
    ai: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>',
    corp: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M15 9h4a2 2 0 0 1 2 2v10"/><path d="M8 7h2M8 11h2M8 15h2M11 7h1M11 11h1M11 15h1"/></svg>'
};

function navigate(path) {
    window.location.hash = '#' + path;
    // 关闭移动端菜单
    document.getElementById('navMenu').classList.remove('active');
    document.getElementById('navToggle').classList.remove('active');
}

// 跳转到专业领域页的指定板块（供页脚"专业领域"链接使用）
function goPracticeSection(id) {
    const onPractice = getRoute() === '/practice';
    if (!onPractice) {
        window.location.hash = '#/practice';
    }
    setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, onPractice ? 80 : 220);
}

function getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
}

function handleRoute() {
    const route = getRoute();
    const app = document.getElementById('app');

    // 更新导航高亮
    updateNavActive(route);

    // 显示加载状态
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';

    // 滚动到顶部
    window.scrollTo(0, 0);

    // 路由匹配
    if (route === '/' || route === '') {
        renderHome();
    } else if (route === '/practice') {
        renderPractice();
    } else if (route === '/tags') {
        renderTags();
    } else if (route === '/about') {
        renderAbout();
    } else if (route.startsWith('/article/')) {
        const articleId = route.replace('/article/', '');
        renderArticle(articleId);
    } else if (route.startsWith('/tag/')) {
        const tag = decodeURIComponent(route.replace('/tag/', ''));
        renderArticlesByTag(tag);
    } else {
        renderNotFound();
    }
}

// ===== 导航高亮 =====
function updateNavActive(route) {
    const links = document.querySelectorAll('.nav-menu li a');
    links.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href').replace('#', '');
        if (route === '/' && href === '/') link.classList.add('active');
        else if (route.startsWith('/practice') && href === '/practice') link.classList.add('active');
        else if (route.startsWith('/tags') && href === '/tags') link.classList.add('active');
        else if (route.startsWith('/about') && href === '/about') link.classList.add('active');
    });
}

// ===== 页面：首页（文章列表） =====
function renderHome() {
    const app = document.getElementById('app');
    const articles = ARTICLES;

    let html = `
        <div class="hero">
            <h1>陈思杰律师</h1>
            <p>专注劳动争议、知识产权与人工智能法律前沿，以专业视角解读法律实务</p>
            <div class="hero-tags">
                <span>劳动法</span>
                <span>知识产权</span>
                <span>AI合规</span>
                <span>独角兽企业法务</span>
            </div>
        </div>
        <div class="section-title">
            <span>专业领域</span>
            <a href="#/practice" class="view-all" onclick="navigate('/practice')">查看全部 &rarr;</a>
        </div>
        <div class="category-grid">
            <div class="category-card" onclick="navigate('/practice')">
                <div class="category-icon">${ICONS.labor}</div>
                <h3>劳动争议</h3>
                <p>劳动人事争议仲裁诉讼、竞业限制攻防、企业用工合规</p>
            </div>
            <div class="category-card" onclick="navigate('/practice')">
                <div class="category-icon">${ICONS.ip}</div>
                <h3>知识产权</h3>
                <p>商标侵权、著作权纠纷、商业秘密保护、不正当竞争</p>
            </div>
            <div class="category-card" onclick="navigate('/practice')">
                <div class="category-icon">${ICONS.ai}</div>
                <h3>人工智能法律</h3>
                <p>AI Agent 开发合规、数据合规、生成式 AI 风控</p>
            </div>
            <div class="category-card" onclick="navigate('/practice')">
                <div class="category-icon">${ICONS.corp}</div>
                <h3>公司治理</h3>
                <p>融资合规、股权架构、企业常年法律顾问</p>
            </div>
        </div>
        <div class="section-title">
            <span>最新文章</span>
            <span class="count">共 ${articles.length} 篇</span>
        </div>
        <div class="article-list">
    `;

    articles.forEach(article => {
        const dateFormatted = formatDate(article.date);
        html += `
            <div class="article-card" onclick="navigate('/article/${article.id}')">
                <div class="card-category">${article.category}</div>
                <h2>${article.title}</h2>
                <p class="card-summary">${article.summary}</p>
                <div class="card-meta">
                    <span>${dateFormatted}</span>
                    <div class="tags">
                        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>

        <div class="home-intro">
            <div class="intro-text">
                <h3>陈思杰 律师</h3>
                <p>浙江律凡律师事务所 AI+法律部负责人，专注劳动争议、知识产权与人工智能法律，致力于为企业与个人提供具有前瞻性的法律解决方案。</p>
                <div class="intro-actions">
                    <a href="#/about" class="btn btn-primary" onclick="navigate('/about')">了解更多</a>
                    <a href="#/practice" class="btn btn-outline" onclick="navigate('/practice')">服务范围</a>
                </div>
            </div>
        </div>
    `;
    app.innerHTML = html;
}

// ===== 页面：文章详情 =====
function renderArticle(articleId) {
    const app = document.getElementById('app');
    const article = ARTICLES.find(a => a.id === articleId);

    if (!article) {
        renderNotFound();
        return;
    }

    const dateFormatted = formatDate(article.date);
    const renderedContent = DOMPurify.sanitize(marked.parse(article.content), {
        USE_PROFILES: { html: true }
    });

    const html = `
        <div class="article-detail">
            <a href="#/" class="back-link" onclick="navigate('/')">
                &larr; 返回文章列表
            </a>
            <div class="article-header">
                <div class="category">${article.category}</div>
                <h1>${article.title}</h1>
                <div class="meta">
                    <span>${article.author}</span>
                    <span>${dateFormatted}</span>
                    <div class="tags">
                        ${article.tags.map(tag => `<span class="tag" onclick="navigate('/tag/${encodeURIComponent(tag)}')" style="cursor:pointer">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="article-body">
                ${renderedContent}
            </div>
            <div style="margin-top: 48px; padding: 24px 32px; background: var(--bg-card); border-radius: var(--radius); border-left: 4px solid var(--gold); box-shadow: var(--shadow);">
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">本文作者</p>
                <p style="font-family: var(--font-serif); font-size: 1.1rem; font-weight: 600; color: var(--navy); margin-bottom: 4px;">${article.author}</p>
                <p style="font-size: 0.88rem; color: var(--text-light);">浙江律凡律师事务所 AI+法律部负责人 | 执业证号：13301202110362404</p>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">如需专业法律服务，请联系：15990034784 | 1701397885@qq.com</p>
            </div>
        </div>
    `;

    app.innerHTML = html;
}

// ===== 页面：标签分类 =====
function renderTags() {
    const app = document.getElementById('app');

    // 统计所有标签
    const tagMap = {};
    ARTICLES.forEach(article => {
        article.tags.forEach(tag => {
            if (tagMap[tag]) {
                tagMap[tag]++;
            } else {
                tagMap[tag] = 1;
            }
        });
    });

    // 按文章数量排序
    const sortedTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);

    let html = `
        <div class="tags-page">
            <div class="section-title">
                <span>标签分类</span>
                <span class="count">${sortedTags.length} 个标签</span>
            </div>
            <div class="tags-cloud">
    `;

    sortedTags.forEach(([tag, count]) => {
        html += `
            <div class="tag-item" onclick="navigate('/tag/${encodeURIComponent(tag)}')">
                <span>${tag}</span>
                <span class="count">${count}</span>
            </div>
        `;
    });

    html += `
            </div>
            <div class="section-title">
                <span>全部文章</span>
                <span class="count">共 ${ARTICLES.length} 篇</span>
            </div>
            <div class="article-list">
    `;

    ARTICLES.forEach(article => {
        const dateFormatted = formatDate(article.date);
        html += `
            <div class="article-card" onclick="navigate('/article/${article.id}')">
                <div class="card-category">${article.category}</div>
                <h2>${article.title}</h2>
                <p class="card-summary">${article.summary}</p>
                <div class="card-meta">
                    <span>${dateFormatted}</span>
                    <div class="tags">
                        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div></div>';
    app.innerHTML = html;
}

// ===== 页面：按标签筛选文章 =====
function renderArticlesByTag(tag) {
    const app = document.getElementById('app');
    const filtered = ARTICLES.filter(article => article.tags.includes(tag));
    const safeTag = escapeHtml(tag);
    
    let html = `
        <div class="tags-page">
            <a href="#/tags" class="back-link" onclick="navigate('/tags')">
                &larr; 返回标签列表
            </a>
            <div class="section-title">
                <span>标签：「${safeTag}」</span>
                <span class="count">${filtered.length} 篇文章</span>
            </div>
    `;

    if (filtered.length === 0) {
        html += `
            <div class="empty-state">
                <div class="icon">&#128218;</div>
                <p>该标签下暂无文章</p>
            </div>
        `;
    } else {
        html += '<div class="article-list">';
        filtered.forEach(article => {
            const dateFormatted = formatDate(article.date);
            html += `
                <div class="article-card" onclick="navigate('/article/${article.id}')">
                    <div class="card-category">${article.category}</div>
                    <h2>${article.title}</h2>
                    <p class="card-summary">${article.summary}</p>
                    <div class="card-meta">
                        <span>${dateFormatted}</span>
                        <div class="tags">
                            ${article.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';
    app.innerHTML = html;
}

// ===== 页面：专业领域 =====
function renderPractice() {
    const app = document.getElementById('app');

    const html = `
        <div class="practice-page">
            <div class="practice-hero">
                <h1>专业领域</h1>
                <p>聚焦劳动争议、知识产权与人工智能法律，提供从风险防范到争议解决的全程法律服务。</p>
            </div>

            <div class="practice-section" id="practice-labor">
                <h2>${ICONS.labor} 劳动争议</h2>
                <p class="practice-desc">深耕劳动人事争议领域，从仲裁到诉讼全流程代理，兼顾企业用工合规与劳动者权益保护。</p>
                <ul class="practice-list">
                    <li>劳动人事争议仲裁、诉讼代理</li>
                    <li>竞业限制协议审查与违约追责</li>
                    <li>劳动合同拟定、审查与解除合规</li>
                    <li>企业规章制度与用工合规建设</li>
                    <li>经济补偿金、赔偿金、加班费等争议处理</li>
                    <li>工伤认定与社会保险争议处理</li>
                </ul>
            </div>

            <div class="practice-section" id="practice-ip">
                <h2>${ICONS.ip} 知识产权</h2>
                <p class="practice-desc">专注商标、著作权、商业秘密与不正当竞争，为企业创新成果提供全链条保护。</p>
                <ul class="practice-list">
                    <li>商标侵权诉讼与维权</li>
                    <li>著作权纠纷处理</li>
                    <li>商业秘密保护体系搭建</li>
                    <li>不正当竞争纠纷处理</li>
                    <li>专利侵权的分析与应对</li>
                </ul>
            </div>

            <div class="practice-section" id="practice-ai">
                <h2>${ICONS.ai} 人工智能法律</h2>
                <p class="practice-desc">聚焦 AI Agent 开发与生成式人工智能的法律风险，为 AI 企业提供前瞻性合规方案。</p>
                <ul class="practice-list">
                    <li>AI Agent 开发全流程合规</li>
                    <li>数据合规与个人信息保护</li>
                    <li>算法备案与安全评估</li>
                    <li>生成式 AI 服务法律风险防控</li>
                    <li>AI 商业秘密与知识产权保护</li>
                </ul>
            </div>

            <div class="practice-section" id="practice-corp">
                <h2>${ICONS.corp} 公司治理</h2>
                <p class="practice-desc">服务独角兽企业及成长型企业，覆盖融资、股权、合同与常年法律顾问。</p>
                <ul class="practice-list">
                    <li>独角兽企业融资合规</li>
                    <li>股权架构设计与激励</li>
                    <li>企业常年法律顾问</li>
                    <li>合同风控与合规审查</li>
                    <li>员工竞业限制与保密体系建设</li>
                </ul>
            </div>

            <div class="practice-cta">
                <h3>需要法律服务？</h3>
                <p>欢迎致电或邮件咨询，我将根据您的具体情况提供针对性建议。</p>
                <div class="intro-actions">
                    <a href="tel:15990034784" class="btn btn-primary">电话咨询</a>
                    <a href="mailto:1701397885@qq.com" class="btn btn-outline">发送邮件</a>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = html;
}

// ===== 页面：关于 =====
function renderAbout() {
    const app = document.getElementById('app');

    const html = `
        <div class="about-page">
            <div class="about-hero">
                <div class="avatar">
                    <img src="data:image/jpeg;base64,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" alt="陈思杰律师">
                </div>
                <h1>陈思杰 律师</h1>
                <p class="subtitle">浙江律凡律师事务所合伙人 | AI+法律部负责人</p>
                <p class="credential">执业证号：13301202110362404</p>
            </div>

            <div class="about-section">
                <h2>个人简介</h2>
                <p>陈思杰律师，浙江律凡律师事务所合伙人、AI+法律部负责人。</p>
                <p>执业方向为民商事领域，擅长处理<strong>劳动人事争议纠纷</strong>、<strong>知识产权侵权纠纷</strong>。目前深耕领域为 <strong>AI Agent 的开发过程与独角兽企业商业模式中的法务需求</strong>，致力于将传统法律服务与人工智能前沿技术深度结合，为企业提供具有前瞻性的法律解决方案。</p>
            </div>

            <div class="about-section">
                <h2>社会职务</h2>
                <ul>
                    <li>拱墅区人民法院法律服务志愿者</li>
                    <li>杭州12355青少年服务台法律志愿者</li>
                    <li>天水街道公共法律服务工作站值班律师</li>
                    <li>曾任拱墅区法律援助中心指派援助律师</li>
                </ul>
            </div>

            <div class="about-section">
                <h2>专业领域</h2>
                <ul>
                    <li><strong>劳动争议</strong>：劳动人事争议纠纷、竞业限制协议、劳动合同审查、企业用工合规</li>
                    <li><strong>知识产权</strong>：商标侵权诉讼、著作权纠纷、商业秘密保护、不正当竞争</li>
                    <li><strong>人工智能法律</strong>：AI Agent 开发合规、数据合规、算法备案、生成式AI服务法律风险</li>
                    <li><strong>公司治理</strong>：独角兽企业融资合规、股权架构设计、企业法律顾问</li>
                </ul>
            </div>

            <div class="about-section">
                <h2>浙江律凡律师事务所</h2>
                <p>浙江律凡律师事务所是经浙江省司法厅批准成立的律师事务所，是中华全国律师协会的团体成员。</p>
                <p>律凡律所注重法律服务的专业化方向，目前在<strong>劳动争议纠纷、民商合同纠纷、刑事辩护、电子商务、互联网金融、婚姻家事</strong>等领域均有专业律师负责，做到律师的专业团队化服务。</p>
                <p style="margin-top: 16px; text-align: center; font-family: var(--font-serif); font-size: 1.15rem; color: var(--gold-dark); font-weight: 600;">「 平凡人做不平凡事 」</p>
                <p style="text-align: center; font-size: 0.85rem; color: var(--text-muted);">— 律凡律所理念 —</p>
            </div>

            <div class="about-section">
                <h2>律所服务领域</h2>
                <ul>
                    <li><strong>民商事纠纷</strong>：劳动争议纠纷、侵权责任纠纷、合同纠纷、婚姻家事纠纷等</li>
                    <li><strong>企业法律顾问</strong>：企业风控、合规审查等</li>
                    <li><strong>刑事案件</strong>：刑事辩护、刑事控告等</li>
                    <li><strong>知识产权与不正当竞争纠纷</strong>：侵权诉讼、业务谈判等</li>
                </ul>
            </div>

            <div class="about-contact">
                <h2>需要专业法律服务？</h2>
                <p>欢迎致电或邮件咨询，我将根据您的具体情况提供针对性建议。</p>
                <div class="intro-actions">
                    <a href="tel:15990034784" class="btn btn-primary">电话咨询</a>
                    <a href="mailto:1701397885@qq.com" class="btn btn-outline">发送邮件</a>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = html;
}

// ===== 页面：404 =====
function renderNotFound() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="empty-state">
            <div class="icon">&#128533;</div>
            <h2 style="font-family: var(--font-serif); color: var(--navy); margin-bottom: 12px;">页面不存在</h2>
            <p>您访问的页面不存在，请返回首页浏览文章。</p>
            <p style="margin-top: 20px;">
                <a href="#/" onclick="navigate('/')" style="display: inline-block; padding: 10px 28px; background: var(--navy); color: #fff; border-radius: var(--radius); font-weight: 500;">返回首页</a>
            </p>
        </div>
    `;
}

// ===== 工具函数 =====
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// ===== 移动端菜单切换 =====
function setupMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        menu.classList.toggle('active');
    });
}

// ===== 滚动效果（导航栏阴影） =====
function setupScrollEffect() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
        }
    });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupScrollEffect();

    // 监听路由变化
    window.addEventListener('hashchange', handleRoute);

    // 初始路由
    handleRoute();
});
