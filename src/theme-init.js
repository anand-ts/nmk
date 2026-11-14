// Run before stylesheets so a saved appearance is applied before first paint.
(() => {
  let saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch { /* Storage can be unavailable in private or restricted contexts. */ }
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const color = document.querySelector('meta[name="theme-color"]');
  if (color) color.content = theme === 'dark' ? '#1b1e1a' : '#f7f6f2';
})();
