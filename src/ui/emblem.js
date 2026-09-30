/** Art-Deco sunburst emblem (SVG, original). */
export function emblemSVG({ size = 220, color = '#dcc084', rays = 36, cls = '' } = {}) {
  const c = size / 2;
  let lines = '';
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const long = i % 3 === 0;
    const r0 = c * 0.46;
    const r1 = c * (long ? 0.96 : 0.8);
    lines += `<line x1="${(c + Math.cos(a) * r0).toFixed(2)}" y1="${(c + Math.sin(a) * r0).toFixed(2)}" x2="${(c + Math.cos(a) * r1).toFixed(2)}" y2="${(c + Math.sin(a) * r1).toFixed(2)}" stroke-width="${long ? 1.2 : 0.6}"/>`;
  }
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ticks += `<circle cx="${(c + Math.cos(a) * c * 0.38).toFixed(2)}" cy="${(c + Math.sin(a) * c * 0.38).toFixed(2)}" r="${i % 3 === 0 ? 1.8 : 0.9}" fill="${color}" stroke="none"/>`;
  }
  return `<svg class="emblem ${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none" stroke="${color}">
    <g class="emblem__rays">${lines}</g>
    <circle cx="${c}" cy="${c}" r="${c * 0.44}" stroke-width="1"/>
    <circle cx="${c}" cy="${c}" r="${c * 0.33}" stroke-width="0.6"/>
    ${ticks}
    <g class="emblem__hands">
      <line x1="${c}" y1="${c}" x2="${c}" y2="${c - c * 0.27}" stroke-width="1.4"/>
      <line x1="${c}" y1="${c}" x2="${c + c * 0.18}" y2="${c + c * 0.06}" stroke-width="1"/>
    </g>
    <path d="M${c} ${c - c * 0.12} L${c + c * 0.06} ${c} L${c} ${c + c * 0.12} L${c - c * 0.06} ${c} Z" fill="${color}" stroke="none"/>
    <circle cx="${c}" cy="${c}" r="${c * 0.99}" stroke-width="0.5" stroke-dasharray="1 3"/>
  </svg>`;
}

/** Small decorative rule with a centred diamond. */
export const decoRule = (w = 18) => `<span class="deco-rule" style="width:${w}rem"><i></i></span>`;
