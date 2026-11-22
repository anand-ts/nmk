const arrowPaths = {
  'up-right': 'M5 19 19 5M5 5h14v14',
  left: 'M20 12H4m7-7-7 7 7 7',
  up: 'M12 20V4m-7 7 7-7 7 7',
  down: 'M12 4v16m-7-7 7 7 7-7',
};

export function arrowIcon(direction, className = '') {
  return `<svg${className ? ` class="${className}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${arrowPaths[direction]}"/></svg>`;
}
