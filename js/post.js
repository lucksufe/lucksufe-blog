(function() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const headerEl = document.getElementById('post-header');
  const contentEl = document.getElementById('post-content');
  const notFoundEl = document.getElementById('not-found');
  const articleEl = document.getElementById('post-article');

  // Protect LaTeX expressions from being mangled by marked's markdown parser
  function escapeMath(src) {
    const store = [];
    // First protect fenced code blocks (including mermaid) from math regex
    src = src.replace(/(```[\s\S]*?```)/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    // display math: \[...\] and $$...$$
    src = src.replace(/\\\[[\s\S]*?\\\]/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    src = src.replace(/\$\$[\s\S]*?\$\$/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    // inline math: \(...\) and $...$
    src = src.replace(/\\\([\s\S]*?\\\)/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    src = src.replace(/\$(?!\s)(?:[^$\\]|\\.)+?\$/g, m => { store.push(m); return `%%MATH${store.length - 1}%%`; });
    return { src, store };
  }

  function restoreMath(html, store) {
    store.forEach((m, i) => {
      if (m.startsWith('```')) {
        // Code blocks: convert to <pre><code> HTML
        const lang = m.match(/^```(\w*)\n/)?.[1] || '';
        const code = m.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
        html = html.replace(`%%MATH${i}%%`, `<pre><code class="language-${lang}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
      } else {
        html = html.replace(`%%MATH${i}%%`, m);
      }
    });
    return html;
  }

  const mathDelimiters = [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false }
  ];

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
      <a href="index.html" class="back-link">${t('post.back')}</a>
      <h1>${post.title}</h1>
      <div class="post-meta">
        <span class="post-date">${post.date}</span>
        <div class="post-tags" style="display:flex;gap:6px;flex-wrap:wrap;">
          ${post.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
        </div>
      </div>
    `;

    const { src, store } = escapeMath(post.content.trim());
    const html = restoreMath(marked.parse(src), store);
    contentEl.innerHTML = html;

    if (typeof renderMathInElement === 'function') {
      renderMathInElement(contentEl, {
        delimiters: mathDelimiters,
        throwOnError: false
      });
    }

    if (typeof Prism !== 'undefined') {
      Prism.highlightAllUnder(contentEl);
    }

    // Render Mermaid diagrams
    if (typeof mermaid !== 'undefined') {
      const mermaidBlocks = contentEl.querySelectorAll('code.language-mermaid');
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

  if (id) loadPost();
})();
