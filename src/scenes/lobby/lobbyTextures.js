import * as THREE from 'three';
import { canvas, rng, mottle, grain, paperDetail, toTexture, makeNoise, fakeLines, edgeBurn, spacedText } from '../../art/painter.js';

/** Procedural textures for the archive room. */

export function woodFloor(w = 1024, h = 1024, seed = 2) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const nz = makeNoise(seed);
  const planks = 8;
  const pw = w / planks;
  const img = g.createImageData(w, h);
  const d = img.data;
  const base = [[74, 46, 30], [82, 52, 33], [66, 41, 27], [88, 57, 36]];
  const offs = Array.from({ length: planks }, () => r() * h);
  const tones = Array.from({ length: planks * 4 }, () => base[Math.floor(r() * base.length)]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = Math.floor(x / pw);
      const seg = Math.floor(((y + offs[p]) % h) / (h / 2));
      const tone = tones[p * 4 + seg];
      const lx = x - p * pw;
      const grainV = nz.fbm(lx / 4 + p * 13.1, (y + offs[p]) / 90, 3, 256);
      const ring = Math.sin((lx / pw) * 6 + grainV * 12) * 0.5 + 0.5;
      let k = 0.8 + grainV * 0.35 + ring * 0.08;
      if (lx < 1.5 || ((y + offs[p]) % (h / 2)) < 2) k *= 0.45;
      const i = (y * w + x) * 4;
      d[i] = tone[0] * k;
      d[i + 1] = tone[1] * k;
      d[i + 2] = tone[2] * k;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  grain(g, w, h, 6, seed);
  const t = toTexture(c, { repeat: true });
  t.repeat.set(3, 3);
  return t;
}

export function wallpaper(w = 512, h = 512, seed = 5) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#2e3432';
  g.fillRect(0, 0, w, h);
  // damask-ish repeating ornament
  g.strokeStyle = 'rgba(160,150,120,0.16)';
  g.fillStyle = 'rgba(160,150,120,0.08)';
  g.lineWidth = 2;
  const cell = 128;
  for (let y = -cell; y < h + cell; y += cell) {
    for (let x = -cell; x < w + cell; x += cell) {
      const ox = (y / cell) % 2 ? cell / 2 : 0;
      const cx = x + ox + cell / 2;
      const cy = y + cell / 2;
      g.beginPath();
      g.moveTo(cx, cy - 46);
      g.bezierCurveTo(cx + 34, cy - 30, cx + 30, cy + 10, cx, cy + 46);
      g.bezierCurveTo(cx - 30, cy + 10, cx - 34, cy - 30, cx, cy - 46);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(cx, cy - 20);
      g.lineTo(cx + 10, cy);
      g.lineTo(cx, cy + 20);
      g.lineTo(cx - 10, cy);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.arc(cx, cy - 58, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  // vertical pinstripes
  g.fillStyle = 'rgba(200,180,140,0.05)';
  for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
  mottle(g, w, h, { seed, scale: 6 / 512, amount: 0.18, tile: true });
  grain(g, w, h, 8, seed);
  const t = toTexture(c, { repeat: true });
  return t;
}

export function panelWood(w = 512, h = 512, seed = 9) {
  const { c, g } = canvas(w, h);
  const nz = makeNoise(seed);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = nz.fbm(x / 6, y / 160, 3, 256);
      const k = 0.7 + v * 0.5;
      const i = (y * w + x) * 4;
      img.data[i] = 58 * k;
      img.data[i + 1] = 36 * k;
      img.data[i + 2] = 24 * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = toTexture(c, { repeat: true });
  return t;
}

export function rugTexture(w = 1024, h = 700, seed = 3) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#5c1f24';
  g.fillRect(0, 0, w, h);
  const bands = [
    [18, '#2a1a18'],
    [40, '#b08d4e'],
    [48, '#2a1a18'],
    [90, '#6e2a2c'],
    [96, '#c9a45c'],
  ];
  for (const [inset, color] of bands) {
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  }
  // central medallion
  g.save();
  g.translate(w / 2, h / 2);
  for (let i = 0; i < 16; i++) {
    g.rotate(Math.PI / 8);
    g.fillStyle = i % 2 ? '#b08d4e' : '#2a1a18';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(26, 150);
    g.lineTo(0, 190);
    g.lineTo(-26, 150);
    g.closePath();
    g.globalAlpha = 0.7;
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = '#6e2a2c';
  g.beginPath();
  g.arc(0, 0, 70, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#c9a45c';
  g.lineWidth = 3;
  g.stroke();
  g.restore();
  // corner motifs
  for (const [x, y] of [[140, 140], [w - 140, 140], [140, h - 140], [w - 140, h - 140]]) {
    g.fillStyle = '#2a1a18';
    g.beginPath();
    g.moveTo(x, y - 30);
    g.lineTo(x + 30, y);
    g.lineTo(x, y + 30);
    g.lineTo(x - 30, y);
    g.fill();
  }
  mottle(g, w, h, { seed, scale: 0.02, amount: 0.25 });
  grain(g, w, h, 20, seed);
  return toTexture(c);
}

export function leatherTexture(color = '#2d4a3a', w = 512, h = 512, seed = 11) {
  const { c, g } = canvas(w, h);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.03, amount: 0.22, oct: 5 });
  grain(g, w, h, 14, seed);
  g.strokeStyle = 'rgba(200,170,100,0.4)';
  g.lineWidth = 3;
  g.strokeRect(14, 14, w - 28, h - 28);
  return toTexture(c);
}

/** Row of book spines for shelves (atlas: 8 columns of spines). */
export function bookSpines(seed = 4) {
  const w = 1024;
  const h = 256;
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const cols = ['#5a1f24', '#233a33', '#2b2a3f', '#6b4a2c', '#3a3530', '#7a6a4a', '#1f2526', '#4a2a3a', '#8a7a5a', '#2e4050'];
  const n = 16;
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const col = r.pick(cols);
    g.fillStyle = col;
    g.fillRect(i * bw, 0, bw, h);
    const gr = g.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0.45)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.08)');
    gr.addColorStop(0.7, 'rgba(0,0,0,0.05)');
    gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = gr;
    g.fillRect(i * bw, 0, bw, h);
    g.fillStyle = 'rgba(210,180,110,0.75)';
    const bands = r.int(1, 3);
    for (let b = 0; b < bands; b++) g.fillRect(i * bw + 4, 20 + b * 12 + (r() < 0.5 ? 0 : h - 60), bw - 8, 3);
    g.fillStyle = 'rgba(40,30,20,0.6)';
    g.fillRect(i * bw + bw * 0.2, h * 0.35, bw * 0.6, h * 0.25);
    g.fillStyle = 'rgba(210,180,110,0.6)';
    for (let k = 0; k < 5; k++) g.fillRect(i * bw + bw * 0.3, h * 0.38 + k * 10, bw * 0.4, 2);
  }
  grain(g, w, h, 10, seed);
  const t = toTexture(c);
  return { texture: t, count: n };
}

/** Newspaper clipping with headline. */
export function clipping(headline, sub, w = 420, h = 560, seed = 1, lang = 'en') {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#ddd2b6';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.012, amount: 0.12 });
  g.fillStyle = '#231e18';
  g.font = lang === 'zh' ? '700 46px "Noto Serif TC", serif' : '700 44px "Bodoni Moda", serif';
  g.textAlign = 'center';
  const lines = headline.split('\n');
  lines.forEach((l, i) => g.fillText(l, w / 2, 70 + i * 50));
  let y = 70 + lines.length * 50 - 20;
  g.fillRect(24, y, w - 48, 2);
  g.font = 'italic 500 20px "Cormorant Garamond", serif';
  g.fillText(sub, w / 2, y + 30);
  y += 48;
  // photo block
  g.fillStyle = '#6a6254';
  g.fillRect(24, y, w - 48, 150);
  const pr = rng(seed);
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(20,16,12,${pr() * 0.4})`;
    g.fillRect(24 + pr() * (w - 48), y + pr() * 150, 2, 2);
  }
  g.fillStyle = '#2a241c';
  g.beginPath();
  g.moveTo(24, y + 150);
  g.lineTo(24 + (w - 48) * 0.3, y + 60);
  g.lineTo(24 + (w - 48) * 0.5, y + 110);
  g.lineTo(24 + (w - 48) * 0.7, y + 40);
  g.lineTo(w - 24, y + 150);
  g.fill();
  y += 166;
  const colW = (w - 60) / 2;
  fakeLines(g, 24, y, colW, h - y - 20, { seed, lineH: 11, thickness: 3 });
  fakeLines(g, 36 + colW, y, colW, h - y - 20, { seed: seed + 1, lineH: 11, thickness: 3 });
  paperDetail(g, w, h, { seed, fibers: 200, specks: 60, stains: 2 });
  edgeBurn(g, w, h, 0.35);
  return c;
}

/** Letter / document with handwriting-like lines. */
export function letterSheet(w = 400, h = 520, seed = 1, { title = '', ink = '#2a3b5a' } = {}) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#ece3cc';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.01, amount: 0.1 });
  g.strokeStyle = 'rgba(120,100,70,0.22)';
  g.lineWidth = 1;
  for (let y = 90; y < h - 30; y += 26) {
    g.beginPath();
    g.moveTo(30, y);
    g.lineTo(w - 30, y);
    g.stroke();
  }
  const r = rng(seed);
  g.strokeStyle = ink;
  g.lineWidth = 1.6;
  for (let y = 84; y < h - 60; y += 26) {
    let x = 36 + (y === 84 ? 40 : 0);
    const end = w - 40 - (r() < 0.2 ? r() * 150 : 0);
    g.beginPath();
    g.moveTo(x, y);
    while (x < end) {
      const nx = x + r.range(4, 9);
      g.quadraticCurveTo((x + nx) / 2, y - r.range(2, 8), nx, y + r.range(-1, 1));
      x = nx;
      if (r() < 0.12) {
        x += r.range(6, 12);
        g.moveTo(x, y);
      }
    }
    g.stroke();
  }
  if (title) {
    g.fillStyle = ink;
    g.font = 'italic 500 30px "Cormorant Garamond", serif';
    g.fillText(title, 36, 56);
  }
  paperDetail(g, w, h, { seed, fibers: 200, specks: 40, stains: 1 });
  return c;
}

/** Label card (cabinet drawers etc). */
export function labelCard(text, w = 256, h = 96, { font = '600 48px "Barlow Condensed"', bg = '#e6dcc2', ink = '#2a241c' } = {}) {
  const { c, g } = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed: text.length, scale: 0.05, amount: 0.12 });
  g.fillStyle = ink;
  g.font = font;
  g.textBaseline = 'middle';
  spacedText(g, text, w / 2, h / 2 + 2, 6, 'center');
  g.strokeStyle = 'rgba(40,30,20,0.5)';
  g.strokeRect(4, 4, w - 8, h - 8);
  return c;
}

/** Clock face with roman numerals. */
export function clockFace(size = 512) {
  const { c, g } = canvas(size, size);
  const cx = size / 2;
  g.fillStyle = '#e8dcc0';
  g.beginPath();
  g.arc(cx, cx, cx - 2, 0, Math.PI * 2);
  g.fill();
  mottle(g, size, size, { seed: 3, scale: 0.02, amount: 0.12 });
  g.strokeStyle = '#2a241c';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cx, cx * 0.92, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cx, cx * 0.7, 0, Math.PI * 2);
  g.stroke();
  const rom = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  g.fillStyle = '#2a241c';
  g.font = '600 44px "Bodoni Moda", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.save();
    g.translate(cx + Math.cos(a) * cx * 0.8, cx + Math.sin(a) * cx * 0.8);
    g.rotate(a + Math.PI / 2);
    g.fillText(rom[i], 0, 0);
    g.restore();
  }
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = cx * (i % 5 === 0 ? 0.86 : 0.89);
    g.lineWidth = i % 5 === 0 ? 3 : 1;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * cx * 0.92, cx + Math.sin(a) * cx * 0.92);
    g.stroke();
  }
  g.font = 'italic 500 22px "Cormorant Garamond", serif';
  g.fillText('Chrono & Fils', cx, cx + cx * 0.35);
  edgeBurn(g, size, size, 0.4);
  return toTexture(c);
}

/** Vinyl record label + grooves. */
export function recordTexture(size = 512) {
  const { c, g } = canvas(size, size);
  const cx = size / 2;
  g.fillStyle = '#0d0c0c';
  g.beginPath();
  g.arc(cx, cx, cx, 0, Math.PI * 2);
  g.fill();
  for (let r = cx * 0.36; r < cx * 0.98; r += 2) {
    g.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cx, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = '#7b2530';
  g.beginPath();
  g.arc(cx, cx, cx * 0.32, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e8d8b0';
  g.font = '600 26px "Barlow Condensed"';
  g.textAlign = 'center';
  g.fillText('CHRONO RECORDS', cx, cx - 40);
  g.font = 'italic 500 22px "Cormorant Garamond"';
  g.fillText('Nocturne in Rain', cx, cx + 50);
  g.fillStyle = '#0d0c0c';
  g.beginPath();
  g.arc(cx, cx, 8, 0, Math.PI * 2);
  g.fill();
  return toTexture(c);
}

/** Old TV screen: static + test card; returns canvas for live updates. */
export function tvCanvas() {
  return canvas(256, 192);
}

export function drawTV(tv, t) {
  const { g, w, h } = tv;
  const img = g.createImageData(w, h);
  const d = img.data;
  const roll = (t * 40) % h;
  for (let y = 0; y < h; y++) {
    const band = Math.abs(y - roll) < 12 ? 40 : 0;
    for (let x = 0; x < w; x++) {
      const v = Math.random() * 150 + band;
      const i = (y * w + x) * 4;
      d[i] = v * 0.8;
      d[i + 1] = v * 0.9;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // faint test card
  g.globalAlpha = 0.35;
  g.strokeStyle = '#e8e4d8';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(w / 2, h / 2, 50, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(w / 2 - 70, h / 2);
  g.lineTo(w / 2 + 70, h / 2);
  g.moveTo(w / 2, h / 2 - 60);
  g.lineTo(w / 2, h / 2 + 60);
  g.stroke();
  g.font = '600 18px "Barlow Condensed"';
  g.fillStyle = '#e8e4d8';
  g.textAlign = 'center';
  g.fillText('NO SIGNAL · 1929', w / 2, h - 18);
  g.globalAlpha = 1;
}

export function paperTex(seed = 1, color = '#e6dcc4') {
  const { c, g, w, h } = canvas(256, 256);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.03, amount: 0.12 });
  paperDetail(g, w, h, { seed, fibers: 200, specks: 40, stains: 1 });
  return toTexture(c);
}

export function corkTexture(w = 512, h = 512, seed = 21) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#8a6a44';
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.35)' : 'rgba(200,160,110,0.3)';
    g.fillRect(r() * w, r() * h, r.range(1, 3), r.range(1, 3));
  }
  mottle(g, w, h, { seed, scale: 0.02, amount: 0.2 });
  const t = toTexture(c, { repeat: true });
  return t;
}

/** Soft radial sprite for glows / dust. */
export function glowSprite(size = 64, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const { c, g } = canvas(size, size);
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** Vertical gradient used for light shafts. */
export function shaftTexture() {
  const { c, g } = canvas(64, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 256);
  const g2 = g.createLinearGradient(0, 0, 64, 0);
  g2.addColorStop(0, 'rgba(0,0,0,1)');
  g2.addColorStop(0.25, 'rgba(0,0,0,0)');
  g2.addColorStop(0.75, 'rgba(0,0,0,0)');
  g2.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = g2;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}
