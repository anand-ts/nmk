let disposeGallery;

/**
 * Open photographs in one shared, keyboard-accessible native dialog.
 * Buttons opt in with data-lightbox, data-src, data-alt, data-caption,
 * and data-series. A series includes photographs inside closed details.
 * Returns a cleanup function; calling initGallery again replaces listeners.
 */
export function initGallery() {
  disposeGallery?.();

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Photograph viewer');
  dialog.setAttribute('aria-describedby', 'lightbox-caption');
  dialog.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Close photograph viewer" autofocus>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
    <div class="lightbox__stage">
      <button class="lightbox__previous" type="button" aria-label="Previous photograph">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m14 5-7 7 7 7M7 12h14" /></svg>
      </button>
      <figure class="lightbox__figure">
        <img class="lightbox__image" alt="" decoding="async" />
        <div class="lightbox__status" role="status" aria-live="polite"></div>
        <button class="lightbox__retry" type="button" hidden>Try loading again</button>
        <figcaption class="lightbox__caption" id="lightbox-caption"></figcaption>
      </figure>
      <button class="lightbox__next" type="button" aria-label="Next photograph">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m10 5 7 7-7 7M3 12h14" /></svg>
      </button>
    </div>
    <p class="lightbox__counter" aria-live="polite" aria-atomic="true"></p>
  `;
  document.body.append(dialog);

  const photograph = dialog.querySelector('.lightbox__image');
  const caption = dialog.querySelector('.lightbox__caption');
  const counter = dialog.querySelector('.lightbox__counter');
  const status = dialog.querySelector('.lightbox__status');
  const previous = dialog.querySelector('.lightbox__previous');
  const next = dialog.querySelector('.lightbox__next');
  const close = dialog.querySelector('.lightbox__close');
  const retry = dialog.querySelector('.lightbox__retry');
  let photographs = [];
  let position = 0;
  let opener;
  let loadSequence = 0;
  let loadingTimer;
  let restoredScroll = false;

  function render() {
    const selected = photographs[position];
    if (!selected) return;

    const sequence = ++loadSequence;
    const source = selected.dataset.src || selected.querySelector('img')?.currentSrc;
    const series = selected.dataset.series || '';
    const description = selected.dataset.caption || series;
    const alt = selected.dataset.alt || selected.querySelector('img')?.alt || description || 'Photograph';

    clearTimeout(loadingTimer);
    dialog.dataset.state = 'loading';
    dialog.setAttribute('aria-busy', 'true');
    photograph.hidden = true;
    photograph.alt = alt;
    status.hidden = false;
    status.textContent = 'Loading photograph…';
    retry.hidden = true;
    caption.textContent = description;
    counter.textContent = `${position + 1} / ${photographs.length}`;
    previous.hidden = next.hidden = photographs.length < 2;
    dialog.setAttribute('aria-label', series ? `${series} — photograph viewer` : 'Photograph viewer');

    function failed() {
      if (sequence !== loadSequence) return;
      clearTimeout(loadingTimer);
      dialog.dataset.state = 'error';
      dialog.setAttribute('aria-busy', 'false');
      photograph.hidden = true;
      status.hidden = false;
      status.textContent = 'This photograph could not be loaded.';
      retry.hidden = false;
    }

    if (!source) {
      failed();
      return;
    }

    // A separate loader ensures rapid navigation cannot show an older photo.
    const loader = new Image();
    loader.onload = () => {
      if (sequence !== loadSequence) return;
      clearTimeout(loadingTimer);
      if (document.activeElement === retry) close.focus({ preventScroll: true });
      retry.hidden = true;
      photograph.src = source;
      photograph.hidden = false;
      status.hidden = true;
      dialog.dataset.state = 'ready';
      dialog.setAttribute('aria-busy', 'false');
    };
    loader.onerror = failed;
    loader.src = source;
    loadingTimer = setTimeout(() => {
      if (sequence !== loadSequence || dialog.dataset.state !== 'loading') return;
      status.textContent = 'Still loading the photograph…';
      retry.hidden = false;
    }, 12000);
  }

  function move(direction) {
    if (photographs.length < 2) return;
    position = (position + direction + photographs.length) % photographs.length;
    render();
  }

  function open(event) {
    if (dialog.open) return;
    const trigger = event.target instanceof Element && event.target.closest('[data-lightbox]');
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof dialog.showModal !== 'function') return;
    const series = trigger.dataset.series || '';
    photographs = [...document.querySelectorAll('[data-lightbox]')].filter(
      (item) => (item.dataset.series || '') === series,
    );
    position = photographs.indexOf(trigger);
    if (position < 0) return;

    event.preventDefault();
    opener = trigger;
    restoredScroll = document.documentElement.classList.contains('lightbox-open');
    document.documentElement.classList.add('lightbox-open');
    render();
    dialog.showModal();
    close.focus({ preventScroll: true });
  }

  function finish() {
    ++loadSequence;
    clearTimeout(loadingTimer);
    if (!restoredScroll) document.documentElement.classList.remove('lightbox-open');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    photograph.removeAttribute('src');
    photographs = [];
  }

  function keyboard(event) {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
    // Escape and focus trapping are provided by the native modal dialog.
  }

  document.addEventListener('click', open);
  dialog.addEventListener('keydown', keyboard);
  dialog.addEventListener('close', finish);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.classList.contains('lightbox__stage') || event.target.classList.contains('lightbox__figure')) dialog.close();
  });
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  retry.addEventListener('click', () => {
    render();
    // The retry control hides during loading, so retain a visible focus target.
    close.focus({ preventScroll: true });
  });

  const cleanup = () => {
    document.removeEventListener('click', open);
    if (dialog.open) {
      dialog.close();
      finish();
    }
    ++loadSequence;
    clearTimeout(loadingTimer);
    dialog.removeEventListener('close', finish);
    dialog.remove();
    if (disposeGallery === cleanup) disposeGallery = undefined;
  };
  disposeGallery = cleanup;
  return cleanup;
}
