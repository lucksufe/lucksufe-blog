(function() {
  const $ = id => document.getElementById(id);

  const tokenInput = $('token');
  const saveTokenBtn = $('save-token');
  const tokenStatus = $('token-status');
  const tokenSection = $('token-section');
  const manageSection = $('manage-section');
  const userDisplay = $('user-display');
  const postListEl = $('post-list');
  const postListStatus = $('post-list-status');
  const pagePrev = $('page-prev');
  const pageNext = $('page-next');
  const pageInfo = $('page-info');

  const PER_PAGE = 15;
  let allManifest = [];
  let currentPage = 0;
  let busy = false;

  function setBusy(v) {
    busy = v;
    postListEl.querySelectorAll('.btn-edit, .btn-draft-toggle, .btn-delete, .post-cb').forEach(b => { b.disabled = v; });
    $('refresh-posts').disabled = v;
    $('select-all-cb').disabled = v;
    updateBatchBar();
  }

  // Storage mode indicator
  var storageLabel = document.createElement('span');
  storageLabel.className = 'storage-mode';
  storageLabel.textContent = storage === LOCAL ? t('manage.storageLocal') : t('manage.storageGithub');
  storageLabel.style.cssText = 'font-size:0.75rem;color:var(--text-muted);padding:2px 8px;border:1px solid var(--border);border-radius:4px;';
  manageSection.querySelector('.editor-meta')?.prepend(storageLabel);

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
        manageSection.style.display = 'block';
        userDisplay.textContent = 'local';
        loadPostList();
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
      const user = await storage.getUser();
      userDisplay.textContent = user;
      tokenSection.style.display = 'none';
      manageSection.style.display = 'block';
      loadPostList();
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
        userDisplay.textContent = 'local';
        setTimeout(() => {
          tokenSection.style.display = 'none';
          manageSection.style.display = 'block';
          loadPostList();
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
      const user = await storage.getUser();
      tokenStatus.textContent = t('status.ok');
      tokenStatus.className = 'status-msg success';
      userDisplay.textContent = user;
      setTimeout(() => {
        tokenSection.style.display = 'none';
        manageSection.style.display = 'block';
        loadPostList();
      }, 500);
    } catch (e) {
      tokenStatus.textContent = e.message;
      tokenStatus.className = 'status-msg error';
      storage.setToken('');
    }
  });

  function loadLocalDrafts() {
    const section = $('local-drafts-section');
    const list = $('local-drafts-list');
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('draft_')) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.title || data.content) {
          drafts.push({ key, id: key.replace('draft_', ''), title: data.title || '(无标题)', date: data.date || '' });
        }
      } catch(e) {}
    }
    if (drafts.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    section.querySelector('.local-drafts-title').dataset.hint = t('manage.localDrafts.hint');
    list.innerHTML = drafts.map(d => `
      <div class="local-draft-item">
        <span class="local-draft-title">${d.title}</span>
        <span class="local-draft-date">${d.date}</span>
        <div class="local-draft-actions">
          <button class="btn btn-draft-edit" data-id="${d.id}" data-i18n="btn.edit">编辑</button>
          <button class="btn btn-draft-clear" data-key="${d.key}">${t('btn.delete')}</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-draft-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        window.location.href = id === 'new' ? '/editor/write.html' : '/editor/write.html?id=' + encodeURIComponent(id);
      });
    });

    list.querySelectorAll('.btn-draft-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.removeItem(btn.dataset.key);
        loadLocalDrafts();
      });
    });
    applyI18n();
  }

  async function loadPostList() {
    postListStatus.textContent = t('status.loading');
    postListEl.innerHTML = '';
    loadLocalDrafts();
    try {
      const manifest = await storage.getManifest();
      if (manifest.length === 0) {
        postListStatus.textContent = t('manage.noPosts');
        return;
      }
      allManifest = manifest;
      currentPage = 0;
      postListStatus.textContent = `${manifest.length} ${t('manage.postCount')}`;
      renderPostList();
    } catch (e) {
      postListStatus.textContent = t('status.loadingFailed') + ': ' + e.message;
    }
  }

  function getSelectedIds() {
    return Array.from(postListEl.querySelectorAll('.post-cb:checked')).map(cb => cb.dataset.id);
  }

  function updateBatchBar() {
    const ids = getSelectedIds();
    const bar = $('batch-bar');
    if (!bar) return;
    if (ids.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    bar.querySelector('.batch-count').textContent = t('manage.selected').replace('{n}', ids.length);
    bar.querySelector('.btn-batch-delete').disabled = busy;
    bar.querySelector('.btn-batch-draft').disabled = busy;
    bar.querySelector('.btn-batch-publish').disabled = busy;
  }

  function renderPostList() {
    const totalPages = Math.ceil(allManifest.length / PER_PAGE);
    const page = allManifest.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

    postListEl.innerHTML = page.map(p => `
      <div class="post-item${p.draft ? ' post-item-draft' : ''}">
        <label class="post-cb-label"><input type="checkbox" class="post-cb" data-id="${p.id}"></label>
        <div class="post-item-info">
          <span class="post-item-title">${p.title}${p.draft ? ` <span class="draft-badge">${t('status.draftLabel')}</span>` : ''}</span>
          <span class="post-item-date">${p.date}</span>
          <span class="post-item-tags">${p.tags.join(', ')}</span>
        </div>
        <div class="post-item-actions">
          <button class="btn btn-edit" data-id="${p.id}" data-i18n="btn.edit">编辑</button>
          <button class="btn btn-draft-toggle" data-id="${p.id}" data-draft="${p.draft ? '1' : ''}">${p.draft ? t('btn.setPublish') : t('btn.setDraft')}</button>
          <button class="btn btn-delete" data-id="${p.id}" data-i18n="btn.delete">删除</button>
        </div>
      </div>
    `).join('');

    postListEl.querySelectorAll('.post-cb').forEach(cb => {
      cb.addEventListener('change', updateBatchBar);
    });

    postListEl.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => { window.location.href = '/editor/write.html?id=' + encodeURIComponent(btn.dataset.id); });
    });

    postListEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn, btn.dataset.id));
    });

    postListEl.querySelectorAll('.btn-draft-toggle').forEach(btn => {
      btn.addEventListener('click', () => handleDraftToggle(btn, btn.dataset.id, !btn.dataset.draft));
    });

    const paginationEl = $('pagination-controls');
    if (totalPages <= 1) {
      paginationEl.style.display = 'none';
    } else {
      paginationEl.style.display = '';
      pagePrev.disabled = currentPage === 0;
      pageNext.disabled = currentPage >= totalPages - 1;
      pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
    }
    updateBatchBar();
    applyI18n();
  }

  async function handleDraftToggle(btn, id, toDraft) {
    if (busy) return;
    setBusy(true);
    const origText = btn.textContent;
    btn.textContent = t('status.saving');
    postListStatus.textContent = t('status.saving');
    try {
      const post = await storage.getPost(id);
      if (!post) { alert('Post not found'); return; }
      await storage.publishPost({
        id: post.id,
        title: post.title,
        date: post.date,
        tags: post.tags,
        summary: post.summary,
        content: post.content || '',
        draft: toDraft,
      });
      postListStatus.textContent = '';
      loadPostList();
    } catch (e) {
      postListStatus.textContent = '';
      alert('操作失败: ' + e.message);
    } finally {
      btn.textContent = origText;
      setBusy(false);
    }
  }

  async function handleDelete(btn, id) {
    if (!confirm(t('confirm.delete').replace('{id}', id))) return;
    if (busy) return;
    setBusy(true);
    const origText = btn.textContent;
    btn.textContent = t('status.saving');
    postListStatus.textContent = t('status.saving');
    try {
      await storage.deletePost(id);
      postListStatus.textContent = '';
      loadPostList();
    } catch (e) {
      postListStatus.textContent = '';
      alert(t('status.deleteFailed') + ': ' + e.message);
    } finally {
      btn.textContent = origText;
      setBusy(false);
    }
  }

  async function handleBatch(ids, action) {
    if (busy || ids.length === 0) return;
    if (action === 'delete' && !confirm(t('confirm.batchDelete').replace('{n}', ids.length))) return;
    setBusy(true);
    updateBatchBar();
    let done = 0;
    const errors = [];
    for (const id of ids) {
      postListStatus.textContent = t('manage.batchProgress').replace('{done}', done + 1).replace('{total}', ids.length);
      try {
        if (action === 'delete') {
          await storage.deletePost(id);
        } else {
          const post = await storage.getPost(id);
          if (!post) continue;
          await storage.publishPost({
            id: post.id, title: post.title, date: post.date,
            tags: post.tags, summary: post.summary,
            content: post.content || '', draft: action === 'draft',
          });
        }
      } catch (e) {
        errors.push(id + ': ' + e.message);
      }
      done++;
    }
    postListStatus.textContent = errors.length
      ? `${done}/${ids.length} OK, ${errors.length} failed`
      : t('manage.batchDone').replace('{total}', done);
    setBusy(false);
    loadPostList();
  }

  pagePrev.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderPostList();
    }
  });

  pageNext.addEventListener('click', () => {
    const totalPages = Math.ceil(allManifest.length / PER_PAGE);
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderPostList();
    }
  });

  $('refresh-posts')?.addEventListener('click', loadPostList);

  // --- Batch operations ---
  $('select-all-cb')?.addEventListener('change', function() {
    postListEl.querySelectorAll('.post-cb').forEach(cb => { cb.checked = this.checked; });
    updateBatchBar();
  });

  document.querySelector('.btn-batch-delete')?.addEventListener('click', () => handleBatch(getSelectedIds(), 'delete'));
  document.querySelector('.btn-batch-draft')?.addEventListener('click', () => handleBatch(getSelectedIds(), 'draft'));
  document.querySelector('.btn-batch-publish')?.addEventListener('click', () => handleBatch(getSelectedIds(), 'publish'));

  // --- Settings Modal ---
  const settingsModal = $('settings-modal');
  const settingsBtn = $('settings-btn');
  const settingsClose = $('settings-close');
  const settingsSave = $('settings-save');
  const settingsStatus = $('settings-status');

  async function openSettings() {
    settingsModal.style.display = 'flex';
    settingsStatus.textContent = '';
    try {
      const cfg = await storage.getConfig();
      $('cfg-title').value = cfg.title || '';
      $('cfg-tagline').value = cfg.tagline || '';
      $('cfg-footer').value = cfg.footer || '';
      $('cfg-font').value = cfg.font || 'system-ui';
      $('cfg-fontsize').value = cfg.fontSize || '16';
      $('cfg-show-rss').checked = cfg.showRss !== false;
      $('cfg-lang').value = cfg.lang || 'zh';
    } catch (e) {
      settingsStatus.textContent = t('status.loadingFailed') + ': ' + e.message;
      settingsStatus.className = 'status-msg error';
    }
  }

  function closeSettings() {
    settingsModal.style.display = 'none';
  }

  settingsBtn?.addEventListener('click', openSettings);
  settingsClose?.addEventListener('click', closeSettings);
  settingsModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeSettings);

  settingsSave?.addEventListener('click', async () => {
    const cfg = {
      title: $('cfg-title').value.trim(),
      tagline: $('cfg-tagline').value.trim(),
      footer: $('cfg-footer').value.trim(),
      font: $('cfg-font').value,
      fontSize: $('cfg-fontsize').value,
      showRss: $('cfg-show-rss').checked,
      lang: $('cfg-lang').value,
    };
    settingsStatus.textContent = t('status.saving');
    settingsStatus.className = 'status-msg';
    try {
      await storage.publishConfig(cfg);
      settingsStatus.textContent = t('settings.saved');
      settingsStatus.className = 'status-msg success';
      applyConfig(cfg);
      if (cfg.lang && cfg.lang !== window._lang) {
        window._lang = cfg.lang;
        localStorage.setItem('site_config', JSON.stringify(cfg));
        applyI18n();
      }
      setTimeout(closeSettings, 800);
    } catch (e) {
      settingsStatus.textContent = t('settings.saveFailed') + ': ' + e.message;
      settingsStatus.className = 'status-msg error';
    }
  });

  function applyConfig(cfg) {
    if (cfg.title) document.title = 'Manage - ' + cfg.title;
    const root = document.documentElement;
    if (cfg.font) root.style.setProperty('--font-sans', cfg.font);
    if (cfg.fontSize) root.style.fontSize = cfg.fontSize + 'px';
  }

  $('logout-btn')?.addEventListener('click', () => {
    if (storage === GH) GH.setToken('');
    LOCAL.setPassword('');
    localStorage.removeItem('storage_mode');
    window.storage = GH;
    storageLabel.textContent = 'GitHub';
    tokenSection.style.display = 'block';
    manageSection.style.display = 'none';
    tokenInput.value = '';
  });

  checkToken();
})();
