(function() {
  const $ = id => document.getElementById(id);

  const tokenInput = $('token');
  const saveTokenBtn = $('save-token');
  const tokenStatus = $('token-status');
  const tokenSection = $('token-section');
  const editorSection = $('editor-section');
  const editorTitle = $('editor-title');

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

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');
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
      await GH.getUser();
      tokenSection.style.display = 'none';
      editorSection.style.display = 'block';
      if (editId) loadForEdit(editId);
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
      await GH.getUser();
      tokenStatus.textContent = 'OK';
      tokenStatus.className = 'status-msg success';
      setTimeout(() => {
        tokenSection.style.display = 'none';
        editorSection.style.display = 'block';
        if (editId) loadForEdit(editId);
      }, 500);
    } catch (e) {
      tokenStatus.textContent = 'Invalid: ' + e.message;
      tokenStatus.className = 'status-msg error';
      GH.setToken('');
    }
  });

  // --- Load for edit ---

  async function loadForEdit(id) {
    try {
      const post = await GH.getPost(id);
      if (!post) { showStatus('Post not found', 'error'); return; }

      editingId = id;
      editorTitle.textContent = '编辑文章';
      document.title = 'Edit - Blog';
      titleInput.value = post.title;
      slugInput.value = post.id;
      slugInput.dataset.manual = '1';
      dateInput.value = post.date;
      tagsInput.value = post.tags.join(', ');
      summaryInput.value = post.summary;
      contentInput.value = post.content || '';
      publishBtn.textContent = 'Update';
      showStatus(`Editing: ${post.title}`, '');
    } catch (e) {
      showStatus('Load failed: ' + e.message, 'error');
    }
  }

  // --- Preview ---

  function escapeMath(src) {
    const store = [];
    src = src.replace(/(```[\s\S]*?```)/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    src = src.replace(/\\\[[\s\S]*?\\\]/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    src = src.replace(/\$\$[\s\S]*?\$\$/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    src = src.replace(/\\\([\s\S]*?\\\)/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    src = src.replace(/\$(?!\s)(?:[^$\\]|\\.)+?\$/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    return { src, store };
  }

  function restoreMath(html, store) {
    store.forEach((m, i) => {
      if (m.startsWith('```')) {
        const lang = m.match(/^```(\w*)\n/)?.[1] || '';
        const code = m.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        html = html.replace(`%%MATH${i}%%`, `<pre><code class="language-${lang}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
      } else {
        html = html.replace(`%%MATH${i}%%`, m);
      }
    });
    return html;
  }

  previewBtn.addEventListener('click', async () => {
    if (previewEl.style.display === 'none') {
      const { src, store } = escapeMath(contentInput.value);
      previewEl.innerHTML = restoreMath(marked.parse(src), store);
      previewEl.style.display = 'block';
      previewBtn.textContent = 'Hide preview';
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(previewEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      }
      if (typeof Prism !== 'undefined') Prism.highlightAllUnder(previewEl);
      // Render Mermaid diagrams
      if (typeof mermaid !== 'undefined') {
        const mermaidBlocks = previewEl.querySelectorAll('code.language-mermaid');
        if (mermaidBlocks.length > 0) {
          mermaid.initialize({ startOnLoad: false, theme: 'dark' });
          for (const block of mermaidBlocks) {
            const pre = block.parentElement;
            const id = 'mermaid-' + Math.random().toString(36).slice(2, 10);
            try {
              const { svg } = await mermaid.render(id, block.textContent);
              const wrapper = document.createElement('div');
              wrapper.className = 'mermaid';
              wrapper.innerHTML = svg;
              pre.replaceWith(wrapper);
            } catch (e) {
              pre.classList.add('mermaid-error');
              pre.textContent = 'Mermaid error: ' + e.message;
            }
          }
        }
      }
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
      if (!editingId) {
        // Clear form for next post
        titleInput.value = '';
        slugInput.value = '';
        slugInput.dataset.manual = '';
        tagsInput.value = '';
        summaryInput.value = '';
        contentInput.value = '';
        dateInput.value = new Date().toISOString().slice(0, 10);
      }
    } catch (e) {
      showStatus('Failed: ' + e.message, 'error');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = editingId ? 'Update' : 'Publish';
    }
  });

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status-msg' + (type ? ' ' + type : '');
  }

  $('logout-btn')?.addEventListener('click', () => {
    GH.setToken('');
    tokenSection.style.display = 'block';
    editorSection.style.display = 'none';
    tokenInput.value = '';
  });

  checkToken();
})();
