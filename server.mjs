import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = __dirname;
const dataDir = path.join(__dirname, 'data');
const contentPath = path.join(dataDir, 'content.json');
const port = Number(process.env.PORT || 3000);

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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
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

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const requested = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(publicDir, requested);

  if (!filePath.startsWith(publicDir)) {
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

  if (url.pathname === '/admin') {
    req.url = '/admin.html';
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

await ensureDataFile();

createServer((req, res) => {
  router(req, res).catch(error => {
    console.error(error);
    sendJson(res, 500, { ok: false, message: '服务器内部错误' });
  });
}).listen(port, () => {
  console.log(`Guoxue culture site running at http://localhost:${port}`);
  console.log(`Admin panel: http://localhost:${port}/admin`);
});
