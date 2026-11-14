const STORAGE_KEY = 'portfolio-theme';
const isTheme = value => value === 'light' || value === 'dark';
let disposeTheme;

function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch { return null; }
}

export function initTheme() {
  disposeTheme?.();
  const root = document.documentElement;
  const buttons = [...document.querySelectorAll('[data-theme-toggle]')];
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = savedTheme();

  function apply(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const dark = theme === 'dark';
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = dark ? '#1b1e1a' : '#f7f6f2';
  }

  function toggle() {
    preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(preference);
    try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* Keep the choice for this page when storage is blocked. */ }
  }

  function followSystem(event) {
    if (!preference) apply(event.matches ? 'dark' : 'light');
  }

  function followStorage(event) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    preference = isTheme(event.newValue) ? event.newValue : null;
    apply(preference || (system.matches ? 'dark' : 'light'));
  }

  apply(preference || (isTheme(root.dataset.theme) ? root.dataset.theme : system.matches ? 'dark' : 'light'));
  buttons.forEach(button => button.addEventListener('click', toggle));
  system.addEventListener('change', followSystem);
  window.addEventListener('storage', followStorage);

  const cleanup = () => {
    buttons.forEach(button => button.removeEventListener('click', toggle));
    system.removeEventListener('change', followSystem);
    window.removeEventListener('storage', followStorage);
    if (disposeTheme === cleanup) disposeTheme = undefined;
  };
  disposeTheme = cleanup;
  return cleanup;
}
