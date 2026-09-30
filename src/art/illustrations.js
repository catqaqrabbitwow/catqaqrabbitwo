import { canvas, rng, mottle, grain, paperDetail, edgeBurn, smoothPath, makeNoise } from './painter.js';

/**
 * Painted illustrations used by loading cards, archive props and the lobby.
 * Everything is original and generated at runtime.
 */

/** Sunset school corridor, photographed. */
export function paintCorridorPhoto(w = 900, h = 620, { sepia = 0.5, seed = 4 } = {}) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  // base wall
  g.fillStyle = '#3d3a44';
  g.fillRect(0, 0, w, h);
  const vx = w * 0.62;
  const vy = h * 0.46;
  // ceiling
  const ceil = g.createLinearGradient(0, 0, 0, vy);
  ceil.addColorStop(0, '#2c2a33');
  ceil.addColorStop(1, '#6d5b58');
  g.fillStyle = ceil;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w, 0);
  g.lineTo(vx + 40, vy - 40);
  g.lineTo(vx - 40, vy - 40);
  g.closePath();
  g.fill();
  // floor
  const fl = g.createLinearGradient(0, vy, 0, h);
  fl.addColorStop(0, '#b0785a');
  fl.addColorStop(0.4, '#6b4a42');
  fl.addColorStop(1, '#2c2428');
  g.fillStyle = fl;
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(w, h);
  g.lineTo(vx + 40, vy + 34);
  g.lineTo(vx - 40, vy + 34);
  g.closePath();
  g.fill();
  // left window wall — bright sunset
  const lw = g.createLinearGradient(0, 0, vx, 0);
  lw.addColorStop(0, '#3a2e33');
  lw.addColorStop(1, '#8a6258');
  g.fillStyle = lw;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(vx - 40, vy - 40);
  g.lineTo(vx - 40, vy + 34);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  // windows along the left wall
  for (let i = 0; i < 7; i++) {
    const t0 = Math.pow(i / 7, 1.6);
    const t1 = Math.pow((i + 0.72) / 7, 1.6);
    const x0 = t0 * (vx - 40);
    const x1 = t1 * (vx - 40);
    const top0 = (vy - 40) * t0 + h * 0.12 * (1 - t0);
    const top1 = (vy - 40) * t1 + h * 0.12 * (1 - t1);
    const bot0 = vy + 34 * t0 + (h * 0.62 - vy) * (1 - t0);
    const bot1 = vy + 34 * t1 + (h * 0.62 - vy) * (1 - t1);
    const wg = g.createLinearGradient(0, top0, 0, bot0);
    wg.addColorStop(0, '#ffd9a0');
    wg.addColorStop(0.55, '#ffb070');
    wg.addColorStop(1, '#f08a58');
    g.fillStyle = wg;
    g.beginPath();
    g.moveTo(x0, top0);
    g.lineTo(x1, top1);
    g.lineTo(x1, bot1);
    g.lineTo(x0, bot0);
    g.closePath();
    g.fill();
    // light patch on the floor
    g.save();
    g.globalCompositeOperation = 'screen';
    g.fillStyle = 'rgba(255,170,110,0.35)';
    g.beginPath();
    const fy0 = h - (h - vy - 34) * t0;
    const fy1 = h - (h - vy - 34) * t1;
    g.moveTo(x0 + 60 * (1 - t0), fy0);
    g.lineTo(x1 + 60 * (1 - t1), fy1);
    g.lineTo(x1 + 260 * (1 - t1), fy1 - 4);
    g.lineTo(x0 + 320 * (1 - t0), fy0 - 10);
    g.closePath();
    g.fill();
    g.restore();
    // mullion
    g.strokeStyle = 'rgba(40,30,35,0.8)';
    g.lineWidth = 3 * (1 - t0) + 1;
    g.beginPath();
    g.moveTo((x0 + x1) / 2, (top0 + top1) / 2);
    g.lineTo((x0 + x1) / 2, (bot0 + bot1) / 2);
    g.stroke();
  }
  // right wall with doors
  const rw = g.createLinearGradient(w, 0, vx, 0);
  rw.addColorStop(0, '#26232b');
  rw.addColorStop(1, '#5a4a4e');
  g.fillStyle = rw;
  g.beginPath();
  g.moveTo(w, 0);
  g.lineTo(vx + 40, vy - 40);
  g.lineTo(vx + 40, vy + 34);
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  for (let i = 0; i < 4; i++) {
    const t0 = Math.pow(i / 4.3, 1.5);
    const t1 = Math.pow((i + 0.45) / 4.3, 1.5);
    const X = (t) => w - t * (w - vx - 40);
    const T = (t) => h * 0.2 * (1 - t) + (vy - 30) * t;
    const B = (t) => h * 0.92 * (1 - t) + (vy + 34) * t;
    g.fillStyle = 'rgba(20,16,20,0.55)';
    g.beginPath();
    g.moveTo(X(t0), T(t0));
    g.lineTo(X(t1), T(t1));
    g.lineTo(X(t1), B(t1));
    g.lineTo(X(t0), B(t0));
    g.closePath();
    g.fill();
  }
  // end window glow
  const eg = g.createRadialGradient(vx, vy, 4, vx, vy, 180);
  eg.addColorStop(0, 'rgba(255,230,180,1)');
  eg.addColorStop(0.3, 'rgba(255,190,120,0.55)');
  eg.addColorStop(1, 'rgba(255,160,100,0)');
  g.fillStyle = eg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff3d8';
  g.fillRect(vx - 40, vy - 40, 80, 74);
  // silhouette of a student far down the hall
  g.fillStyle = '#1c1418';
  const sx = vx - 70;
  const sy = vy + 32;
  g.beginPath();
  g.ellipse(sx, sy - 58, 7, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(sx - 9, sy - 50);
  g.lineTo(sx + 9, sy - 50);
  g.lineTo(sx + 12, sy - 22);
  g.lineTo(sx + 5, sy - 22);
  g.lineTo(sx + 4, sy);
  g.lineTo(sx + 1, sy);
  g.lineTo(sx, sy - 20);
  g.lineTo(sx - 2, sy);
  g.lineTo(sx - 5, sy);
  g.lineTo(sx - 6, sy - 22);
  g.lineTo(sx - 12, sy - 22);
  g.closePath();
  g.fill();
  // long shadow
  g.fillStyle = 'rgba(20,14,18,0.35)';
  g.beginPath();
  g.moveTo(sx - 4, sy);
  g.lineTo(sx + 4, sy);
  g.lineTo(sx + 110, sy + 90);
  g.lineTo(sx + 70, sy + 96);
  g.closePath();
  g.fill();
  // god rays
  g.save();
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const gx = r.range(0.05, 0.5) * w;
    const gr = g.createLinearGradient(gx, 0, gx + 200, h);
    gr.addColorStop(0, 'rgba(255,200,140,0.18)');
    gr.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(gx, h * 0.15);
    g.lineTo(gx + 40, h * 0.15);
    g.lineTo(gx + 340, h);
    g.lineTo(gx + 200, h);
    g.closePath();
    g.fill();
  }
  // dust
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(255,230,190,${r.range(0.1, 0.6)})`;
    g.beginPath();
    g.arc(r() * w * 0.7, r() * h, r.range(0.5, 1.6), 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  toneAndAge(g, w, h, { sepia, seed });
  return c;
}

/** Sepia toning + grain + burnt edges to feel like an old print. */
export function toneAndAge(g, w, h, { sepia = 0.5, seed = 1, contrast = 1.05, burn = 0.45 } = {}) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i];
    const G = d[i + 1];
    const B = d[i + 2];
    const sr = R * 0.393 + G * 0.769 + B * 0.189;
    const sg = R * 0.349 + G * 0.686 + B * 0.168;
    const sb = R * 0.272 + G * 0.534 + B * 0.131;
    d[i] = ((R * (1 - sepia) + sr * sepia) - 128) * contrast + 128;
    d[i + 1] = ((G * (1 - sepia) + sg * sepia) - 128) * contrast + 128;
    d[i + 2] = ((B * (1 - sepia) + sb * sepia) - 128) * contrast + 128;
  }
  g.putImageData(img, 0, 0);
  grain(g, w, h, 26, seed + 3);
  edgeBurn(g, w, h, burn, '40,24,14');
}

/** Storybook forest at night (for the forest loading card and archive book). */
export function paintForestIllustration(w = 900, h = 620, { seed = 12 } = {}) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1b2433');
  sky.addColorStop(0.45, '#2c3a45');
  sky.addColorStop(0.75, '#34454a');
  sky.addColorStop(1, '#141c20');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // moon
  const mx = w * 0.7;
  const my = h * 0.22;
  const mg = g.createRadialGradient(mx, my, 10, mx, my, 220);
  mg.addColorStop(0, 'rgba(240,235,200,0.55)');
  mg.addColorStop(0.3, 'rgba(180,200,190,0.18)');
  mg.addColorStop(1, 'rgba(120,150,160,0)');
  g.fillStyle = mg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#efe8c8';
  g.beginPath();
  g.arc(mx, my, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(180,170,140,0.35)';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(mx + r.range(-28, 28), my + r.range(-28, 28), r.range(4, 10), 0, Math.PI * 2);
    g.fill();
  }
  // layered tree lines
  const layers = [
    { y: 0.55, col: '#2a3a40', hmin: 0.22, hmax: 0.4, n: 18 },
    { y: 0.66, col: '#1d2a30', hmin: 0.3, hmax: 0.52, n: 12 },
    { y: 0.8, col: '#111a1e', hmin: 0.45, hmax: 0.7, n: 8 },
  ];
  for (const L of layers) {
    g.fillStyle = L.col;
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, h * L.y);
    for (let i = 0; i <= L.n; i++) {
      const x = (i / L.n) * w + r.range(-20, 20);
      const th = h * r.range(L.hmin, L.hmax);
      const base = h * L.y + r.range(-10, 10);
      g.lineTo(x - 22, base);
      g.lineTo(x - 10, base - th * 0.6);
      g.lineTo(x - 16, base - th * 0.6);
      g.lineTo(x, base - th);
      g.lineTo(x + 16, base - th * 0.6);
      g.lineTo(x + 10, base - th * 0.6);
      g.lineTo(x + 22, base);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    // mist
    const mist = g.createLinearGradient(0, h * L.y - 40, 0, h * L.y + 30);
    mist.addColorStop(0, 'rgba(120,160,160,0)');
    mist.addColorStop(0.6, 'rgba(120,160,160,0.12)');
    mist.addColorStop(1, 'rgba(120,160,160,0)');
    g.fillStyle = mist;
    g.fillRect(0, h * L.y - 40, w, 70);
  }
  // path
  g.fillStyle = '#26302c';
  g.beginPath();
  g.moveTo(w * 0.36, h);
  g.quadraticCurveTo(w * 0.46, h * 0.82, w * 0.52, h * 0.74);
  g.lineTo(w * 0.55, h * 0.74);
  g.quadraticCurveTo(w * 0.56, h * 0.86, w * 0.7, h);
  g.fill();
  // mushrooms glowing
  for (let i = 0; i < 9; i++) {
    const x = r.range(0.05, 0.95) * w;
    const y = r.range(0.84, 0.97) * h;
    const s = r.range(6, 14);
    const glow = g.createRadialGradient(x, y - s, 1, x, y - s, s * 5);
    glow.addColorStop(0, 'rgba(160,240,200,0.5)');
    glow.addColorStop(1, 'rgba(160,240,200,0)');
    g.fillStyle = glow;
    g.fillRect(x - s * 5, y - s * 6, s * 10, s * 10);
    g.fillStyle = '#d8efe0';
    g.fillRect(x - s * 0.18, y - s, s * 0.36, s);
    g.fillStyle = r() < 0.5 ? '#7fe0c0' : '#c99be8';
    g.beginPath();
    g.ellipse(x, y - s, s * 0.8, s * 0.5, 0, Math.PI, 0);
    g.fill();
  }
  // wanderer with a lantern
  const px = w * 0.53;
  const py = h * 0.86;
  const lg = g.createRadialGradient(px + 22, py - 30, 2, px + 22, py - 30, 120);
  lg.addColorStop(0, 'rgba(255,190,110,0.7)');
  lg.addColorStop(0.3, 'rgba(255,150,80,0.2)');
  lg.addColorStop(1, 'rgba(255,150,80,0)');
  g.fillStyle = lg;
  g.fillRect(px - 120, py - 150, 280, 260);
  g.fillStyle = '#0c0e10';
  g.beginPath();
  g.moveTo(px - 16, py);
  g.quadraticCurveTo(px - 18, py - 30, px - 10, py - 44);
  g.quadraticCurveTo(px, py - 64, px + 10, py - 44);
  g.quadraticCurveTo(px + 18, py - 30, px + 16, py);
  g.closePath();
  g.fill();
  // horns
  g.strokeStyle = '#0c0e10';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px - 6, py - 56);
  g.quadraticCurveTo(px - 16, py - 72, px - 8, py - 78);
  g.moveTo(px + 6, py - 56);
  g.quadraticCurveTo(px + 16, py - 72, px + 8, py - 78);
  g.stroke();
  g.fillStyle = '#ffd08a';
  g.beginPath();
  g.arc(px + 22, py - 30, 5, 0, Math.PI * 2);
  g.fill();
  // eyes in the dark (slimes)
  for (let i = 0; i < 5; i++) {
    const ex = r.range(0.1, 0.9) * w;
    const ey = r.range(0.7, 0.8) * h;
    if (Math.abs(ex - px) < 80) continue;
    g.fillStyle = 'rgba(200,120,255,0.85)';
    g.beginPath();
    g.ellipse(ex, ey, 3, 4, 0, 0, Math.PI * 2);
    g.ellipse(ex + 12, ey, 3, 4, 0, 0, Math.PI * 2);
    g.fill();
  }
  // fireflies
  for (let i = 0; i < 40; i++) {
    const x = r() * w;
    const y = r.range(0.35, 0.95) * h;
    const fg = g.createRadialGradient(x, y, 0, x, y, 8);
    fg.addColorStop(0, 'rgba(230,255,170,0.9)');
    fg.addColorStop(1, 'rgba(230,255,170,0)');
    g.fillStyle = fg;
    g.fillRect(x - 8, y - 8, 16, 16);
  }
  paperDetail(g, w, h, { seed, fibers: 600, specks: 200, stains: 2, fiberColor: 'rgba(255,240,200,0.03)', speckColor: 'rgba(0,0,0,0.3)' });
  grain(g, w, h, 16, seed);
  edgeBurn(g, w, h, 0.5, '5,10,12');
  return c;
}

/** Rainy night city through a window (lobby exterior). */
export function paintRainyCity(w = 1024, h = 1024, { seed = 3 } = {}) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1a2129');
  sky.addColorStop(0.5, '#34414b');
  sky.addColorStop(0.72, '#4a5256');
  sky.addColorStop(1, '#1c2024');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // soft cloud masses
  const nz = makeNoise(seed);
  const img = g.getImageData(0, 0, w, h * 0.7);
  for (let y = 0; y < h * 0.7; y++) {
    for (let x = 0; x < w; x++) {
      const v = nz.fbm(x / 180, y / 90, 5);
      const k = (v - 0.5) * 40;
      const i = (y * w + x) * 4;
      img.data[i] += k;
      img.data[i + 1] += k;
      img.data[i + 2] += k * 1.1;
    }
  }
  g.putImageData(img, 0, 0);
  // clock tower silhouette
  const tx = w * 0.68;
  g.fillStyle = '#20262c';
  g.fillRect(tx - 34, h * 0.24, 68, h);
  g.beginPath();
  g.moveTo(tx - 42, h * 0.24);
  g.lineTo(tx, h * 0.12);
  g.lineTo(tx + 42, h * 0.24);
  g.fill();
  g.fillRect(tx - 2, h * 0.07, 4, h * 0.06);
  const cg = g.createRadialGradient(tx, h * 0.3, 2, tx, h * 0.3, 60);
  cg.addColorStop(0, 'rgba(255,220,160,0.9)');
  cg.addColorStop(0.35, 'rgba(255,200,140,0.35)');
  cg.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = cg;
  g.fillRect(tx - 70, h * 0.3 - 70, 140, 140);
  g.fillStyle = '#f0dcb0';
  g.beginPath();
  g.arc(tx, h * 0.3, 20, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#3a3026';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(tx, h * 0.3);
  g.lineTo(tx + 10, h * 0.3 - 8);
  g.moveTo(tx, h * 0.3);
  g.lineTo(tx - 2, h * 0.3 - 16);
  g.stroke();
  // buildings
  for (let layer = 0; layer < 3; layer++) {
    const base = h * (0.55 + layer * 0.1);
    const col = ['#2b333a', '#22292f', '#171b1f'][layer];
    let x = -20;
    while (x < w) {
      const bw = r.range(60, 160) * (1 + layer * 0.3);
      const bh = r.range(0.12, 0.3) * h * (1 + layer * 0.25);
      g.fillStyle = col;
      g.fillRect(x, base - bh, bw, h);
      if (r() < 0.4) {
        g.beginPath();
        g.moveTo(x, base - bh);
        g.lineTo(x + bw / 2, base - bh - r.range(20, 60));
        g.lineTo(x + bw, base - bh);
        g.fill();
      }
      // lit windows
      for (let wy = base - bh + 14; wy < h; wy += 22 + layer * 6) {
        for (let wx = x + 10; wx < x + bw - 12; wx += 18 + layer * 5) {
          if (r() < 0.22) {
            g.fillStyle = r() < 0.7 ? `rgba(255,${190 + r() * 40},${120 + r() * 40},${0.5 + r() * 0.4})` : 'rgba(170,210,230,0.5)';
            g.fillRect(wx, wy, 6 + layer * 2, 9 + layer * 3);
          }
        }
      }
      x += bw + r.range(-10, 20);
    }
  }
  // street lamps bokeh
  for (let i = 0; i < 70; i++) {
    const x = r() * w;
    const y = r.range(0.62, 0.98) * h;
    const s = r.range(6, 26);
    const warm = r() < 0.75;
    const bg = g.createRadialGradient(x, y, 0, x, y, s);
    bg.addColorStop(0, warm ? 'rgba(255,200,130,0.55)' : 'rgba(160,210,240,0.45)');
    bg.addColorStop(0.7, warm ? 'rgba(255,180,110,0.25)' : 'rgba(150,200,230,0.2)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg;
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fill();
  }
  // red neon sign
  g.save();
  g.globalCompositeOperation = 'screen';
  const nx = w * 0.18;
  const ny = h * 0.7;
  const ng = g.createRadialGradient(nx, ny, 2, nx, ny, 80);
  ng.addColorStop(0, 'rgba(255,90,80,0.7)');
  ng.addColorStop(1, 'rgba(255,60,60,0)');
  g.fillStyle = ng;
  g.fillRect(nx - 80, ny - 80, 160, 160);
  g.restore();
  // mist
  const mist = g.createLinearGradient(0, h * 0.5, 0, h);
  mist.addColorStop(0, 'rgba(90,105,115,0)');
  mist.addColorStop(0.5, 'rgba(90,105,115,0.35)');
  mist.addColorStop(1, 'rgba(40,48,55,0.3)');
  g.fillStyle = mist;
  g.fillRect(0, 0, w, h);
  return c;
}

/** A vintage photograph used on the wall board / props. kind: portrait|tower|sea|forest|school|street */
export function paintPhoto(kind, w = 360, h = 460, seed = 1) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#9a917f');
  bg.addColorStop(1, '#4a443b');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2a2520';
  switch (kind) {
    case 'portrait': {
      g.fillStyle = '#7a7060';
      g.fillRect(0, 0, w, h);
      const lg = g.createRadialGradient(w * 0.4, h * 0.3, 10, w * 0.5, h * 0.4, w);
      lg.addColorStop(0, '#c8bda5');
      lg.addColorStop(1, '#3c362e');
      g.fillStyle = lg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2a241e';
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.36, w * 0.17, h * 0.15, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(w * 0.12, h);
      g.quadraticCurveTo(w * 0.18, h * 0.55, w * 0.5, h * 0.52);
      g.quadraticCurveTo(w * 0.82, h * 0.55, w * 0.88, h);
      g.fill();
      // hat
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.25, w * 0.3, h * 0.035, -0.05, 0, Math.PI * 2);
      g.fill();
      g.fillRect(w * 0.34, h * 0.13, w * 0.32, h * 0.12);
      g.fillStyle = '#b8ab92';
      g.beginPath();
      g.ellipse(w * 0.5, h * 0.4, w * 0.11, h * 0.1, 0, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'tower': {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#d8cfb8');
      sky.addColorStop(1, '#8e8470');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3a342c';
      g.beginPath();
      g.moveTo(w * 0.42, h);
      g.lineTo(w * 0.47, h * 0.18);
      g.lineTo(w * 0.5, h * 0.06);
      g.lineTo(w * 0.53, h * 0.18);
      g.lineTo(w * 0.58, h);
      g.fill();
      for (let i = 0; i < 5; i++) g.fillRect(w * (0.2 + i * 0.14), h * r.range(0.7, 0.8), w * 0.12, h);
      break;
    }
    case 'sea': {
      g.fillStyle = '#c7bea8';
      g.fillRect(0, 0, w, h * 0.5);
      g.fillStyle = '#6e685c';
      g.fillRect(0, h * 0.5, w, h);
      g.strokeStyle = 'rgba(220,210,190,0.4)';
      for (let i = 0; i < 20; i++) {
        g.beginPath();
        const y = h * 0.52 + i * 10;
        g.moveTo(r() * w, y);
        g.lineTo(r() * w, y);
        g.stroke();
      }
      g.fillStyle = '#2a2520';
      g.beginPath();
      g.moveTo(w * 0.3, h * 0.5);
      g.lineTo(w * 0.36, h * 0.44);
      g.lineTo(w * 0.52, h * 0.44);
      g.lineTo(w * 0.58, h * 0.5);
      g.fill();
      g.fillRect(w * 0.44, h * 0.32, 3, h * 0.12);
      break;
    }
    case 'forest':
      return paintForestIllustration(w, h, { seed });
    case 'school':
      return paintCorridorPhoto(w, h, { sepia: 0.85, seed });
    case 'street':
    default: {
      g.fillStyle = '#b5ab96';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#4a4238';
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(w * 0.45, h * 0.45);
      g.lineTo(w * 0.55, h * 0.45);
      g.lineTo(w, h);
      g.fill();
      g.fillStyle = '#2c2721';
      g.fillRect(0, 0, w * 0.3, h * 0.8);
      g.fillRect(w * 0.7, 0, w * 0.3, h * 0.85);
      g.fillRect(w * 0.47, h * 0.5, 8, 30);
      g.beginPath();
      g.arc(w * 0.475 + 4, h * 0.5 - 4, 6, 0, Math.PI * 2);
      g.fill();
      break;
    }
  }
  toneAndAge(g, w, h, { sepia: 0.9, seed, contrast: 1.1, burn: 0.55 });
  return c;
}

/** Hand-drawn style map (for the wall board and archive). */
export function paintMap(w = 700, h = 500, seed = 8) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  g.fillStyle = '#d9c9a2';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.01, amount: 0.12 });
  // coastline
  g.strokeStyle = '#6a5436';
  g.lineWidth = 2;
  const pts = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const rad = 170 + r.range(-40, 50);
    pts.push([w * 0.48 + Math.cos(a) * rad * 1.3, h * 0.5 + Math.sin(a) * rad * 0.9]);
  }
  g.fillStyle = '#cdb98c';
  g.beginPath();
  smoothPath(g, pts, true);
  g.fill();
  g.stroke();
  g.setLineDash([3, 5]);
  g.strokeStyle = 'rgba(106,84,54,0.6)';
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    smoothPath(g, pts.map(([x, y]) => [w * 0.48 + (x - w * 0.48) * (1.08 + k * 0.06), h * 0.5 + (y - h * 0.5) * (1.08 + k * 0.06)]), true);
    g.stroke();
  }
  g.setLineDash([]);
  // grid
  g.strokeStyle = 'rgba(80,60,40,0.18)';
  g.lineWidth = 1;
  for (let x = 0; x < w; x += 50) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y < h; y += 50) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  // route in red
  g.strokeStyle = '#9b2c2c';
  g.lineWidth = 2.5;
  g.setLineDash([8, 6]);
  g.beginPath();
  g.moveTo(w * 0.25, h * 0.7);
  g.bezierCurveTo(w * 0.35, h * 0.3, w * 0.6, h * 0.75, w * 0.72, h * 0.32);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#9b2c2c';
  [[0.25, 0.7], [0.48, 0.52], [0.72, 0.32]].forEach(([x, y]) => {
    g.beginPath();
    g.arc(w * x, h * y, 6, 0, Math.PI * 2);
    g.fill();
  });
  // compass
  const cx = w * 0.86;
  const cy = h * 0.8;
  g.strokeStyle = '#4a3a26';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, 34, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx, cy - 46);
  g.lineTo(cx + 7, cy);
  g.lineTo(cx, cy + 46);
  g.lineTo(cx - 7, cy);
  g.closePath();
  g.stroke();
  g.font = '600 16px "Bodoni Moda", serif';
  g.fillStyle = '#4a3a26';
  g.textAlign = 'center';
  g.fillText('N', cx, cy - 52);
  g.font = 'italic 500 22px "Bodoni Moda", serif';
  g.fillText('Terra Incognita · 1929', w * 0.3, h * 0.12);
  paperDetail(g, w, h, { seed, fibers: 500, specks: 120, stains: 3 });
  edgeBurn(g, w, h, 0.5);
  return c;
}
