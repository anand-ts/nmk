import { initGallery } from './gallery.js';
import { initTheme } from './theme.js';

initTheme();
if (document.querySelector('[data-lightbox]')) initGallery();
if (document.querySelector('video[data-film]')) import('./film.js').then(({ initFilms }) => initFilms()).catch(() => {});
// Decorative motion should never block the theme toggle or photograph viewer.
import('./motion.js').then(({ initMotion }) => initMotion()).catch(() => {});

// Reading progress belongs to the page, so both columns share one natural scroll.
const progress = document.querySelector('[data-scroll-progress]');
if (progress) {
  let scheduled = false;
  const update = () => {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0})`;
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}
