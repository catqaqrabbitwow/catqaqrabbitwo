import * as THREE from 'three';
import { rng } from '../painter.js';

/**
 * Procedural anime-style humanoid painter. Produces PaperRig part definitions.
 * Character space: pixels, origin between the feet, y up (≈750px tall at S=1).
 *
 * cfg = {
 *   seed, S (resolution multiplier), gender:'f'|'m',
 *   skin, hair:{ style, color }, eyes:{ color },
 *   outfit:{ type:'sailor'|'blazer'|'gakuran'|'teacher'|'cardigan'|'coat', main, accent, bottom, socks, shoes },
 *   glasses, hat, umbrella, bag
 * }
 */

const col = (c) => new THREE.Color(c);
const hex = (c) => '#' + c.getHexString();
export const shade = (c, k) => hex(col(c).lerp(new THREE.Color(0x1a1420), k));
export const tintC = (c, k) => hex(col(c).lerp(new THREE.Color(0xfff6e8), k));
const cool = (c, k) => hex(col(c).lerp(new THREE.Color(0x2c3050), k));

const INK = '#2a1e1e';

function stroke(g, w = 2.4, c = INK) {
  g.lineWidth = w;
  g.strokeStyle = c;
  g.stroke();
}

/** Fill the current path with a vertical gradient + stroke. */
function fillShaded(g, top, bottom, y0, y1, lw = 2.4) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fill();
  if (lw) stroke(g, lw);
}

/** Cool shadow on one side of the current clip (cel-like). */
function sideShade(g, w, h, color, fromLeft = true, width = 0.38, alpha = 0.35) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath();
  if (fromLeft) {
    g.moveTo(0, 0);
    g.lineTo(w * width, 0);
    g.quadraticCurveTo(w * (width - 0.12), h * 0.5, w * width, h);
    g.lineTo(0, h);
  } else {
    g.moveTo(w, 0);
    g.lineTo(w * (1 - width), 0);
    g.quadraticCurveTo(w * (1 - width + 0.12), h * 0.5, w * (1 - width), h);
    g.lineTo(w, h);
  }
  g.closePath();
  g.fill();
  g.restore();
}

// ─────────────────────────────── face ───────────────────────────────

function drawEye(g, cx, cy, iris, state, flip = 1, lashes = true) {
  g.save();
  if (state === 'closed') {
    g.beginPath();
    g.moveTo(cx - 14 * flip, cy + 1);
    g.quadraticCurveTo(cx, cy + 8, cx + 14 * flip, cy + 1);
    stroke(g, 3.2);
    if (lashes) {
      g.beginPath();
      g.moveTo(cx + 13 * flip, cy + 1.5);
      g.lineTo(cx + 18 * flip, cy - 1);
      stroke(g, 2);
    }
    g.restore();
    return;
  }
  const lidTop = state === 'half' ? cy - 2 : cy - 12;
  // eye white shape
  g.beginPath();
  g.moveTo(cx - 14 * flip, cy - 5);
  g.quadraticCurveTo(cx - 2 * flip, lidTop - 3, cx + 14 * flip, lidTop + 2);
  g.quadraticCurveTo(cx + 15 * flip, cy + 8, cx + 6 * flip, cy + 12);
  g.quadraticCurveTo(cx - 6 * flip, cy + 13, cx - 13 * flip, cy + 5);
  g.closePath();
  g.fillStyle = '#fbf6f0';
  g.fill();
  g.save();
  g.clip();
  // iris
  const ig = g.createLinearGradient(0, cy - 12, 0, cy + 14);
  ig.addColorStop(0, shade(iris, 0.75));
  ig.addColorStop(0.45, iris);
  ig.addColorStop(1, tintC(iris, 0.45));
  g.fillStyle = ig;
  g.beginPath();
  g.ellipse(cx + 1 * flip, cy + 2, 9.5, 12.5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = shade(iris, 0.8);
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = shade(iris, 0.85);
  g.beginPath();
  g.ellipse(cx + 1 * flip, cy + 1, 4.6, 6.5, 0, 0, Math.PI * 2);
  g.fill();
  // lid shadow
  g.fillStyle = 'rgba(60,40,60,0.35)';
  g.fillRect(cx - 20, lidTop - 10, 40, 10);
  // highlights
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(cx - 3.5 * flip, cy - 3, 3.6, 3.2, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(cx + 4.5 * flip, cy + 6.5, 1.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // upper lid line
  g.beginPath();
  g.moveTo(cx - 15 * flip, cy - 4);
  g.quadraticCurveTo(cx - 2 * flip, lidTop - 4, cx + 15 * flip, lidTop + 2);
  stroke(g, 3.6);
  if (lashes) {
    g.beginPath();
    g.moveTo(cx + 14 * flip, lidTop + 2);
    g.lineTo(cx + 19 * flip, lidTop - 2);
    g.moveTo(cx + 12 * flip, lidTop);
    g.lineTo(cx + 16 * flip, lidTop - 5);
    stroke(g, 1.8);
  }
  // lower lash
  g.beginPath();
  g.moveTo(cx - 6 * flip, cy + 12.5);
  g.quadraticCurveTo(cx + 2 * flip, cy + 13.5, cx + 8 * flip, cy + 11);
  stroke(g, 1.1, 'rgba(42,30,30,0.7)');
  g.restore();
}

function eyesPart(cfg, S) {
  const iris = cfg.eyes?.color || '#6b4a3a';
  const brow = shade(cfg.hair.color, 0.45);
  const draw = (state) => (g) => {
    g.scale(S, S);
    const L = 55 - 22;
    const R = 55 + 22;
    const y = 27;
    drawEye(g, L, y, iris, state, -1, cfg.gender === 'f');
    drawEye(g, R, y, iris, state, 1, cfg.gender === 'f');
    // brows
    g.lineCap = 'round';
    const by = cfg.stern ? 8 : 6;
    g.beginPath();
    g.moveTo(L - 12, by + 3);
    g.quadraticCurveTo(L - 2, by - (cfg.stern ? 0 : 2), L + 10, by + (cfg.stern ? 4 : 1));
    g.moveTo(R + 12, by + 3);
    g.quadraticCurveTo(R + 2, by - (cfg.stern ? 0 : 2), R - 10, by + (cfg.stern ? 4 : 1));
    stroke(g, cfg.gender === 'm' ? 2.6 : 1.8, brow);
    if (cfg.glasses) {
      g.lineWidth = 2;
      g.strokeStyle = cfg.glassesColor || '#3a2c2a';
      g.beginPath();
      g.roundRect ? g.roundRect(L - 17, y - 14, 34, 28, 7) : g.rect(L - 17, y - 14, 34, 28);
      g.moveTo(R + 17, y);
      g.roundRect ? g.roundRect(R - 17, y - 14, 34, 28, 7) : g.rect(R - 17, y - 14, 34, 28);
      g.moveTo(L + 17, y - 2);
      g.quadraticCurveTo(55, y - 6, R - 17, y - 2);
      g.stroke();
      g.fillStyle = 'rgba(200,230,255,0.18)';
      g.fillRect(L - 15, y - 12, 10, 24);
      g.fillRect(R - 15, y - 12, 10, 24);
    }
  };
  return {
    name: 'eyes',
    parent: 'head',
    w: 110 * S,
    h: 48 * S,
    pivot: [55 * S, 27 * S],
    joint: [0, 650],
    layer: 6.4,
    shadow: false,
    frames: { open: draw('open'), half: draw('half'), closed: draw('closed') },
    defaultFrame: 'open',
  };
}

function mouthPart(cfg, S) {
  const lip = '#8a3a3a';
  return {
    name: 'mouth',
    parent: 'head',
    w: 40 * S,
    h: 24 * S,
    pivot: [20 * S, 10 * S],
    joint: [0, 620],
    layer: 6.4,
    shadow: false,
    defaultFrame: cfg.smile ? 'smile' : 'closed',
    frames: {
      closed: (g) => {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(14, 10);
        g.quadraticCurveTo(20, cfg.stern ? 10 : 12, 26, 10);
        stroke(g, 1.8, INK);
      },
      smile: (g) => {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(12, 8);
        g.quadraticCurveTo(20, 15, 28, 8);
        stroke(g, 1.8, INK);
      },
      open: (g) => {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(14, 7);
        g.quadraticCurveTo(20, 6, 26, 7);
        g.quadraticCurveTo(25, 17, 20, 17);
        g.quadraticCurveTo(15, 17, 14, 7);
        g.fillStyle = '#5a1f22';
        g.fill();
        stroke(g, 1.6, INK);
        g.fillStyle = '#c86a6a';
        g.beginPath();
        g.ellipse(20, 14.5, 3.5, 2, 0, 0, Math.PI * 2);
        g.fill();
        void lip;
      },
      o: (g) => {
        g.scale(S, S);
        g.beginPath();
        g.ellipse(20, 11, 3.6, 4.6, 0, 0, Math.PI * 2);
        g.fillStyle = '#5a1f22';
        g.fill();
        stroke(g, 1.5, INK);
      },
    },
  };
}

function headPart(cfg, S) {
  const skin = cfg.skin || '#f4dcc8';
  return {
    name: 'head',
    parent: 'torso',
    w: 150 * S,
    h: 172 * S,
    pivot: [75 * S, 152 * S],
    joint: [0, 590],
    layer: 6,
    draw(g) {
      g.scale(S, S);
      // neck
      g.beginPath();
      g.moveTo(61, 118);
      g.lineTo(61, 168);
      g.lineTo(89, 168);
      g.lineTo(89, 118);
      g.closePath();
      fillShaded(g, shade(skin, 0.28), shade(skin, 0.12), 118, 168, 2);
      // face
      g.beginPath();
      g.moveTo(30, 44);
      g.bezierCurveTo(26, 78, 28, 96, 40, 116);
      g.bezierCurveTo(52, 132, 64, 140, 75, 141);
      g.bezierCurveTo(86, 140, 98, 132, 110, 116);
      g.bezierCurveTo(122, 96, 124, 78, 120, 44);
      g.bezierCurveTo(112, 14, 38, 14, 30, 44);
      g.closePath();
      const fg = g.createLinearGradient(0, 30, 0, 140);
      fg.addColorStop(0, tintC(skin, 0.15));
      fg.addColorStop(1, skin);
      g.fillStyle = fg;
      g.fill();
      g.save();
      g.clip();
      // cool side shading (backlit characters)
      g.fillStyle = cool(skin, 0.25);
      g.globalAlpha = 0.45;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(44, 0);
      g.quadraticCurveTo(34, 90, 64, 150);
      g.lineTo(0, 150);
      g.fill();
      g.globalAlpha = 1;
      // blush
      const bl = (x) => {
        const b = g.createRadialGradient(x, 104, 1, x, 104, 14);
        b.addColorStop(0, 'rgba(236,120,120,0.35)');
        b.addColorStop(1, 'rgba(236,120,120,0)');
        g.fillStyle = b;
        g.fillRect(x - 16, 88, 32, 32);
      };
      bl(46);
      bl(104);
      // chin-to-neck shadow
      g.restore();
      stroke(g, 2.4);
      // nose
      g.beginPath();
      g.moveTo(78, 108);
      g.lineTo(75, 116);
      stroke(g, 1.4, 'rgba(120,70,60,0.8)');
      if (cfg.hat === 'fedora') {
        // shadow of hat brim across the forehead
        g.fillStyle = 'rgba(40,30,40,0.28)';
        g.beginPath();
        g.moveTo(28, 40);
        g.quadraticCurveTo(75, 64, 122, 40);
        g.lineTo(122, 20);
        g.lineTo(28, 20);
        g.fill();
      }
    },
  };
}

// ─────────────────────────────── hair ───────────────────────────────

function hairPaint(g, color, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, tintC(color, 0.12));
  gr.addColorStop(0.5, color);
  gr.addColorStop(1, shade(color, 0.35));
  g.fillStyle = gr;
  g.fill();
}

function strands(g, color, pts, r) {
  g.save();
  g.clip();
  g.strokeStyle = shade(color, 0.45);
  g.globalAlpha = 0.35;
  g.lineWidth = 1.2;
  for (const [x0, y0, x1, y1] of pts) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + r.range(-6, 6), (y0 + y1) / 2, x1, y1);
    g.stroke();
  }
  g.restore();
}

function angelRing(g, color, cx, cy, rx, ry) {
  g.save();
  g.clip();
  g.strokeStyle = tintC(color, 0.55);
  g.globalAlpha = 0.55;
  g.lineWidth = 7;
  g.setLineDash([14, 6, 8, 5]);
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.9);
  g.stroke();
  g.setLineDash([]);
  g.restore();
}

function hairFrontPart(cfg, S) {
  const c = cfg.hair.color;
  const style = cfg.hair.style;
  const r = rng(cfg.seed || 1);
  const off = cfg.hat ? 50 : 0;
  return {
    name: 'hairFront',
    parent: 'head',
    w: 200 * S,
    h: (170 + off) * S,
    pivot: [100 * S, (30 + off) * S],
    joint: [0, 720],
    layer: 7,
    draw(g) {
      g.scale(S, S);
      g.translate(0, off);
      // local: head centre x=100; forehead line at y≈70; skull top y≈8
      const cx = 100;
      const top = 6;
      const short = style === 'short' || style === 'messy' || style === 'parted';
      const sideLen = style === 'long' || style === 'twin' ? 150 : style === 'bob' ? 118 : short ? 84 : 110;
      g.beginPath();
      // skull cap from left temple up and over
      g.moveTo(cx - 52, 96);
      g.bezierCurveTo(cx - 62, 30, cx - 30, top, cx, top);
      g.bezierCurveTo(cx + 30, top, cx + 62, 30, cx + 52, 96);
      // right side lock
      g.quadraticCurveTo(cx + 56, sideLen * 0.8, cx + 44, sideLen);
      g.quadraticCurveTo(cx + 40, sideLen * 0.7, cx + 36, 80);
      // bangs zig-zag, right to left
      const n = style === 'parted' ? 4 : short ? 6 : 7;
      const x0 = cx + 38;
      const x1 = cx - 38;
      for (let i = 0; i < n; i++) {
        const xa = x0 + ((x1 - x0) * (i + 0.5)) / n;
        const xb = x0 + ((x1 - x0) * (i + 1)) / n;
        const tip = (style === 'parted' ? 66 : short ? 72 : 84) + r.range(-8, 10) + (i === Math.floor(n / 2) ? 6 : 0);
        const valley = (style === 'parted' ? 40 : 52) + r.range(-6, 6);
        g.quadraticCurveTo(xa + r.range(-3, 3), tip - 18, xa, tip);
        g.quadraticCurveTo(xa - 2, tip - 14, xb, valley);
      }
      // left side lock
      g.quadraticCurveTo(cx - 40, sideLen * 0.7, cx - 46, sideLen);
      g.quadraticCurveTo(cx - 58, sideLen * 0.8, cx - 52, 96);
      g.closePath();
      hairPaint(g, c, top, sideLen);
      strands(
        g,
        c,
        Array.from({ length: 14 }, () => {
          const x = cx + r.range(-44, 44);
          return [x, top + 10, x + r.range(-10, 10), r.range(60, 100)];
        }),
        r,
      );
      g.beginPath();
      g.moveTo(cx - 52, 96);
      g.bezierCurveTo(cx - 62, 30, cx - 30, top, cx, top);
      g.bezierCurveTo(cx + 30, top, cx + 62, 30, cx + 52, 96);
      g.lineTo(cx + 52, 40);
      g.lineTo(cx - 52, 40);
      g.closePath();
      angelRing(g, c, cx, 58, 46, 34);
      // outline again (re-trace main path cheaply using the stored shape)
      g.lineWidth = 2.4;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(cx - 52, 96);
      g.bezierCurveTo(cx - 62, 30, cx - 30, top, cx, top);
      g.bezierCurveTo(cx + 30, top, cx + 62, 30, cx + 52, 96);
      g.stroke();
      if (cfg.hairpin) {
        g.fillStyle = cfg.hairpin;
        g.save();
        g.translate(cx + 36, 50);
        g.rotate(0.6);
        g.fillRect(-10, -3, 20, 6);
        g.strokeStyle = INK;
        g.lineWidth = 1.2;
        g.strokeRect(-10, -3, 20, 6);
        g.restore();
      }
      if (cfg.hat === 'fedora') drawFedora(g, cx, cfg.hatColor || '#2a2626', cfg.hatBand || '#7b2530');
    },
  };
}

function drawFedora(g, cx, color, band) {
  // brim
  g.beginPath();
  g.ellipse(cx, 34, 92, 16, -0.05, 0, Math.PI * 2);
  fillShaded(g, tintC(color, 0.1), shade(color, 0.3), 20, 50, 2.4);
  // crown
  g.beginPath();
  g.moveTo(cx - 52, 34);
  g.bezierCurveTo(cx - 56, -8, cx - 40, -30, cx - 8, -26);
  g.quadraticCurveTo(cx, -18, cx + 8, -26);
  g.bezierCurveTo(cx + 40, -30, cx + 56, -8, cx + 52, 34);
  g.quadraticCurveTo(cx, 44, cx - 52, 34);
  g.closePath();
  fillShaded(g, tintC(color, 0.18), shade(color, 0.25), -30, 40, 2.4);
  // band
  g.beginPath();
  g.moveTo(cx - 53, 18);
  g.quadraticCurveTo(cx, 30, cx + 53, 18);
  g.lineTo(cx + 52, 32);
  g.quadraticCurveTo(cx, 44, cx - 52, 32);
  g.closePath();
  g.fillStyle = band;
  g.fill();
  stroke(g, 1.6);
  // pinch highlight
  g.strokeStyle = 'rgba(255,240,220,0.25)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - 30, -18);
  g.quadraticCurveTo(cx - 40, 0, cx - 36, 16);
  g.stroke();
}

function hairBackPart(cfg, S) {
  const c = cfg.hair.color;
  const style = cfg.hair.style;
  const r = rng((cfg.seed || 1) + 7);
  const len = { long: 330, twin: 150, bob: 170, ponytail: 150, short: 120, messy: 130, parted: 110, bun: 140 }[style] || 150;
  return {
    name: 'hairBack',
    parent: 'head',
    w: 240 * S,
    h: (len + 20) * S,
    pivot: [120 * S, 40 * S],
    joint: [0, 712],
    layer: -1,
    draw(g) {
      g.scale(S, S);
      const cx = 120;
      g.beginPath();
      if (style === 'long') {
        g.moveTo(cx - 60, 60);
        g.bezierCurveTo(cx - 70, 0, cx + 70, 0, cx + 60, 60);
        g.bezierCurveTo(cx + 80, 150, cx + 92, 250, cx + 78, len);
        for (let i = 0; i < 6; i++) {
          const x = cx + 78 - ((i + 1) * 156) / 6;
          g.quadraticCurveTo(x + 13, len - 30 + r.range(-8, 8), x, len + r.range(-14, 4));
        }
        g.bezierCurveTo(cx - 92, 250, cx - 80, 150, cx - 60, 60);
      } else if (style === 'bob') {
        g.moveTo(cx - 60, 60);
        g.bezierCurveTo(cx - 70, 0, cx + 70, 0, cx + 60, 60);
        g.bezierCurveTo(cx + 74, 110, cx + 70, 150, cx + 58, len);
        g.quadraticCurveTo(cx, len - 16, cx - 58, len);
        g.bezierCurveTo(cx - 70, 150, cx - 74, 110, cx - 60, 60);
      } else if (style === 'bun') {
        g.moveTo(cx - 58, 60);
        g.bezierCurveTo(cx - 66, 0, cx + 66, 0, cx + 58, 60);
        g.bezierCurveTo(cx + 64, 100, cx + 56, 120, cx + 44, len);
        g.quadraticCurveTo(cx, len - 10, cx - 44, len);
        g.bezierCurveTo(cx - 56, 120, cx - 64, 100, cx - 58, 60);
      } else {
        g.moveTo(cx - 56, 60);
        g.bezierCurveTo(cx - 64, 0, cx + 64, 0, cx + 56, 60);
        g.bezierCurveTo(cx + 62, 90, cx + 52, 110, cx + 40, len);
        g.quadraticCurveTo(cx, len + 8, cx - 40, len);
        g.bezierCurveTo(cx - 52, 110, cx - 62, 90, cx - 56, 60);
      }
      g.closePath();
      hairPaint(g, shade(c, 0.12), 0, len);
      strands(
        g,
        c,
        Array.from({ length: 18 }, () => {
          const x = cx + r.range(-60, 60);
          return [x, 30, x * 1.02 + r.range(-8, 8), len - 10];
        }),
        r,
      );
      g.lineWidth = 2.4;
      g.strokeStyle = INK;
      g.stroke();
      if (style === 'bun') {
        g.beginPath();
        g.arc(cx + 8, 6, 30, 0, Math.PI * 2);
        hairPaint(g, c, -24, 36);
        stroke(g, 2.4);
        g.beginPath();
        g.moveTo(cx - 14, -6);
        g.quadraticCurveTo(cx + 8, 14, cx + 32, -4);
        stroke(g, 1.2, shade(c, 0.5));
      }
    },
  };
}

function tailPart(cfg, S, side = 0) {
  const c = cfg.hair.color;
  const twin = cfg.hair.style === 'twin';
  const name = side === 0 ? 'tail' : side < 0 ? 'tailL' : 'tailR';
  return {
    name,
    parent: 'head',
    w: 110 * S,
    h: 260 * S,
    pivot: [55 * S, 20 * S],
    joint: twin ? [side * 60, 690] : [18, 724],
    layer: twin ? 6.9 : -1.2,
    draw(g) {
      g.scale(S, S);
      g.beginPath();
      g.moveTo(40, 18);
      g.bezierCurveTo(10, 60, 22, 140, 44, 250);
      g.quadraticCurveTo(52, 232, 58, 252);
      g.quadraticCurveTo(66, 230, 72, 246);
      g.bezierCurveTo(96, 140, 96, 60, 70, 18);
      g.closePath();
      hairPaint(g, c, 0, 250);
      g.lineWidth = 2.4;
      g.strokeStyle = INK;
      g.stroke();
      // tie
      g.fillStyle = cfg.outfit?.accent || '#a3373f';
      g.beginPath();
      g.ellipse(55, 20, 18, 8, 0, 0, Math.PI * 2);
      g.fill();
      stroke(g, 1.6);
    },
  };
}

// ─────────────────────────────── body ───────────────────────────────

function torsoPart(cfg, S) {
  const o = cfg.outfit;
  const skin = cfg.skin || '#f4dcc8';
  return {
    name: 'torso',
    parent: 'hips',
    w: 180 * S,
    h: 196 * S,
    pivot: [90 * S, 180 * S],
    joint: [0, 432],
    layer: 5,
    draw(g, W, H) {
      g.scale(S, S);
      const cx = 90;
      const f = cfg.gender === 'f';
      const sh = f ? 58 : 66; // shoulder half-width
      const wa = f ? 40 : 48; // waist
      const body = () => {
        g.beginPath();
        g.moveTo(cx - 16, 14);
        g.quadraticCurveTo(cx - sh + 6, 20, cx - sh, 42);
        g.quadraticCurveTo(cx - sh - 4, 80, cx - wa - 4, 130);
        g.quadraticCurveTo(cx - wa, 170, cx - wa - 6, 190);
        g.lineTo(cx + wa + 6, 190);
        g.quadraticCurveTo(cx + wa, 170, cx + wa + 4, 130);
        g.quadraticCurveTo(cx + sh + 4, 80, cx + sh, 42);
        g.quadraticCurveTo(cx + sh - 6, 20, cx + 16, 14);
        g.closePath();
      };
      // neck base
      g.beginPath();
      g.rect(cx - 14, 0, 28, 24);
      g.fillStyle = shade(skin, 0.2);
      g.fill();

      if (o.type === 'sailor') {
        body();
        fillShaded(g, '#f4f1ea', '#d9d6d2', 10, 190);
        g.save();
        body();
        g.clip();
        sideShade(g, 180, 196, '#8c93b8', true, 0.3, 0.3);
        // sailor collar
        g.beginPath();
        g.moveTo(cx - 16, 12);
        g.lineTo(cx - sh - 2, 36);
        g.lineTo(cx - sh + 4, 70);
        g.lineTo(cx - 20, 64);
        g.lineTo(cx, 108);
        g.lineTo(cx + 20, 64);
        g.lineTo(cx + sh - 4, 70);
        g.lineTo(cx + sh + 2, 36);
        g.lineTo(cx + 16, 12);
        g.quadraticCurveTo(cx, 26, cx - 16, 12);
        g.fillStyle = o.main;
        g.fill();
        stroke(g, 2);
        g.strokeStyle = '#f4f1ea';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(cx - sh + 2, 62);
        g.lineTo(cx - 22, 57);
        g.lineTo(cx, 96);
        g.lineTo(cx + 22, 57);
        g.lineTo(cx + sh - 2, 62);
        g.stroke();
        // hem band
        g.fillStyle = shade('#f4f1ea', 0.15);
        g.fillRect(0, 176, 180, 20);
        g.restore();
        // scarf bow
        g.fillStyle = o.accent;
        g.beginPath();
        g.moveTo(cx, 100);
        g.quadraticCurveTo(cx - 26, 86, cx - 30, 104);
        g.quadraticCurveTo(cx - 20, 118, cx, 106);
        g.quadraticCurveTo(cx + 20, 118, cx + 30, 104);
        g.quadraticCurveTo(cx + 26, 86, cx, 100);
        g.fill();
        stroke(g, 1.8);
        g.beginPath();
        g.moveTo(cx - 4, 106);
        g.lineTo(cx - 12, 142);
        g.lineTo(cx - 2, 136);
        g.lineTo(cx + 4, 106);
        g.moveTo(cx + 4, 106);
        g.lineTo(cx + 12, 140);
        g.lineTo(cx + 2, 134);
        g.fillStyle = shade(o.accent, 0.15);
        g.fill();
        stroke(g, 1.6);
      } else if (o.type === 'blazer' || o.type === 'coat' || o.type === 'cardigan') {
        const main = o.main;
        body();
        fillShaded(g, tintC(main, 0.08), shade(main, 0.25), 10, 190);
        g.save();
        body();
        g.clip();
        sideShade(g, 180, 196, '#1e2238', true, 0.3, 0.3);
        // shirt V
        g.beginPath();
        g.moveTo(cx - 18, 12);
        g.lineTo(cx, o.type === 'cardigan' ? 150 : 104);
        g.lineTo(cx + 18, 12);
        g.closePath();
        g.fillStyle = o.shirt || '#f2efe6';
        g.fill();
        if (o.vest) {
          g.beginPath();
          g.moveTo(cx - 14, 34);
          g.lineTo(cx, 96);
          g.lineTo(cx + 14, 34);
          g.lineTo(cx + 26, 40);
          g.lineTo(cx + 22, 196);
          g.lineTo(cx - 22, 196);
          g.lineTo(cx - 26, 40);
          g.closePath();
          g.fillStyle = o.vest;
          g.fill();
          stroke(g, 1.6);
        }
        // tie / ribbon
        if (o.tie) {
          g.beginPath();
          g.moveTo(cx - 5, 20);
          g.lineTo(cx + 5, 20);
          g.lineTo(cx + 9, 86);
          g.lineTo(cx, 98);
          g.lineTo(cx - 9, 86);
          g.closePath();
          g.fillStyle = o.accent;
          g.fill();
          stroke(g, 1.4);
          g.strokeStyle = shade(o.accent, 0.4);
          g.lineWidth = 2;
          for (let y = 36; y < 90; y += 12) {
            g.beginPath();
            g.moveTo(cx - 6, y + 4);
            g.lineTo(cx + 6, y - 2);
            g.stroke();
          }
        } else if (o.ribbon) {
          g.fillStyle = o.accent;
          g.beginPath();
          g.moveTo(cx, 28);
          g.quadraticCurveTo(cx - 22, 16, cx - 24, 32);
          g.quadraticCurveTo(cx - 18, 42, cx, 32);
          g.quadraticCurveTo(cx + 18, 42, cx + 24, 32);
          g.quadraticCurveTo(cx + 22, 16, cx, 28);
          g.fill();
          stroke(g, 1.5);
        }
        // lapels
        const lap = o.type === 'coat' ? 1.25 : 1;
        g.fillStyle = shade(main, 0.18);
        g.beginPath();
        g.moveTo(cx - 18, 12);
        g.lineTo(cx - 34 * lap, 40);
        g.lineTo(cx - 22, 50);
        g.lineTo(cx - 30 * lap, 60);
        g.lineTo(cx - 2, o.type === 'cardigan' ? 150 : 110);
        g.closePath();
        g.fill();
        stroke(g, 1.6);
        g.beginPath();
        g.moveTo(cx + 18, 12);
        g.lineTo(cx + 34 * lap, 40);
        g.lineTo(cx + 22, 50);
        g.lineTo(cx + 30 * lap, 60);
        g.lineTo(cx + 2, o.type === 'cardigan' ? 150 : 110);
        g.closePath();
        g.fill();
        stroke(g, 1.6);
        // buttons
        g.fillStyle = o.buttons || (o.type === 'coat' ? '#c9a45c' : shade(main, 0.5));
        for (let i = 0; i < (o.type === 'cardigan' ? 4 : 2); i++) {
          const by = (o.type === 'cardigan' ? 70 : 128) + i * (o.type === 'cardigan' ? 26 : 26);
          g.beginPath();
          g.arc(cx + (o.type === 'coat' ? 12 : 0), by, 3.4, 0, Math.PI * 2);
          g.fill();
          stroke(g, 1);
          if (o.type === 'coat') {
            g.beginPath();
            g.arc(cx - 12, by, 3.4, 0, Math.PI * 2);
            g.fill();
            stroke(g, 1);
          }
        }
        // pocket + emblem
        if (o.type === 'blazer') {
          g.strokeStyle = shade(main, 0.45);
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(cx - 44, 150);
          g.lineTo(cx - 20, 150);
          g.moveTo(cx + 20, 150);
          g.lineTo(cx + 44, 150);
          g.stroke();
          g.fillStyle = o.emblem || '#c9a45c';
          g.beginPath();
          g.moveTo(cx - 38, 76);
          g.lineTo(cx - 28, 76);
          g.lineTo(cx - 28, 86);
          g.quadraticCurveTo(cx - 33, 92, cx - 38, 86);
          g.closePath();
          g.fill();
        }
        g.restore();
        body();
        stroke(g, 2.4);
      } else if (o.type === 'gakuran') {
        body();
        fillShaded(g, '#2e3040', '#15161f', 10, 190);
        g.save();
        body();
        g.clip();
        sideShade(g, 180, 196, '#000000', true, 0.28, 0.35);
        g.fillStyle = '#23242f';
        g.fillRect(cx - 20, 8, 40, 16);
        g.strokeStyle = 'rgba(255,255,255,0.18)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(cx, 24);
        g.lineTo(cx, 196);
        g.stroke();
        g.fillStyle = '#d7b56d';
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          g.arc(cx + 4, 38 + i * 30, 3.6, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
        body();
        stroke(g, 2.4);
      } else if (o.type === 'teacher') {
        body();
        fillShaded(g, '#f3f0ea', '#cfcbc4', 10, 190);
        g.save();
        body();
        g.clip();
        sideShade(g, 180, 196, '#7c83a8', true, 0.3, 0.3);
        // vest
        g.beginPath();
        g.moveTo(cx - 16, 30);
        g.lineTo(cx, 100);
        g.lineTo(cx + 16, 30);
        g.lineTo(cx + 50, 44);
        g.lineTo(cx + 50, 196);
        g.lineTo(cx - 50, 196);
        g.lineTo(cx - 50, 44);
        g.closePath();
        g.fillStyle = o.vest || '#5a5a60';
        g.fill();
        stroke(g, 1.6);
        g.beginPath();
        g.moveTo(cx - 5, 20);
        g.lineTo(cx + 5, 20);
        g.lineTo(cx + 8, 92);
        g.lineTo(cx, 100);
        g.lineTo(cx - 8, 92);
        g.closePath();
        g.fillStyle = o.accent;
        g.fill();
        stroke(g, 1.4);
        g.fillStyle = '#2a2a2e';
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.arc(cx + 2, 112 + i * 20, 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
        body();
        stroke(g, 2.4);
      } else if (o.type === 'shadow') {
        body();
        g.fillStyle = '#0b0909';
        g.fill();
      }
      // collar points for shirts
      if (['blazer', 'teacher', 'cardigan', 'coat'].includes(o.type)) {
        g.fillStyle = o.shirt || '#f6f3ec';
        g.beginPath();
        g.moveTo(cx - 16, 12);
        g.lineTo(cx - 20, 30);
        g.lineTo(cx - 4, 22);
        g.closePath();
        g.moveTo(cx + 16, 12);
        g.lineTo(cx + 20, 30);
        g.lineTo(cx + 4, 22);
        g.closePath();
        g.fill();
        stroke(g, 1.4);
      }
      void W;
      void H;
    },
  };
}

function armParts(cfg, S, side) {
  // side: -1 = far (back) arm, +1 = near (front) arm
  const o = cfg.outfit;
  const skin = cfg.skin || '#f4dcc8';
  const sleeve = { sailor: '#f2efe8', blazer: o.main, coat: o.main, cardigan: o.main, gakuran: '#23242f', teacher: '#f3f0ea', shadow: '#0b0909' }[o.type] || o.main;
  const cuff = o.type === 'sailor' ? o.main : o.type === 'teacher' ? '#e8e4dc' : shade(sleeve, 0.25);
  const dim = side < 0 ? 0.18 : 0;
  const sx = cfg.gender === 'f' ? 54 : 62;
  const name = side < 0 ? 'B' : 'F';
  const layerBase = side < 0 ? 1 : 8;
  return [
    {
      name: 'upperArm' + name,
      parent: 'torso',
      w: 50 * S,
      h: 140 * S,
      pivot: [25 * S, 14 * S],
      joint: [side * sx, 564],
      layer: layerBase,
      draw(g) {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(8, 12);
        g.quadraticCurveTo(25, -2, 42, 12);
        g.lineTo(40, 128);
        g.quadraticCurveTo(25, 136, 10, 128);
        g.closePath();
        fillShaded(g, shade(sleeve, dim), shade(sleeve, dim + 0.22), 0, 136);
        g.save();
        g.clip();
        sideShade(g, 50, 140, '#3a3f60', side < 0, 0.4, 0.25);
        g.restore();
      },
    },
    {
      name: 'foreArm' + name,
      parent: 'upperArm' + name,
      w: 46 * S,
      h: 128 * S,
      pivot: [23 * S, 10 * S],
      joint: [side * sx, 448],
      layer: layerBase + 0.1,
      draw(g) {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(8, 6);
        g.quadraticCurveTo(23, -2, 38, 6);
        g.lineTo(36, 112);
        g.lineTo(10, 112);
        g.closePath();
        fillShaded(g, shade(sleeve, dim + 0.05), shade(sleeve, dim + 0.25), 0, 112);
        g.beginPath();
        g.rect(9, 100, 28, 14);
        g.fillStyle = shade(cuff, dim);
        g.fill();
        stroke(g, 1.8);
      },
    },
    {
      name: 'hand' + name,
      parent: 'foreArm' + name,
      w: 40 * S,
      h: 52 * S,
      pivot: [20 * S, 6 * S],
      joint: [side * sx, 340],
      layer: layerBase + 0.2,
      draw(g) {
        g.scale(S, S);
        const sk = o.gloves ? o.gloves : skin;
        g.beginPath();
        g.moveTo(10, 4);
        g.lineTo(30, 4);
        g.quadraticCurveTo(34, 24, 30, 38);
        g.quadraticCurveTo(22, 50, 14, 44);
        g.quadraticCurveTo(6, 34, 10, 4);
        g.closePath();
        fillShaded(g, shade(sk, dim), shade(sk, dim + 0.18), 0, 48, 2);
        g.beginPath();
        g.moveTo(side < 0 ? 12 : 28, 14);
        g.quadraticCurveTo(side < 0 ? 4 : 36, 24, side < 0 ? 10 : 30, 32);
        stroke(g, 1.4, 'rgba(90,50,40,0.6)');
      },
    },
  ];
}

function legParts(cfg, S, side) {
  const o = cfg.outfit;
  const skin = cfg.skin || '#f4dcc8';
  const pants = cfg.gender === 'm' || o.pants;
  const cloth = pants ? o.bottom : skin;
  const socks = o.socks || '#1f2130';
  const shoes = o.shoes || '#4a2e22';
  const dim = side < 0 ? 0.2 : 0;
  const name = side < 0 ? 'B' : 'F';
  const hx = cfg.gender === 'f' ? 22 : 26;
  const layerBase = side < 0 ? 2 : 3;
  const w0 = pants ? 30 : 26;
  return [
    {
      name: 'thigh' + name,
      parent: 'hips',
      w: 70 * S,
      h: 214 * S,
      pivot: [35 * S, 10 * S],
      joint: [side * hx, 400],
      layer: layerBase,
      draw(g) {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(35 - w0, 6);
        g.lineTo(35 + w0, 6);
        g.quadraticCurveTo(35 + w0 - 2, 110, 35 + w0 * 0.7, 204);
        g.lineTo(35 - w0 * 0.7, 204);
        g.quadraticCurveTo(35 - w0 + 2, 110, 35 - w0, 6);
        g.closePath();
        fillShaded(g, shade(cloth, dim), shade(cloth, dim + 0.2), 0, 204);
        if (pants) {
          g.save();
          g.clip();
          sideShade(g, 70, 214, '#000000', side < 0, 0.45, 0.2);
          g.restore();
        }
      },
    },
    {
      name: 'shin' + name,
      parent: 'thigh' + name,
      w: 60 * S,
      h: 200 * S,
      pivot: [30 * S, 8 * S],
      joint: [side * hx, 208],
      layer: layerBase + 0.1,
      draw(g) {
        g.scale(S, S);
        const ww = pants ? 22 : 19;
        g.beginPath();
        g.moveTo(30 - ww, 4);
        g.lineTo(30 + ww, 4);
        g.quadraticCurveTo(30 + ww + 2, 60, 30 + ww * 0.62, 186);
        g.lineTo(30 - ww * 0.62, 186);
        g.quadraticCurveTo(30 - ww - 2, 60, 30 - ww, 4);
        g.closePath();
        fillShaded(g, shade(cloth, dim), shade(cloth, dim + 0.2), 0, 186);
        if (!pants) {
          // knee socks
          g.save();
          g.clip();
          g.fillStyle = shade(socks, dim);
          g.fillRect(0, 44, 60, 160);
          g.strokeStyle = shade(socks, dim + 0.4);
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(0, 50);
          g.lineTo(60, 50);
          g.stroke();
          g.restore();
          g.beginPath();
          g.moveTo(30 - ww, 4);
          g.lineTo(30 + ww, 4);
          g.quadraticCurveTo(30 + ww + 2, 60, 30 + ww * 0.62, 186);
          g.lineTo(30 - ww * 0.62, 186);
          g.quadraticCurveTo(30 - ww - 2, 60, 30 - ww, 4);
          stroke(g, 2.2);
        }
      },
    },
    {
      name: 'foot' + name,
      parent: 'shin' + name,
      w: 80 * S,
      h: 50 * S,
      pivot: [30 * S, 10 * S],
      joint: [side * hx, 30],
      layer: layerBase + 0.2,
      draw(g) {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(16, 6);
        g.lineTo(44, 6);
        g.quadraticCurveTo(48, 20, 66, 26);
        g.quadraticCurveTo(76, 34, 70, 42);
        g.lineTo(14, 42);
        g.quadraticCurveTo(10, 24, 16, 6);
        g.closePath();
        fillShaded(g, tintC(shade(shoes, dim), 0.1), shade(shoes, dim + 0.3), 0, 42, 2.2);
        g.fillStyle = 'rgba(255,240,220,0.25)';
        g.beginPath();
        g.ellipse(52, 28, 8, 3, -0.3, 0, Math.PI * 2);
        g.fill();
      },
    },
  ];
}

function hipsPart(cfg, S) {
  const o = cfg.outfit;
  const pants = cfg.gender === 'm' || o.pants;
  if (pants && o.type !== 'coat') {
    return {
      name: 'hips',
      w: 140 * S,
      h: 90 * S,
      pivot: [70 * S, 10 * S],
      joint: [0, 432],
      layer: 3.5,
      draw(g) {
        g.scale(S, S);
        g.beginPath();
        g.moveTo(22, 4);
        g.lineTo(118, 4);
        g.quadraticCurveTo(124, 50, 118, 84);
        g.lineTo(22, 84);
        g.quadraticCurveTo(16, 50, 22, 4);
        g.closePath();
        fillShaded(g, o.bottom, shade(o.bottom, 0.25), 0, 84);
        g.fillStyle = shade(o.bottom, 0.4);
        g.fillRect(22, 4, 96, 10);
        g.strokeStyle = shade(o.bottom, 0.5);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(70, 14);
        g.lineTo(70, 70);
        g.stroke();
      },
    };
  }
  // skirt (or coat tails) — also acts as the hips node
  const long = o.type === 'coat' || o.longSkirt;
  const len = long ? 300 : 150;
  const col0 = o.type === 'coat' ? o.main : o.bottom;
  return {
    name: 'skirt',
    parent: 'hips',
    w: 230 * S,
    h: (len + 16) * S,
    pivot: [115 * S, 10 * S],
    joint: [0, 432],
    layer: o.type === 'coat' ? 3.6 : 4,
    draw(g) {
      g.scale(S, S);
      const cx = 115;
      const top = 44;
      const hem = long ? 96 : 104;
      g.beginPath();
      g.moveTo(cx - top, 4);
      g.lineTo(cx + top, 4);
      g.quadraticCurveTo(cx + hem - 10, len * 0.5, cx + hem, len);
      if (o.type === 'coat') {
        // split coat tails: front opening shows the legs
        g.lineTo(cx + 20, len - 6);
        g.lineTo(cx + 6, 96);
        g.lineTo(cx - 6, 96);
        g.lineTo(cx - 20, len - 6);
      } else {
        for (let i = 0; i <= 8; i++) g.lineTo(cx + hem - (i * hem * 2) / 8, len + (i % 2 ? -5 : 3));
      }
      g.lineTo(cx - hem, len);
      g.quadraticCurveTo(cx - hem + 10, len * 0.5, cx - top, 4);
      g.closePath();
      fillShaded(g, col0, shade(col0, 0.3), 0, len);
      g.save();
      g.clip();
      sideShade(g, 230, len + 16, '#10121e', true, 0.36, 0.3);
      if (o.type !== 'coat') {
        g.strokeStyle = shade(col0, 0.45);
        g.lineWidth = 1.6;
        for (let i = -3; i <= 3; i++) {
          g.beginPath();
          g.moveTo(cx + i * 12, 14);
          g.lineTo(cx + i * 28, len);
          g.stroke();
        }
        if (o.plaid) {
          g.globalAlpha = 0.22;
          g.strokeStyle = o.plaid;
          g.lineWidth = 3;
          for (let y = 30; y < len; y += 26) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(230, y);
            g.stroke();
          }
          for (let x = 10; x < 230; x += 26) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x + (x - cx) * 0.4, len);
            g.stroke();
          }
          g.globalAlpha = 1;
        }
      } else {
        g.strokeStyle = shade(col0, 0.5);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(cx - 60, 60);
        g.lineTo(cx - 30, 60);
        g.stroke();
      }
      g.restore();
      // waist band
      g.fillStyle = shade(col0, 0.25);
      g.fillRect(cx - top, 2, top * 2, 10);
      g.strokeStyle = INK;
      g.lineWidth = 1.6;
      g.strokeRect(cx - top, 2, top * 2, 10);
    },
  };
}

function umbrellaPart(S) {
  return {
    name: 'umbrella',
    parent: 'handF',
    w: 70 * S,
    h: 420 * S,
    pivot: [35 * S, 40 * S],
    joint: [66, 318],
    layer: 8.5,
    draw(g) {
      g.scale(S, S);
      // hook handle
      g.beginPath();
      g.arc(24, 30, 14, Math.PI, 0);
      g.lineWidth = 7;
      g.strokeStyle = '#5a3a24';
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = INK;
      g.stroke();
      // shaft
      g.fillStyle = '#2a2420';
      g.fillRect(35, 28, 5, 60);
      // folded canopy
      g.beginPath();
      g.moveTo(37, 80);
      g.quadraticCurveTo(58, 170, 44, 380);
      g.lineTo(38, 410);
      g.lineTo(32, 380);
      g.quadraticCurveTo(16, 170, 37, 80);
      g.closePath();
      fillShaded(g, '#34303a', '#16141a', 80, 410);
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(40, 100);
      g.quadraticCurveTo(50, 200, 41, 370);
      g.stroke();
      g.fillStyle = '#c9a45c';
      g.fillRect(33, 150, 9, 5);
    },
  };
}

function bagPart(cfg, S) {
  return {
    name: 'bag',
    parent: 'torso',
    w: 110 * S,
    h: 90 * S,
    pivot: [55 * S, 10 * S],
    joint: [-56, 470],
    layer: 0.5,
    draw(g) {
      g.scale(S, S);
      g.beginPath();
      g.moveTo(10, 10);
      g.lineTo(100, 10);
      g.lineTo(96, 84);
      g.lineTo(14, 84);
      g.closePath();
      fillShaded(g, cfg.bagColor || '#3a2e2a', shade(cfg.bagColor || '#3a2e2a', 0.4), 10, 84);
      g.fillStyle = '#c9a45c';
      g.fillRect(50, 30, 10, 8);
    },
  };
}

/** Build the full part list for a humanoid. */
export function humanoidParts(cfg) {
  const S = cfg.S || 1;
  const hp = hipsPart(cfg, S);
  const extra = hp.name === 'skirt' ? [{ name: 'hips', w: 4, h: 4, pivot: [2, 2], joint: [0, 432], layer: 0, shadow: false, draw() {} }] : [];
  const parts = [...extra, torsoPart(cfg, S), hp, headPart(cfg, S), eyesPart(cfg, S), mouthPart(cfg, S), hairFrontPart(cfg, S), hairBackPart(cfg, S), ...armParts(cfg, S, -1), ...armParts(cfg, S, 1), ...legParts(cfg, S, -1), ...legParts(cfg, S, 1)];
  if (cfg.hair.style === 'ponytail') parts.push(tailPart(cfg, S, 0));
  if (cfg.hair.style === 'twin') parts.push(tailPart(cfg, S, -1), tailPart(cfg, S, 1));
  if (cfg.umbrella) parts.push(umbrellaPart(S));
  if (cfg.bag) parts.push(bagPart(cfg, S));
  // scale joints for high-res variants
  if (S !== 1) for (const p of parts) p.joint = [p.joint[0] * S, p.joint[1] * S];
  return parts;
}

/** Height of the rig in character pixels (for placing name tags etc.). */
export const HUMANOID_HEIGHT = 760;
