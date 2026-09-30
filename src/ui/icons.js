/** Original thin line icons (SVG). */
const s = (body, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON = {
  gear: s(`<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"/><circle cx="12" cy="12" r="6.6"/>`),
  envelope: s(`<rect x="3" y="6" width="18" height="12.5"/><path d="M3 6.5l9 7 9-7"/>`),
  mission: s(`<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3M9 10h6M9 13.5h6M9 17h4"/>`),
  exit: s(`<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M18 12H9"/>`),
  ticket: s(`<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M15 7v10" stroke-dasharray="1.5 1.5"/>`),
  folder: s(`<path d="M3 6h6l2 2h10v11H3z"/>`),
  camera: s(`<rect x="3" y="7" width="18" height="12"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-2.5h5L16 7"/>`),
  clock: s(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>`),
  rain: s(`<path d="M7 14a4 4 0 1 1 1.2-7.8A5 5 0 0 1 18 8a3.5 3.5 0 0 1-.5 6.9"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>`),
  arrow: s(`<path d="M5 12h14M14 7l5 5-5 5"/>`),
  back: s(`<path d="M19 12H5M10 7l-5 5 5 5"/>`),
  pen: s(`<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>`),
  lock: s(`<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`),
  seal: s(`<circle cx="12" cy="12" r="6"/><path d="M12 8.5l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z"/>`),
  compass: s(`<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>`),
  watch: s(`<circle cx="12" cy="13.5" r="6.5"/><path d="M12 10v3.5l2 1.5M10.5 4h3M12 4v3"/>`),
  leaf: s(`<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>`),
  key: s(`<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/>`),
  note: s(`<path d="M5 3h14v18H5z"/><path d="M8 7h8M8 10.5h8M8 14h5"/>`),
  moon: s(`<path d="M16 3.5A8.5 8.5 0 1 0 20.5 16 7 7 0 0 1 16 3.5z"/>`),
  eye: s(`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`),
  play: s(`<path d="M8 5l11 7-11 7z"/>`),
};
