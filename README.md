# Blog

极简静态博客。纯 HTML/CSS/JS，无构建工具，无依赖安装。

## 功能

- Markdown 写作，支持代码高亮（Prism.js）和数学公式（KaTeX）
- Tag 标签筛选
- 暗色主题，响应式布局
- 一行命令发布新文章

## 目录结构

```
blog/
├── index.html          # 首页（文章列表 + 标签筛选）
├── post.html           # 文章详情页
├── css/style.css       # 样式
├── js/
│   ├── posts.js        # 文章数据（自动生成，不要手动编辑）
│   ├── app.js          # 首页逻辑
│   └── post.js         # 文章渲染逻辑
├── favicon.svg         # 站点图标
├── posts/              # Markdown 草稿目录
│   └── _example.md     # 格式模板
├── new-post.sh         # 发布脚本
└── README.md
```

## 本地预览

```bash
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 写新文章

### 1. 创建 Markdown 文件

复制模板开始写：

```bash
cp posts/_example.md posts/my-new-post.md
```

文件格式：

```markdown
---
title: 文章标题
date: 2026-06-04
tags: [标签1, 标签2]
summary: 一句话摘要
---

正文内容。

## 二级标题

**加粗**、*斜体*、`行内代码`。

代码块：

```python
print("hello")
```

数学公式：$E = mc^2$

> 引用文字
```

### 2. 发布

```bash
./new-post.sh posts/my-new-post.md
```

脚本会解析 frontmatter 并自动追加到 `js/posts.js`。刷新浏览器即可看到。

### 3. 删除文章

手动从 `js/posts.js` 中删除对应的对象块即可。

## 部署

将以下文件/目录复制到静态托管（GitHub Pages、Vercel、Netlify、Nginx 等）：

```
index.html
post.html
css/
js/
favicon.svg
```

打包命令：

```bash
tar czf blog.tar.gz index.html post.html css/ js/ favicon.svg
```

`posts/` 目录和 `new-post.sh` 仅用于本地写作，不需要部署。

## 依赖（CDN）

- [marked.js](https://github.com/markedjs/marked) — Markdown 解析
- [KaTeX](https://katex.org) — 数学公式渲染
- [Prism.js](https://prismjs.com) — 代码语法高亮
- [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) + [Inter](https://fonts.google.com/specimen/Inter) — 字体

全部通过 CDN 加载，无需安装。
