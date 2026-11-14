import { initGallery } from './gallery.js';
import { initTheme } from './theme.js';

initTheme();
if (document.querySelector('[data-lightbox]')) initGallery();

// Keep disclosure labels accurate without replacing native <details> behavior.
document.querySelectorAll('[data-series-disclosure]').forEach((details) => {
  const label = details.querySelector('[data-disclosure-label]');
  details.addEventListener('toggle', () => {
    if (label) label.textContent = details.open ? 'Show fewer photographs' : 'View all photographs';
  });
});

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
  document.querySelectorAll('details').forEach((details) => details.addEventListener('toggle', update));
  update();
}
