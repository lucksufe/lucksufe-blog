# Blog

极简静态博客。纯 HTML/CSS/JS，无构建工具，无依赖安装。

## 目录结构

```
blog/
├── site/               # 部署到 GitHub Pages
│   ├── index.html      # 首页（文章列表 + 标签筛选）
│   ├── post.html       # 文章详情页
│   ├── css/style.css   # 样式
│   ├── js/
│   │   ├── posts.js    # 文章数据（由编辑器自动生成）
│   │   ├── app.js      # 首页逻辑
│   │   └── post.js     # 文章渲染逻辑
│   ├── favicon.svg
│   └── README.md
├── editor/             # 本地使用，不部署
│   ├── editor.html     # 写文章的页面
│   ├── js/
│   │   ├── github.js   # GitHub API 封装
│   │   └── editor.js   # 编辑器逻辑
│   ├── posts/          # Markdown 草稿
│   └── new-post.sh     # 命令行发布脚本（备用）
└── README.md
```

## 功能

- Markdown 写作，支持代码高亮（Prism.js）和数学公式（KaTeX）
- Tag 标签筛选
- 暗色主题，响应式布局
- 网页编辑器，一键发布到 GitHub Pages

## 写新文章

### 方式一：网页编辑器（推荐）

1. 本地打开 `editor/editor.html`
2. 输入 GitHub Fine-grained Personal Access Token（需 Contents: Read and write 权限）
3. 填写标题、标签、摘要，写 Markdown 正文
4. 点击「发布」— 自动提交到 GitHub 仓库，GitHub Pages 自动重新部署

### 方式二：命令行

```bash
cp editor/posts/_example.md editor/posts/my-post.md
# 编辑 my-post.md
./editor/new-post.sh editor/posts/my-post.md
git add site/js/posts.js && git commit -m "add post" && git push
```

## 部署

`site/` 目录即为完整的静态站点，推送到 GitHub 后在 Settings → Pages 中选择 `main` 分支的 `/site` 目录作为源。

## 依赖（CDN）

- [marked.js](https://github.com/markedjs/marked) — Markdown 解析
- [KaTeX](https://katex.org) — 数学公式渲染
- [Prism.js](https://prismjs.com) — 代码语法高亮
- [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) + [Inter](https://fonts.google.com/specimen/Inter) — 字体

全部通过 CDN 加载，无需安装。
