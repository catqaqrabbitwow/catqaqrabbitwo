import * as THREE from 'three';
import { canvas, rng, makeNoise, toTexture, grain } from '../../art/painter.js';

/**
 * Paper-cut dark-fairytale art for the Black Forest.
 * Rich deep greens / teals / purples, never pure black.
 */

/** Painted ground covering the whole map. pathPts: [[x,z], ...] in world units. */
export function paintGround({ w = 1536, h = 2560, world = { x0: -24, x1: 24, z0: -58, z1: 26 }, path, clearings, stream, seed = 4 }) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const nz = makeNoise(seed);
  const X = (x) => ((x - world.x0) / (world.x1 - world.x0)) * w;
  const Z = (z) => ((z - world.z0) / (world.z1 - world.z0)) * h;
  const ppm = w / (world.x1 - world.x0);
  // base: deep moss with large colour variation
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = nz.fbm(x / 160, y / 160, 4);
      const n2 = nz.fbm(x / 22 + 40, y / 22, 2);
      const i = (y * w + x) * 4;
      const k = 0.7 + n * 0.55 + (n2 - 0.5) * 0.18;
      img.data[i] = (38 + n * 20) * k;
      img.data[i + 1] = (74 + n * 30) * k;
      img.data[i + 2] = (64 + (1 - n) * 26) * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // violet shadow pools
  for (let i = 0; i < 60; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = r.range(40, 160);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(40,24,60,0.35)');
    gr.addColorStop(1, 'rgba(40,24,60,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // dirt path: layered soft strokes
  const strokePath = (width, color, alpha) => {
    g.strokeStyle = color;
    g.globalAlpha = alpha;
    g.lineWidth = width * ppm;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    path.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.stroke();
    g.globalAlpha = 1;
  };
  strokePath(5.2, '#34483a', 0.6);
  strokePath(4.2, '#5a5440', 0.8);
  strokePath(3.2, '#7a664a', 0.85);
  strokePath(2.2, '#8a7454', 0.6);
  for (const [cx, cz, rad] of clearings) {
    const gr = g.createRadialGradient(X(cx), Z(cz), rad * ppm * 0.3, X(cx), Z(cz), rad * ppm);
    gr.addColorStop(0, 'rgba(92,76,56,0.85)');
    gr.addColorStop(0.7, 'rgba(70,62,46,0.6)');
    gr.addColorStop(1, 'rgba(50,56,40,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(X(cx), Z(cz), rad * ppm, 0, Math.PI * 2);
    g.fill();
  }
  // pebbles + fallen leaves along the path
  for (let i = 0; i < 2600; i++) {
    const pi = Math.floor(r() * (path.length - 1));
    const t = r();
    const [ax, az] = path[pi];
    const [bx, bz] = path[pi + 1];
    const x = X(ax + (bx - ax) * t + r.range(-2.4, 2.4));
    const y = Z(az + (bz - az) * t + r.range(-1, 1));
    if (r() < 0.6) {
      g.fillStyle = `rgba(${140 + r() * 40},${120 + r() * 30},${90 + r() * 30},0.5)`;
      g.beginPath();
      g.ellipse(x, y, r.range(1.5, 4), r.range(1, 3), r() * 3, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = r() < 0.5 ? 'rgba(150,70,50,0.55)' : 'rgba(170,120,50,0.5)';
      g.beginPath();
      g.ellipse(x, y, r.range(3, 6), r.range(1.5, 3), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  // grass tufts & tiny flowers everywhere else
  for (let i = 0; i < 9000; i++) {
    const x = r() * w;
    const y = r() * h;
    g.strokeStyle = `rgba(${60 + r() * 50},${100 + r() * 60},${70 + r() * 40},0.45)`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + r.range(-3, 3), y - r.range(4, 9));
    g.stroke();
  }
  for (let i = 0; i < 700; i++) {
    g.fillStyle = r.pick(['rgba(230,220,255,0.8)', 'rgba(180,140,255,0.8)', 'rgba(255,220,150,0.7)', 'rgba(140,230,220,0.7)']);
    g.beginPath();
    g.arc(r() * w, r() * h, r.range(1.2, 2.6), 0, Math.PI * 2);
    g.fill();
  }
  // stream bed
  if (stream) {
    g.strokeStyle = '#162a30';
    g.lineWidth = stream.width * ppm * 1.4;
    g.beginPath();
    stream.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.stroke();
  }
  grain(g, w, h, 10, seed);
  const t = toTexture(c, { mipmaps: true, aniso: 8 });
  return t;
}

/** Tiled detail noise (multiplied in the ground shader for close-up crispness). */
export function detailTexture() {
  const { c, g, w, h } = canvas(256, 256);
  const nz = makeNoise(9);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = nz.fbm(x / 16, y / 16, 3, 16);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 150 + v * 105;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, repeat: true });
}

/** Stylised tree billboard. kind: 'pine' | 'round' | 'dead' | 'willow' */
export function treeTexture(kind = 'round', seed = 1) {
  const W = 512;
  const H = 1024;
  const { c, g } = canvas(W, H);
  const r = rng(seed);
  const ink = '#0b0f14';
  // trunk
  const trunk = () => {
    g.beginPath();
    g.moveTo(W / 2 - 34, H);
    g.bezierCurveTo(W / 2 - 22, H * 0.8, W / 2 - 18, H * 0.6, W / 2 - 10, H * 0.42);
    g.lineTo(W / 2 + 12, H * 0.42);
    g.bezierCurveTo(W / 2 + 20, H * 0.6, W / 2 + 26, H * 0.8, W / 2 + 40, H);
    g.closePath();
    const gr = g.createLinearGradient(W / 2 - 40, 0, W / 2 + 40, 0);
    gr.addColorStop(0, '#4a3a48');
    gr.addColorStop(0.5, '#342836');
    gr.addColorStop(1, '#221a26');
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = ink;
    g.stroke();
    // roots
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(W / 2 + s * 20, H - 40);
      g.quadraticCurveTo(W / 2 + s * 70, H - 20, W / 2 + s * 110, H - 4);
      g.lineTo(W / 2 + s * 30, H);
      g.fillStyle = '#1a1620';
      g.fill();
      g.stroke();
    }
    // moonlit edge
    g.strokeStyle = 'rgba(150,190,230,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(W / 2 - 30, H - 10);
    g.bezierCurveTo(W / 2 - 20, H * 0.8, W / 2 - 16, H * 0.6, W / 2 - 8, H * 0.44);
    g.stroke();
  };
  const blob = (x, y, rad, base, rim) => {
    g.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = rad * (0.8 + r() * 0.3);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.85;
      if (i === 0) g.moveTo(px, py);
      else g.quadraticCurveTo(x + Math.cos(a - 0.35) * rr * 1.2, y + Math.sin(a - 0.35) * rr * 1.0, px, py);
    }
    g.closePath();
    g.fillStyle = base;
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = ink;
    g.stroke();
    // rim light on the upper-left
    g.save();
    g.clip();
    g.strokeStyle = rim;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(x + rad * 0.12, y + rad * 0.12, rad * 0.95, Math.PI * 1.05, Math.PI * 1.55);
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath();
    g.ellipse(x + rad * 0.3, y + rad * 0.45, rad * 0.9, rad * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  if (kind === 'pine') {
    g.fillStyle = '#16121a';
    g.fillRect(W / 2 - 16, H * 0.6, 32, H * 0.4);
    for (let i = 0; i < 6; i++) {
      const y = H * 0.12 + i * 120;
      const hw = 70 + i * 34;
      g.beginPath();
      g.moveTo(W / 2, y - 60);
      g.lineTo(W / 2 + hw, y + 110);
      g.quadraticCurveTo(W / 2, y + 80, W / 2 - hw, y + 110);
      g.closePath();
      g.fillStyle = ['#2c5a56', '#2a5452', '#284e4e', '#264848', '#244244', '#223c40'][i];
      g.fill();
      g.lineWidth = 6;
      g.strokeStyle = ink;
      g.stroke();
      g.strokeStyle = 'rgba(140,200,210,0.35)';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(W / 2 - 4, y - 50);
      g.lineTo(W / 2 - hw * 0.8, y + 96);
      g.stroke();
    }
  } else if (kind === 'dead') {
    trunk();
    g.strokeStyle = '#141018';
    g.lineCap = 'round';
    const branch = (x, y, a, len, wdt, d) => {
      if (d === 0) return;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      g.lineWidth = wdt;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo((x + x2) / 2 + r.range(-20, 20), (y + y2) / 2, x2, y2);
      g.stroke();
      branch(x2, y2, a - r.range(0.2, 0.6), len * 0.72, wdt * 0.65, d - 1);
      branch(x2, y2, a + r.range(0.2, 0.6), len * 0.72, wdt * 0.65, d - 1);
    };
    branch(W / 2, H * 0.45, -Math.PI / 2, 150, 22, 5);
  } else {
    trunk();
    const cols = kind === 'willow' ? ['#46406e', '#524a80', '#5e5490'] : ['#2e5c4e', '#386a52', '#447a5c'];
    const rims = kind === 'willow' ? 'rgba(220,190,255,0.75)' : 'rgba(170,240,210,0.7)';
    const spots = [
      [0.5, 0.33, 150],
      [0.3, 0.42, 110],
      [0.7, 0.42, 110],
      [0.38, 0.22, 110],
      [0.64, 0.24, 110],
      [0.5, 0.13, 100],
      [0.22, 0.3, 80],
      [0.78, 0.3, 80],
    ];
    spots.forEach(([x, y, rad], i) => blob(W * x, H * y, rad, cols[i % cols.length], rims));
    if (kind === 'willow') {
      g.strokeStyle = 'rgba(60,50,90,0.9)';
      g.lineWidth = 4;
      for (let i = 0; i < 30; i++) {
        const x = r.range(W * 0.15, W * 0.85);
        g.beginPath();
        g.moveTo(x, H * 0.4);
        g.quadraticCurveTo(x + r.range(-10, 10), H * 0.55, x + r.range(-16, 16), H * r.range(0.55, 0.72));
        g.stroke();
      }
    }
  }
  return toTexture(c, { mipmaps: true });
}

export function grassBlade() {
  const { c, g } = canvas(128, 128);
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    const x = 20 + r() * 88;
    const hgt = r.range(60, 120);
    const bend = r.range(-18, 18);
    const gr = g.createLinearGradient(0, 128, 0, 128 - hgt);
    gr.addColorStop(0, '#2a4a36');
    gr.addColorStop(0.6, '#4e8a5c');
    gr.addColorStop(1, '#b0e0a0');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x - 5, 128);
    g.quadraticCurveTo(x + bend * 0.4, 128 - hgt * 0.6, x + bend, 128 - hgt);
    g.quadraticCurveTo(x + bend * 0.4 + 3, 128 - hgt * 0.5, x + 5, 128);
    g.closePath();
    g.fill();
  }
  return toTexture(c, { mipmaps: true });
}

export function spriteTexture(draw, w = 256, h = 256) {
  const { c, g } = canvas(w, h);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  draw(g, w, h);
  return toTexture(c, { mipmaps: true });
}

const INK = '#0e0c12';
function stroke(g, w = 5) {
  g.lineWidth = w;
  g.strokeStyle = INK;
  g.stroke();
}

export const SPRITES = {
  mushroom: (hue = 'cyan') =>
    spriteTexture((g, w, h) => {
      const cap = hue === 'cyan' ? ['#7ae8d0', '#2a8a80'] : hue === 'purple' ? ['#d09aff', '#6a3aa0'] : ['#ff9a7a', '#a03a3a'];
      for (const [x, s] of [[w * 0.36, 1], [w * 0.66, 0.7]]) {
        g.beginPath();
        g.moveTo(x - 12 * s, h);
        g.quadraticCurveTo(x - 8 * s, h - 60 * s, x - 6 * s, h - 90 * s);
        g.lineTo(x + 6 * s, h - 90 * s);
        g.quadraticCurveTo(x + 8 * s, h - 60 * s, x + 12 * s, h);
        g.closePath();
        g.fillStyle = '#e8e2d4';
        g.fill();
        stroke(g, 4);
        g.beginPath();
        g.ellipse(x, h - 92 * s, 60 * s, 40 * s, 0, Math.PI, 0);
        g.closePath();
        const gr = g.createLinearGradient(0, h - 132 * s, 0, h - 92 * s);
        gr.addColorStop(0, cap[0]);
        gr.addColorStop(1, cap[1]);
        g.fillStyle = gr;
        g.fill();
        stroke(g, 5);
        g.fillStyle = 'rgba(255,255,255,0.7)';
        for (const [dx, dy, rr] of [[-24, -110, 7], [8, -118, 5], [26, -100, 6]]) {
          g.beginPath();
          g.arc(x + dx * s, h + dy * s, rr * s, 0, Math.PI * 2);
          g.fill();
        }
      }
    }),
  candle: () =>
    spriteTexture((g, w, h) => {
      g.beginPath();
      g.moveTo(w / 2 - 22, h);
      g.lineTo(w / 2 - 20, h - 120);
      g.quadraticCurveTo(w / 2, h - 130, w / 2 + 20, h - 120);
      g.lineTo(w / 2 + 22, h);
      g.closePath();
      g.fillStyle = '#e8dcc0';
      g.fill();
      stroke(g, 5);
      g.fillStyle = 'rgba(230,220,190,0.9)';
      g.beginPath();
      g.moveTo(w / 2 + 10, h - 124);
      g.quadraticCurveTo(w / 2 + 16, h - 90, w / 2 + 12, h - 70);
      g.quadraticCurveTo(w / 2 + 6, h - 90, w / 2 + 4, h - 122);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w / 2, h - 128);
      g.lineTo(w / 2, h - 140);
      g.stroke();
    }, 128, 256),
  flame: () =>
    spriteTexture((g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h * 0.65, 2, w / 2, h * 0.6, w * 0.5);
      gr.addColorStop(0, 'rgba(255,255,230,1)');
      gr.addColorStop(0.25, 'rgba(255,200,110,0.95)');
      gr.addColorStop(0.6, 'rgba(255,120,60,0.4)');
      gr.addColorStop(1, 'rgba(255,80,40,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w / 2, 4);
      g.bezierCurveTo(w * 0.9, h * 0.5, w * 0.9, h, w / 2, h);
      g.bezierCurveTo(w * 0.1, h, w * 0.1, h * 0.5, w / 2, 4);
      g.fill();
    }, 64, 128),
  skull: () =>
    spriteTexture((g, w, h) => {
      g.beginPath();
      g.moveTo(w * 0.2, h * 0.55);
      g.bezierCurveTo(w * 0.15, h * 0.1, w * 0.85, h * 0.1, w * 0.8, h * 0.55);
      g.lineTo(w * 0.72, h * 0.7);
      g.lineTo(w * 0.7, h * 0.88);
      g.lineTo(w * 0.3, h * 0.88);
      g.lineTo(w * 0.28, h * 0.7);
      g.closePath();
      g.fillStyle = '#e4dccc';
      g.fill();
      stroke(g, 6);
      g.fillStyle = INK;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(w / 2 + s * w * 0.14, h * 0.5, w * 0.09, h * 0.1, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.moveTo(w / 2, h * 0.6);
      g.lineTo(w / 2 - 8, h * 0.7);
      g.lineTo(w / 2 + 8, h * 0.7);
      g.fill();
      for (let i = 0; i < 4; i++) g.fillRect(w * 0.36 + i * w * 0.08, h * 0.78, 3, h * 0.08);
    }, 128, 128),
  totem: () =>
    spriteTexture((g, w, h) => {
      g.beginPath();
      g.rect(w * 0.3, h * 0.1, w * 0.4, h * 0.9);
      g.fillStyle = '#3a2a24';
      g.fill();
      stroke(g, 6);
      // carved faces
      for (let i = 0; i < 3; i++) {
        const y = h * (0.22 + i * 0.26);
        g.fillStyle = i === 0 ? '#b03a3a' : '#5a4034';
        g.beginPath();
        g.ellipse(w / 2, y, w * 0.18, h * 0.1, 0, 0, Math.PI * 2);
        g.fill();
        stroke(g, 4);
        g.fillStyle = i === 0 ? '#ffd070' : '#1a1418';
        g.beginPath();
        g.arc(w / 2 - w * 0.07, y - 4, 5, 0, Math.PI * 2);
        g.arc(w / 2 + w * 0.07, y - 4, 5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(w / 2 - 12, y + 12);
        g.lineTo(w / 2 + 12, y + 12);
        g.stroke();
      }
      // top horns
      g.beginPath();
      g.moveTo(w * 0.3, h * 0.12);
      g.quadraticCurveTo(w * 0.1, h * 0.04, w * 0.14, 0);
      g.lineTo(w * 0.36, h * 0.1);
      g.moveTo(w * 0.7, h * 0.12);
      g.quadraticCurveTo(w * 0.9, h * 0.04, w * 0.86, 0);
      g.lineTo(w * 0.64, h * 0.1);
      g.fillStyle = '#e8dcc2';
      g.fill();
      stroke(g, 4);
    }, 128, 384),
  sign: (text, sub) =>
    spriteTexture((g, w, h) => {
      g.fillStyle = '#3a2a22';
      g.fillRect(w / 2 - 8, h * 0.45, 16, h * 0.55);
      g.beginPath();
      g.moveTo(20, 30);
      g.lineTo(w - 50, 26);
      g.lineTo(w - 12, h * 0.25);
      g.lineTo(w - 48, h * 0.46);
      g.lineTo(24, h * 0.42);
      g.closePath();
      g.fillStyle = '#6a4a34';
      g.fill();
      stroke(g, 6);
      g.strokeStyle = 'rgba(30,20,16,0.6)';
      g.lineWidth = 2;
      for (let y = 50; y < h * 0.42; y += 16) {
        g.beginPath();
        g.moveTo(30, y);
        g.lineTo(w - 60, y + 3);
        g.stroke();
      }
      g.fillStyle = '#f0e2c4';
      g.font = '700 38px "Noto Serif TC"';
      g.textAlign = 'center';
      g.fillText(text, w / 2 - 10, h * 0.25);
      g.font = '500 20px "Barlow Condensed"';
      g.fillText(sub, w / 2 - 10, h * 0.36);
    }, 320, 256),
  rune: () =>
    spriteTexture((g, w, h) => {
      g.strokeStyle = 'rgba(255,80,90,1)';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const b = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
        g.beginPath();
        g.moveTo(w / 2 + Math.cos(a) * w * 0.36, h / 2 + Math.sin(a) * h * 0.36);
        g.lineTo(w / 2 + Math.cos(b) * w * 0.36, h / 2 + Math.sin(b) * h * 0.36);
        g.stroke();
      }
      g.font = '600 28px "Barlow Condensed"';
      g.fillStyle = 'rgba(255,120,120,1)';
      g.textAlign = 'center';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.save();
        g.translate(w / 2 + Math.cos(a) * w * 0.4, h / 2 + Math.sin(a) * h * 0.4);
        g.rotate(a + Math.PI / 2);
        g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i], 0, 8);
        g.restore();
      }
    }, 512, 512),
  seed: () =>
    spriteTexture((g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,240,1)');
      gr.addColorStop(0.2, 'rgba(220,240,255,0.95)');
      gr.addColorStop(0.5, 'rgba(150,200,255,0.3)');
      gr.addColorStop(1, 'rgba(120,180,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fffbe8';
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * 0.1, h * 0.14, 0.4, 0, Math.PI * 2);
      g.fill();
    }, 128, 128),
  thorns: () =>
    spriteTexture((g, w, h) => {
      const r = rng(8);
      g.strokeStyle = '#2a1a34';
      g.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        g.lineWidth = r.range(6, 14);
        g.beginPath();
        let x = r() * w;
        let y = h;
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          const nx = x + r.range(-60, 60);
          const ny = y - r.range(40, 90);
          g.quadraticCurveTo(x + r.range(-40, 40), (y + ny) / 2, nx, ny);
          // thorns
          g.moveTo(nx, ny);
          x = nx;
          y = ny;
        }
        g.stroke();
      }
      g.fillStyle = '#b070ff';
      for (let i = 0; i < 40; i++) {
        g.beginPath();
        g.arc(r() * w, r() * h * 0.9, r.range(2, 5), 0, Math.PI * 2);
        g.fill();
      }
    }, 512, 384),
};

/** Ground material: painted map × tiled detail, receives shadows. */
export function groundMaterial(map, detail, repeat = 40) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tDetail = { value: detail };
    sh.uniforms.detailRepeat = { value: repeat };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tDetail;\nuniform float detailRepeat;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= texture2D(tDetail, vMapUv * detailRepeat).r * 1.1;');
  };
  return m;
}

/**
 * Billboard material with wind sway (top of the quad moves) and a
 * screen-door fade used when the camera looks through foreground foliage.
 */
export function swayMaterial(map, { color = 0xffffff, sway = 0.08, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, color, roughness: 1, emissive, emissiveIntensity });
  m.userData.uniforms = { time: { value: 0 }, fade: { value: 1 }, sway: { value: sway } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float time;\nuniform float sway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float hgt = clamp(uv.y, 0.0, 1.0);
         vec4 wp = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float ph = wp.x * 0.37 + wp.z * 0.21;
         transformed.x += sin(time * 1.3 + ph) * sway * hgt * hgt * 3.0;
         transformed.z += cos(time * 1.1 + ph) * sway * hgt * hgt * 1.0;`,
      );
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float fade;').replace(
      '#include <alphatest_fragment>',
      `#include <alphatest_fragment>
       if (fade < 0.999) {
         vec2 p = floor(gl_FragCoord.xy);
         float d = mod(p.x + p.y * 2.0, 4.0) / 4.0 + mod(p.y, 2.0) * 0.125;
         if (d > fade) discard;
       }`,
    );
  };
  m.customProgramCacheKey = () => 'sway';
  return m;
}
