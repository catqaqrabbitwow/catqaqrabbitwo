import { shade, tintC } from './humanoid.js';

/**
 * Chunky, cute-but-dark paper puppets for 《黑森林試煉》.
 * Thick ink outlines, flat colour with one shade band, big glossy eyes.
 * Character px, origin between the feet, y up. (~300px tall at S=1)
 */
const INK = '#16121a';

function ink(g, w = 5) {
  g.lineWidth = w;
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.stroke();
}

function flat(g, base, shadeCol, y0, y1, split = 0.62) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, base);
  gr.addColorStop(split, base);
  gr.addColorStop(split + 0.01, shadeCol);
  gr.addColorStop(1, shadeCol);
  g.fillStyle = gr;
  g.fill();
}

function bigEyes(g, cx, cy, state, { gap = 26, rx = 11, ry = 15, color = '#141018', glint = true } = {}) {
  for (const s of [-1, 1]) {
    const x = cx + s * gap;
    g.beginPath();
    if (state === 'closed') {
      g.moveTo(x - rx, cy + 2);
      g.quadraticCurveTo(x, cy + ry * 0.7, x + rx, cy + 2);
      ink(g, 5);
      continue;
    }
    if (state === 'angry') {
      g.moveTo(x - rx, cy - ry * 0.3 - s * 4);
      g.lineTo(x + rx, cy - ry * 0.3 + s * 4);
      g.lineTo(x + rx * 0.9, cy + ry * 0.8);
      g.quadraticCurveTo(x, cy + ry * 1.1, x - rx * 0.9, cy + ry * 0.8);
      g.closePath();
    } else if (state === 'happy') {
      g.moveTo(x - rx, cy + 4);
      g.quadraticCurveTo(x, cy - ry, x + rx, cy + 4);
      ink(g, 5);
      continue;
    } else g.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    if (glint) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(x - rx * 0.3, cy - ry * 0.35, rx * 0.38, ry * 0.3, -0.4, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(x + rx * 0.35, cy + ry * 0.4, rx * 0.16, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ═══════════════════════════════ the wanderer ═══════════════════════════════
export function wandererParts(o = {}) {
  const S = o.S || 1;
  const cloak = o.cloak || '#7a2230';
  const cloakSh = shade(cloak, 0.35);
  const face = o.face || '#f1e6d4';
  const horn = o.horn || '#e8dcc2';
  const P = (p) => ({ ...p, w: p.w * S, h: p.h * S, pivot: [p.pivot[0] * S, p.pivot[1] * S], joint: [p.joint[0] * S, p.joint[1] * S] });
  const sc = (fn) => (g, w, h) => {
    g.scale(S, S);
    fn(g, w / S, h / S);
  };
  return [
    P({ name: 'hips', w: 4, h: 4, pivot: [2, 2], joint: [0, 60], layer: 0, shadow: false, draw() {} }),
    ...[-1, 1].map((s) =>
      P({
        name: s < 0 ? 'legB' : 'legF',
        parent: 'hips',
        w: 40,
        h: 70,
        pivot: [20, 8],
        joint: [s * 18, 62],
        layer: s < 0 ? 1 : 2,
        draw: sc((g) => {
          g.beginPath();
          g.moveTo(10, 4);
          g.lineTo(30, 4);
          g.lineTo(30, 44);
          g.quadraticCurveTo(38, 52, 34, 62);
          g.lineTo(6, 62);
          g.quadraticCurveTo(4, 50, 10, 44);
          g.closePath();
          g.fillStyle = s < 0 ? '#1a141c' : '#241c26';
          g.fill();
          ink(g, 4);
        }),
      }),
    ),
    P({
      name: 'cape',
      parent: 'hips',
      w: 170,
      h: 130,
      pivot: [85, 12],
      joint: [0, 150],
      layer: 1.5,
      draw: sc((g) => {
        g.beginPath();
        g.moveTo(40, 8);
        g.lineTo(130, 8);
        g.quadraticCurveTo(160, 70, 158, 118);
        g.lineTo(130, 104);
        g.lineTo(108, 124);
        g.lineTo(85, 106);
        g.lineTo(60, 124);
        g.lineTo(38, 104);
        g.lineTo(12, 118);
        g.quadraticCurveTo(10, 70, 40, 8);
        g.closePath();
        g.fillStyle = cloakSh;
        g.fill();
        ink(g, 5);
      }),
    }),
    P({
      name: 'body',
      parent: 'hips',
      w: 150,
      h: 130,
      pivot: [75, 118],
      joint: [0, 60],
      layer: 3,
      draw: sc((g) => {
        g.beginPath();
        g.moveTo(52, 10);
        g.quadraticCurveTo(75, 0, 98, 10);
        g.quadraticCurveTo(132, 60, 136, 118);
        g.quadraticCurveTo(75, 128, 14, 118);
        g.quadraticCurveTo(18, 60, 52, 10);
        g.closePath();
        flat(g, cloak, cloakSh, 0, 125, 0.55);
        ink(g, 5);
        // scarf / collar
        g.beginPath();
        g.moveTo(40, 22);
        g.quadraticCurveTo(75, 44, 110, 22);
        g.lineTo(106, 38);
        g.quadraticCurveTo(75, 58, 44, 38);
        g.closePath();
        g.fillStyle = o.scarf || '#e8c46a';
        g.fill();
        ink(g, 4);
        // clasp
        g.beginPath();
        g.arc(75, 50, 7, 0, Math.PI * 2);
        g.fillStyle = '#c9a45c';
        g.fill();
        ink(g, 3);
        // hem trim
        g.strokeStyle = shade(cloak, 0.6);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(20, 106);
        g.quadraticCurveTo(75, 116, 130, 106);
        g.stroke();
      }),
    }),
    P({
      name: 'armB',
      parent: 'body',
      w: 40,
      h: 56,
      pivot: [20, 8],
      joint: [-40, 150],
      layer: 0.8,
      draw: sc((g) => {
        g.beginPath();
        g.ellipse(20, 26, 14, 20, 0, 0, Math.PI * 2);
        g.fillStyle = cloakSh;
        g.fill();
        ink(g, 4);
      }),
    }),
    P({
      name: 'head',
      parent: 'body',
      w: 210,
      h: 200,
      pivot: [105, 176],
      joint: [0, 170],
      layer: 5,
      draw: sc((g) => {
        // horns
        for (const s of [-1, 1]) {
          g.beginPath();
          const x = 105 + s * 44;
          g.moveTo(x - s * 8, 60);
          g.bezierCurveTo(x + s * 18, 30, x + s * 40, 32, x + s * 46, 8);
          g.bezierCurveTo(x + s * 58, 36, x + s * 36, 64, x + s * 12, 70);
          g.closePath();
          flat(g, horn, shade(horn, 0.3), 0, 70, 0.6);
          ink(g, 4);
          g.strokeStyle = shade(horn, 0.45);
          g.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            g.beginPath();
            g.moveTo(x + s * (14 + k * 9), 56 - k * 12);
            g.lineTo(x + s * (22 + k * 9), 62 - k * 12);
            g.stroke();
          }
        }
        // hood
        g.beginPath();
        g.moveTo(105, 30);
        g.bezierCurveTo(170, 28, 196, 90, 186, 148);
        g.quadraticCurveTo(180, 180, 150, 186);
        g.lineTo(60, 186);
        g.quadraticCurveTo(30, 180, 24, 148);
        g.bezierCurveTo(14, 90, 40, 28, 105, 30);
        g.closePath();
        flat(g, cloak, cloakSh, 20, 190, 0.5);
        ink(g, 5);
        // face
        g.beginPath();
        g.ellipse(105, 118, 64, 56, 0, 0, Math.PI * 2);
        g.fillStyle = face;
        g.fill();
        g.save();
        g.clip();
        g.fillStyle = shade(face, 0.2);
        g.beginPath();
        g.ellipse(105, 70, 80, 30, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.beginPath();
        g.ellipse(105, 118, 64, 56, 0, 0, Math.PI * 2);
        ink(g, 4);
        // blush
        for (const s of [-1, 1]) {
          g.fillStyle = 'rgba(230,120,120,0.45)';
          g.beginPath();
          g.ellipse(105 + s * 42, 138, 12, 6, 0, 0, Math.PI * 2);
          g.fill();
        }
      }),
    }),
    P({
      name: 'eyes',
      parent: 'head',
      w: 120,
      h: 60,
      pivot: [60, 30],
      joint: [0, 225],
      layer: 5.5,
      shadow: false,
      defaultFrame: 'open',
      frames: {
        open: sc((g) => bigEyes(g, 60, 30, 'open')),
        half: sc((g) => bigEyes(g, 60, 34, 'open', { ry: 9 })),
        closed: sc((g) => bigEyes(g, 60, 30, 'closed')),
        angry: sc((g) => bigEyes(g, 60, 30, 'angry')),
        happy: sc((g) => bigEyes(g, 60, 30, 'happy')),
      },
    }),
    P({
      name: 'mouth',
      parent: 'head',
      w: 40,
      h: 30,
      pivot: [20, 12],
      joint: [0, 198],
      layer: 5.5,
      shadow: false,
      defaultFrame: 'closed',
      frames: {
        closed: sc((g) => {
          g.beginPath();
          g.moveTo(12, 12);
          g.quadraticCurveTo(20, 18, 28, 12);
          ink(g, 3);
        }),
        open: sc((g) => {
          g.beginPath();
          g.ellipse(20, 14, 8, 8, 0, 0, Math.PI * 2);
          g.fillStyle = '#4a1822';
          g.fill();
          ink(g, 3);
        }),
        o: sc((g) => {
          g.beginPath();
          g.ellipse(20, 14, 5, 6, 0, 0, Math.PI * 2);
          g.fillStyle = '#4a1822';
          g.fill();
          ink(g, 3);
        }),
      },
    }),
    P({
      name: 'armF',
      parent: 'body',
      w: 44,
      h: 60,
      pivot: [22, 10],
      joint: [42, 150],
      layer: 7,
      draw: sc((g) => {
        g.beginPath();
        g.ellipse(22, 28, 15, 21, 0, 0, Math.PI * 2);
        flat(g, cloak, cloakSh, 6, 50, 0.5);
        ink(g, 4);
        g.beginPath();
        g.arc(22, 48, 9, 0, Math.PI * 2);
        g.fillStyle = face;
        g.fill();
        ink(g, 3);
      }),
    }),
    P({
      name: 'sword',
      parent: 'armF',
      w: 60,
      h: 190,
      pivot: [30, 164],
      joint: [42, 104],
      layer: 6.5,
      draw: sc((g) => {
        // blade pointing up from the hand
        g.beginPath();
        g.moveTo(30, 4);
        g.lineTo(42, 30);
        g.lineTo(38, 140);
        g.lineTo(22, 140);
        g.lineTo(18, 30);
        g.closePath();
        const gr = g.createLinearGradient(18, 0, 42, 0);
        gr.addColorStop(0, '#c9d4dc');
        gr.addColorStop(0.5, '#f4f8fa');
        gr.addColorStop(0.51, '#9aa8b4');
        gr.addColorStop(1, '#7a8894');
        g.fillStyle = gr;
        g.fill();
        ink(g, 4);
        // guard + grip
        g.beginPath();
        g.rect(8, 140, 44, 10);
        g.fillStyle = '#c9a45c';
        g.fill();
        ink(g, 3);
        g.beginPath();
        g.rect(24, 150, 12, 28);
        g.fillStyle = '#3a2420';
        g.fill();
        ink(g, 3);
      }),
    }),
  ];
}

// ═══════════════════════════════ slime ═══════════════════════════════
export function slimeParts(o = {}) {
  const S = o.S || 1;
  const col = o.color || '#6ecb5a';
  const dark = shade(col, 0.45);
  const light = tintC(col, 0.45);
  const P = (p) => ({ ...p, w: p.w * S, h: p.h * S, pivot: [p.pivot[0] * S, p.pivot[1] * S], joint: [p.joint[0] * S, p.joint[1] * S] });
  const sc = (fn) => (g, w, h) => {
    g.scale(S, S);
    fn(g, w / S, h / S);
  };
  const parts = [
    P({
      name: 'body',
      w: 240,
      h: 190,
      pivot: [120, 184],
      joint: [0, 0],
      layer: 1,
      draw: sc((g) => {
        g.beginPath();
        g.moveTo(20, 180);
        g.bezierCurveTo(4, 110, 50, 12, 120, 10);
        g.bezierCurveTo(190, 12, 236, 110, 220, 180);
        g.quadraticCurveTo(120, 192, 20, 180);
        g.closePath();
        const gr = g.createRadialGradient(95, 70, 10, 120, 110, 140);
        gr.addColorStop(0, light);
        gr.addColorStop(0.45, col);
        gr.addColorStop(1, dark);
        g.fillStyle = gr;
        g.fill();
        g.save();
        g.clip();
        // inner bubbles
        g.fillStyle = 'rgba(255,255,255,0.18)';
        for (const [x, y, r] of [[160, 130, 10], [80, 150, 7], [140, 95, 5], [60, 110, 4]]) {
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
        if (o.seed) {
          const sg = g.createRadialGradient(150, 140, 2, 150, 140, 34);
          sg.addColorStop(0, 'rgba(255,255,230,1)');
          sg.addColorStop(0.35, 'rgba(200,240,255,0.9)');
          sg.addColorStop(1, 'rgba(160,220,255,0)');
          g.fillStyle = sg;
          g.beginPath();
          g.arc(150, 140, 34, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#fffbe8';
          g.beginPath();
          g.ellipse(150, 140, 9, 12, 0.4, 0, Math.PI * 2);
          g.fill();
        }
        // bottom shadow band
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.beginPath();
        g.ellipse(120, 186, 110, 22, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.beginPath();
        g.moveTo(20, 180);
        g.bezierCurveTo(4, 110, 50, 12, 120, 10);
        g.bezierCurveTo(190, 12, 236, 110, 220, 180);
        g.quadraticCurveTo(120, 192, 20, 180);
        ink(g, 6);
        // gloss
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.beginPath();
        g.ellipse(76, 58, 22, 12, -0.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(106, 40, 5, 0, Math.PI * 2);
        g.fill();
        if (o.crown) {
          g.fillStyle = '#2a1a2e';
          g.beginPath();
          g.moveTo(70, 26);
          for (let i = 0; i < 5; i++) {
            g.lineTo(80 + i * 20, -2 + (i % 2) * 6);
            g.lineTo(90 + i * 20, 22);
          }
          g.lineTo(170, 26);
          g.closePath();
          g.fill();
        }
      }),
    }),
    P({
      name: 'eyes',
      parent: 'body',
      w: 150,
      h: 70,
      pivot: [75, 35],
      joint: [0, 100],
      layer: 1.5,
      shadow: false,
      defaultFrame: 'open',
      frames: {
        open: sc((g) => bigEyes(g, 75, 35, 'open', { gap: 34, rx: 14, ry: 19 })),
        closed: sc((g) => bigEyes(g, 75, 35, 'closed', { gap: 34, rx: 14, ry: 19 })),
        angry: sc((g) => bigEyes(g, 75, 35, 'angry', { gap: 34, rx: 14, ry: 19, color: o.angryColor || '#141018' })),
        hurt: sc((g) => {
          for (const s of [-1, 1]) {
            const x = 75 + s * 34;
            g.beginPath();
            g.moveTo(x - 12, 26);
            g.lineTo(x + 12, 44);
            g.moveTo(x + 12, 26);
            g.lineTo(x - 12, 44);
            ink(g, 6);
          }
        }),
      },
    }),
    P({
      name: 'mouth',
      parent: 'body',
      w: 60,
      h: 40,
      pivot: [30, 16],
      joint: [0, 66],
      layer: 1.5,
      shadow: false,
      defaultFrame: 'smile',
      frames: {
        smile: sc((g) => {
          g.beginPath();
          g.moveTo(16, 12);
          g.quadraticCurveTo(30, 26, 44, 12);
          ink(g, 4);
        }),
        open: sc((g) => {
          g.beginPath();
          g.moveTo(10, 8);
          g.quadraticCurveTo(30, 44, 50, 8);
          g.closePath();
          g.fillStyle = '#3a1422';
          g.fill();
          ink(g, 4);
          g.fillStyle = '#fff';
          g.beginPath();
          g.moveTo(16, 10);
          g.lineTo(20, 18);
          g.lineTo(24, 11);
          g.moveTo(36, 11);
          g.lineTo(40, 18);
          g.lineTo(44, 10);
          g.fill();
        }),
      },
    }),
  ];
  return parts;
}

// ═══════════════════════════════ forest spirit ═══════════════════════════════
export function spiritParts(o = {}) {
  const S = o.S || 1;
  const P = (p) => ({ ...p, w: p.w * S, h: p.h * S, pivot: [p.pivot[0] * S, p.pivot[1] * S], joint: [p.joint[0] * S, p.joint[1] * S] });
  const sc = (fn) => (g, w, h) => {
    g.scale(S, S);
    fn(g, w / S, h / S);
  };
  const moss = '#4a7a5a';
  return [
    P({
      name: 'body',
      w: 170,
      h: 190,
      pivot: [85, 186],
      joint: [0, 0],
      layer: 1,
      draw: sc((g) => {
        // leafy robe, wispy bottom
        g.beginPath();
        g.moveTo(60, 10);
        g.quadraticCurveTo(85, 0, 110, 10);
        g.quadraticCurveTo(150, 80, 150, 150);
        g.lineTo(132, 176);
        g.lineTo(118, 158);
        g.lineTo(100, 184);
        g.lineTo(85, 160);
        g.lineTo(68, 184);
        g.lineTo(52, 158);
        g.lineTo(38, 176);
        g.lineTo(20, 150);
        g.quadraticCurveTo(20, 80, 60, 10);
        g.closePath();
        flat(g, moss, shade(moss, 0.4), 0, 186, 0.55);
        ink(g, 5);
        g.fillStyle = 'rgba(200,255,210,0.35)';
        for (let i = 0; i < 9; i++) {
          g.beginPath();
          g.ellipse(40 + (i % 3) * 45, 50 + Math.floor(i / 3) * 40, 12, 6, 0.6, 0, Math.PI * 2);
          g.fill();
        }
      }),
    }),
    P({
      name: 'head',
      parent: 'body',
      w: 220,
      h: 180,
      pivot: [110, 160],
      joint: [0, 170],
      layer: 3,
      draw: sc((g) => {
        // twig antlers
        g.strokeStyle = '#3a2a22';
        g.lineWidth = 7;
        g.lineCap = 'round';
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(110 + s * 30, 70);
          g.quadraticCurveTo(110 + s * 60, 40, 110 + s * 90, 10);
          g.moveTo(110 + s * 58, 42);
          g.lineTo(110 + s * 78, 50);
          g.moveTo(110 + s * 72, 26);
          g.lineTo(110 + s * 66, 6);
          g.stroke();
          g.fillStyle = '#8ad0a0';
          g.beginPath();
          g.ellipse(110 + s * 82, 48, 10, 5, 0.4 * s, 0, Math.PI * 2);
          g.fill();
        }
        // round mossy head / mask
        g.beginPath();
        g.ellipse(110, 110, 64, 58, 0, 0, Math.PI * 2);
        g.fillStyle = '#e8e2d0';
        g.fill();
        ink(g, 5);
        g.beginPath();
        g.ellipse(110, 64, 66, 26, 0, Math.PI, 0);
        g.fillStyle = moss;
        g.fill();
        ink(g, 4);
        g.fillStyle = '#6aa27a';
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.arc(60 + i * 20, 62 + (i % 2) * 4, 9, 0, Math.PI * 2);
          g.fill();
        }
      }),
    }),
    P({
      name: 'eyes',
      parent: 'head',
      w: 120,
      h: 60,
      pivot: [60, 30],
      joint: [0, 290],
      layer: 3.5,
      shadow: false,
      defaultFrame: 'open',
      frames: {
        open: sc((g) => {
          for (const s of [-1, 1]) {
            const gr = g.createRadialGradient(60 + s * 24, 30, 0, 60 + s * 24, 30, 16);
            gr.addColorStop(0, '#f4fff0');
            gr.addColorStop(0.4, '#9af0c0');
            gr.addColorStop(1, 'rgba(60,160,120,0)');
            g.fillStyle = gr;
            g.beginPath();
            g.arc(60 + s * 24, 30, 16, 0, Math.PI * 2);
            g.fill();
          }
        }),
        closed: sc((g) => {
          for (const s of [-1, 1]) {
            g.beginPath();
            g.moveTo(60 + s * 24 - 10, 30);
            g.quadraticCurveTo(60 + s * 24, 38, 60 + s * 24 + 10, 30);
            g.strokeStyle = '#5ac090';
            g.lineWidth = 4;
            g.stroke();
          }
        }),
      },
    }),
    P({
      name: 'lantern',
      parent: 'body',
      w: 70,
      h: 130,
      pivot: [35, 6],
      joint: [66, 120],
      layer: 4,
      draw: sc((g) => {
        g.strokeStyle = '#2a2020';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(35, 4);
        g.lineTo(35, 44);
        g.stroke();
        g.beginPath();
        g.moveTo(14, 50);
        g.lineTo(56, 50);
        g.lineTo(52, 110);
        g.lineTo(18, 110);
        g.closePath();
        const gr = g.createRadialGradient(35, 80, 4, 35, 80, 40);
        gr.addColorStop(0, '#fffbe0');
        gr.addColorStop(0.5, '#ffd070');
        gr.addColorStop(1, '#c07030');
        g.fillStyle = gr;
        g.fill();
        ink(g, 4);
        g.fillStyle = '#2a2020';
        g.fillRect(10, 42, 50, 10);
        g.fillRect(14, 108, 42, 8);
      }),
    }),
  ];
}
