const SELECTORS = [
  '.site-header', '.page-intro', '.writings-intro > *', '.writing',
  '.project__aside > *', '.gallery__item', '.project__view-link',
  '.film-section > *', '.essay__header', '.essay__body > p',
  '.essay__figure', '.essay__references', '.essay__footer',
  '.project-gallery__header', '.project-grid__item', '.project-gallery__footer',
  '.next-page', '.site-footer',
].join(',');
const DURATION = 620;
let disposeMotion;

/** Add once-only, visual entrances without hiding content before observation. */
export function initMotion() {
  disposeMotion?.();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const candidates = [...document.querySelectorAll(SELECTORS)].filter(element =>
    !element.matches('.project, .project__aside, .project__gallery, .writings-intro') &&
    getComputedStyle(element).position !== 'sticky',
  );
  const candidateSet = new Set(candidates);
  const targets = candidates.filter(element => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (candidateSet.has(parent)) return false;
    }
    return true;
  });
  const seen = new WeakSet();
  const active = new Map();
  let observer;
  let disposed = false;

  function show(element) {
    seen.add(element);
    observer?.unobserve(element);
    const animation = active.get(element);
    active.delete(element);
    animation?.cancel();
    element.dataset.motionState = 'shown';
  }

  function showAll() {
    observer?.disconnect();
    targets.forEach(show);
  }

  function showRelated(element) {
    if (!(element instanceof Element) || element === document.body || element === document.documentElement) return;
    for (const target of targets) {
      if (target === element || target.contains(element) || element.contains(target)) show(target);
    }
  }

  function hashTarget(hash = window.location.hash) {
    if (!hash || hash === '#') return;
    try { showRelated(document.getElementById(decodeURIComponent(hash.slice(1)))); }
    catch { /* A malformed hash must not interrupt navigation. */ }
  }

  function delayFor(element) {
    const parent = element.parentElement;
    const siblings = [...parent.children];
    const index = siblings.indexOf(element);
    if (parent.matches('.project-grid')) {
      const columns = Math.max(1, getComputedStyle(parent).gridTemplateColumns.split(/\s+/).length);
      return Math.min((index % columns) * 45, 120);
    }
    if (parent.matches('.project__aside, .writings-intro')) return Math.min(index * 24, 120);
    if (parent.matches('.film-section')) return Math.min(index * 45, 120);
    if (element.matches('.writing')) return Math.min(index * 36, 120);
    return element.matches('.page-intro, .essay__header, .project-gallery__header') ? 32 : 0;
  }

  function reveal(element) {
    if (seen.has(element) || disposed) return;
    if (reduced.matches || element.contains(document.activeElement)) return show(element);
    seen.add(element);
    observer?.unobserve(element);
    const delay = delayFor(element);
    element.dataset.motionDelay = String(delay);
    element.dataset.motionState = 'revealing';
    try {
      const animation = element.animate([
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'none' },
      ], {
        duration: DURATION, delay, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards',
      });
      active.set(element, animation);
      const settle = () => {
        if (active.get(element) !== animation) return;
        active.delete(element);
        animation.cancel();
        element.dataset.motionState = 'shown';
      };
      animation.finished.then(settle, settle);
    } catch { show(element); }
  }

  function focus(event) { showRelated(event.target); }
  function anchor(event) {
    const link = event.target instanceof Element && event.target.closest('a[href]');
    if (!link) return;
    try {
      const url = new URL(link.href, window.location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) hashTarget(url.hash);
    } catch { /* Navigation still follows the browser's normal behavior. */ }
  }
  function hash() { hashTarget(); }
  function restore(event) {
    if (event.persisted || window.scrollY > 0) showAll();
  }
  function pageHide() { showAll(); }
  function visibility() {
    if (document.visibilityState === 'hidden') [...active.keys()].forEach(show);
    else {
      for (const target of targets) {
        if (seen.has(target)) continue;
        const bounds = target.getBoundingClientRect();
        if (bounds.top < innerHeight && bounds.bottom > 0) show(target);
      }
    }
  }
  function preference(event) { if (event.matches) showAll(); }

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    showAll();
    reduced.removeEventListener('change', preference);
    document.removeEventListener('focusin', focus, true);
    document.removeEventListener('click', anchor, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('hashchange', hash);
    window.removeEventListener('pageshow', restore);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('beforeprint', showAll);
    for (const target of targets) {
      target.removeAttribute('data-motion-reveal');
      delete target.dataset.motionState;
      delete target.dataset.motionDelay;
    }
    if (disposeMotion === cleanup) disposeMotion = undefined;
  };
  disposeMotion = cleanup;
  for (const target of targets) {
    target.setAttribute('data-motion-reveal', '');
    target.dataset.motionState = 'ready';
  }

  const restored = performance.getEntriesByType('navigation')[0]?.type === 'back_forward' || window.scrollY > 0;
  if (reduced.matches || restored || document.visibilityState === 'hidden' ||
      typeof window.IntersectionObserver !== 'function' || typeof Element.prototype.animate !== 'function') {
    showAll();
    return cleanup;
  }

  reduced.addEventListener('change', preference);
  document.addEventListener('focusin', focus, true);
  document.addEventListener('click', anchor, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('hashchange', hash);
  window.addEventListener('pageshow', restore);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('beforeprint', showAll);
  showRelated(document.activeElement);
  hashTarget();
  // A slow module load must not fade out content the visitor is already reading.
  if (performance.now() > 1000) {
    for (const target of targets) {
      const bounds = target.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > 0 &&
          bounds.left < innerWidth && bounds.right > 0) show(target);
    }
  }
  try {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { rootMargin: '0px 0px 48px 0px', threshold: 0.01 });
    for (const target of targets) if (!seen.has(target)) observer.observe(target);
  } catch { showAll(); }
  return cleanup;
}
