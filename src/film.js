const START_RATIO = 0.5;
const STOP_RATIO = 0.18;
const choices = new WeakMap();
const controlledPauseEvents = new WeakSet();
let disposeFilms;

/** Autoplay muted films in view while leaving native playback choices intact. */
export function initFilms() {
  disposeFilms?.();
  const videos = [...document.querySelectorAll('video[data-film]')];
  const states = new Map();
  let observer;
  let observing = false;
  let disposed = false;
  let pageActive = true;

  function viewportRatio(video) {
    const bounds = video.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return 0;
    const width = Math.max(0, Math.min(bounds.right, innerWidth) - Math.max(bounds.left, 0));
    const height = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0));
    return width * height / (bounds.width * bounds.height);
  }

  function updateVisibility(state, ratio) {
    state.ratio = ratio;
    if (ratio >= START_RATIO) state.inView = true;
    else if (ratio <= STOP_RATIO) state.inView = false;
  }

  function mayPlay(state) {
    return !disposed && state.choice.owner === state && observing && pageActive &&
      document.visibilityState === 'visible' && state.inView &&
      !state.choice.manuallyPaused && !state.choice.ended && !state.video.ended && !state.choice.blocked;
  }

  function pause(state) {
    if (state.request) state.request.cancelled = true;
    if (state.video.paused) return;
    state.choice.controlledPauses += 1;
    try { state.video.pause(); }
    catch { state.choice.controlledPauses -= 1; }
  }

  function settle(state, request, success) {
    // An older controller must not pause a newer controller's playback.
    if (state.choice.owner !== state) return;
    if (state.request === request) state.request = null;
    if (!success && !request.cancelled) state.choice.blocked = true;
    if (!mayPlay(state)) pause(state);
    else if (request.cancelled && state.video.paused) synchronize(state);
  }

  function synchronize(state) {
    if (!observing) return;
    if (!mayPlay(state)) return pause(state);
    if (!state.video.paused || state.request) return;
    const request = { cancelled: false };
    state.request = request;
    try {
      const result = state.video.play();
      Promise.resolve(result).then(
        () => settle(state, request, true),
        () => settle(state, request, false),
      ).catch(() => {
        if (state.choice.owner !== state) return;
        if (state.request === request) state.request = null;
        state.choice.blocked = true;
        pause(state);
      });
    } catch { settle(state, request, false); }
  }

  for (const video of videos) {
    let choice = choices.get(video);
    if (!choice) {
      choice = { manuallyPaused: false, ended: video.ended, blocked: false, controlledPauses: 0 };
      choices.set(video, choice);
      video.playsInline = true;
      // The HTML supplies defaultMuted; never overwrite a user's live audio choice.
    }
    const state = { video, choice, ratio: 0, inView: false, request: null };
    choice.owner = state;
    if (!video.paused && !video.ended) {
      state.ratio = viewportRatio(video);
      state.inView = state.ratio > STOP_RATIO;
      choice.manuallyPaused = false;
      choice.ended = false;
      choice.blocked = false;
    }

    function onPlay() {
      if (disposed || video.paused) return;
      if (!state.request || state.request.cancelled) {
        // Native Play is an explicit request, including after an autoplay rejection.
        choice.manuallyPaused = false;
        choice.ended = false;
        choice.blocked = false;
        if (observing) {
          updateVisibility(state, viewportRatio(video));
          if (state.ratio > STOP_RATIO) state.inView = true;
        }
      }
      if (!pageActive || document.visibilityState !== 'visible' || (observing && !state.inView)) pause(state);
    }

    function onPause(event) {
      if (controlledPauseEvents.has(event)) {
        if (disposed && !choice.controlledPauses) video.removeEventListener('pause', onPause);
        return;
      }
      if (choice.controlledPauses) {
        choice.controlledPauses -= 1;
        controlledPauseEvents.add(event);
        if (disposed && !choice.controlledPauses) video.removeEventListener('pause', onPause);
        return;
      }
      if (disposed) return;
      if (video.ended) return;
      choice.manuallyPaused = true;
      if (state.request) state.request.cancelled = true;
    }

    function onEnded() {
      if (disposed) return;
      choice.ended = true;
      if (state.request) state.request.cancelled = true;
    }

    state.removeListeners = (keepPendingPause = false) => {
      video.removeEventListener('play', onPlay);
      if (!keepPendingPause) video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    states.set(video, state);
  }

  function refresh() {
    if (!pageActive || document.visibilityState !== 'visible') {
      states.forEach(pause);
      return;
    }
    if (!observing) return;
    for (const state of states.values()) {
      updateVisibility(state, viewportRatio(state.video));
      synchronize(state);
    }
  }
  function hide() { pageActive = false; states.forEach(pause); }
  function show() { pageActive = true; refresh(); }

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('pagehide', hide);
    window.removeEventListener('pageshow', show);
    for (const state of states.values()) {
      pause(state);
      // Drain an already queued native pause even if a new controller mounts first.
      state.removeListeners(state.choice.controlledPauses > 0);
    }
    if (disposeFilms === cleanup) disposeFilms = undefined;
  };
  disposeFilms = cleanup;
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', show);

  if (typeof window.IntersectionObserver === 'function') {
    try {
      observer = new IntersectionObserver(entries => {
        if (disposed) return;
        for (const entry of entries) {
          const state = states.get(entry.target);
          if (!state) continue;
          updateVisibility(state, entry.isIntersecting ? entry.intersectionRatio : 0);
          synchronize(state);
        }
      }, { threshold: [0, STOP_RATIO, START_RATIO, 1] });
      observing = true;
      videos.forEach(video => observer.observe(video));
    } catch { observer?.disconnect(); observing = false; }
  }
  if (document.visibilityState !== 'visible') states.forEach(pause);
  return cleanup;
}
