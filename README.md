# 元和国学文化内容站原型

这是基于原 `gold-markets-time` 静态页面项目改造出的国学文化网站原型。

当前版本已经具备：

- 国学文化网站前台首页
- 本地 Node 后端服务
- 内容 API：`/api/content`
- 内容后台：`/admin`
- 本地 JSON 内容存储：`data/content.json`
- 支持编辑网站简介、公告、业务、新闻、文章
- 支持在后台上传主视觉图片并保存为 Base64

## 启动

```bash
npm run dev
```

启动后访问：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin

## 后续方向

当前后端为了快速看到效果，使用本地 JSON 文件存储内容。后续可以迁移到 Directus、Strapi、PostgreSQL 或其他正式 CMS/数据库。
