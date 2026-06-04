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

  async function checkToken() {
    const token = GH.getToken();
    if (!token) return;
    tokenInput.value = token;
    try {
      const user = await GH.getUser();
      userDisplay.textContent = user;
      tokenSection.style.display = 'none';
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
        manageSection.style.display = 'block';
        loadPostList();
      }, 500);
    } catch (e) {
      tokenStatus.textContent = 'Invalid: ' + e.message;
      tokenStatus.className = 'status-msg error';
      GH.setToken('');
    }
  });

  async function loadPostList() {
    postListStatus.textContent = 'Loading...';
    postListEl.innerHTML = '';
    try {
      const manifest = await GH.getManifest();
      if (manifest.length === 0) {
        postListStatus.textContent = 'No posts';
        return;
      }
      allManifest = manifest;
      currentPage = 0;
      postListStatus.textContent = `${manifest.length} posts`;
      renderPostList();
    } catch (e) {
      postListStatus.textContent = 'Failed: ' + e.message;
    }
  }

  function renderPostList() {
    const totalPages = Math.ceil(allManifest.length / PER_PAGE);
    const page = allManifest.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

    postListEl.innerHTML = page.map(p => `
      <div class="post-item">
        <div class="post-item-info">
          <span class="post-item-title">${p.title}</span>
          <span class="post-item-date">${p.date}</span>
          <span class="post-item-tags">${p.tags.join(', ')}</span>
        </div>
        <div class="post-item-actions">
          <a href="/editor/write.html?id=${encodeURIComponent(p.id)}" class="btn btn-edit">Edit</a>
          <button class="btn btn-delete" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');

    postListEl.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
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
  }

  async function handleDelete(id) {
    if (!confirm(`Delete "${id}"? This cannot be undone.`)) return;
    try {
      await GH.deletePost(id);
      loadPostList();
    } catch (e) {
      alert('Delete failed: ' + e.message);
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

  $('logout-btn')?.addEventListener('click', () => {
    GH.setToken('');
    tokenSection.style.display = 'block';
    manageSection.style.display = 'none';
    tokenInput.value = '';
  });

  checkToken();
})();
