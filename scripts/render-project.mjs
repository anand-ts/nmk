const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

/** Render a complete project overview using the shared photograph viewer. */
export function renderProjectGallery(project, { prefix = '../../', photograph } = {}) {
  if (typeof photograph !== 'function') throw new TypeError('Project galleries require the shared photograph renderer.');
  const images = project.images || [];
  const total = String(images.length).padStart(2, '0');
  const homeHref = `${prefix}#${encodeURIComponent(project.id)}`;
  const backLink = `<a class="project-gallery__back" href="${escape(homeHref)}"><span aria-hidden="true">←</span> Back to Home</a>`;
  const figures = images.map((image, index) => `<figure class="project-grid__item">
    ${photograph(image, prefix, { lightbox: true, series: project.id, grid: true, eager: index === 0 })}
    <figcaption><span class="project-grid__caption">${escape(image.caption)}</span><span class="project-grid__index">${String(index + 1).padStart(2, '0')} / ${total}</span></figcaption>
  </figure>`).join('\n');
  return `<main id="main" tabindex="-1" class="project-gallery-page">
    <header class="project-gallery__header">
      ${backLink}
      <div class="project-gallery__meta"><span class="eyebrow">${escape(project.category || 'Photographic series')}</span><span>${images.length} ${images.length === 1 ? 'photograph' : 'photographs'}</span></div>
      <h1>${escape(project.title)}</h1>
      ${project.description ? `<p class="project-gallery__description">${escape(project.description)}</p>` : ''}
    </header>
    <div class="project-grid">${figures}</div>
    <div class="project-gallery__footer">${backLink}</div>
  </main>`;
}
