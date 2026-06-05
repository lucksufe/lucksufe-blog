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
        label: 'Markdown',
        items: [
          { label: '# 标题', insert: ['# ', ''] },
          { label: '**粗体**', insert: ['**', '**'] },
          { label: '*斜体*', insert: ['*', '*'] },
          { label: '> 引用', insert: ['> ', ''] },
          { label: '`行内代码`', insert: ['`', '`'] },
          { label: '--- 分隔线', insert: ['\n---\n', ''] },
          { sep: true },
          { label: '代码块', sub: [
            { label: '普通代码块', insert: ['```\n', '\n```'] },
            { label: 'Python', insert: ['```python\n', '\n```'] },
            { label: 'JavaScript', insert: ['```javascript\n', '\n```'] },
            { label: 'Bash', insert: ['```bash\n', '\n```'] },
          ]},
          { label: '列表', sub: [
            { label: '无序列表', insert: ['- ', ''] },
            { label: '有序列表', insert: ['1. ', ''] },
            { label: '任务列表', insert: ['- [ ] ', ''] },
          ]},
          { label: '表格', sub: [
            { label: '2 列', insert: ['| 列1 | 列2 |\n| --- | --- |\n| ', ' |  |'] },
            { label: '3 列', insert: ['| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ', ' |  |  |'] },
          ]},
        ]
      },
      {
        label: '数学公式',
        items: [
          { label: '分式  a/b', insert: ['\\frac{', '}{b}'] },
          { label: '根号  √', insert: ['\\sqrt{', '}'] },
          { label: '上标下标  x²ₙ', insert: ['x^{', '}_{n}'] },
          { label: '向量  →', insert: ['\\vec{', '}'] },
          { sep: true },
          { label: '$ 行内公式', insert: ['$ ', ' $'] },
          { label: '$$ 块级公式', insert: ['$$\n', '\n$$'] },
          { label: '\\[ \\] 展示公式', insert: ['\\[\n', '\n\\]'] },
          { sep: true },
          { label: '微积分', sub: [
            { label: '∫ 积分', insert: ['\\int_{', '}^{\\infty} f(x) \\, \\mathrm{d}x'] },
            { label: '∫∫ 二重积分', insert: ['\\iint_{', 'D} f(x,y) \\, \\mathrm{d}x \\mathrm{d}y'] },
            { label: '∑ 求和', insert: ['\\sum_{i=', '}^{n} a_i'] },
            { label: '∏ 求积', insert: ['\\prod_{i=', '}^{n} a_i'] },
            { label: 'lim 极限', insert: ['\\lim_{x \\to ', '} f(x)'] },
          ]},
          { label: '线性代数', sub: [
            { label: '2×2 矩阵', insert: ['\\begin{pmatrix}\na & b \\\\\\\\\nc & d\n\\end{pmatrix}', ''] },
            { label: '3×3 矩阵', insert: ['\\begin{pmatrix}\na & b & c \\\\\\\\\nd & e & f \\\\\\\\\ng & h & i\n\\end{pmatrix}', ''] },
            { label: '行列式', insert: ['\\begin{vmatrix}\na & b \\\\\\\\\nc & d\n\\end{vmatrix}', ''] },
          ]},
          { label: '希腊字母', sub: [
            { label: 'α β γ δ ε', insert: ['\\alpha \\beta \\gamma \\delta \\epsilon', ''] },
            { label: 'θ φ ψ ω', insert: ['\\theta \\varphi \\psi \\omega', ''] },
            { label: 'Γ Δ Θ Λ Ξ', insert: ['\\Gamma \\Delta \\Theta \\Lambda \\Xi', ''] },
          ]},
        ]
      },
      {
        label: '图表',
        items: [
          { label: '流程图', insert: ['```mermaid\ngraph LR\n    A[开始] --> B{判断}\n    B -->|是| C[执行]\n    B -->|否| D[结束]\n```', ''] },
          { label: '时序图', insert: ['```mermaid\nsequenceDiagram\n    participant A as 用户\n    participant B as 服务器\n    A->>B: 请求\n    B-->>A: 响应\n```', ''] },
          { label: '类图', insert: ['```mermaid\nclassDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +bark()\n    }\n    Animal <|-- Dog\n```', ''] },
          { sep: true },
          { label: '其他', sub: [
            { label: '状态图', insert: ['```mermaid\nstateDiagram-v2\n    [*] --> 待处理\n    待处理 --> 进行中\n    进行中 --> 已完成\n    已完成 --> [*]\n```', ''] },
            { label: '甘特图', insert: ['```mermaid\ngantt\n    title 项目计划\n    dateFormat YYYY-MM-DD\n    section 阶段一\n    任务A :a1, 2026-01-01, 30d\n    任务B :a2, after a1, 20d\n```', ''] },
            { label: '饼图', insert: ['```mermaid\npie title 分布\n    "A" : 40\n    "B" : 30\n    "C" : 30\n```', ''] },
            { label: 'ER 图', insert: ['```mermaid\nerDiagram\n    USER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n```', ''] },
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
      insertAtCursor(contentInput, '![上传中...]()');
      const url = await storage.uploadImage(file);
      // Replace the placeholder with actual markdown
      contentInput.value = contentInput.value.replace(
        '![上传中...]()',
        `![${file.name}](${url})`
      );
    } catch (e) {
      contentInput.value = contentInput.value.replace('![上传中...]()', '');
      alert('图片上传失败: ' + e.message);
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
      if (confirm('发现未保存的草稿，是否恢复？')) {
        titleInput.value = data.title || '';
        slugInput.value = data.slug || '';
        dateInput.value = data.date || '';
        tagsInput.value = data.tags || '';
        summaryInput.value = data.summary || '';
        contentInput.value = data.content || '';
        return true;
      }
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
  storageLabel.textContent = storage === LOCAL ? '本地存储' : 'GitHub';
  storageLabel.style.cssText = 'font-size:0.75rem;color:var(--text-muted);padding:2px 8px;border:1px solid var(--border);border-radius:4px;';
  editorSection.querySelector('.editor-meta')?.prepend(storageLabel);

  // --- Token / Auth ---

  function setupLocalAuth() {
    tokenSection.querySelector('h2').textContent = '本地服务器认证';
    tokenSection.querySelector('.hint').textContent = '服务器需要密码验证。';
    tokenInput.placeholder = '输入密码...';
    tokenInput.type = 'password';
    saveTokenBtn.textContent = '验证';
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
        tokenSection.style.display = 'none';
        editorSection.style.display = 'block';
        if (editId) { await loadForEdit(editId); }
        else { loadDraft(); }
      } else {
        setupLocalAuth();
      }
      return;
    }
    const token = storage.getToken();
    if (!token) return;
    tokenInput.value = token;
    try {
      await storage.getUser();
      tokenSection.style.display = 'none';
      editorSection.style.display = 'block';
      if (editId) { await loadForEdit(editId); }
      else { loadDraft(); }
    } catch {
      storage.setToken('');
    }
  }

  saveTokenBtn.addEventListener('click', async () => {
    if (storage === LOCAL) {
      const pw = tokenInput.value.trim();
      if (!pw) return;
      LOCAL.setPassword(pw);
      tokenStatus.textContent = '验证中...';
      tokenStatus.className = 'status-msg';
      const ok = await checkLocalAuth();
      if (ok) {
        tokenStatus.textContent = 'OK';
        tokenStatus.className = 'status-msg success';
        setTimeout(async () => {
          tokenSection.style.display = 'none';
          editorSection.style.display = 'block';
          if (editId) { await loadForEdit(editId); }
          else { loadDraft(); }
        }, 500);
      } else {
        tokenStatus.textContent = '密码错误';
        tokenStatus.className = 'status-msg error';
        LOCAL.setPassword('');
      }
      return;
    }
    const token = tokenInput.value.trim();
    if (!token) return;
    storage.setToken(token);
    tokenStatus.textContent = 'Verifying...';
    tokenStatus.className = 'status-msg';
    try {
      await storage.getUser();
      tokenStatus.textContent = 'OK';
      tokenStatus.className = 'status-msg success';
      setTimeout(async () => {
        tokenSection.style.display = 'none';
        editorSection.style.display = 'block';
        if (editId) { await loadForEdit(editId); }
        else { loadDraft(); }
      }, 500);
    } catch (e) {
      tokenStatus.textContent = 'Invalid: ' + e.message;
      tokenStatus.className = 'status-msg error';
      storage.setToken('');
    }
  });

  // --- Load for edit ---

  async function loadForEdit(id) {
    try {
      const post = await storage.getPost(id);
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
    const id = slugInput.value.trim() || storage.slugify(title);

    if (!title || !content) { showStatus('Title and content required', 'error'); return; }
    if (tags.length === 0) { showStatus('At least one tag', 'error'); return; }

    publishBtn.disabled = true;
    publishBtn.textContent = editingId ? 'Updating...' : 'Publishing...';
    showStatus('Committing to GitHub...', '');

    try {
      const resultId = await storage.publishPost({ id, title, date, tags, summary, content });
      showStatus(editingId ? `Updated: ${resultId}` : `Published: ${resultId}`, 'success');
      clearDraft();
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
