# 元和国学文化内容站原型

这是基于原 `gold-markets-time` 静态页面项目改造出的国学文化网站原型。

当前版本已经具备：

- 国学文化网站前台首页
- GitHub Pages 静态 HTTPS 发布
- 原黄金页面保留：`gold.html`
- 本地 Node 预览服务
- 本地内容 API：`/api/content`
- 本地内容后台：`/admin`
- 本地 JSON 内容存储：`data/content.json`
- 线上不公开后台编辑页，内容更新通过本地后台或文件编辑后提交 GitHub

## 启动

```bash
npm run dev
```

启动后访问：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin
- 原黄金页面：http://localhost:3000/gold.html

## 后续方向

当前线上版本使用 GitHub Pages 静态托管，适合展示站和手动更新内容。后续如果需要登录后台、数据库、图片管理和多人编辑，可以迁移到 Directus、Strapi、Supabase、Vercel 或独立服务器后端。
