const svg = (body: string, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  check: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  cross: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>'),
  info: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  camera: svg('<path d="M3 8h3.5L8 5.5h8L17.5 8H21v11H3z"/><circle cx="12" cy="13.5" r="3.8"/>'),
  cube: svg('<path d="M12 2.8l8.5 4.7v9L12 21.2l-8.5-4.7v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9.2"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M4 20h16"/>'),
  sound: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  restart: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4.3h4.3"/>'),
  home: svg('<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevron: svg('<path d="M6 9l6 6 6-6"/>'),
  medal: svg(
    '<path d="M22 6l6 13M42 6l-6 13" stroke-width="3"/><circle cx="32" cy="38" r="17" stroke-width="3"/><circle cx="32" cy="38" r="11" stroke-width="2"/><path d="M26.5 38.5l4 4 7.5-8" stroke-width="3"/>',
    '0 0 64 64',
  ),
  goggles: svg(
    '<path d="M6 26c0-6 5-9 11-9h30c6 0 11 3 11 9v3c0 6-4 10-10 10h-6c-4 0-6-3-7-6h-6c-1 3-3 6-7 6h-6C10 39 6 35 6 29z"/><path d="M6 25H2M58 25h4"/><path d="M14 24c3-2 7-2 10 0M40 24c3-2 7-2 10 0" stroke-width="1.6"/>',
    '0 0 64 64',
  ),
  cuff: svg(
    '<path d="M14 6h22l6 36H18z"/><path d="M18 42h24v10a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z"/><circle cx="36" cy="49" r="2.2"/><path d="M26 49h5"/><path d="M47 26l7 7 9-12" stroke-width="3"/>',
    '0 0 64 64',
  ),
  cap: svg(
    '<path d="M10 36c0-12 10-22 22-22s22 10 22 22z"/><path d="M6 36h52v4H6z"/><path d="M32 14v6M22 17l3 5M42 17l-3 5"/><path d="M20 44c2 6 7 10 12 10s10-4 12-10"/>',
    '0 0 64 64',
  ),
  hand: svg(
    '<path d="M22 34V14a3 3 0 0 1 6 0v16M28 28V10a3 3 0 0 1 6 0v18M34 28V12a3 3 0 0 1 6 0v18M40 30V18a3 3 0 0 1 6 0v18c0 10-6 18-15 18-6 0-10-3-13-8l-6-10a3 3 0 0 1 5-3l5 6"/>',
    '0 0 64 64',
  ),
  glove: svg(
    '<path d="M18 30V12a3.5 3.5 0 0 1 7 0v14M25 24V8a3.5 3.5 0 0 1 7 0v16M32 24V10a3.5 3.5 0 0 1 7 0v16M39 26V16a3.5 3.5 0 0 1 7 0v20c0 9-6 16-14 16-5 0-9-2-12-6l-8-11a3.5 3.5 0 0 1 6-4l5 5"/><path d="M20 50h24v8H20z"/>',
    '0 0 64 64',
  ),
  watch: svg(
    '<rect x="20" y="20" width="24" height="24" rx="6"/><path d="M24 20l2-12h12l2 12M24 44l2 12h12l2-12"/><path d="M32 26v6l4 3"/>',
    '0 0 64 64',
  ),
  scarf: svg(
    '<path d="M14 18c6 5 30 5 36 0l-2 9c-6 4-26 4-32 0z"/><path d="M36 26l6 30h-8l-3-28M28 27l-4 25h-7l6-26"/>',
    '0 0 64 64',
  ),
  headphones: svg(
    '<path d="M10 40V32a22 22 0 0 1 44 0v8"/><rect x="8" y="36" width="10" height="16" rx="3"/><rect x="46" y="36" width="10" height="16" rx="3"/><path d="M26 30l4 4-4 4M34 26v14" stroke-width="1.8"/>',
    '0 0 64 64',
  ),
  drillBit: svg(
    '<path d="M10 54l6-6M16 48l4 4 26-26-4-4zM42 22l6-10 4 4-10 6"/><path d="M22 42l4 4M28 36l4 4M34 30l4 4" stroke-width="1.6"/>',
    '0 0 64 64',
  ),
};
