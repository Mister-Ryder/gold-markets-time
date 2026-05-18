const fallback = {
  site: {},
  hero: {},
  announcement: {},
  services: [],
  news: [],
  articles: [],
  posts: [],
  ads: []
};

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map(renderItem).join('');
}

async function loadContent() {
  try {
    const draft = localStorage.getItem('guoxue-content-draft');
    if (draft) return JSON.parse(draft);

    const res = await fetch('data/content.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('内容读取失败');
    return await res.json();
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

async function loadJson(path, fallbackValue) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return fallbackValue;
    return await res.json();
  } catch (error) {
    console.warn(`读取 ${path} 失败`, error);
    return fallbackValue;
  }
}

function renderContent(content) {
  const site = content.site || {};
  const hero = content.hero || {};
  const announcement = content.announcement || {};

  document.title = site.title || '元和国学文化';
  setText('brandName', site.title);
  setText('siteTitle', site.title);
  setText('siteSubtitle', site.subtitle);
  setText('siteDescription', site.description);
  setText('heroQuote', hero.quote);
  setText('quoteSource', hero.quoteSource);
  setText('announcementTitle', announcement.title);
  setText('announcementBody', announcement.body);

  const cta = document.getElementById('ctaLink');
  if (cta) {
    cta.textContent = site.ctaLabel || '查看最新活动';
    cta.href = site.ctaHref || '#news';
  }

  if (hero.image) {
    const media = document.getElementById('heroMedia');
    media.style.backgroundImage = `linear-gradient(120deg, rgba(32, 24, 18, .12), rgba(32, 24, 18, .72)), url("${hero.image}")`;
    media.classList.add('has-image');
  }

  renderList('servicesGrid', content.services || [], item => `
    <article class="service-item">
      <span></span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `);

  renderList('newsList', content.news || [], item => `
    <article class="news-item">
      <time>${escapeHtml(item.date || '')}</time>
      <div>
        <span>${escapeHtml(item.category || '动态')}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.excerpt)}</p>
      </div>
    </article>
  `);

  const posts = content.posts?.length ? content.posts : content.articles || [];
  renderList('articleGrid', posts, item => `
    <article class="article-item">
      <span>${escapeHtml(item.category || '文章')}</span>
      <h3>${item.url ? `<a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.excerpt)}</p>
      ${item.date ? `<time>${escapeHtml(item.date)}</time>` : ''}
    </article>
  `);

  renderList('promoGrid', content.ads || [], item => `
    <article class="promo-item">
      <span>${escapeHtml(item.label || '推荐')}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
      ${item.href || item.url ? `<a class="text-link" href="${escapeHtml(item.href || item.url)}">${escapeHtml(item.cta || '了解更多')}</a>` : ''}
    </article>
  `);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Promise.all([
  loadContent(),
  loadJson('data/posts.json', []),
  loadJson('data/ads.json', [])
]).then(([content, posts, ads]) => {
  renderContent({ ...content, posts, ads });
});
