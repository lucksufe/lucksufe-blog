(function() {
  const tagListEl = document.getElementById('tag-list');
  const postListEl = document.getElementById('post-list');
  const searchInput = document.getElementById('search-input');
  const pagePrev = document.getElementById('page-prev');
  const pageNext = document.getElementById('page-next');
  const pageInfo = document.getElementById('page-info');

  const PER_PAGE = 10;
  let allPosts = [];
  let activeTag = null;
  let searchQuery = '';
  let currentPage = 0;

  async function init() {
    try {
      const res = await fetch('posts/manifest.json');
      allPosts = (await res.json()).filter(p => !p.draft);
    } catch {
      postListEl.innerHTML = `<div class="empty-state"><p>${t('status.loadingFailed')}</p></div>`;
      return;
    }
    renderTags();
    renderPosts();
  }

  function getFiltered() {
    let posts = allPosts;

    if (activeTag) {
      posts = posts.filter(p => p.tags.includes(activeTag));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return posts;
  }

  function renderTags() {
    const allTags = [...new Set(allPosts.flatMap(p => p.tags))].sort();
    tagListEl.innerHTML = '';

    const allPill = document.createElement('span');
    allPill.className = 'tag-pill' + (activeTag === null ? ' active' : '');
    allPill.textContent = t('tag.all');
    allPill.addEventListener('click', () => { activeTag = null; currentPage = 0; renderTags(); renderPosts(); });
    tagListEl.appendChild(allPill);

    allTags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill' + (activeTag === tag ? ' active' : '');
      pill.textContent = tag;
      pill.addEventListener('click', () => { activeTag = activeTag === tag ? null : tag; currentPage = 0; renderTags(); renderPosts(); });
      tagListEl.appendChild(pill);
    });
  }

  function renderPosts() {
    const filtered = getFiltered();
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const page = filtered.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

    if (filtered.length === 0) {
      postListEl.innerHTML = `<div class="empty-state"><p>${t('empty.noResults')}</p></div>`;
    } else {
      postListEl.innerHTML = page.map(post => `
        <a href="post.html?id=${encodeURIComponent(post.id)}" class="post-card">
          <div class="post-date">${post.date}</div>
          <h2>${post.title}</h2>
          <div class="post-summary">${post.summary}</div>
          <div class="post-tags">
            ${post.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
          </div>
        </a>
      `).join('');
    }

    // Pagination
    if (totalPages <= 1) {
      pagePrev.style.display = 'none';
      pageNext.style.display = 'none';
      pageInfo.textContent = '';
    } else {
      pagePrev.style.display = '';
      pageNext.style.display = '';
      pagePrev.disabled = currentPage === 0;
      pageNext.disabled = currentPage >= totalPages - 1;
      pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
    }
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    currentPage = 0;
    renderPosts();
  });

  pagePrev.addEventListener('click', () => { if (currentPage > 0) { currentPage--; renderPosts(); } });
  pageNext.addEventListener('click', () => { currentPage++; renderPosts(); });

  init();
})();
