# 元和国学文化内容站原型

这是基于原 `gold-markets-time` 静态页面项目改造出的国学文化网站原型。

当前版本已经具备：

- 国学文化网站前台首页
- GitHub Pages 静态 HTTPS 发布
- 原黄金页面保留：`gold.html`
- 本地 Node 预览服务
- 本地内容 API：`/api/content`、`/api/posts`、`/api/build`
- 本地内容后台：`/admin`
- 本地 JSON 内容存储：`data/content.json`
- 本地 markdown 文章目录：`content/posts`
- 广告/推广配置：`content/ads.json`
- 静态生成输出：`posts/*.html`、`data/posts.json`、`data/ads.json`
- 线上不发布可用后台，内容更新通过本地后台或文件编辑后手动提交 GitHub

## 启动

```bash
npm run dev
```

启动后访问：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin
- 原黄金页面：http://localhost:3000/gold.html

## 本地后台

`/admin` 只在本机 `npm run dev` 启动的 Node 服务中可用，由 `server.mjs` 动态返回 HTML 字符串，不依赖根目录 `admin.html`。GitHub Pages 只发布静态站点，不提供可用的 Node 后台或写文件 API。

本地后台当前支持：

- 查看和编辑 `data/content.json`
- 查看 `content/posts` 下的 markdown 文章列表
- 创建新的 markdown 文章
- 触发本地静态构建，生成文章页、文章索引和广告索引

文章 slug 只允许小写字母、数字和中划线，例如 `classic-reading-notes`。后台只做本地保存和构建，不会自动执行 `git push`，避免把本机写入能力暴露成线上发布能力。

也可以直接运行本地静态构建：

```bash
npm run build
```

构建会读取：

- `content/posts/*.md`
- `content/ads.json`

并生成：

- `posts/<slug>.html`
- `data/posts.json`
- `data/ads.json`

## 后续方向

当前线上版本使用 GitHub Pages 静态托管，适合展示站和手动更新内容。后续如果需要登录后台、数据库、图片管理和多人编辑，可以迁移到 Directus、Strapi、Supabase、Vercel 或独立服务器后端。
