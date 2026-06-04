(function() {
  const tagListEl = document.getElementById('tag-list');
  const postListEl = document.getElementById('post-list');

  // Collect all unique tags
  const allTags = [...new Set(POSTS.flatMap(p => p.tags))].sort();

  let activeTag = null;

  function renderTags() {
    tagListEl.innerHTML = '';

    // "All" pill
    const allPill = document.createElement('span');
    allPill.className = 'tag-pill' + (activeTag === null ? ' active' : '');
    allPill.textContent = 'All';
    allPill.addEventListener('click', () => {
      activeTag = null;
      renderTags();
      renderPosts();
    });
    tagListEl.appendChild(allPill);

    allTags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill' + (activeTag === tag ? ' active' : '');
      pill.textContent = tag;
      pill.addEventListener('click', () => {
        activeTag = activeTag === tag ? null : tag;
        renderTags();
        renderPosts();
      });
      tagListEl.appendChild(pill);
    });
  }

  function renderPosts() {
    const filtered = activeTag
      ? POSTS.filter(p => p.tags.includes(activeTag))
      : POSTS;

    if (filtered.length === 0) {
      postListEl.innerHTML = '<div class="empty-state"><p>No posts found.</p></div>';
      return;
    }

    postListEl.innerHTML = filtered.map(post => `
      <a href="post.html?id=${post.id}" class="post-card">
        <div class="post-date">${post.date}</div>
        <h2>${post.title}</h2>
        <div class="post-summary">${marked.parse(post.summary)}</div>
        <div class="post-tags">
          ${post.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
        </div>
      </a>
    `).join('');
  }

  renderTags();
  renderPosts();
})();
