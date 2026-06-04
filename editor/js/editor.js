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

  dateInput.value = new Date().toISOString().slice(0, 10);

  titleInput.addEventListener('input', () => {
    if (!slugInput.dataset.manual) {
      slugInput.value = GH.slugify(titleInput.value);
    }
  });
  slugInput.addEventListener('input', () => {
    slugInput.dataset.manual = '1';
  });

  // --- Token ---

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
    tokenStatus.textContent = 'Verifying...';
    tokenStatus.className = 'status-msg';
    try {
      const user = await GH.getUser();
      tokenStatus.textContent = 'OK';
      tokenStatus.className = 'status-msg success';
      userDisplay.textContent = user;
      setTimeout(() => {
        tokenSection.style.display = 'none';
        editorSection.style.display = 'block';
        manageSection.style.display = 'block';
        loadPostList();
      }, 500);
    } catch (e) {
      tokenStatus.textContent = 'Invalid: ' + e.message;
      tokenStatus.className = 'status-msg error';
      GH.setToken('');
    }
  });

  // --- Post list ---

  async function loadPostList() {
    postListStatus.textContent = 'Loading...';
    postListEl.innerHTML = '';
    try {
      const manifest = await GH.getManifest();
      if (manifest.length === 0) {
        postListStatus.textContent = 'No posts';
        return;
      }
      postListStatus.textContent = `${manifest.length} posts`;
      renderPostList(manifest);
    } catch (e) {
      postListStatus.textContent = 'Failed: ' + e.message;
    }
  }

  function renderPostList(posts) {
    postListEl.innerHTML = posts.map(p => `
      <div class="post-item">
        <div class="post-item-info">
          <span class="post-item-title">${p.title}</span>
          <span class="post-item-date">${p.date}</span>
          <span class="post-item-tags">${p.tags.join(', ')}</span>
        </div>
        <div class="post-item-actions">
          <button class="btn btn-edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-delete" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');

    postListEl.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.id));
    });
    postListEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
  }

  // --- Edit ---

  async function startEdit(id) {
    try {
      const post = await GH.getPost(id);
      if (!post) return;

      editingId = id;
      titleInput.value = post.title;
      slugInput.value = post.id;
      slugInput.dataset.manual = '1';
      dateInput.value = post.date;
      tagsInput.value = post.tags.join(', ');
      summaryInput.value = post.summary;
      contentInput.value = post.content || '';

      publishBtn.textContent = 'Update';
      showStatus(`Editing: ${post.title}`, '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      showStatus('Load failed: ' + e.message, 'error');
    }
  }

  // --- Delete ---

  async function handleDelete(id) {
    if (!confirm(`Delete "${id}"? This cannot be undone.`)) return;
    try {
      await GH.deletePost(id);
      showStatus(`Deleted: ${id}`, 'success');
      if (editingId === id) resetForm();
      loadPostList();
    } catch (e) {
      showStatus('Delete failed: ' + e.message, 'error');
    }
  }

  // --- Preview ---

  previewBtn.addEventListener('click', () => {
    if (previewEl.style.display === 'none') {
      previewEl.innerHTML = marked.parse(contentInput.value);
      previewEl.style.display = 'block';
      previewBtn.textContent = 'Hide preview';
      if (typeof Prism !== 'undefined') Prism.highlightAllUnder(previewEl);
    } else {
      previewEl.style.display = 'none';
      previewBtn.textContent = 'Preview';
    }
  });

  // --- Publish ---

  publishBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const date = dateInput.value;
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const summary = summaryInput.value.trim();
    const content = contentInput.value.trim();
    const id = slugInput.value.trim() || GH.slugify(title);

    if (!title || !content) { showStatus('Title and content required', 'error'); return; }
    if (tags.length === 0) { showStatus('At least one tag', 'error'); return; }

    publishBtn.disabled = true;
    publishBtn.textContent = editingId ? 'Updating...' : 'Publishing...';
    showStatus('Committing to GitHub...', '');

    try {
      const resultId = await GH.publishPost({ id, title, date, tags, summary, content });
      showStatus(editingId ? `Updated: ${resultId}` : `Published: ${resultId}`, 'success');
      resetForm();
      loadPostList();
    } catch (e) {
      showStatus('Failed: ' + e.message, 'error');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = editingId ? 'Update' : 'Publish';
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
    previewBtn.textContent = 'Preview';
    publishBtn.textContent = 'Publish';
  }

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status-msg' + (type ? ' ' + type : '');
  }

  newPostBtn?.addEventListener('click', () => { resetForm(); showStatus('New post', ''); });
  refreshBtn?.addEventListener('click', loadPostList);

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
