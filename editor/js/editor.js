(function() {
  const $ = id => document.getElementById(id);

  const tokenInput = $('token');
  const saveTokenBtn = $('save-token');
  const tokenStatus = $('token-status');
  const editorSection = $('editor-section');
  const tokenSection = $('token-section');
  const userDisplay = $('user-display');

  const titleInput = $('title');
  const slugInput = $('slug');
  const dateInput = $('date');
  const tagsInput = $('tags');
  const summaryInput = $('summary');
  const contentInput = $('content');
  const publishBtn = $('publish-btn');
  const statusEl = $('publish-status');
  const previewBtn = $('preview-btn');
  const previewEl = $('preview');

  const postListEl = $('post-list');
  const postListStatus = $('post-list-status');
  const refreshBtn = $('refresh-posts');
  const newPostBtn = $('new-post-btn');
  const manageSection = $('manage-section');

  let editingId = null;
  let postsRawContent = '';

  // Init date to today
  dateInput.value = new Date().toISOString().slice(0, 10);

  // Auto-generate slug from title
  titleInput.addEventListener('input', () => {
    if (!slugInput.dataset.manual) {
      slugInput.value = GH.slugify(titleInput.value);
    }
  });
  slugInput.addEventListener('input', () => {
    slugInput.dataset.manual = '1';
  });

  // Token flow
  async function checkToken() {
    const token = GH.getToken();
    if (!token) return;
    tokenInput.value = token;
    try {
      const user = await GH.getUser();
      userDisplay.textContent = user;
      tokenSection.style.display = 'none';
      editorSection.style.display = 'block';
      manageSection.style.display = 'block';
      loadPostList();
    } catch {
      GH.setToken('');
    }
  }

  saveTokenBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) return;
    GH.setToken(token);
    tokenStatus.textContent = '验证中...';
    tokenStatus.className = 'status-msg';
    try {
      const user = await GH.getUser();
      tokenStatus.textContent = '验证成功';
      tokenStatus.className = 'status-msg success';
      userDisplay.textContent = user;
      setTimeout(() => {
        tokenSection.style.display = 'none';
        editorSection.style.display = 'block';
        manageSection.style.display = 'block';
        loadPostList();
      }, 500);
    } catch (e) {
      tokenStatus.textContent = 'Token 无效: ' + e.message;
      tokenStatus.className = 'status-msg error';
      GH.setToken('');
    }
  });

  // Post list management
  async function loadPostList() {
    postListStatus.textContent = '加载中...';
    postListEl.innerHTML = '';
    try {
      const file = await GH.getFile('js/posts.js');
      if (!file) {
        postListStatus.textContent = '找不到 posts.js';
        return;
      }
      postsRawContent = file.content;
      const posts = GH.loadPosts(file.content);
      if (posts.length === 0) {
        postListStatus.textContent = '暂无文章';
        return;
      }
      postListStatus.textContent = `共 ${posts.length} 篇文章`;
      renderPostList(posts);
    } catch (e) {
      postListStatus.textContent = '加载失败: ' + e.message;
    }
  }

  function renderPostList(posts) {
    postListEl.innerHTML = posts.map(p => `
      <div class="post-item" data-id="${p.id}">
        <div class="post-item-info">
          <span class="post-item-title">${p.title}</span>
          <span class="post-item-date">${p.date}</span>
          <span class="post-item-tags">${p.tags.join(', ')}</span>
        </div>
        <div class="post-item-actions">
          <button class="btn btn-edit" data-id="${p.id}">编辑</button>
          <button class="btn btn-delete" data-id="${p.id}">删除</button>
        </div>
      </div>
    `).join('');

    // Bind edit buttons
    postListEl.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.id));
    });

    // Bind delete buttons
    postListEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
  }

  async function startEdit(id) {
    const posts = GH.loadPosts(postsRawContent);
    const post = posts.find(p => p.id === id);
    if (!post) return;

    editingId = id;
    titleInput.value = post.title;
    slugInput.value = post.id;
    slugInput.dataset.manual = '1';
    dateInput.value = post.date;
    tagsInput.value = post.tags.join(', ');
    summaryInput.value = post.summary;

    // Try to load full content from .md file
    try {
      const mdFile = await GH.getFile(`posts/${id}.md`);
      if (mdFile) {
        // Strip frontmatter
        const body = mdFile.content.replace(/^---[\s\S]*?---\n*/, '');
        contentInput.value = body;
      } else {
        contentInput.value = '';
      }
    } catch {
      contentInput.value = '';
    }

    publishBtn.textContent = '更新';
    showStatus(`编辑中: ${post.title}`, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    const posts = GH.loadPosts(postsRawContent);
    const post = posts.find(p => p.id === id);
    if (!post) return;

    if (!confirm(`确定删除「${post.title}」？此操作不可撤销。`)) return;

    try {
      await GH.deletePost(id);
      showStatus(`已删除: ${post.title}`, 'success');
      if (editingId === id) resetForm();
      loadPostList();
    } catch (e) {
      showStatus('删除失败: ' + e.message, 'error');
    }
  }

  // Preview
  previewBtn.addEventListener('click', () => {
    if (previewEl.style.display === 'none') {
      previewEl.innerHTML = marked.parse(contentInput.value);
      previewEl.style.display = 'block';
      previewBtn.textContent = '隐藏预览';
      if (typeof Prism !== 'undefined') Prism.highlightAllUnder(previewEl);
    } else {
      previewEl.style.display = 'none';
      previewBtn.textContent = '预览';
    }
  });

  // Publish
  publishBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const date = dateInput.value;
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const summary = summaryInput.value.trim();
    const content = contentInput.value.trim();
    const id = slugInput.value.trim() || GH.slugify(title);

    if (!title || !content) {
      showStatus('标题和内容不能为空', 'error');
      return;
    }
    if (tags.length === 0) {
      showStatus('至少填一个标签', 'error');
      return;
    }

    publishBtn.disabled = true;
    publishBtn.textContent = editingId ? '更新中...' : '发布中...';
    showStatus('正在提交到 GitHub...', '');

    try {
      const resultId = await GH.publishPost({ id, title, date, tags, summary, content });
      showStatus(editingId ? `更新成功！文章 ID: ${resultId}` : `发布成功！文章 ID: ${resultId}`, 'success');
      resetForm();
      loadPostList();
    } catch (e) {
      showStatus((editingId ? '更新失败: ' : '发布失败: ') + e.message, 'error');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = editingId ? '更新' : '发布';
    }
  });

  function resetForm() {
    editingId = null;
    titleInput.value = '';
    slugInput.value = '';
    slugInput.dataset.manual = '';
    tagsInput.value = '';
    summaryInput.value = '';
    contentInput.value = '';
    dateInput.value = new Date().toISOString().slice(0, 10);
    previewEl.style.display = 'none';
    previewBtn.textContent = '预览';
    publishBtn.textContent = '发布';
  }

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status-msg' + (type ? ' ' + type : '');
  }

  // New post button
  newPostBtn?.addEventListener('click', () => {
    resetForm();
    showStatus('新建文章', '');
  });

  // Refresh button
  refreshBtn?.addEventListener('click', loadPostList);

  // Logout
  $('logout-btn')?.addEventListener('click', () => {
    GH.setToken('');
    tokenSection.style.display = 'block';
    editorSection.style.display = 'none';
    manageSection.style.display = 'none';
    tokenInput.value = '';
    resetForm();
  });

  checkToken();
})();
