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
  const draftBtn = $('draft-btn');
  const statusEl = $('publish-status');
  const previewBtn = $('preview-btn');
  const previewRefresh = $('preview-refresh');
  const previewEl = $('preview');

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');
  let editingId = null;

  { const now = new Date(); dateInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }

  // --- Toolbar ---

  function insertAtCursor(textarea, before, after) {
    after = after ?? '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = textarea.value.substring(start, end);
    const replacement = before + sel + after;
    textarea.setRangeText(replacement, start, end, 'select');
    textarea.focus();
    const cursorPos = sel ? start + replacement.length : start + before.length;
    textarea.setSelectionRange(cursorPos, cursorPos);
  }

  function buildToolbar() {
    const toolbar = $('toolbar');

    const menus = [
      {
        label: t('tb.markdown'),
        items: [
          { label: t('tb.heading'), insert: ['# ', ''] },
          { label: t('tb.bold'), insert: ['**', '**'] },
          { label: t('tb.italic'), insert: ['*', '*'] },
          { label: t('tb.quote'), insert: ['> ', ''] },
          { label: t('tb.inlineCode'), insert: ['`', '`'] },
          { label: t('tb.hr'), insert: ['\n---\n', ''] },
          { sep: true },
          { label: t('tb.codeBlock'), sub: [
            { label: t('tb.codePlain'), insert: ['```\n', '\n```'] },
            { label: 'Python', insert: ['```python\n', '\n```'] },
            { label: 'JavaScript', insert: ['```javascript\n', '\n```'] },
            { label: 'Bash', insert: ['```bash\n', '\n```'] },
          ]},
          { label: t('tb.list'), sub: [
            { label: t('tb.listUnordered'), insert: ['- ', ''] },
            { label: t('tb.listOrdered'), insert: ['1. ', ''] },
            { label: t('tb.listTask'), insert: ['- [ ] ', ''] },
          ]},
          { label: t('tb.table'), sub: [
            { label: '2', insert: ['| 列1 | 列2 |\n| --- | --- |\n| ', ' |  |'] },
            { label: '3', insert: ['| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ', ' |  |  |'] },
          ]},
        ]
      },
      {
        label: t('tb.math'),
        items: [
          { label: t('tb.inlineMath'), insert: ['$ ', ' $'] },
          { label: t('tb.blockMath'), insert: ['$$\n', '\n$$'] },
          { label: t('tb.displayMath'), insert: ['\\[\n', '\n\\]'] },
          { sep: true },
          { label: t('tb.frac'), insert: ['\\frac{', '}{b}'] },
          { label: t('tb.sqrt'), insert: ['\\sqrt{', '}'] },
          { label: t('tb.superscript'), insert: ['x^{', '}'] },
          { label: t('tb.subscript'), insert: ['x_{', '}'] },
          { label: t('tb.vector'), insert: ['\\vec{', '}'] },
          { sep: true },
          { label: t('tb.calculus'), sub: [
            { label: t('tb.integral'), insert: ['\\int_{', '}^{\\infty} f(x) \\, \\mathrm{d}x'] },
            { label: t('tb.integral2'), insert: ['\\iint_{', 'D} f(x,y) \\, \\mathrm{d}x \\mathrm{d}y'] },
            { label: t('tb.sum'), insert: ['\\sum_{i=', '}^{n} a_i'] },
            { label: t('tb.prod'), insert: ['\\prod_{i=', '}^{n} a_i'] },
            { label: t('tb.limit'), insert: ['\\lim_{x \\to ', '} f(x)'] },
          ]},
          { label: t('tb.linalgebra'), sub: [
            { label: t('tb.matrix2'), insert: ['\\begin{pmatrix}\na & b \\\\\\\\\nc & d\n\\end{pmatrix}', ''] },
            { label: t('tb.matrix3'), insert: ['\\begin{pmatrix}\na & b & c \\\\\\\\\nd & e & f \\\\\\\\\ng & h & i\n\\end{pmatrix}', ''] },
            { label: t('tb.det'), insert: ['\\begin{vmatrix}\na & b \\\\\\\\\nc & d\n\\end{vmatrix}', ''] },
          ]},
          { label: t('tb.greek'), sub: [
            { label: 'α β γ δ ε', insert: ['\\alpha \\beta \\gamma \\delta \\epsilon', ''] },
            { label: 'θ φ ψ ω', insert: ['\\theta \\varphi \\psi \\omega', ''] },
            { label: 'Γ Δ Θ Λ Ξ', insert: ['\\Gamma \\Delta \\Theta \\Lambda \\Xi', ''] },
          ]},
        ]
      },
      {
        label: t('tb.diagram'),
        items: [
          { label: t('tb.flowchart'), insert: ['```mermaid\ngraph LR\n    A[开始] --> B{判断}\n    B -->|是| C[执行]\n    B -->|否| D[结束]\n```', ''] },
          { label: t('tb.flowchartV'), insert: ['```mermaid\ngraph TD\n    A[开始] --> B{判断}\n    B -->|是| C[执行]\n    B -->|否| D[结束]\n```', ''] },
          { label: t('tb.sequence'), insert: ['```mermaid\nsequenceDiagram\n    participant A as 用户\n    participant B as 服务器\n    A->>B: 请求\n    B-->>A: 响应\n```', ''] },
          { label: t('tb.class'), insert: ['```mermaid\nclassDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +bark()\n    }\n    Animal <|-- Dog\n```', ''] },
          { sep: true },
          { label: t('tb.other'), sub: [
            { label: t('tb.state'), insert: ['```mermaid\nstateDiagram-v2\n    [*] --> 待处理\n    待处理 --> 进行中\n    进行中 --> 已完成\n    已完成 --> [*]\n```', ''] },
            { label: t('tb.gantt'), insert: ['```mermaid\ngantt\n    title 项目计划\n    dateFormat YYYY-MM-DD\n    section 阶段一\n    任务A :a1, 2026-01-01, 30d\n    任务B :a2, after a1, 20d\n```', ''] },
            { label: t('tb.pie'), insert: ['```mermaid\npie title 分布\n    "A" : 40\n    "B" : 30\n    "C" : 30\n```', ''] },
            { label: t('tb.er'), insert: ['```mermaid\nerDiagram\n    USER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n```', ''] },
          ]},
        ]
      }
    ];

    menus.forEach(menu => {
      const dropdown = document.createElement('div');
      dropdown.className = 'tb-dropdown';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tb-btn';
      btn.textContent = menu.label;
      dropdown.appendChild(btn);

      const menuEl = document.createElement('div');
      menuEl.className = 'tb-menu';
      buildMenuItems(menuEl, menu.items);
      dropdown.appendChild(menuEl);

      toolbar.appendChild(dropdown);
    });

    toolbar.addEventListener('click', e => {
      const item = e.target.closest('.tb-item');
      if (item && item._itemData) {
        // Leaf menu item: insert template
        insertAtCursor(contentInput, item._itemData.insert[0], item._itemData.insert[1]);
        closeAll();
        return;
      }
      if (item && item.classList.contains('tb-submenu-trigger')) {
        // Submenu trigger: toggle on mobile
        item.classList.toggle('open');
        e.stopPropagation();
        return;
      }
      const btn = e.target.closest('.tb-btn');
      if (!btn) { closeAll(); return; }
      const dropdown = btn.parentElement;
      const wasOpen = dropdown.classList.contains('open');
      closeAll();
      if (!wasOpen) dropdown.classList.add('open');
    });

    document.addEventListener('click', e => {
      if (!toolbar.contains(e.target)) closeAll();
    });
  }

  function buildMenuItems(container, items) {
    items.forEach(item => {
      if (item.sep) {
        const sep = document.createElement('div');
        sep.className = 'tb-sep';
        container.appendChild(sep);
        return;
      }
      if (item.sub) {
        const trigger = document.createElement('div');
        trigger.className = 'tb-item tb-submenu-trigger';
        trigger.innerHTML = `<span>${item.label}</span><span class="tb-arrow">▸</span>`;
        const sub = document.createElement('div');
        sub.className = 'tb-submenu';
        buildMenuItems(sub, item.sub);
        trigger.appendChild(sub);
        container.appendChild(trigger);
        return;
      }
      const el = document.createElement('div');
      el.className = 'tb-item';
      el.textContent = item.label;
      el._itemData = item;
      container.appendChild(el);
    });
  }

  function closeAll() {
    $('toolbar').querySelectorAll('.tb-dropdown.open').forEach(d => d.classList.remove('open'));
  }

  buildToolbar();

  // --- Image upload (paste & drag-drop) ---

  function isImageFile(file) {
    return file && file.type.startsWith('image/');
  }

  async function uploadAndInsert(file) {
    if (!isImageFile(file)) return;
    try {
      insertAtCursor(contentInput, `![${t('status.uploading')}]()`);
      const url = await storage.uploadImage(file);
      contentInput.value = contentInput.value.replace(
        `![${t('status.uploading')}]()`,
        `![${file.name}](${url})`
      );
    } catch (e) {
      contentInput.value = contentInput.value.replace(`![${t('status.uploading')}]()`, '');
      alert(t('status.uploadFailed') + ': ' + e.message);
    }
  }

  contentInput.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        uploadAndInsert(item.getAsFile());
        return;
      }
    }
  });

  contentInput.addEventListener('drop', e => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files) {
      for (const file of files) {
        if (isImageFile(file)) {
          uploadAndInsert(file);
          return;
        }
      }
    }
  });

  contentInput.addEventListener('dragover', e => e.preventDefault());

  // --- Draft auto-save ---

  function draftKey() {
    return 'draft_' + (editId || 'new');
  }

  function saveDraft() {
    const data = {
      title: titleInput.value,
      slug: slugInput.value,
      date: dateInput.value,
      tags: tagsInput.value,
      summary: summaryInput.value,
      content: contentInput.value,
    };
    // Only save if there's actual content
    if (data.title || data.content) {
      localStorage.setItem(draftKey(), JSON.stringify(data));
    }
  }

  function loadDraft() {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (!data.title && !data.content) return false;
      // Don't overwrite if loading for edit and content already loaded
      if (editId && contentInput.value) return false;
      titleInput.value = data.title || '';
      slugInput.value = data.slug || '';
      dateInput.value = data.date || '';
      tagsInput.value = data.tags || '';
      summaryInput.value = data.summary || '';
      contentInput.value = data.content || '';
      return true;
    } catch(e) {}
    return false;
  }

  function clearDraft() {
    localStorage.removeItem(draftKey());
  }

  // Auto-save every 30 seconds
  setInterval(saveDraft, 30000);

  // Save on publish success (clear draft)
  var originalPublishClick = publishBtn.onclick;

  titleInput.addEventListener('input', () => {
    if (!slugInput.dataset.manual) {
      slugInput.value = storage.slugify(titleInput.value);
    }
  });
  slugInput.addEventListener('input', () => {
    slugInput.dataset.manual = '1';
  });

  // --- Storage mode indicator ---
  var storageLabel = document.createElement('span');
  storageLabel.className = 'storage-mode';
  storageLabel.textContent = storage === LOCAL ? t('manage.storageLocal') : t('manage.storageGithub');
  storageLabel.style.cssText = 'font-size:0.75rem;color:var(--text-muted);padding:2px 8px;border:1px solid var(--border);border-radius:4px;';
  editorSection.querySelector('.editor-meta')?.prepend(storageLabel);

  // --- Token / Auth ---

  function setupLocalAuth() {
    tokenSection.querySelector('h2').textContent = t('auth.local');
    tokenSection.querySelector('.hint').textContent = t('auth.local.hint');
    tokenInput.placeholder = t('auth.local.placeholder');
    tokenInput.type = 'password';
    saveTokenBtn.textContent = t('btn.verify');
  }

  async function checkLocalAuth() {
    try {
      await storage.getManifest();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function checkToken() {
    if (storage === LOCAL) {
      const ok = await checkLocalAuth();
      if (ok) {
        editorSection.style.display = 'block';
        if (editId) { await loadForEdit(editId); }
        else { loadDraft(); }
      } else {
        setupLocalAuth();
        tokenSection.style.display = 'block';
      }
      return;
    }
    const token = storage.getToken();
    if (!token) { tokenSection.style.display = 'block'; return; }
    tokenInput.value = token;
    try {
      await storage.getUser();
      tokenSection.style.display = 'none';
      editorSection.style.display = 'block';
      if (editId) { await loadForEdit(editId); }
      else { loadDraft(); }
    } catch {
      storage.setToken('');
      tokenSection.style.display = 'block';
    }
  }

  saveTokenBtn.addEventListener('click', async () => {
    if (storage === LOCAL) {
      const pw = tokenInput.value.trim();
      if (!pw) return;
      LOCAL.setPassword(pw);
      tokenStatus.textContent = t('status.verifying');
      tokenStatus.className = 'status-msg';
      const ok = await checkLocalAuth();
      if (ok) {
        tokenStatus.textContent = t('status.ok');
        tokenStatus.className = 'status-msg success';
        setTimeout(async () => {
          tokenSection.style.display = 'none';
          editorSection.style.display = 'block';
          if (editId) { await loadForEdit(editId); }
          else { loadDraft(); }
        }, 500);
      } else {
        tokenStatus.textContent = t('status.wrongPassword');
        tokenStatus.className = 'status-msg error';
        LOCAL.setPassword('');
      }
      return;
    }
    const token = tokenInput.value.trim();
    if (!token) return;
    storage.setToken(token);
    tokenStatus.textContent = t('status.verifying');
    tokenStatus.className = 'status-msg';
    try {
      await storage.getUser();
      tokenStatus.textContent = t('status.ok');
      tokenStatus.className = 'status-msg success';
      setTimeout(async () => {
        tokenSection.style.display = 'none';
        editorSection.style.display = 'block';
        if (editId) { await loadForEdit(editId); }
        else { loadDraft(); }
      }, 500);
    } catch (e) {
      tokenStatus.textContent = e.message;
      tokenStatus.className = 'status-msg error';
      storage.setToken('');
    }
  });

  // --- Load for edit ---

  async function loadForEdit(id) {
    try {
      const post = await storage.getPost(id);
      if (!post) { showStatus(t('status.postNotFound'), 'error'); return; }

      editingId = id;
      editorTitle.textContent = t('editor.editPost');
      document.title = 'Edit - Blog';
      titleInput.value = post.title;
      slugInput.value = post.id;
      slugInput.dataset.manual = '1';
      dateInput.value = post.date;
      tagsInput.value = post.tags.join(', ');
      summaryInput.value = post.summary;
      contentInput.value = post.content || '';
      publishBtn.textContent = t('btn.update');
      showStatus(`${t('status.editing')}: ${post.title}`, '');
    } catch (e) {
      showStatus(t('status.loadingFailed') + ': ' + e.message, 'error');
    }
  }

  // --- Preview ---

  // Generate slug from heading text for anchor links
  function headingSlug(text) {
    return text.toLowerCase().trim()
      .replace(/\./g, '')
      .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Configure marked to add id attributes to headings
  marked.use({
    renderer: {
      heading(text, depth, raw) {
        var slug = headingSlug(raw);
        return '<h' + depth + ' id="' + slug + '">' + text + '</h' + depth + '>\n';
      }
    }
  });

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

  async function renderPreview() {
    const { src, store } = escapeMath(contentInput.value);
    previewEl.innerHTML = restoreMath(marked.parse(src), store);
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
            pre.textContent = t('status.mermaidError') + ': ' + e.message;
          }
        }
      }
    }
  }

  previewBtn.addEventListener('click', async () => {
    if (previewEl.style.display === 'none') {
      previewEl.style.display = 'block';
      previewBtn.textContent = t('btn.hidePreview');
      previewRefresh.style.display = '';
      await renderPreview();
    } else {
      previewEl.style.display = 'none';
      previewBtn.textContent = t('btn.preview');
      previewRefresh.style.display = 'none';
    }
  });

  previewRefresh.addEventListener('click', async () => {
    previewRefresh.disabled = true;
    previewRefresh.textContent = '...';
    await renderPreview();
    previewRefresh.disabled = false;
    previewRefresh.textContent = t('btn.refreshPreview');
  });

  // --- Publish / Draft ---

  async function savePost(isDraft) {
    const title = titleInput.value.trim();
    const date = dateInput.value;
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const summary = summaryInput.value.trim();
    const content = contentInput.value.trim();
    const id = slugInput.value.trim() || storage.slugify(title);

    if (!title || !content) { showStatus(t('status.titleRequired'), 'error'); return; }

    publishBtn.disabled = true;
    draftBtn.disabled = true;
    const origText = isDraft ? draftBtn.textContent : publishBtn.textContent;
    (isDraft ? draftBtn : publishBtn).textContent = t('status.saving');
    showStatus('', '');

    try {
      const resultId = await storage.publishPost({ id, title, date, tags, summary, content, draft: isDraft });
      const label = isDraft ? t('status.draftLabel') : (editingId ? t('status.updated') : t('status.published'));
      showStatus(`${label}: ${resultId}`, 'success');
      clearDraft();
      // Redirect to management page after ~1s
      setTimeout(function() { window.location.href = '/editor/index.html'; }, 1000);
    } catch (e) {
      showStatus(t('status.failed') + ': ' + e.message, 'error');
      publishBtn.disabled = false;
      draftBtn.disabled = false;
    } finally {
      (isDraft ? draftBtn : publishBtn).textContent = origText;
    }
  }

  publishBtn.addEventListener('click', () => savePost(false));
  draftBtn.addEventListener('click', () => savePost(true));

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status-msg' + (type ? ' ' + type : '');
  }

  $('logout-btn')?.addEventListener('click', () => {
    if (storage === GH) GH.setToken('');
    LOCAL.setPassword('');
    localStorage.removeItem('storage_mode');
    tokenInput.value = '';
    tokenSection.style.display = 'block';
    editorSection.style.display = 'none';
    window.storage = GH;
    storageLabel.textContent = 'GitHub';
  });

  window.addEventListener('beforeunload', saveDraft);

  checkToken();
})();
