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
function navigate(path) {
    window.location.hash = '#' + path;
    // 关闭移动端菜单
    document.getElementById('navMenu').classList.remove('active');
    document.getElementById('navToggle').classList.remove('active');
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
            <p>专注劳动法、知识产权与AI法律前沿，以专业视角解读法律实务</p>
            <div class="hero-tags">
                <span>劳动法</span>
                <span>知识产权</span>
                <span>AI合规</span>
                <span>独角兽企业法务</span>
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

    html += '</div>';
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
    const renderedContent = marked.parse(article.content);

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

    let html = `
        <div class="tags-page">
            <a href="#/tags" class="back-link" onclick="navigate('/tags')">
                &larr; 返回标签列表
            </a>
            <div class="section-title">
                <span>标签：「${tag}」</span>
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

// ===== 页面：关于 =====
function renderAbout() {
    const app = document.getElementById('app');

    const html = `
        <div class="about-page">
            <div class="about-hero">
                <div class="avatar">
                    <img src="images/avatar.png" alt="陈思杰律师">
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
                    <li>浙江律凡律师事务所 AI+法律部负责人</li>
                    <li>杭州12355青少年服务台法律志愿者</li>
                    <li>曾任拱墅区法律援助中心指派援助律师</li>
                </ul>
            </div>

            <div class="about-section">
                <h2>专业领域</h2>
                <ul>
                    <li><strong>劳动法</strong>：劳动人事争议纠纷、竞业限制协议、劳动合同审查、企业用工合规</li>
                    <li><strong>知识产权</strong>：商标侵权诉讼、著作权纠纷、商业秘密保护、不正当竞争</li>
                    <li><strong>AI与法律</strong>：AI Agent 开发合规、数据合规、算法备案、生成式AI服务法律风险</li>
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
                <h2>联系方式</h2>
                <div class="contact-info">
                    <div class="contact-item">
                        <div class="label">联系电话</div>
                        <div class="value">15990034784</div>
                    </div>
                    <div class="contact-item">
                        <div class="label">电子邮箱</div>
                        <div class="value">1701397885@qq.com</div>
                    </div>
                    <div class="contact-item">
                        <div class="label">办公地址</div>
                        <div class="value" style="font-size: 0.88rem;">杭州市拱墅区<br>湖州街168号美好国际大厦15A（14楼）02室</div>
                    </div>
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
