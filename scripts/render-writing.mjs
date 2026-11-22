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
  const images = Array.isArray(block.images) ? block.images : [{ asset: block.asset, alt: block.alt, number: block.number }];
  if (!images.length) throw new Error('An essay figure must contain at least one photograph.');
  const paired = images.length > 1;
  const markerNumbers = Array.isArray(block.markerNumbers) ? block.markerNumbers : images.map(image => image.number).filter(number => number !== undefined);
  const caption = block.caption ? escape(block.caption) : '';
  const sizes = paired
    ? '(max-width: 760px) calc((100vw - 50px) / 2), (max-width: 1064px) calc((100vw - 82px) / 2), 491px'
    : '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) calc(100vw - 64px), 1000px';
  const photographs = images.map((image, index) => {
    const variants = article.images?.[image.asset];
    const small = variants?.['640'];
    const large = variants?.['1600'];
    if (!small || !large) throw new Error(`Missing essay image variants: ${image.asset}`);
    const alt = image.alt || block.alt || block.caption || `${article.title}, photograph ${image.number ?? index + 1}`;
    return `<button class="photograph essay__photo" type="button" data-lightbox data-src="${escape(prefix + large.src)}" data-alt="${escape(alt)}" data-caption="${escape(block.caption || '')}" data-series="${escape('essay-' + article.slug)}" aria-label="Enlarge photograph: ${escape(alt)}">
      <img src="${escape(prefix + large.src)}" srcset="${escape(prefix + small.src)} ${small.width}w, ${escape(prefix + large.src)} ${large.width}w" sizes="${sizes}" width="${large.width}" height="${large.height}" alt="${escape(alt)}" loading="lazy" decoding="async">
      <span class="photograph__enlarge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.2"/></svg></span>
    </button>`;
  }).join('\n');
  return `<figure class="essay__figure${paired ? ' essay__figure--paired' : ''}" data-marker-numbers="${escape(markerNumbers.join(','))}">
    <div class="essay__image-row">${photographs}</div>
    ${caption ? `<figcaption>${block.captionItalic ? `<em>${caption}</em>` : caption}</figcaption>` : ''}
  </figure>`;
}

/** Render an author's supplied article body without rewriting its text. */
export function renderWritingArticle(article, prefix = '../../') {
  const publication = typeof article.publication === 'string' ? { name: article.publication } : (article.publication || {});
  const publicationUrl = safeHref(publication.url);
  const byline = article.byline || article.author;
  const metadata = `${byline ? `<span class="essay__author">${escape(byline)}</span>` : ''}${publication.name ? `<span>${escape(publication.name)}</span>` : ''}${publication.date ? `<time datetime="${escape(publication.date)}">${escape(publication.displayDate || publication.date)}</time>` : ''}`;
  const poem = article.kind === 'poem';
  const blocks = (article.blocks || []).map((block, index) => {
    if (block.type === 'paragraph') {
      const spacing = poem ? '\n'.repeat(block.blankLinesBefore ?? 0) : '';
      // Give a trailing soft break a visible line before the paragraph ends.
      const trailingBreak = poem && block.runs?.at(-1)?.text?.endsWith('\n') ? '<br aria-hidden="true">' : '';
      return `<p>${spacing}${renderRuns(block.runs)}${trailingBreak}</p>`;
    }
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
    <article class="essay${poem ? ' essay--poem' : ''}" aria-labelledby="essay-title">
      <header class="essay__header">
        <a class="essay__back" href="../"><span aria-hidden="true">←</span> Writings</a>
        <h1 id="essay-title">${escape(article.title)}</h1>
        ${article.subtitle ? `<p class="essay__subtitle">${escape(article.subtitle)}</p>` : ''}
        ${metadata ? `<div class="essay__meta">${metadata}</div>` : ''}
      </header>
      <div class="essay__body">${blocks}</div>
      <footer class="essay__footer">
        <a class="essay__back" href="../"><span aria-hidden="true">←</span> Back to Writings</a>
        ${publicationUrl ? `<a class="essay__source" href="${escape(publicationUrl)}">Published version${publication.name ? ` at ${escape(publication.name)}` : ''} <span aria-hidden="true">↗</span></a>` : ''}
      </footer>
    </article>
  </main>`;
}
