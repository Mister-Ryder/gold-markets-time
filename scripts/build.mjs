import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const postsSourceDir = path.join(root, 'content', 'posts');
const adsSourceFile = path.join(root, 'content', 'ads.json');
const postsOutDir = path.join(root, 'posts');
const dataOutDir = path.join(root, 'data');

async function main() {
  await mkdir(postsOutDir, { recursive: true });
  await mkdir(dataOutDir, { recursive: true });

  const posts = await readPosts();
  for (const post of posts) {
    await writeFile(path.join(postsOutDir, `${post.slug}.html`), renderPostPage(post), 'utf8');
  }

  const postIndex = posts.map(({ html, body, ...post }) => post);
  await writeFile(path.join(dataOutDir, 'posts.json'), `${JSON.stringify(postIndex, null, 2)}\n`, 'utf8');

  const ads = JSON.parse(await readFile(adsSourceFile, 'utf8'));
  await writeFile(path.join(dataOutDir, 'ads.json'), `${JSON.stringify(ads, null, 2)}\n`, 'utf8');

  console.log(`Built ${posts.length} posts and ${ads.length} ads.`);
}

async function readPosts() {
  const files = (await readdir(postsSourceDir))
    .filter(file => file.endsWith('.md'))
    .sort();

  const posts = await Promise.all(files.map(async file => {
    const source = await readFile(path.join(postsSourceDir, file), 'utf8');
    const { frontmatter, body } = parseMarkdownFile(source, file);
    const slug = path.basename(file, '.md');
    const html = markdownToHtml(body);

    return {
      slug,
      title: frontmatter.title || slug,
      date: frontmatter.date || '',
      category: frontmatter.category || '文章',
      excerpt: frontmatter.excerpt || '',
      cover: frontmatter.cover || '',
      featured: Boolean(frontmatter.featured),
      url: `posts/${slug}.html`,
      body,
      html
    };
  }));

  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));
}

function parseMarkdownFile(source, file) {
  if (!source.startsWith('---\n')) {
    throw new Error(`${file} is missing frontmatter.`);
  }

  const end = source.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${file} has unterminated frontmatter.`);
  }

  const frontmatterSource = source.slice(4, end).trim();
  const body = source.slice(end + 4).trim();
  const frontmatter = {};

  for (const line of frontmatterSource.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    frontmatter[key] = parseFrontmatterValue(rawValue);
  }

  return { frontmatter, body };
}

function parseFrontmatterValue(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#+/)[0].length;
      blocks.push(`<h${level}>${inlineMarkdown(line.replace(/^#{1,3}\s+/, ''))}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    if (line === '---') {
      flushParagraph();
      flushList();
      blocks.push('<hr>');
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join('\n');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderPostPage(post) {
  const cover = post.cover
    ? `<div class="hero-media has-image" style="position: relative; inset: auto; min-height: 320px; margin: 28px 0; background-image: linear-gradient(120deg, rgba(32, 24, 18, .12), rgba(32, 24, 18, .42)), url('${escapeAttribute(post.cover)}');"></div>`
    : '';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} - 元和国学文化</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="../index.html">
      <span class="brand-mark">和</span>
      <span>元和国学文化</span>
    </a>
    <nav class="nav">
      <a href="../index.html">首页</a>
      <a href="../index.html#articles">文章</a>
      <a href="../gold.html">黄金页面</a>
    </nav>
  </header>

  <main>
    <article class="section" style="max-width: 820px; margin: 28px auto 0;">
      <div class="section-head">
        <span>${escapeHtml(post.category)}</span>
        <time datetime="${escapeAttribute(post.date)}">${escapeHtml(post.date)}</time>
      </div>
      <h1 style="font-size: clamp(36px, 7vw, 72px); line-height: 1.08; margin: 0 0 18px;">${escapeHtml(post.title)}</h1>
      <p class="lead">${escapeHtml(post.excerpt)}</p>
      ${cover}
      <div class="article-body" style="font-size: 18px; line-height: 1.95;">
${post.html}
      </div>
    </article>
  </main>

  <footer class="footer">
    <p>元和国学文化内容站原型</p>
    <a href="../index.html">返回首页</a>
  </footer>
</body>
</html>
`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
