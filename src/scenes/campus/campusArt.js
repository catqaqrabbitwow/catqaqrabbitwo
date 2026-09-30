import * as THREE from 'three';
import { canvas, rng, mottle, grain, toTexture, makeNoise, spacedText, fakeLines, paperDetail } from '../../art/painter.js';

/**
 * Painted anime-background textures for Kuremi High at sunset.
 * Warm, soft, slightly chalky — shading does most of the work.
 */

/** Sunset sky with clouds, distant town and trees (used through windows). */
export function sunsetSky(w = 2048, h = 1024, { seed = 3, trees = true, town = true } = {}) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#6d6aa3');
  sky.addColorStop(0.28, '#c98ea6');
  sky.addColorStop(0.52, '#ffb885');
  sky.addColorStop(0.7, '#ffd99a');
  sky.addColorStop(0.8, '#fff0c8');
  sky.addColorStop(1, '#f7c890');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // sun glow
  const sx = w * 0.32;
  const sy = h * 0.74;
  const sg = g.createRadialGradient(sx, sy, 10, sx, sy, h * 0.9);
  sg.addColorStop(0, 'rgba(255,250,225,1)');
  sg.addColorStop(0.06, 'rgba(255,236,190,0.9)');
  sg.addColorStop(0.25, 'rgba(255,190,120,0.35)');
  sg.addColorStop(1, 'rgba(255,170,110,0)');
  g.fillStyle = sg;
  g.fillRect(0, 0, w, h);
  // painted clouds: soft lumpy strokes lit from below
  const nz = makeNoise(seed);
  for (let i = 0; i < 26; i++) {
    const cx = r() * w;
    const cy = r.range(0.08, 0.55) * h;
    const cw = r.range(180, 520);
    const ch = r.range(24, 70);
    for (let k = 0; k < 14; k++) {
      const x = cx + r.range(-cw / 2, cw / 2);
      const y = cy + r.range(-ch / 2, ch / 2) * 0.6;
      const rad = r.range(ch * 0.5, ch * 1.2);
      const cg = g.createRadialGradient(x, y + rad * 0.3, 0, x, y, rad);
      const lit = cy > h * 0.3;
      cg.addColorStop(0, lit ? 'rgba(255,214,170,0.55)' : 'rgba(230,170,190,0.5)');
      cg.addColorStop(0.6, lit ? 'rgba(240,160,140,0.35)' : 'rgba(160,130,170,0.35)');
      cg.addColorStop(1, 'rgba(160,120,160,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(x, y, rad * 1.6, rad, 0, 0, Math.PI * 2);
      g.fill();
    }
    // bright underside edge
    g.strokeStyle = 'rgba(255,240,200,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - cw / 2, cy + ch * 0.3);
    g.quadraticCurveTo(cx, cy + ch * 0.55, cx + cw / 2, cy + ch * 0.25);
    g.stroke();
  }
  void nz;
  if (town) {
    // distant town silhouette, hazy
    g.fillStyle = 'rgba(150,110,130,0.55)';
    let x = 0;
    while (x < w) {
      const bw = r.range(30, 110);
      const bh = r.range(20, 90);
      g.fillRect(x, h * 0.8 - bh, bw, bh + h * 0.2);
      if (r() < 0.2) g.fillRect(x + bw / 2, h * 0.8 - bh - 40, 4, 40);
      x += bw;
    }
    // power lines
    g.strokeStyle = 'rgba(70,50,70,0.55)';
    g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.moveTo(0, h * (0.55 + k * 0.03));
      g.quadraticCurveTo(w / 2, h * (0.62 + k * 0.03), w, h * (0.56 + k * 0.03));
      g.stroke();
    }
    g.fillStyle = 'rgba(70,50,70,0.8)';
    g.fillRect(w * 0.78, h * 0.45, 8, h * 0.55);
    g.fillRect(w * 0.76, h * 0.5, w * 0.04, 5);
  }
  if (trees) {
    // tree silhouettes (backlit, purple-brown with warm rim)
    for (let t = 0; t < 7; t++) {
      const tx = r() * w;
      const ty = h * r.range(0.72, 0.9);
      const tr = r.range(90, 190);
      for (let k = 0; k < 22; k++) {
        const x = tx + r.range(-tr, tr);
        const y = ty - r.range(0, tr * 1.2);
        const rr = r.range(26, 60);
        g.fillStyle = `rgba(${70 + r() * 20},${46 + r() * 16},${62 + r() * 18},0.95)`;
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(255,190,130,0.35)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, y, rr, Math.PI * 1.1, Math.PI * 1.6);
        g.stroke();
      }
      g.fillStyle = 'rgba(60,40,55,1)';
      g.fillRect(tx - 10, ty - 10, 20, h);
    }
  }
  grain(g, w, h, 6, seed);
  const t = toTexture(c, { mipmaps: true });
  return t;
}

/** Plaster wall: cream upper, painted lower wainscot band, soft mottling. */
export function plasterWall(w = 1024, h = 1024, { seed = 2, upper = '#e9dcc6', lower = '#b9c4b4', band = 0.34 } = {}) {
  const { c, g } = canvas(w, h);
  g.fillStyle = upper;
  g.fillRect(0, 0, w, h);
  g.fillStyle = lower;
  g.fillRect(0, h * (1 - band), w, h * band);
  g.fillStyle = 'rgba(90,70,60,0.5)';
  g.fillRect(0, h * (1 - band) - 6, w, 6);
  mottle(g, w, h, { seed, scale: 5 / w, amount: 0.06, tile: true });
  // faint vertical streaks (weathering)
  const r = rng(seed);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(120,100,80,${r.range(0.01, 0.04)})`;
    g.fillRect(r() * w, 0, r.range(2, 10), h);
  }
  grain(g, w, h, 5, seed);
  return toTexture(c, { repeat: true });
}

/** Polished corridor floor: long warm strips with sheen. */
export function schoolFloor(w = 1024, h = 1024, seed = 4, base = [182, 132, 96]) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const nz = makeNoise(seed);
  const img = g.createImageData(w, h);
  const strips = 10;
  const sw = h / strips;
  for (let y = 0; y < h; y++) {
    const si = Math.floor(y / sw);
    const tone = 0.9 + ((si * 37) % 7) * 0.025;
    for (let x = 0; x < w; x++) {
      const v = nz.fbm(x / 220 + si * 7, y / 6, 3, 256);
      let k = tone * (0.86 + v * 0.26);
      if (y % Math.round(sw) < 2) k *= 0.6;
      const i = (y * w + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  void r;
  grain(g, w, h, 5, seed);
  return toTexture(c, { repeat: true });
}

/** Backlit classroom interior seen through corridor windows. */
export function classroomGlimpse(w = 1024, h = 512, seed = 6) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#fff2d0');
  bg.addColorStop(0.55, '#ffd49a');
  bg.addColorStop(1, '#d98a64');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // far windows (brighter)
  for (let i = 0; i < 5; i++) {
    g.fillStyle = 'rgba(255,252,235,0.9)';
    g.fillRect(40 + i * 200, 30, 160, 230);
    g.fillStyle = 'rgba(200,120,90,0.5)';
    g.fillRect(40 + i * 200 + 78, 30, 5, 230);
  }
  // desks & chairs silhouettes
  g.fillStyle = 'rgba(120,70,70,0.75)';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 30 + col * 130 + row * 20 + r.range(-6, 6);
      const y = 320 + row * 60;
      const s = 1 + row * 0.25;
      g.fillRect(x, y, 70 * s, 8 * s);
      g.fillRect(x + 6, y, 5 * s, 60 * s);
      g.fillRect(x + 60 * s, y, 5 * s, 60 * s);
      g.fillRect(x + 80 * s, y - 30 * s, 6 * s, 90 * s);
    }
  }
  // soft bloom
  const gl = g.createRadialGradient(w * 0.3, 120, 10, w * 0.3, 120, 500);
  gl.addColorStop(0, 'rgba(255,255,240,0.6)');
  gl.addColorStop(1, 'rgba(255,255,240,0)');
  g.fillStyle = gl;
  g.fillRect(0, 0, w, h);
  return toTexture(c);
}

/** Poster / notice for bulletin boards. kind selects the layout. */
export function poster(kind, seed = 1, w = 360, h = 500) {
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const pal = [['#f4e8d0', '#c0453a'], ['#e8f0e4', '#2f6a5a'], ['#f6ecd8', '#3a5a9a'], ['#fff4e0', '#d08a2a'], ['#efe6f2', '#7a4a8a']][seed % 5];
  g.fillStyle = pal[0];
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.02, amount: 0.06 });
  g.fillStyle = pal[1];
  const titles = {
    festival: ['校園文化祭', '十月二十五日 · 全校參加'],
    library: ['圖書館閱讀週', '舊館資料室 · 暫停開放'],
    run: ['走廊禁止奔跑', '安全第一 · 生活指導組'],
    lost: ['失物招領', '請至教務處領取'],
    club: ['美術社 招募中', '放學後 · 第二美術教室'],
    clean: ['打掃分配表', '二年B組 · 本週'],
    choir: ['合唱比賽', '十一月三日 · 體育館'],
  };
  const [t1, t2] = titles[kind] || titles.festival;
  g.fillRect(0, 0, w, 90);
  g.fillStyle = pal[0];
  g.font = '700 44px "Noto Serif TC"';
  g.textAlign = 'center';
  g.fillText(t1, w / 2, 62);
  g.fillStyle = '#3a302a';
  g.font = '400 22px "Noto Serif TC"';
  g.fillText(t2, w / 2, 128);
  // illustration block
  g.fillStyle = pal[1];
  g.globalAlpha = 0.25;
  g.fillRect(30, 150, w - 60, 200);
  g.globalAlpha = 1;
  g.strokeStyle = pal[1];
  g.lineWidth = 4;
  if (kind === 'festival' || kind === 'choir') {
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(80 + i * 45, 250 + Math.sin(i) * 30, 18 + r() * 14, 0, Math.PI * 2);
      g.stroke();
    }
  } else if (kind === 'library') {
    for (let i = 0; i < 7; i++) g.strokeRect(60 + i * 34, 190 + (i % 2) * 10, 26, 130 - (i % 2) * 10);
  } else {
    g.beginPath();
    g.moveTo(60, 320);
    g.lineTo(w / 2, 170);
    g.lineTo(w - 60, 320);
    g.closePath();
    g.stroke();
  }
  fakeLines(g, 36, 380, w - 72, 100, { seed, lineH: 16, thickness: 3, color: 'rgba(60,50,40,0.5)' });
  paperDetail(g, w, h, { seed, fibers: 120, specks: 30, stains: 1 });
  return toTexture(c);
}

export function classPlate(text, w = 256, h = 96) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#f2ece0';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3a3230';
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = '#2a2420';
  g.font = '700 52px "Noto Serif TC"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 3);
  return toTexture(c);
}

/** Blackboard with chalk writing. */
export function blackboard(w = 1536, h = 640) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#2f4a3e';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed: 8, scale: 0.004, amount: 0.12 });
  // chalk smudges
  const r = rng(8);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(230,235,225,${r.range(0.02, 0.06)})`;
    g.beginPath();
    g.ellipse(r() * w, r() * h, r.range(60, 220), r.range(20, 60), r.range(-0.3, 0.3), 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = 'rgba(240,242,232,0.85)';
  g.font = '500 54px "Noto Serif TC"';
  g.fillText('十月三十日(三)', 70, 100);
  g.font = '500 44px "Noto Serif TC"';
  g.fillText('值日生:青山 · 早瀨', 70, 170);
  g.fillText('放學後請打掃教室', 70, 240);
  g.strokeStyle = 'rgba(240,242,232,0.8)';
  g.lineWidth = 4;
  g.font = 'italic 500 56px "Cormorant Garamond"';
  g.fillText('∫ sin²x dx = x/2 − sin2x/4 + C', 700, 150);
  g.beginPath();
  g.moveTo(720, 260);
  g.quadraticCurveTo(900, 120, 1100, 380);
  g.stroke();
  g.beginPath();
  g.moveTo(700, 390);
  g.lineTo(1400, 390);
  g.moveTo(720, 400);
  g.lineTo(720, 180);
  g.stroke();
  g.fillStyle = 'rgba(255,200,190,0.8)';
  g.font = '500 40px "Noto Serif TC"';
  g.fillText('※ 舊圖書館資料室 禁止進入', 70, 560);
  g.fillStyle = 'rgba(240,242,232,0.6)';
  g.font = '500 36px "Noto Serif TC"';
  g.fillText('期中考 範圍 p.42–88', 1000, 560);
  return toTexture(c);
}

/** Steel lockers / shoe cabinet texture (one unit per 256px). */
export function lockerTexture(cols = 4, rows = 3, color = '#8fa39a') {
  const cw = 256;
  const ch = 220;
  const { c, g } = canvas(cw * cols, ch * rows);
  g.fillStyle = color;
  g.fillRect(0, 0, cw * cols, ch * rows);
  mottle(g, cw * cols, ch * rows, { seed: 5, scale: 0.01, amount: 0.08 });
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cw;
      const py = y * ch;
      g.strokeStyle = 'rgba(40,50,50,0.6)';
      g.lineWidth = 4;
      g.strokeRect(px + 6, py + 6, cw - 12, ch - 12);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(px + 10, py + 10, cw - 20, 6);
      for (let v = 0; v < 4; v++) {
        g.fillStyle = 'rgba(40,50,50,0.55)';
        g.fillRect(px + 40, py + 40 + v * 14, cw - 80, 5);
      }
      g.fillStyle = '#f2ece0';
      g.fillRect(px + cw / 2 - 40, py + ch - 70, 80, 30);
      g.fillStyle = '#2a2420';
      g.font = '500 22px "IBM Plex Mono"';
      g.textAlign = 'center';
      g.fillText(String(y * cols + x + 1).padStart(2, '0'), px + cw / 2, py + ch - 48);
      g.fillStyle = 'rgba(30,30,30,0.7)';
      g.fillRect(px + cw - 40, py + ch / 2 - 20, 10, 40);
    }
  }
  return toTexture(c);
}

export function timetable(w = 512, h = 400) {
  const { c, g } = canvas(w, h);
  g.fillStyle = '#f5efe2';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2a2420';
  g.font = '700 30px "Noto Serif TC"';
  g.fillText('二年B組 課表', 20, 40);
  const days = ['一', '二', '三', '四', '五'];
  const subj = ['國語', '數學', '英語', '理科', '社會', '體育', '美術', '音樂'];
  const r = rng(3);
  g.font = '400 18px "Noto Serif TC"';
  for (let d = 0; d < 5; d++) {
    g.fillText(days[d], 70 + d * 88, 78);
    for (let p = 0; p < 6; p++) {
      g.strokeStyle = 'rgba(40,30,20,0.4)';
      g.strokeRect(50 + d * 88, 90 + p * 48, 88, 48);
      g.fillText(r.pick(subj), 70 + d * 88, 120 + p * 48);
    }
  }
  return toTexture(c);
}

/** Library shelf books atlas, brighter school palette. */
export function libraryBooks(seed = 9) {
  const w = 1024;
  const h = 256;
  const { c, g } = canvas(w, h);
  const r = rng(seed);
  const cols = ['#7a2a2a', '#2a4a6a', '#3a6a4a', '#8a6a2a', '#5a3a6a', '#2a2a3a', '#c8b08a', '#6a7a8a', '#9a4a3a', '#3a5a5a', '#b88a4a', '#4a4a4a'];
  const n = 20;
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = r.pick(cols);
    g.fillRect(i * bw, 0, bw, h);
    const gr = g.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0.4)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.1)');
    gr.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = gr;
    g.fillRect(i * bw, 0, bw, h);
    g.fillStyle = 'rgba(245,235,210,0.8)';
    g.fillRect(i * bw + 6, h - 50, bw - 12, 24);
    g.fillStyle = '#2a2420';
    g.font = '400 14px "IBM Plex Mono"';
    g.textAlign = 'center';
    g.fillText(`${r.int(100, 999)}`, i * bw + bw / 2, h - 33);
    g.fillStyle = 'rgba(230,210,160,0.7)';
    g.fillRect(i * bw + 5, 30, bw - 10, 3);
    for (let k = 0; k < 4; k++) g.fillRect(i * bw + bw * 0.35, 60 + k * 18, bw * 0.3, 8);
  }
  grain(g, w, h, 8, seed);
  return { texture: toTexture(c), count: n };
}

/** Soft sprite with a small speech / exclamation mark (NPC indicator). */
export function indicatorSprite(kind = 'talk') {
  const { c, g } = canvas(128, 128);
  g.fillStyle = 'rgba(20,16,14,0.75)';
  g.beginPath();
  g.arc(64, 58, 38, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(52, 92);
  g.lineTo(64, 112);
  g.lineTo(76, 92);
  g.fill();
  g.strokeStyle = kind === 'quest' ? '#f2c46a' : '#f3ead4';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(64, 58, 38, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = kind === 'quest' ? '#f2c46a' : '#f3ead4';
  if (kind === 'quest') {
    g.fillRect(60, 34, 8, 30);
    g.beginPath();
    g.arc(64, 76, 5, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'look') {
    g.lineWidth = 4;
    g.strokeStyle = '#f3ead4';
    g.beginPath();
    g.arc(58, 54, 14, 0, Math.PI * 2);
    g.moveTo(68, 64);
    g.lineTo(82, 78);
    g.stroke();
  } else {
    for (const x of [46, 64, 82]) {
      g.beginPath();
      g.arc(x, 58, 5, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function woodTex(seed = 3, base = [150, 100, 64], w = 512, h = 512) {
  const { c, g } = canvas(w, h);
  const nz = makeNoise(seed);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = nz.fbm(x / 5, y / 120, 3, 256);
      const k = 0.78 + v * 0.4;
      const i = (y * w + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { repeat: true });
}

export function curtainTex() {
  const { c, g } = canvas(256, 512);
  const gr = g.createLinearGradient(0, 0, 256, 0);
  for (let i = 0; i <= 8; i++) {
    gr.addColorStop(i / 8, i % 2 ? '#f3e7cf' : '#d8c6a4');
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 512);
  mottle(g, 256, 512, { seed: 3, scale: 0.02, amount: 0.05 });
  return toTexture(c);
}

export function noteCover() {
  const { c, g } = canvas(256, 340);
  g.fillStyle = '#3a5a8a';
  g.fillRect(0, 0, 256, 340);
  g.fillStyle = '#f2ece0';
  g.fillRect(30, 60, 196, 70);
  g.fillStyle = '#2a2420';
  g.font = '700 26px "Noto Serif TC"';
  g.fillText('青山 雪', 50, 105);
  g.font = '400 16px "Noto Serif TC"';
  g.fillText('二年B組 · 筆記', 50, 124);
  spacedText(g, 'NOTEBOOK', 50, 300, 4);
  return toTexture(c);
}
