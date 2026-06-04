(function() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const headerEl = document.getElementById('post-header');
  const contentEl = document.getElementById('post-content');
  const notFoundEl = document.getElementById('not-found');
  const articleEl = document.getElementById('post-article');

  async function loadPost() {
    let post;
    try {
      const res = await fetch(`posts/${encodeURIComponent(id)}.json`);
      if (!res.ok) throw new Error('Not found');
      post = await res.json();
    } catch {
      articleEl.style.display = 'none';
      notFoundEl.style.display = 'block';
      return;
    }

    document.title = post.title + ' - Blog';

    headerEl.innerHTML = `
      <a href="index.html" class="back-link">&larr; back</a>
      <h1>${post.title}</h1>
      <div class="post-meta">
        <span class="post-date">${post.date}</span>
        <div class="post-tags" style="display:flex;gap:6px;flex-wrap:wrap;">
          ${post.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
        </div>
      </div>
    `;

    contentEl.innerHTML = marked.parse(post.content.trim());

    if (typeof renderMathInElement === 'function') {
      renderMathInElement(contentEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }

    if (typeof Prism !== 'undefined') {
      Prism.highlightAllUnder(contentEl);
    }
  }

  if (id) loadPost();
})();
