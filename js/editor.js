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
      }, 500);
    } catch (e) {
      tokenStatus.textContent = 'Token 无效: ' + e.message;
      tokenStatus.className = 'status-msg error';
      GH.setToken('');
    }
  });

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
    publishBtn.textContent = '发布中...';
    showStatus('正在提交到 GitHub...', '');

    try {
      const resultId = await GH.publishPost({ id, title, date, tags, summary, content });
      showStatus(`发布成功！文章 ID: ${resultId}`, 'success');
      // Reset form
      titleInput.value = '';
      slugInput.value = '';
      slugInput.dataset.manual = '';
      tagsInput.value = '';
      summaryInput.value = '';
      contentInput.value = '';
      dateInput.value = new Date().toISOString().slice(0, 10);
      previewEl.style.display = 'none';
      previewBtn.textContent = '预览';
    } catch (e) {
      showStatus('发布失败: ' + e.message, 'error');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = '发布';
    }
  });

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status-msg' + (type ? ' ' + type : '');
  }

  // Logout
  $('logout-btn')?.addEventListener('click', () => {
    GH.setToken('');
    tokenSection.style.display = 'block';
    editorSection.style.display = 'none';
    tokenInput.value = '';
  });

  checkToken();
})();
