import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderWritingArticle } from './render-writing.mjs';
import { renderProjectGallery } from './render-project.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const content = JSON.parse(await readFile(path.join(root, 'content/portfolio.json'), 'utf8'));
const assets = JSON.parse(await readFile(path.join(root, 'content/assets.json'), 'utf8'));
const articles = new Map(await Promise.all(content.writings.filter(writing => writing.article).map(async writing => [writing.article, JSON.parse(await readFile(path.join(root, 'content/writings', `${writing.article}.json`), 'utf8'))])));
const dist = path.join(root, 'dist');
const escape = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.2"/></svg>';

function photograph(image, prefix, { eager = false, className = '', lightbox = false, series = '', thumbnail = false, grid = false, href = '', linkLabel = '' } = {}) {
  const sizes = assets[image.asset];
  if (!sizes) throw new Error(`Missing asset metadata: ${image.asset}`);
  const small = sizes[thumbnail ? '320' : '640'];
  const large = sizes[thumbnail ? '640' : '1600'];
  const fallback = thumbnail ? small : large;
  const responsiveSizes = thumbnail ? '(max-width: 760px) 67px, (max-width: 1100px) 82px, 115px' : grid ? '(max-width: 760px) calc((100vw - 56px) / 2), (max-width: 1100px) calc((100vw - 84px) / 2), (min-width: 1600px) 476px, 29vw' : '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 62vw, 64vw';
  const markup = `<img src="${prefix}${fallback.src}" srcset="${prefix}${small.src} ${small.width}w, ${prefix}${large.src} ${large.width}w" sizes="${responsiveSizes}" width="${fallback.width}" height="${fallback.height}" alt="${escape(image.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
  if (href) return `<a class="photograph project-preview ${className}" href="${escape(href)}" aria-label="${escape(linkLabel || image.alt)}">${markup}<span class="photograph__enlarge" aria-hidden="true">${arrow}</span></a>`;
  return lightbox
    ? `<button class="photograph ${className}" type="button" data-lightbox data-src="${prefix}${large.src}" data-alt="${escape(image.alt)}" data-caption="${escape(image.caption)}" data-series="${escape(series)}" aria-label="Enlarge photograph: ${escape(image.alt)} (${escape(image.caption)})">${markup}<span class="photograph__enlarge" aria-hidden="true">${arrow}</span></button>`
    : `<span class="photograph ${className}">${markup}</span>`;
}

function frame(page, body, options = {}) {
  const prefix = options.prefix || (page === 'home' ? './' : '../');
  const label = page === 'home' ? '' : `${page[0].toUpperCase() + page.slice(1)} — `;
  const title = options.title || label + content.name;
  const description = options.description || content.description;
  const nav = [['home', prefix, 'Home'], ['writings', `${prefix}writings/`, 'Writings'], ['contact', `${prefix}contact/`, 'Contact']].map(([key, href, text]) => `<a class="nav__link${key === page ? ' nav__link--active' : ''}" href="${href}"${key === page ? ' aria-current="page"' : ''}>${text}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f7f6f2">
  <script src="${prefix}assets/theme-init.js"></script>
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="${options.article ? 'article' : 'website'}">
  <link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/styles.css">
  ${options.article ? `<link rel="stylesheet" href="${prefix}assets/article.css">` : ''}
  ${options.project ? `<link rel="stylesheet" href="${prefix}assets/project.css">` : ''}
  <link rel="stylesheet" href="${prefix}assets/theme.css">
  <script type="module" src="${prefix}assets/main.js"></script>
</head>
<body class="page page--${page}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${page === 'home' ? '<div class="scroll-progress" data-scroll-progress aria-hidden="true"></div>' : ''}
  <div class="site-shell">
    <header class="site-header" id="top">
      <a class="wordmark" href="${prefix}">${escape(content.name)}</a>
      <nav class="site-nav" aria-label="Main navigation">${nav}<button class="theme-toggle" data-theme-toggle type="button" aria-label="Dark mode" aria-pressed="false" title="Switch to dark mode"><svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.5 13.1A8.7 8.7 0 0 1 10.9 3.5 8.8 8.8 0 1 0 20.5 13.1Z"/></svg><svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.7"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg></button></nav>
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
  const projectHref = `./projects/${project.id}/`;
  const series = project.images.slice(0, 2).map((image, imageIndex) => `<figure class="gallery__item${imageIndex === 1 && project.id === 'homeland' ? ' gallery__item--portrait' : ''}">
    ${photograph(image, './', { eager: index === 0 && imageIndex === 0, href: projectHref, linkLabel: `View ${project.title}: ${image.alt}` })}
    <figcaption><span>${escape(image.caption)}</span><span class="image-index">${String(imageIndex + 1).padStart(2, '0')} / ${String(project.images.length).padStart(2, '0')}</span></figcaption>
  </figure>`);
  const videos = (project.videos || []).map((video) => `<figure class="gallery__item"><video controls playsinline preload="none"${video.poster ? ` poster="./${escape(video.poster)}"` : ''} aria-label="${escape(video.title)}"><source src="./${escape(video.src)}" type="${escape(video.type || 'video/mp4')}">${video.captions ? `<track kind="captions" src="./${escape(video.captions)}" srclang="en" label="English" default>` : ''}<p>Your browser cannot play this film. <a href="./${escape(video.src)}">Download ${escape(video.title)}</a>.</p></video><figcaption>${escape(video.title)}</figcaption></figure>`).join('');
  return `<section class="project" id="${escape(project.id)}" aria-labelledby="${escape(project.id)}-title">
    <aside class="project__aside">
      <div class="eyebrow"><span>${number}</span><span>${escape(project.category)}</span></div>
      <h2 id="${escape(project.id)}-title"><a class="project__title-link" href="${projectHref}">${escape(project.title)} <span aria-hidden="true">↗</span></a></h2>
      ${project.description ? `<p class="project__description">${escape(project.description)}</p>` : ''}
      <p class="project__selection">${project.images.length} photographs</p>
      <nav class="project-index" aria-label="Photographic series">
        ${content.projects.map((item, itemIndex) => `<a href="./projects/${escape(item.id)}/"${item.id === project.id ? ' class="project-index__link--active"' : ''}><span>${String(itemIndex + 1).padStart(2, '0')}</span><span>${escape(item.title)}</span><span class="project-index__arrow" aria-hidden="true">↗</span></a>`).join('')}
      </nav>
    </aside>
    <div class="project__gallery">
      ${series.join('\n')}
      <a class="project__view-link" href="${projectHref}"><span>View all ${project.images.length} photographs</span>${arrow}</a>
      ${videos}
    </div>
  </section>`;
}

const home = `<main id="main" tabindex="-1">
  <div class="page-intro"><h1>${escape(content.intro)}</h1><div class="page-intro__meta"><span>Selected work</span><span>01 — ${String(content.projects.length).padStart(2, '0')} <span class="intro-arrow" aria-hidden="true">↓</span></span></div></div>
  ${content.bio ? `<p class="bio">${escape(content.bio)}</p>` : ''}
  ${content.projects.map(projectSection).join('\n')}
  ${(content.films || []).map(film => `<section class="film-section" id="${escape(film.id)}" aria-labelledby="${escape(film.id)}-title"><aside class="film-section__aside"><span class="eyebrow">Moving image</span><h2 class="film-section__title" id="${escape(film.id)}-title">${escape(film.title)}</h2><p class="film-section__meta">${escape(film.version || '')}${film.duration ? ` · ${escape(film.duration)}` : ''}</p></aside><figure class="film__frame"><video data-film controls playsinline preload="none" poster="./${escape(film.poster)}" width="${film.width}" height="${film.height}" aria-label="${escape(film.title)}${film.version ? ` — ${escape(film.version)}` : ''}">${(film.sources || [{ src: film.src, type: film.type || 'video/mp4' }]).map(source => `<source src="./${escape(source.src)}" type="${escape(source.type)}">`).join('')}${film.captions ? `<track kind="captions" src="./${escape(film.captions)}" srclang="en" label="English" default>` : ''}<p>Your browser cannot play this film. <a href="./${escape(film.src)}">Download the film</a>.</p></video><figcaption><span>${escape(film.version || film.title)}</span><span>${escape(film.duration || '')}</span></figcaption></figure></section>`).join('\n')}
  <a class="next-page" href="./writings/"><span>Continue exploring</span><span class="next-page__title">Writings ${arrow}</span></a>
</main>`;

const writings = `<main id="main" tabindex="-1" class="writings-layout">
  <div class="writings-intro"><span class="eyebrow">Words & images</span><h1>Writings</h1></div>
  <div class="writing-list">${content.writings.map((writing, index) => {
    const image = { asset: writing.asset, alt: writing.title === 'The Land Remembers' ? 'A small temple beneath an open sky in the Homeland photographic series.' : 'Loaded yaks in the snowy woodland of the Darkhad Migration series.' };
    const href = writing.article ? `./${writing.article}/` : writing.url;
    const inner = `<span class="writing__number">${String(index + 1).padStart(2, '0')}</span><div class="writing__body"><div class="writing__meta">${href ? `<span>${escape(writing.publication)}</span><time datetime="${escape(writing.date)}">${escape(writing.displayDate)}</time>` : '<span>Text to come</span>'}</div><h2>${escape(writing.title)}</h2>${writing.subtitle ? `<p>${escape(writing.subtitle)}</p>` : ''}${href ? `<span class="writing__action">Read the essay ${arrow}</span>` : ''}</div><span class="writing__thumbnail">${photograph(image, '../', { thumbnail: true })}</span>`;
    return href ? `<article class="writing"><a class="writing__link" href="${escape(href)}">${inner}</a></article>` : `<article class="writing writing--upcoming"><div class="writing__link">${inner}</div></article>`;
  }).join('\n')}</div>
</main>`;

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
await mkdir(path.join(dist, 'writings'), { recursive: true });
await mkdir(path.join(dist, 'contact'), { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
await Promise.all(['main.js', 'gallery.js', 'styles.css', 'article.css', 'project.css', 'theme.js', 'theme-init.js', 'theme.css'].map((filename) => cp(path.join(root, 'src', filename), path.join(dist, 'assets', filename))));
await writeFile(path.join(dist, 'index.html'), frame('home', home));
await writeFile(path.join(dist, 'writings/index.html'), frame('writings', writings));
await writeFile(path.join(dist, 'contact/index.html'), frame('contact', '<main id="main" class="contact-blank" tabindex="-1" aria-label="Contact"><h1 class="visually-hidden">Contact</h1></main>'));
for (const [slug, article] of articles) {
  await mkdir(path.join(dist, 'writings', slug), { recursive: true });
  await writeFile(path.join(dist, 'writings', slug, 'index.html'), frame('writings', renderWritingArticle(article), { prefix: '../../', title: `${article.title} — ${content.name}`, description: article.subtitle, article: true }));
}
for (const project of content.projects) {
  await mkdir(path.join(dist, 'projects', project.id), { recursive: true });
  await writeFile(path.join(dist, 'projects', project.id, 'index.html'), frame('home', renderProjectGallery(project, { photograph }), { prefix: '../../', project: true, title: `${project.title} — ${content.name}`, description: project.description || `${project.images.length} photographs from ${project.title} by ${content.name}.` }));
}
console.log(`Built ${3 + articles.size + content.projects.length} pages with ${Object.keys(assets).length} gallery photographs, ${[...articles.values()].reduce((total, article) => total + Object.keys(article.images || {}).length, 0)} essay images, and ${(content.films || []).length} film.`);
