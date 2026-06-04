const GH = {
  REPO: 'lucksufe/lucksufe-blog',
  BRANCH: 'main',
  API: 'https://api.github.com/repos/lucksufe/lucksufe-blog',

  getToken() {
    return localStorage.getItem('gh_token') || '';
  },

  setToken(token) {
    localStorage.setItem('gh_token', token);
  },

  headers() {
    return {
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v+json'
    };
  },

  async getUser() {
    const res = await fetch('https://api.github.com/user', { headers: this.headers() });
    if (!res.ok) throw new Error('Token 无效');
    return (await res.json()).login;
  },

  async getFile(path) {
    const res = await fetch(`${this.API}/contents/${path}?ref=${this.BRANCH}`, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`获取文件失败: ${res.status}`);
    const data = await res.json();
    return {
      content: decodeURIComponent(escape(atob(data.content.replace(/\s/g, '')))),
      sha: data.sha
    };
  },

  async commitFile(path, content, sha, message) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: this.BRANCH
    };
    if (sha) body.sha = sha;

    const res = await fetch(`${this.API}/contents/${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `提交失败: ${res.status}`);
    }
    return res.json();
  },

  slugify(title) {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w一-鿿-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'post';
  },

  buildMdFile({ title, date, tags, summary, content }) {
    const tagsStr = tags.map(t => `"${t}"`).join(', ');
    return `---
title: "${title}"
date: ${date}
tags: [${tagsStr}]
summary: "${summary}"
---

${content}`;
  },

  buildPostEntry({ id, title, date, tags, summary, content }) {
    const tagsStr = tags.map(t => `"${t}"`).join(', ');
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
    return `  {
    id: "${id}",
    title: "${title}",
    date: "${date}",
    tags: [${tagsStr}],
    summary: "${summary}",
    content: \`
${escaped}\`
  }`;
  },

  async publishPost(post) {
    const id = post.id || this.slugify(post.title);

    // 1. Commit the .md file
    const mdPath = `site/posts/${id}.md`;
    const mdContent = this.buildMdFile(post);
    const existingMd = await this.getFile(mdPath);
    await this.commitFile(mdPath, mdContent, existingMd?.sha, `post: ${post.title}`);

    // 2. Update posts.js
    const postsFile = await this.getFile('site/js/posts.js');
    if (!postsFile) throw new Error('找不到 site/js/posts.js');

    const entry = this.buildPostEntry({ ...post, id });

    let newContent;
    if (postsFile.content.includes(`id: "${id}"`)) {
      // Replace existing entry
      const regex = new RegExp(
        `(  \\{[\\s\\S]*?id: "${id}"[\\s\\S]*?\\})`,
        'm'
      );
      newContent = postsFile.content.replace(regex, entry);
    } else {
      // Append before closing ];
      const trimmed = postsFile.content.trimEnd();
      if (trimmed.endsWith('];')) {
        const base = trimmed.slice(0, -2).trimEnd();
        const separator = base.endsWith('{') ? '' : ',\n';
        newContent = base + separator + entry + '\n];';
      } else {
        throw new Error('posts.js 格式异常');
      }
    }

    await this.commitFile('site/js/posts.js', newContent, postsFile.sha, `update posts.js: ${post.title}`);

    return id;
  }
};
