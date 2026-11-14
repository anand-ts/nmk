const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function safeHref(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const href = value.trim();
  try {
    const url = new URL(href, 'https://portfolio.invalid/');
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}

function renderRuns(runs = []) {
  return runs.map((run) => {
    let text = escape(run.text);
    if (run.italic) text = `<em>${text}</em>`;
    if (run.bold) text = `<strong>${text}</strong>`;
    const href = safeHref(run.href);
    return href ? `<a href="${escape(href)}">${text}</a>` : text;
  }).join('');
}

function renderFigure(block, article, prefix) {
  const variants = article.images?.[block.asset];
  const small = variants?.['640'];
  const large = variants?.['1600'];
  if (!small || !large) throw new Error(`Missing essay image variants: ${block.asset}`);
  return `<figure class="essay__figure">
    <img src="${escape(prefix + large.src)}" srcset="${escape(prefix + small.src)} ${small.width}w, ${escape(prefix + large.src)} ${large.width}w" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) calc(100vw - 64px), 1000px" width="${large.width}" height="${large.height}" alt="${escape(block.alt)}" loading="lazy" decoding="async">
    ${block.caption ? `<figcaption>${escape(block.caption)}</figcaption>` : ''}
  </figure>`;
}

/** Render an author's supplied article body without rewriting its text. */
export function renderWritingArticle(article, prefix = '../../') {
  const publication = typeof article.publication === 'string' ? { name: article.publication } : (article.publication || {});
  const publicationUrl = safeHref(publication.url);
  const blocks = (article.blocks || []).map((block, index) => {
    if (block.type === 'paragraph') return `<p>${renderRuns(block.runs)}</p>`;
    if (block.type === 'figure') return renderFigure(block, article, prefix);
    if (block.type === 'references') {
      return `<section class="essay__references" aria-labelledby="essay-references-${index}">
        <h2 id="essay-references-${index}">References</h2>
        <ol>${(block.items || []).map((item) => `<li>${renderRuns(item.runs)}</li>`).join('')}</ol>
      </section>`;
    }
    throw new Error(`Unsupported essay block type: ${block.type}`);
  }).join('\n');
  return `<main id="main" tabindex="-1" class="article-layout">
    <article class="essay" aria-labelledby="essay-title">
      <header class="essay__header">
        <a class="essay__back" href="../"><span aria-hidden="true">←</span> Writings</a>
        <h1 id="essay-title">${escape(article.title)}</h1>
        ${article.subtitle ? `<p class="essay__subtitle">${escape(article.subtitle)}</p>` : ''}
        <div class="essay__meta">
          ${article.author ? `<span class="essay__author">${escape(article.author)}</span>` : ''}
          ${publication.name ? `<span>${escape(publication.name)}</span>` : ''}
          ${publication.date ? `<time datetime="${escape(publication.date)}">${escape(publication.displayDate || publication.date)}</time>` : ''}
        </div>
      </header>
      <div class="essay__body">${blocks}</div>
      <footer class="essay__footer">
        <a class="essay__back" href="../"><span aria-hidden="true">←</span> Back to Writings</a>
        ${publicationUrl ? `<a class="essay__source" href="${escape(publicationUrl)}">Published version${publication.name ? ` at ${escape(publication.name)}` : ''} <span aria-hidden="true">↗</span></a>` : ''}
      </footer>
    </article>
  </main>`;
}
