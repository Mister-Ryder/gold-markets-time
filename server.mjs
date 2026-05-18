import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const publicDir = __dirname;
const dataDir = path.join(__dirname, 'data');
const contentPath = path.join(dataDir, 'content.json');
const postsDir = path.join(__dirname, 'content', 'posts');
const port = Number(process.env.PORT || 3000);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(contentPath, 'utf8');
  } catch {
    await writeFile(contentPath, JSON.stringify(defaultContent, null, 2), 'utf8');
  }
}

async function ensurePostsDir() {
  await mkdir(postsDir, { recursive: true });
}

function isInside(parent, target) {
  const relative = path.relative(parent, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function listPosts() {
  await ensurePostsDir();
  const entries = await readdir(postsDir, { withFileTypes: true });
  const posts = await Promise.all(entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(async entry => {
      const filePath = path.join(postsDir, entry.name);
      const info = await stat(filePath);
      return {
        file: entry.name,
        slug: entry.name.slice(0, -3),
        size: info.size,
        updatedAt: info.mtime.toISOString()
      };
    }));
  return posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function markdownForPost({ title, slug, body }) {
  const safeTitle = String(title || slug).trim() || slug;
  const safeBody = String(body || '').replace(/\r\n/g, '\n');
  return `---\ntitle: "${safeTitle.replaceAll('"', '\\"')}"\nslug: "${slug}"\ndate: "${new Date().toISOString()}"\n---\n\n${safeBody.trim()}\n`;
}

async function createPost(payload) {
  const slug = String(payload.slug || '').trim();
  if (!slugPattern.test(slug)) {
    throw new Error('slug 只能包含小写字母、数字和中划线，且不能以中划线开头或结尾');
  }

  await ensurePostsDir();
  const filePath = path.resolve(postsDir, `${slug}.md`);
  if (!isInside(postsDir, filePath)) {
    throw new Error('文章路径不安全');
  }

  await writeFile(filePath, markdownForPost({
    title: payload.title,
    slug,
    body: payload.body
  }), { encoding: 'utf8', flag: 'wx' });

  return { slug, file: path.basename(filePath) };
}

async function runBuild() {
  const buildScript = path.join(__dirname, 'scripts', 'build.mjs');
  const { stdout, stderr } = await execFileAsync(process.execPath, [buildScript], {
    cwd: __dirname,
    timeout: 30000,
    maxBuffer: 1024 * 1024
  });

  return {
    ok: true,
    mode: 'static-generator',
    message: '静态文章和索引已生成。',
    updatedAt: new Date().toISOString(),
    stdout: stdout.trim(),
    stderr: stderr.trim()
  };
}

function renderAdminPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>本地内容后台 · 元和国学文化</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f4ef; color: #29231d; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { display: flex; justify-content: space-between; gap: 18px; align-items: center; padding: 24px clamp(18px, 4vw, 48px); background: #29231d; color: #fffaf2; }
    h1 { margin: 0; font-size: clamp(24px, 4vw, 38px); letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    p { margin: 0; }
    main { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap: 18px; padding: 22px clamp(18px, 4vw, 48px) 42px; }
    section { background: #fffdf8; border: 1px solid #ded6c8; border-radius: 8px; padding: 18px; }
    label { display: grid; gap: 6px; font-weight: 700; }
    input, textarea { width: 100%; border: 1px solid #cfc5b5; border-radius: 6px; padding: 10px 12px; font: inherit; background: #fff; color: #29231d; }
    textarea { min-height: 260px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; }
    button, a.button { border: 0; border-radius: 6px; padding: 10px 14px; background: #8c4b2f; color: #fff; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
    button.secondary, a.button.secondary { background: #ece3d5; color: #29231d; }
    button:disabled { opacity: .58; cursor: wait; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .stack { display: grid; gap: 18px; }
    .form-grid { display: grid; gap: 12px; }
    .status { min-height: 24px; color: #665849; font-size: 14px; }
    .posts { display: grid; gap: 8px; }
    .post-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eadfce; }
    .post-row strong { overflow-wrap: anywhere; }
    .post-row span { color: #746657; font-size: 13px; }
    .hint { color: #746657; font-size: 14px; line-height: 1.6; }
    @media (max-width: 860px) { header, main { display: grid; } main { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <div>
      <p class="hint">Local Content Studio</p>
      <h1>本地内容后台</h1>
    </div>
    <div class="actions">
      <a class="button secondary" href="/">查看前台</a>
      <button id="buildBtn" type="button">触发本地 build</button>
    </div>
  </header>
  <main>
    <section class="stack">
      <div>
        <h2>data/content.json</h2>
        <p class="hint">这里直接编辑本地 JSON 文件。保存只写入本机，不会 git push。</p>
      </div>
      <textarea id="contentEditor" spellcheck="false"></textarea>
      <div class="actions">
        <button id="saveContentBtn" type="button">保存 JSON</button>
        <button class="secondary" id="reloadContentBtn" type="button">重新读取</button>
      </div>
      <p class="status" id="contentStatus">正在读取...</p>
    </section>
    <div class="stack">
      <section class="stack">
        <div>
          <h2>content/posts</h2>
          <p class="hint">只显示本地 markdown 文件列表。</p>
        </div>
        <div class="posts" id="postsList"></div>
        <p class="status" id="postsStatus">正在读取...</p>
      </section>
      <section class="stack">
        <div>
          <h2>新建 markdown 文章</h2>
          <p class="hint">slug 只允许小写字母、数字和中划线，例如 classic-reading-notes。</p>
        </div>
        <div class="form-grid">
          <label>标题<input id="postTitle" type="text" autocomplete="off"></label>
          <label>slug<input id="postSlug" type="text" pattern="[a-z0-9]+(-[a-z0-9]+)*" autocomplete="off"></label>
          <label>正文<textarea id="postBody" spellcheck="false" placeholder="从这里开始写正文..."></textarea></label>
        </div>
        <button id="createPostBtn" type="button">创建文章</button>
        <p class="status" id="postCreateStatus"></p>
      </section>
      <section class="stack">
        <h2>构建状态</h2>
        <p class="hint">当前只做本地保存和构建检查，不执行自动 git push。</p>
        <pre class="status" id="buildStatus"></pre>
      </section>
    </div>
  </main>
  <script>
    const $ = id => document.getElementById(id);
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    async function api(path, options = {}) {
      const res = await fetch(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || '请求失败');
      return data;
    }

    async function loadContent() {
      $('contentStatus').textContent = '正在读取...';
      const data = await api('/api/content', { method: 'GET' });
      $('contentEditor').value = JSON.stringify(data, null, 2);
      $('contentStatus').textContent = '已读取 data/content.json';
    }

    async function saveContent() {
      $('contentStatus').textContent = '正在保存...';
      let parsed;
      try {
        parsed = JSON.parse($('contentEditor').value);
      } catch (error) {
        $('contentStatus').textContent = 'JSON 格式错误：' + error.message;
        return;
      }
      const result = await api('/api/content', { method: 'PUT', body: JSON.stringify(parsed) });
      $('contentEditor').value = JSON.stringify({ ...parsed, updatedAt: result.updatedAt }, null, 2);
      $('contentStatus').textContent = '已保存：' + new Date(result.updatedAt).toLocaleString('zh-CN');
    }

    async function loadPosts() {
      $('postsStatus').textContent = '正在读取...';
      const data = await api('/api/posts', { method: 'GET' });
      $('postsList').innerHTML = data.posts.length ? data.posts.map(post => \`
        <div class="post-row">
          <strong>\${escapeHtml(post.file)}</strong>
          <span>\${new Date(post.updatedAt).toLocaleString('zh-CN')} · \${post.size} B</span>
        </div>
      \`).join('') : '<p class="hint">还没有 markdown 文章。</p>';
      $('postsStatus').textContent = '共 ' + data.posts.length + ' 篇';
    }

    async function createPost() {
      const title = $('postTitle').value.trim();
      const slug = $('postSlug').value.trim();
      const body = $('postBody').value;
      if (!slugPattern.test(slug)) {
        $('postCreateStatus').textContent = 'slug 只能包含小写字母、数字和中划线，且不能以中划线开头或结尾';
        return;
      }
      $('createPostBtn').disabled = true;
      $('postCreateStatus').textContent = '正在创建...';
      try {
        const result = await api('/api/posts', { method: 'POST', body: JSON.stringify({ title, slug, body }) });
        $('postCreateStatus').textContent = '已创建：' + result.file;
        $('postTitle').value = '';
        $('postSlug').value = '';
        $('postBody').value = '';
        await loadPosts();
      } catch (error) {
        $('postCreateStatus').textContent = '创建失败：' + error.message;
      } finally {
        $('createPostBtn').disabled = false;
      }
    }

    async function runBuild() {
      $('buildBtn').disabled = true;
      $('buildStatus').textContent = '正在构建...';
      try {
        const result = await api('/api/build', { method: 'POST', body: '{}' });
        $('buildStatus').textContent = JSON.stringify(result, null, 2);
      } catch (error) {
        $('buildStatus').textContent = '构建失败：' + error.message;
      } finally {
        $('buildBtn').disabled = false;
      }
    }

    function escapeHtml(value = '') {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    $('saveContentBtn').addEventListener('click', () => saveContent().catch(error => {
      $('contentStatus').textContent = '保存失败：' + error.message;
    }));
    $('reloadContentBtn').addEventListener('click', () => loadContent().catch(error => {
      $('contentStatus').textContent = '读取失败：' + error.message;
    }));
    $('createPostBtn').addEventListener('click', createPost);
    $('buildBtn').addEventListener('click', runBuild);

    loadContent().catch(error => { $('contentStatus').textContent = '读取失败：' + error.message; });
    loadPosts().catch(error => { $('postsStatus').textContent = '读取失败：' + error.message; });
  </script>
</body>
</html>`;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const requested = path.normalize(decodeURIComponent(pathname))
    .replace(/^[/\\]+/, '')
    .replace(/^(\.\.[/\\])+/, '');
  const filePath = path.resolve(publicDir, requested);

  if (!isInside(publicDir, filePath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const stream = createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600'
    });
    stream.pipe(res);
  });
  stream.on('error', () => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
}

async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/admin' && (req.method === 'GET' || req.method === 'HEAD')) {
    sendHtml(res, renderAdminPage());
    return;
  }

  if (url.pathname === '/api/content' && req.method === 'GET') {
    const content = await readFile(contentPath, 'utf8');
    sendJson(res, 200, JSON.parse(content));
    return;
  }

  if (url.pathname === '/api/content' && (req.method === 'PUT' || req.method === 'POST')) {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      parsed.updatedAt = new Date().toISOString();
      await writeFile(contentPath, JSON.stringify(parsed, null, 2), 'utf8');
      sendJson(res, 200, { ok: true, updatedAt: parsed.updatedAt });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === '/api/posts' && req.method === 'GET') {
    const posts = await listPosts();
    sendJson(res, 200, { ok: true, posts });
    return;
  }

  if (url.pathname === '/api/posts' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const result = await createPost(JSON.parse(body));
      sendJson(res, 201, { ok: true, ...result });
    } catch (error) {
      const status = error.code === 'EEXIST' ? 409 : 400;
      sendJson(res, status, { ok: false, message: error.code === 'EEXIST' ? '同名 slug 的文章已存在' : error.message });
    }
    return;
  }

  if (url.pathname === '/api/build' && req.method === 'POST') {
    try {
      const result = await runBuild();
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { ok: false, message: error.message });
    }
    return;
  }

  await serveStatic(req, res);
}

const defaultContent = {
  site: {
    title: '元和国学文化',
    subtitle: '以经典为根，以当代生活为用',
    description: '面向家庭、学校与企业，提供国学文化课程、雅集活动、文化顾问与内容传播服务。',
    ctaLabel: '查看最新活动',
    ctaHref: '#news'
  },
  hero: {
    image: '',
    quote: '观乎人文，以化成天下。',
    quoteSource: '周易'
  },
  announcement: {
    title: '春季国学雅集开放预约',
    body: '围绕礼乐、诗书、茶席与家风教育，提供小班制体验与定制活动。'
  },
  services: [
    {
      title: '国学课程',
      description: '经典导读、诗词启蒙、礼仪修习与家庭共读课程，适合青少年与成人。'
    },
    {
      title: '文化活动',
      description: '策划雅集、讲座、节气活动、书院体验与企业文化日。'
    },
    {
      title: '内容传播',
      description: '提供文章策划、专题编辑、品牌文化叙事与新媒体内容支持。'
    },
    {
      title: '顾问服务',
      description: '为教育空间、文化品牌和社区项目提供内容体系与运营建议。'
    }
  ],
  news: [
    {
      title: '清明节气文化课完成首期共读',
      category: '活动',
      date: '2026-04-05',
      excerpt: '从节气、家礼与诗词三个角度，带领学员理解传统节日的生活意义。'
    },
    {
      title: '企业雅集方案升级',
      category: '业务',
      date: '2026-04-18',
      excerpt: '新增茶席、香事、书法体验与经典导读模块，可按团队规模灵活组合。'
    },
    {
      title: '亲子经典共读营招募中',
      category: '推送',
      date: '2026-05-01',
      excerpt: '以《论语》选章为线索，设计适合家庭参与的阅读、讨论与表达练习。'
    }
  ],
  articles: [
    {
      title: '为什么今天仍需要读经典',
      category: '经典导读',
      excerpt: '经典不是遥远的文本，而是帮助我们整理生活秩序、语言和判断力的方法。'
    },
    {
      title: '节气教育如何进入家庭生活',
      category: '家风教育',
      excerpt: '从饮食、物候、诗词和仪式感入手，让孩子在日常中理解时间与自然。'
    },
    {
      title: '雅集不是复古表演',
      category: '文化观察',
      excerpt: '好的雅集应当让人重新感知相处、谈话、审美和专注，而不是堆砌符号。'
    }
  ]
};

if (process.argv.includes('--build')) {
  const result = await runBuild();
  console.log(JSON.stringify(result, null, 2));
} else {
  await ensureDataFile();
  await ensurePostsDir();

  createServer((req, res) => {
    router(req, res).catch(error => {
      console.error(error);
      sendJson(res, 500, { ok: false, message: '服务器内部错误' });
    });
  }).listen(port, () => {
    console.log(`Guoxue culture site running at http://localhost:${port}`);
    console.log(`Admin panel: http://localhost:${port}/admin`);
  });
}
