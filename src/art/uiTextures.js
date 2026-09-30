import { canvas, mottle, grain, paperDetail, rng, halftoneDots } from './painter.js';

/**
 * Generates the tactile textures used by the DOM interface (paper fibre,
 * print dots, scratches, dust) and exposes them as CSS custom properties.
 */
export function buildUITextures() {
  const out = {};

  const paper = (base, seed, opts = {}) => {
    const { c, g, w, h } = canvas(512, 512);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    mottle(g, w, h, { seed, scale: 8 / 512, amount: opts.mottle ?? 0.07, tile: true });
    paperDetail(g, w, h, { seed: seed + 1, fibers: opts.fibers ?? 1400, specks: opts.specks ?? 220, stains: 0, fiberColor: opts.fiber ?? 'rgba(95,72,40,0.08)', speckColor: opts.speck ?? 'rgba(50,35,20,0.3)' });
    grain(g, w, h, opts.grain ?? 9, seed + 2);
    return c.toDataURL('image/jpeg', 0.86);
  };

  out.paperIvory = paper('#e9dfc8', 11);
  out.paperCream = paper('#f1e9d6', 21, { mottle: 0.05 });
  out.paperKraft = paper('#c5a676', 31, { mottle: 0.1, fiber: 'rgba(80,50,20,0.14)', fibers: 2200 });
  out.paperDark = paper('#1d1b18', 41, { mottle: 0.18, fiber: 'rgba(255,240,210,0.035)', speck: 'rgba(255,240,210,0.12)', grain: 6 });
  out.paperGrey = paper('#c9c3b5', 51, { mottle: 0.06 });
  out.paperWine = paper('#6e2229', 61, { mottle: 0.14, fiber: 'rgba(255,220,200,0.05)', speck: 'rgba(0,0,0,0.3)' });

  // transparent grain overlay
  {
    const { c, g, w, h } = canvas(256, 256);
    const img = g.createImageData(w, h);
    const r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 28 + r() * 36;
    }
    g.putImageData(img, 0, 0);
    out.grain = c.toDataURL('image/png');
  }

  // halftone dots (print)
  {
    const { c, g, w, h } = canvas(96, 96);
    halftoneDots(g, w, h, { spacing: 6, color: 'rgba(20,16,12,1)', angle: 0.785, sizeFn: () => 0.55 });
    out.halftone = c.toDataURL('image/png');
  }

  // scratches + dust overlay (transparent)
  {
    const { c, g, w, h } = canvas(512, 512);
    const r = rng(77);
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(255,248,230,${r.range(0.05, 0.16)})`;
      g.lineWidth = r.range(0.4, 1);
      const x = r() * w;
      const y = r() * h;
      const a = r.range(-0.4, 0.4) + (r() < 0.5 ? Math.PI / 2 : 0);
      const l = r.range(20, 140);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,250,235' : '20,15,10'},${r.range(0.08, 0.35)})`;
      g.beginPath();
      g.arc(r() * w, r() * h, r.range(0.3, 1.4), 0, Math.PI * 2);
      g.fill();
    }
    out.scratches = c.toDataURL('image/png');
  }

  // deco sunburst emblem (used on title + stamps)
  const root = document.documentElement.style;
  root.setProperty('--tex-ivory', `url(${out.paperIvory})`);
  root.setProperty('--tex-cream', `url(${out.paperCream})`);
  root.setProperty('--tex-kraft', `url(${out.paperKraft})`);
  root.setProperty('--tex-dark', `url(${out.paperDark})`);
  root.setProperty('--tex-grey', `url(${out.paperGrey})`);
  root.setProperty('--tex-wine', `url(${out.paperWine})`);
  root.setProperty('--tex-grain', `url(${out.grain})`);
  root.setProperty('--tex-halftone', `url(${out.halftone})`);
  root.setProperty('--tex-scratch', `url(${out.scratches})`);
  return out;
}
