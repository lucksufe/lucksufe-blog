const LOCAL = {
  API: '/api',

  getPassword() {
    return localStorage.getItem('local_password') || '';
  },

  setPassword(pw) {
    localStorage.setItem('local_password', pw);
  },

  headers() {
    const h = { 'Content-Type': 'application/json' };
    const pw = this.getPassword();
    if (pw) h['Authorization'] = 'Bearer ' + pw;
    return h;
  },

  async getUser() {
    const res = await fetch(`${this.API}/user`);
    if (!res.ok) throw new Error('Local server not available');
    const data = await res.json();
    return { login: data.login, authRequired: !!data.auth };
  },

  slugify(title) {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w一-鿿-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'post';
  },

  async getManifest() {
    const res = await fetch(`${this.API}/manifest`, { headers: this.headers() });
    if (res.status === 401) throw new Error('Password required');
    if (!res.ok) throw new Error('Failed to load manifest');
    return res.json();
  },

  async getPost(id) {
    const res = await fetch(`${this.API}/posts/${encodeURIComponent(id)}`, { headers: this.headers() });
    if (res.status === 401) throw new Error('Password required');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load post: ${id}`);
    return res.json();
  },

  async publishPost(post) {
    const id = post.id || this.slugify(post.title);
    const res = await fetch(`${this.API}/posts/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ ...post, draft: !!post.draft }),
    });
    if (res.status === 401) throw new Error('Password required');
    if (!res.ok) throw new Error('Failed to publish post');
    return id;
  },

  async deletePost(id) {
    const res = await fetch(`${this.API}/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (res.status === 401) throw new Error('Password required');
    if (!res.ok) throw new Error('Failed to delete post');
  },

  async getConfig() {
    const res = await fetch(`${this.API}/config`, { headers: this.headers() });
    if (!res.ok) return {};
    return res.json();
  },

  async publishConfig(cfg) {
    const res = await fetch(`${this.API}/config`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(cfg),
    });
    if (res.status === 401) throw new Error('Password required');
    if (!res.ok) throw new Error('Failed to save config');
    return res.json();
  },

  async uploadImage(file) {
    const data = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const res = await fetch(`${this.API}/upload`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ filename: file.name, data }),
    });
    if (res.status === 401) throw new Error('Password required');
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).url;
  },
};
