import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const content = JSON.parse(await readFile(path.join(root, 'content/portfolio.json'), 'utf8'));
const assets = JSON.parse(await readFile(path.join(root, 'content/assets.json'), 'utf8'));
const dist = path.join(root, 'dist');
const escape = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.2"/></svg>';

function photograph(image, prefix, { eager = false, className = '', lightbox = false, series = '' } = {}) {
  const sizes = assets[image.asset];
  if (!sizes) throw new Error(`Missing asset metadata: ${image.asset}`);
  const small = sizes['640'];
  const large = sizes['1600'];
  const markup = `<img src="${prefix}${large.src}" srcset="${prefix}${small.src} ${small.width}w, ${prefix}${large.src} ${large.width}w" sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 62vw, 64vw" width="${large.width}" height="${large.height}" alt="${escape(image.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
  return lightbox
    ? `<button class="photograph ${className}" type="button" data-lightbox data-src="${prefix}${large.src}" data-alt="${escape(image.alt)}" data-caption="${escape(image.caption)}" data-series="${escape(series)}" aria-label="Enlarge photograph: ${escape(image.alt)} (${escape(image.caption)})">${markup}<span class="photograph__enlarge" aria-hidden="true">${arrow}</span></button>`
    : `<span class="photograph ${className}">${markup}</span>`;
}

function frame(page, body) {
  const prefix = page === 'home' ? './' : '../';
  const label = page === 'home' ? '' : `${page[0].toUpperCase() + page.slice(1)} — `;
  const nav = [['home', prefix, 'Home'], ['writings', `${prefix}writings/`, 'Writings'], ['contact', `${prefix}contact/`, 'Contact']].map(([key, href, text]) => `<a class="nav__link${key === page ? ' nav__link--active' : ''}" href="${href}"${key === page ? ' aria-current="page"' : ''}>${text}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f7f6f2">
  <title>${escape(label + content.name)}</title>
  <meta name="description" content="${escape(content.description)}">
  <meta property="og:title" content="${escape(label + content.name)}">
  <meta property="og:description" content="${escape(content.description)}">
  <meta property="og:type" content="website">
  <link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/styles.css">
  <script type="module" src="${prefix}assets/main.js"></script>
</head>
<body class="page page--${page}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${page === 'home' ? '<div class="scroll-progress" data-scroll-progress aria-hidden="true"></div>' : ''}
  <div class="site-shell">
    <header class="site-header" id="top">
      <a class="wordmark" href="${prefix}">${escape(content.name)}</a>
      <nav class="site-nav" aria-label="Main navigation">${nav}</nav>
    </header>
    ${body}
    ${page === 'contact' ? '' : `<footer class="site-footer"><span>© ${escape(content.name)}</span><a href="#top">Back to top <span aria-hidden="true">↑</span></a></footer>`}
  </div>
</body>
</html>
`;
}

function projectSection(project, index) {
  const number = String(index + 1).padStart(2, '0');
  const series = project.images.map((image, imageIndex) => `<figure class="gallery__item${imageIndex === 1 && project.id === 'homeland' ? ' gallery__item--portrait' : ''}">
    ${photograph(image, './', { eager: index === 0 && imageIndex === 0, lightbox: true, series: project.id })}
    <figcaption><span>${escape(image.caption)}</span><span class="image-index">${String(imageIndex + 1).padStart(2, '0')} / ${String(project.images.length).padStart(2, '0')}</span></figcaption>
  </figure>`);
  const remaining = series.length - 2;
  const videos = (project.videos || []).map((video) => `<figure class="gallery__item"><video controls playsinline preload="none"${video.poster ? ` poster="./${escape(video.poster)}"` : ''} aria-label="${escape(video.title)}"><source src="./${escape(video.src)}" type="${escape(video.type || 'video/mp4')}">${video.captions ? `<track kind="captions" src="./${escape(video.captions)}" srclang="en" label="English" default>` : ''}<p>Your browser cannot play this film. <a href="./${escape(video.src)}">Download ${escape(video.title)}</a>.</p></video><figcaption>${escape(video.title)}</figcaption></figure>`).join('');
  return `<section class="project" id="${escape(project.id)}" aria-labelledby="${escape(project.id)}-title">
    <aside class="project__aside">
      <div class="eyebrow"><span>${number}</span><span>${escape(project.category)}</span></div>
      <h2 id="${escape(project.id)}-title">${escape(project.title)}</h2>
      ${project.description ? `<p class="project__description">${escape(project.description)}</p>` : ''}
      <p class="project__selection">${project.images.length} photographs</p>
      <nav class="project-index" aria-label="Photographic series">
        ${content.projects.map((item, itemIndex) => `<a href="#${escape(item.id)}"${item.id === project.id ? ' aria-current="location"' : ''}><span>${String(itemIndex + 1).padStart(2, '0')}</span><span>${escape(item.title)}</span><span class="project-index__arrow" aria-hidden="true">↗</span></a>`).join('')}
      </nav>
    </aside>
    <div class="project__gallery">
      ${series.slice(0, 2).join('\n')}
      ${remaining > 0 ? `<details class="series-disclosure" data-series-disclosure><summary><span data-disclosure-label>View all photographs</span><span class="series-disclosure__count">${String(series.length).padStart(2, '0')} photographs</span><span class="series-disclosure__icon" aria-hidden="true">+</span></summary><div class="series-disclosure__images">${series.slice(2).join('\n')}</div></details>` : ''}
      ${videos}
    </div>
  </section>`;
}

const home = `<main id="main" tabindex="-1">
  <div class="page-intro"><h1>${escape(content.intro)}</h1><div class="page-intro__meta"><span>Selected work</span><span>01 — ${String(content.projects.length).padStart(2, '0')} <span class="intro-arrow" aria-hidden="true">↓</span></span></div></div>
  ${content.bio ? `<p class="bio">${escape(content.bio)}</p>` : ''}
  ${content.projects.map(projectSection).join('\n')}
  <a class="next-page" href="./writings/"><span>Continue exploring</span><span class="next-page__title">Writings ${arrow}</span></a>
</main>`;

const writings = `<main id="main" tabindex="-1" class="writings-layout">
  <div class="writings-intro"><span class="eyebrow">Words & images</span><h1>Writings</h1></div>
  <div class="writing-list">${content.writings.map((writing, index) => {
    const image = { asset: writing.asset, alt: writing.title === 'The Land Remembers' ? 'A small temple beneath an open sky in the Homeland photographic series.' : 'Loaded yaks in the snowy woodland of the Darkhad Migration series.' };
    const inner = `<span class="writing__number">${String(index + 1).padStart(2, '0')}</span><div class="writing__body"><div class="writing__meta">${writing.url ? `<span>${escape(writing.publication)}</span><time datetime="${escape(writing.date)}">${escape(writing.displayDate)}</time>` : '<span>Text to come</span>'}</div><h2>${escape(writing.title)}</h2>${writing.subtitle ? `<p>${escape(writing.subtitle)}</p>` : ''}${writing.url ? `<span class="writing__action">Read the essay ${arrow}</span>` : ''}</div><span class="writing__thumbnail">${photograph(image, '../')}</span>`;
    return writing.url ? `<article class="writing"><a class="writing__link" href="${escape(writing.url)}">${inner}</a></article>` : `<article class="writing writing--upcoming"><div class="writing__link">${inner}</div></article>`;
  }).join('\n')}</div>
</main>`;

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
await mkdir(path.join(dist, 'writings'), { recursive: true });
await mkdir(path.join(dist, 'contact'), { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
await Promise.all(['main.js', 'gallery.js', 'styles.css'].map((filename) => cp(path.join(root, 'src', filename), path.join(dist, 'assets', filename))));
await writeFile(path.join(dist, 'index.html'), frame('home', home));
await writeFile(path.join(dist, 'writings/index.html'), frame('writings', writings));
await writeFile(path.join(dist, 'contact/index.html'), frame('contact', '<main id="main" class="contact-blank" tabindex="-1" aria-label="Contact"><h1 class="visually-hidden">Contact</h1></main>'));
console.log(`Built Home, Writings, and Contact with ${Object.keys(assets).length} photographs.`);
