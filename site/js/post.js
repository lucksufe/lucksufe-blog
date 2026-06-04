(function() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const post = POSTS.find(p => p.id === id);

  const headerEl = document.getElementById('post-header');
  const contentEl = document.getElementById('post-content');
  const notFoundEl = document.getElementById('not-found');
  const articleEl = document.getElementById('post-article');

  if (!post) {
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

  // Render Markdown to HTML
  contentEl.innerHTML = marked.parse(post.content.trim());

  // Render KaTeX formulas
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(contentEl, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  // Highlight code blocks with Prism
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(contentEl);
  }
})();
