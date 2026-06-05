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
        tokenSection.style.display = 'none';
        manageSection.style.display = 'block';
        userDisplay.textContent = 'local';
        loadPostList();
      } else {
        setupLocalAuth();
      }
      return;
    }
    const token = storage.getToken();
    if (!token) return;
    tokenInput.value = token;
    try {
      const user = await storage.getUser();
      userDisplay.textContent = user;
      tokenSection.style.display = 'none';
      manageSection.style.display = 'block';
      loadPostList();
    } catch {
      storage.setToken('');
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

  async function loadPostList() {
    postListStatus.textContent = t('status.loading');
    postListEl.innerHTML = '';
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

  function renderPostList() {
    const totalPages = Math.ceil(allManifest.length / PER_PAGE);
    const page = allManifest.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

    postListEl.innerHTML = page.map(p => `
      <div class="post-item${p.draft ? ' post-item-draft' : ''}">
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

    postListEl.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => { window.location.href = '/editor/write.html?id=' + encodeURIComponent(btn.dataset.id); });
    });

    postListEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });

    postListEl.querySelectorAll('.btn-draft-toggle').forEach(btn => {
      btn.addEventListener('click', () => handleDraftToggle(btn.dataset.id, !btn.dataset.draft));
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
    applyI18n();
  }

  async function handleDraftToggle(id, toDraft) {
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
      loadPostList();
    } catch (e) {
      alert('操作失败: ' + e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('confirm.delete').replace('{id}', id))) return;
    try {
      await storage.deletePost(id);
      loadPostList();
    } catch (e) {
      alert(t('status.deleteFailed') + ': ' + e.message);
    }
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
