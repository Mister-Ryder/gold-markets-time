let currentContent = null;

const $ = id => document.getElementById(id);

function linesToServices(value) {
  return value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [title = '', description = ''] = line.split('|').map(part => part.trim());
    return { title, description };
  });
}

function linesToNews(value) {
  return value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [title = '', category = '动态', date = '', excerpt = ''] = line.split('|').map(part => part.trim());
    return { title, category, date, excerpt };
  });
}

function linesToArticles(value) {
  return value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [title = '', category = '文章', excerpt = ''] = line.split('|').map(part => part.trim());
    return { title, category, excerpt };
  });
}

function updatePreview() {
  const preview = $('imagePreview');
  const src = $('heroImage').value.trim();
  preview.innerHTML = src ? `<img src="${src}" alt="主视觉图预览">` : '<span>未设置图片时，前台显示水墨山水占位画面。</span>';
}

async function loadContent() {
  const res = await fetch('/api/content', { cache: 'no-store' });
  currentContent = await res.json();

  $('siteTitle').value = currentContent.site?.title || '';
  $('siteSubtitle').value = currentContent.site?.subtitle || '';
  $('siteDescription').value = currentContent.site?.description || '';
  $('ctaLabel').value = currentContent.site?.ctaLabel || '';
  $('ctaHref').value = currentContent.site?.ctaHref || '';
  $('heroImage').value = currentContent.hero?.image || '';
  $('heroQuote').value = currentContent.hero?.quote || '';
  $('quoteSource').value = currentContent.hero?.quoteSource || '';
  $('announcementTitle').value = currentContent.announcement?.title || '';
  $('announcementBody').value = currentContent.announcement?.body || '';

  $('servicesInput').value = (currentContent.services || [])
    .map(item => `${item.title} | ${item.description}`)
    .join('\n');
  $('newsInput').value = (currentContent.news || [])
    .map(item => `${item.title} | ${item.category} | ${item.date} | ${item.excerpt}`)
    .join('\n');
  $('articlesInput').value = (currentContent.articles || [])
    .map(item => `${item.title} | ${item.category} | ${item.excerpt}`)
    .join('\n');

  updatePreview();
}

async function saveContent() {
  const payload = {
    ...currentContent,
    site: {
      title: $('siteTitle').value.trim(),
      subtitle: $('siteSubtitle').value.trim(),
      description: $('siteDescription').value.trim(),
      ctaLabel: $('ctaLabel').value.trim(),
      ctaHref: $('ctaHref').value.trim() || '#news'
    },
    hero: {
      image: $('heroImage').value.trim(),
      quote: $('heroQuote').value.trim(),
      quoteSource: $('quoteSource').value.trim()
    },
    announcement: {
      title: $('announcementTitle').value.trim(),
      body: $('announcementBody').value.trim()
    },
    services: linesToServices($('servicesInput').value),
    news: linesToNews($('newsInput').value),
    articles: linesToArticles($('articlesInput').value)
  };

  $('saveStatus').textContent = '正在保存...';
  const res = await fetch('/api/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await res.json();
  if (!res.ok || !result.ok) {
    $('saveStatus').textContent = `保存失败：${result.message || '未知错误'}`;
    return;
  }
  currentContent = payload;
  $('saveStatus').textContent = `已保存：${new Date(result.updatedAt).toLocaleString('zh-CN')}`;
}

$('saveBtn').addEventListener('click', saveContent);
$('heroImage').addEventListener('input', updatePreview);
$('heroImageFile').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $('heroImage').value = reader.result;
    updatePreview();
  };
  reader.readAsDataURL(file);
});

loadContent().catch(error => {
  $('saveStatus').textContent = `读取失败：${error.message}`;
});
