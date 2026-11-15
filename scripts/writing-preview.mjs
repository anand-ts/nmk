const EXCERPT_LIMIT = 350;
const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

/** Use supplied preview copy, or an unchanged opening from the author's text. */
export function writingExcerpt(writing, article) {
  if (typeof writing?.excerpt === 'string') return writing.excerpt;
  const paragraph = article?.blocks?.find(block => block.type === 'paragraph');
  const text = (paragraph?.runs || []).map(run => String(run.text ?? '')).join('').trim();
  if (!text) return '';
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)].slice(0, 2);
  let excerpt = '';
  for (const { segment } of sentences) {
    if ((excerpt + segment).trim().length > EXCERPT_LIMIT) break;
    excerpt += segment;
  }
  if (excerpt) return excerpt.trim();
  const opening = text.slice(0, EXCERPT_LIMIT - 1);
  const boundary = opening.search(/\s+\S*$/u);
  return (boundary > 0 ? opening.slice(0, boundary) : opening).trimEnd() + '…';
}

function externalHref(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? value : '';
  } catch {
    return '';
  }
}

function previewPhoto(article, prefix) {
  const figure = article?.blocks?.find(block => block.type === 'figure');
  const photo = figure?.images?.[0] || (figure?.asset ? { asset: figure.asset, alt: figure.alt } : null);
  if (!photo) return '';
  const variants = article.images?.[photo.asset];
  const small = variants?.['640'];
  const large = variants?.['1600'];
  if (!small || !large) throw new Error(`Missing featured writing image variants: ${photo.asset}`);
  const alt = photo.alt || figure.alt || figure.caption || article.title;
  return `<span class="writing-feature__image"><img src="${escape(prefix + small.src)}" srcset="${escape(prefix + small.src)} ${small.width}w, ${escape(prefix + large.src)} ${large.width}w" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) calc(69.23vw - 73.38px), (min-width: 1600px) 475px, calc(30.7vw - 16px)" width="${large.width}" height="${large.height}" alt="${escape(alt)}" loading="lazy" decoding="async"></span>`;
}

/** A Home preview backed by an existing article or explicit published copy. */
export function renderFeaturedWriting(writing, article, prefix = './') {
  if (!writing) return '';
  const slug = writing.article;
  const href = slug ? `${prefix}writings/${encodeURIComponent(slug)}/` : externalHref(writing.url);
  if (!href) return '';
  const excerpt = writingExcerpt(writing, article);
  const photo = previewPhoto(article, prefix);
  if (!photo && !excerpt.trim()) return '';
  const publication = typeof writing.publication === 'string' ? writing.publication : writing.publication?.name;
  const publicationName = publication || article?.publication?.name || '';
  const date = writing.date || article?.publication?.date || '';
  const displayDate = writing.displayDate || article?.publication?.displayDate || date;
  const subtitle = writing.subtitle || article?.subtitle;
  return `<section class="writing-feature" aria-labelledby="writing-feature-title">
    <div class="writing-feature__intro">
      <h2 id="writing-feature-title">Writings</h2>
      <a class="writing-feature__all" href="${escape(prefix + 'writings/')}">All writings <span aria-hidden="true">↗</span></a>
    </div>
    <a class="writing-feature__link${photo ? '' : ' writing-feature__link--text-only'}" href="${escape(href)}">
      ${photo}
      <div class="writing-feature__copy">
        <span class="writing-feature__meta">${publicationName ? `<span>${escape(publicationName)}</span>` : ''}${date ? `<time datetime="${escape(date)}">${escape(displayDate)}</time>` : ''}</span>
        <h3>${escape(writing.title || article?.title)}</h3>
        ${subtitle ? `<span class="writing-feature__subtitle">${escape(subtitle)}</span>` : ''}
        ${excerpt ? `<p class="writing-feature__excerpt">${escape(excerpt)}</p>` : ''}
        <span class="writing-feature__action">Read the essay <span aria-hidden="true">↗</span></span>
      </div>
    </a>
  </section>`;
}
