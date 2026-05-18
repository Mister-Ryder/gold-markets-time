# 国学文化内容网站后端改造方案

## 当前项目状态

当前目录来自 `https://mister-ryder.github.io/gold-markets-time/` 对应项目，位置：

`/mnt/e/网站制作尝试/gold-markets-time-main`

现有代码是一个纯静态单页：

- 入口文件：`index.html`
- 说明文件：`README.md`
- 前端技术：原生 HTML、CSS、JavaScript
- 当前没有后端、数据库、构建工具、管理后台或 API 服务
- 页面里的市场数据、文案、汇率逻辑都硬编码在 `index.html`

这个项目适合作为“现有前台页面原型”保留，再逐步迁移为带后台的内容网站。

## 需求拆解

目标网站是一个国学文化相关网站，需要后台支持：

- 上传和维护网站简介
- 上传图片、封面图、活动图、文章配图
- 维护业务/服务内容
- 发布推送、公告、动态
- 发布新闻
- 发布文章、专题、分类内容
- 后续可能扩展作者、活动、课程、典籍、会员或留言

这些能力确实需要后端，最合理的是使用开源 CMS 或 Headless CMS，避免从零手写后台。

## 推荐方案排序

### 1. Directus

最推荐。

Directus 适合给现有静态站快速补上后台、媒体库、数据库和 API。它可以基于 SQL 数据库创建内容集合，并自动提供管理后台、REST API、GraphQL API、文件管理和权限控制。

适合本项目的原因：

- 现有前台不用立刻重写，可以先通过 REST API 读取后台内容
- 后台可以直接建表管理“简介、业务、公告、新闻、文章、图片”
- 非技术人员可以用后台维护内容
- 后期如果要换前端框架，后台仍然能保留

建议内容集合：

- `site_profile`：网站名称、简介、使命、联系方式、SEO 信息
- `hero_sections`：首页主视觉、标语、按钮、背景图
- `business_sections`：业务/服务内容
- `announcements`：公告、推送、置顶消息
- `news`：新闻动态
- `articles`：文章、专题、国学知识
- `categories`：分类
- `authors`：作者
- `media_assets`：图片和附件

### 2. Strapi

第二推荐。

Strapi 是成熟的开源 Headless CMS，有内容类型建模、媒体库、权限、REST API 和插件生态。它也很适合做国学文化内容站。

适合本项目的原因：

- CMS 生态成熟，资料多
- 文章、新闻、分类、媒体库都好做
- 适合团队长期维护

相对 Directus，它的部署和自定义开发成本略高一点，但仍然是稳妥选择。

### 3. WordPress Headless

适合内容运营优先的团队。

如果团队非常熟悉传统文章后台、SEO 插件、分类标签、媒体库，WordPress 可以作为后端，通过 REST API 给前台供数据。

适合：

- 新闻、文章、专栏、专题为主
- 编辑人员需要成熟后台
- 需要丰富 SEO 插件

不太适合：

- 很多高度结构化的业务模块
- 想保持全栈 JavaScript/TypeScript 技术路线

### 4. Payload CMS

适合未来直接升级为 Next.js 全栈项目。

Payload 是 TypeScript/Next.js 方向的 CMS，后台、API、权限、上传能力都强，代码可控性好。

适合：

- 准备重构为 Next.js
- 后续要做会员、课程、活动报名等复杂业务
- 希望内容模型全部代码化、版本化

不适合当前第一阶段快速落地，因为迁移成本比 Directus 和 Strapi 高。

### 5. Ghost

适合文章媒体站，不适合复杂业务内容站。

如果网站主要是“国学文章、新闻、专栏、订阅推送”，Ghost 很快。但如果要管理业务、服务、活动、课程、图片资源库等结构化内容，灵活度不如 Directus/Strapi。

## 建议落地路线

### 第一阶段：保留当前页面，补后台

推荐选 Directus。

开发动作：

1. 在项目旁边新增 `backend/`，运行 Directus。
2. 使用 SQLite 或 PostgreSQL 作为数据库。
3. 配置管理员账号。
4. 创建内容集合：简介、业务、公告、新闻、文章、分类、媒体。
5. 在 `index.html` 中增加 API 配置和数据请求函数。
6. 先把硬编码文案替换为后台内容。

这一阶段的目标是“能登录后台上传内容，前台能读取显示”。

### 第二阶段：重做国学文化前台

当前页面主题是黄金交易时间，不适合作为最终国学网站视觉，只适合作为技术起点。

建议将前台逐步重做为：

- 首页：首页主视觉、国学简介、业务板块、最新新闻、精选文章
- 新闻页：新闻列表、详情页
- 文章页：分类、标签、作者、详情页
- 业务页：文化咨询、课程、活动、文创、传承项目等
- 关于页：机构简介、团队、联系方式

如果继续用静态 HTML，也能做；如果后续内容量上来，建议迁移到 Vite/React、Vue 或 Next.js。

### 第三阶段：上线部署

推荐组合：

- 前台：静态站或 Next.js
- 后台：Directus
- 数据库：PostgreSQL
- 图片：本地存储起步，后续可接对象存储
- 部署：云服务器、Docker Compose 或支持 Node.js 的平台

## 下一步建议

优先执行：

1. 修复当前目录里的坏 `.git` 状态，重新初始化本地 Git。
2. 新建 `backend/`，选择 Directus 或 Strapi。
3. 搭建最小内容模型。
4. 把首页文案和图片改为从 API 读取。

当前推荐决策：先用 Directus。

参考资料：

- Directus Docs: https://docs.directus.io/
- Directus API: https://docs.directus.io/reference/introduction
- Directus Files: https://docs.directus.io/reference/files
- Strapi Docs: https://docs.strapi.io/
- Payload Docs: https://payloadcms.com/docs/getting-started/what-is-payload
- Keystone Docs: https://keystonejs.com/docs
