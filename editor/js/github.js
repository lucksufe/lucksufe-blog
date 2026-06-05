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
    if (!res.ok) throw new Error('Token invalid');
    return (await res.json()).login;
  },

  async getFile(path) {
    const res = await fetch(`${this.API}/contents/${path}?ref=${this.BRANCH}`, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
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
      throw new Error(err.message || `PUT ${path} failed: ${res.status}`);
    }
    return res.json();
  },

  async deleteFile(path, sha, message) {
    const res = await fetch(`${this.API}/contents/${path}`, {
      method: 'DELETE',
      headers: this.headers(),
      body: JSON.stringify({ message, sha, branch: this.BRANCH })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `DELETE ${path} failed: ${res.status}`);
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

  // --- Manifest ---

  async getManifest() {
    const file = await this.getFile('posts/manifest.json');
    if (!file) return [];
    return JSON.parse(file.content);
  },

  async saveManifest(manifest, sha) {
    const content = JSON.stringify(manifest, null, 2);
    await this.commitFile('posts/manifest.json', content, sha, 'update manifest');
  },

  // --- Single post ---

  async getPost(id) {
    const file = await this.getFile(`posts/${id}.json`);
    if (!file) return null;
    return { ...JSON.parse(file.content), _sha: file.sha };
  },

  // --- Publish ---

  async publishPost(post) {
    const id = post.id || this.slugify(post.title);

    // 1. Save post JSON
    const postData = { id, title: post.title, date: post.date, tags: post.tags, summary: post.summary, content: post.content };
    const existing = await this.getFile(`posts/${id}.json`);
    await this.commitFile(
      `posts/${id}.json`,
      JSON.stringify(postData, null, 2),
      existing?.sha,
      `post: ${post.title}`
    );

    // 2. Update manifest
    const manifestFile = await this.getFile('posts/manifest.json');
    let manifest = manifestFile ? JSON.parse(manifestFile.content) : [];

    const meta = { id, title: post.title, date: post.date, tags: post.tags, summary: post.summary };
    const idx = manifest.findIndex(p => p.id === id);
    if (idx >= 0) {
      manifest[idx] = meta;
    } else {
      manifest.push(meta);
    }

    manifest.sort((a, b) => b.date.localeCompare(a.date));
    await this.saveManifest(manifest, manifestFile?.sha);

    // 3. Update RSS
    await this.generateRss(manifest);

    return id;
  },

  async generateRss(manifest) {
    let items = '';
    for (const p of manifest.slice(0, 20)) {
      items += `    <item>\n      <title>${p.title}</title>\n      <link>post.html?id=${p.id}</link>\n      <description>${p.summary || ''}</description>\n      <pubDate>${p.date}</pubDate>\n    </item>\n`;
    }
    const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Blog</title>\n    <link>index.html</link>\n    <description>Blog RSS Feed</description>\n${items}  </channel>\n</rss>`;
    const existing = await this.getFile('rss.xml');
    await this.commitFile('rss.xml', rss, existing?.sha, 'update rss');
  },

  // --- Delete ---

  async deletePost(id) {
    // 1. Delete post JSON
    const postFile = await this.getFile(`posts/${id}.json`);
    if (postFile) {
      await this.deleteFile(`posts/${id}.json`, postFile.sha, `delete: ${id}`);
    }

    // 2. Update manifest
    const manifestFile = await this.getFile('posts/manifest.json');
    if (!manifestFile) throw new Error('manifest.json not found');

    let manifest = JSON.parse(manifestFile.content);
    manifest = manifest.filter(p => p.id !== id);
    await this.saveManifest(manifest, manifestFile.sha);

    // 3. Update RSS
    await this.generateRss(manifest);
  },

  async uploadImage(file) {
    const data = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    const ext = file.name.split('.').pop() || 'png';
    const name = `${Date.now()}.${ext}`;
    const path = `posts/images/${name}`;
    const body = {
      message: `image: ${name}`,
      content: data,
      branch: this.BRANCH
    };
    const res = await fetch(`${this.API}/contents/${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Image upload failed');
    return path;
  }
};
