import * as THREE from 'three';

/** Seeded RNG (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  return { c, g, w, h };
}

/** Value-noise with smooth interpolation (tileable when `period` given). */
export function makeNoise(seed = 1) {
  const r = rng(seed);
  const P = 256;
  const perm = new Uint8Array(P * 2);
  const vals = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    perm[i] = i;
    vals[i] = r();
  }
  for (let i = P - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < P; i++) perm[i + P] = perm[i];
  const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y, period = 256) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X0 = ((xi % period) + period) % period & 255;
    const Y0 = ((yi % period) + period) % period & 255;
    const X1 = (((xi + 1) % period) + period) % period & 255;
    const Y1 = (((yi + 1) % period) + period) % period & 255;
    const v00 = vals[perm[X0 + perm[Y0]]];
    const v10 = vals[perm[X1 + perm[Y0]]];
    const v01 = vals[perm[X0 + perm[Y1]]];
    const v11 = vals[perm[X1 + perm[Y1]]];
    const u = sm(xf);
    const v = sm(yf);
    return v00 * (1 - u) * (1 - v) + v10 * u * (1 - v) + v01 * (1 - u) * v + v11 * u * v;
  };
  n2.fbm = (x, y, oct = 4, period = 256) => {
    let s = 0;
    let a = 0.5;
    let f = 1;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
      s += a * n2(x * f, y * f, period * f);
      norm += a;
      a *= 0.5;
      f *= 2;
    }
    return s / norm;
  };
  return n2;
}

export function hexToRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r * 255, c.g * 255, c.b * 255];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function mix(a, b, t) {
  const A = new THREE.Color(a);
  const B = new THREE.Color(b);
  return '#' + A.lerp(B, t).getHexString();
}

/** Multiply per-pixel with fbm noise (ink unevenness / paper mottling). */
export function mottle(g, w, h, { seed = 3, scale = 0.01, amount = 0.12, oct = 4, dark = true, tile = false } = {}) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const nz = makeNoise(seed);
  const period = tile ? Math.max(1, Math.round(w * scale)) : 256;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = nz.fbm(x * scale, y * scale, oct, period) - 0.5;
      const k = 1 + v * amount * 2 * (dark ? 1 : -1);
      const i = (y * w + x) * 4;
      d[i] *= k;
      d[i + 1] *= k;
      d[i + 2] *= k;
    }
  }
  g.putImageData(img, 0, 0);
}

/** Per-pixel grain. */
export function grain(g, w, h, amount = 10, seed = 9, mono = true) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += mono ? n : (r() - 0.5) * amount;
    d[i + 2] += mono ? n : (r() - 0.5) * amount;
  }
  g.putImageData(img, 0, 0);
}

/** Paper fibers, specks and faint stains. */
export function paperDetail(g, w, h, { seed = 5, fibers = 900, specks = 300, stains = 3, fiberColor = 'rgba(90,70,40,0.07)', speckColor = 'rgba(40,30,20,0.25)', stainColor = 'rgba(120,85,40,0.06)', tile = false } = {}) {
  const r = rng(seed);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < fibers; i++) {
    const x = r() * w;
    const y = r() * h;
    const len = r.range(3, 18);
    const a = r() * Math.PI * 2;
    g.strokeStyle = fiberColor;
    g.lineWidth = r.range(0.3, 1.1);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.5) * len * 0.5, y + Math.sin(a + 0.5) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  for (let i = 0; i < specks; i++) {
    g.fillStyle = speckColor;
    g.globalAlpha = r.range(0.2, 1);
    const s = r.range(0.4, 1.6);
    g.beginPath();
    g.arc(r() * w, r() * h, s, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < stains; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = r.range(0.08, 0.3) * Math.min(w, h);
    if (tile && (x < rad || y < rad || x > w - rad || y > h - rad)) continue;
    const gr = g.createRadialGradient(x, y, rad * 0.6, x, y, rad);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.85, stainColor);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Darkened, burnt edges (old paper / photo). */
export function edgeBurn(g, w, h, amount = 0.35, color = '60,40,20') {
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  gr.addColorStop(0, `rgba(${color},0)`);
  gr.addColorStop(1, `rgba(${color},${amount})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

/** Halftone dot overlay inside current canvas using luminance of a draw fn. */
export function halftoneDots(g, w, h, { spacing = 6, color = 'rgba(0,0,0,0.25)', angle = 0.4, sizeFn = () => 0.5 } = {}) {
  g.save();
  g.fillStyle = color;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const diag = Math.hypot(w, h);
  for (let v = -diag; v < diag; v += spacing) {
    for (let u = -diag; u < diag; u += spacing) {
      const x = w / 2 + u * ca - v * sa;
      const y = h / 2 + u * sa + v * ca;
      if (x < -spacing || y < -spacing || x > w + spacing || y > h + spacing) continue;
      const s = sizeFn(x / w, y / h);
      if (s <= 0.02) continue;
      g.beginPath();
      g.arc(x, y, (spacing / 2) * s, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

/** Canvas → THREE texture. */
export function toTexture(c, { srgb = true, repeat = false, aniso = 8, mipmaps = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.generateMipmaps = mipmaps;
  if (!mipmaps) t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Smooth closed/open path through points (Catmull-Rom → Bézier). */
export function smoothPath(g, pts, closed = true, tension = 0.5) {
  const n = pts.length;
  if (n < 2) return;
  g.moveTo(pts[0][0], pts[0][1]);
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const t = tension / 3;
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t, p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}

/** Text with letter-spacing (canvas letterSpacing when available). */
export function spacedText(g, text, x, y, spacing = 0, align = 'left') {
  if ('letterSpacing' in g) {
    g.letterSpacing = spacing + 'px';
    const prev = g.textAlign;
    g.textAlign = align;
    g.fillText(text, x, y);
    g.letterSpacing = '0px';
    g.textAlign = prev;
    return;
  }
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = g.textAlign;
  g.textAlign = 'left';
  chars.forEach((ch, i) => {
    g.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  g.textAlign = prev;
}

/** Fake typeset paragraph lines (grey bars) for newspapers / documents. */
export function fakeLines(g, x, y, w, h, { lineH = 7, color = 'rgba(30,25,20,0.55)', seed = 2, justify = true, thickness = 2.2 } = {}) {
  const r = rng(seed);
  g.save();
  g.fillStyle = color;
  for (let yy = y; yy < y + h - lineH * 0.5; yy += lineH) {
    let xx = x;
    const end = justify && r() > 0.12 ? x + w : x + w * r.range(0.4, 0.95);
    while (xx < end) {
      const ww = Math.min(r.range(4, 22), end - xx);
      g.globalAlpha = r.range(0.6, 1);
      g.fillRect(xx, yy, ww, thickness);
      xx += ww + r.range(2, 4);
    }
  }
  g.restore();
}

/** Deterministic torn / deckled edge polygon (percentages for CSS clip-path). */
export function tornClip(seed = 1, { top = true, bottom = true, left = false, right = false, amp = 1.2, steps = 28 } = {}) {
  const r = rng(seed);
  const pts = [];
  const j = () => r() * amp;
  for (let i = 0; i <= steps; i++) pts.push([(i / steps) * 100, top ? j() : 0]);
  for (let i = 1; i <= steps; i++) pts.push([right ? 100 - j() : 100, (i / steps) * 100]);
  for (let i = steps - 1; i >= 0; i--) pts.push([(i / steps) * 100, bottom ? 100 - j() : 100]);
  for (let i = steps - 1; i > 0; i--) pts.push([left ? j() : 0, (i / steps) * 100]);
  return `polygon(${pts.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(',')})`;
}

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
