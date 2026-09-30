import { canvas, mottle, paperDetail, grain, edgeBurn, rng, spacedText, toTexture, fakeLines } from '../../art/painter.js';
import { paintCorridorPhoto, paintForestIllustration } from '../../art/illustrations.js';

/** Painted covers for the objects lying on the archive desk. */

export function folderCover() {
  const { c, g, w, h } = canvas(900, 1200);
  g.fillStyle = '#c4a26e';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed: 4, scale: 0.006, amount: 0.14 });
  paperDetail(g, w, h, { seed: 5, fibers: 1800, specks: 300, stains: 3, fiberColor: 'rgba(80,50,20,0.12)' });
  // label strip
  g.fillStyle = '#ebe1c8';
  g.fillRect(70, 110, 560, 160);
  g.strokeStyle = '#2a241c';
  g.lineWidth = 2;
  g.strokeRect(80, 120, 540, 140);
  g.fillStyle = '#2a241c';
  g.font = '500 30px "Barlow Condensed"';
  spacedText(g, 'CASE FILE No. 01 · DECLASSIFIED', 100, 160, 5);
  g.font = '700 70px "Noto Serif TC"';
  g.fillText('校園異聞', 100, 240);
  // clipped photo
  g.save();
  g.translate(460, 620);
  g.rotate(-0.06);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(-326, -236, 670, 500);
  g.fillStyle = '#f3eee2';
  g.fillRect(-340, -250, 670, 520);
  g.drawImage(paintCorridorPhoto(620, 420, { sepia: 0.45, seed: 4 }), -315, -225, 620, 420);
  g.fillStyle = '#3a2f25';
  g.font = 'italic 500 34px "Cormorant Garamond"';
  g.fillText('west corridor — 17:04', -300, 240);
  g.restore();
  // paperclip
  g.strokeStyle = '#8a857c';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(420, 300);
  g.lineTo(420, 430);
  g.arc(450, 430, 30, Math.PI, 0, true);
  g.lineTo(480, 330);
  g.arc(460, 330, 20, 0, Math.PI, true);
  g.lineTo(440, 410);
  g.stroke();
  // stamp
  g.save();
  g.translate(650, 1020);
  g.rotate(-0.2);
  g.strokeStyle = 'rgba(168,50,45,0.8)';
  g.lineWidth = 7;
  g.strokeRect(-190, -55, 380, 110);
  g.fillStyle = 'rgba(168,50,45,0.8)';
  g.font = '600 56px "Barlow Condensed"';
  g.textAlign = 'center';
  g.fillText('CONFIDENTIAL', 0, 20);
  g.restore();
  g.fillStyle = 'rgba(40,30,20,0.65)';
  g.font = '400 26px "IBM Plex Mono"';
  g.fillText('KUREMI HIGH · CLASS 2-B · 16:30—17:30', 80, 980);
  edgeBurn(g, w, h, 0.3);
  return toTexture(c);
}

export function bookCover() {
  const { c, g, w, h } = canvas(900, 1200);
  g.fillStyle = '#1f3a30';
  g.fillRect(0, 0, w, h);
  // cloth weave
  const r = rng(3);
  for (let i = 0; i < 16000; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
    g.fillRect(r() * w, r() * h, r() < 0.5 ? 3 : 1, r() < 0.5 ? 1 : 3);
  }
  mottle(g, w, h, { seed: 9, scale: 0.005, amount: 0.2 });
  // gilt borders
  g.strokeStyle = '#c9a45c';
  g.lineWidth = 5;
  g.strokeRect(50, 50, w - 100, h - 100);
  g.lineWidth = 2;
  g.strokeRect(70, 70, w - 140, h - 140);
  for (const [x, y] of [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]]) {
    g.fillStyle = '#c9a45c';
    g.beginPath();
    g.moveTo(x, y - 22);
    g.lineTo(x + 22, y);
    g.lineTo(x, y + 22);
    g.lineTo(x - 22, y);
    g.fill();
  }
  // title
  g.fillStyle = '#e2c47c';
  g.textAlign = 'center';
  g.font = '500 34px "Barlow Condensed"';
  spacedText(g, 'CHAPTER · II', w / 2, 170, 10, 'center');
  g.font = 'italic 500 78px "Bodoni Moda"';
  g.fillText('Trial of the', w / 2, 260);
  g.fillText('Black Forest', w / 2, 345);
  g.font = '700 64px "Noto Serif TC"';
  spacedText(g, '黑森林試煉', w / 2, 440, 18, 'center');
  // inset illustration (oval)
  g.save();
  g.beginPath();
  g.ellipse(w / 2, 790, 300, 290, 0, 0, Math.PI * 2);
  g.clip();
  g.drawImage(paintForestIllustration(640, 620, { seed: 12 }), w / 2 - 320, 500, 640, 620);
  g.restore();
  g.lineWidth = 6;
  g.strokeStyle = '#c9a45c';
  g.beginPath();
  g.ellipse(w / 2, 790, 300, 290, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(w / 2, 790, 316, 306, 0, 0, Math.PI * 2);
  g.stroke();
  grain(g, w, h, 10, 2);
  edgeBurn(g, w, h, 0.45, '0,0,0');
  return toTexture(c);
}

export function envelopeCover(label, seed = 1) {
  const { c, g, w, h } = canvas(900, 600);
  g.fillStyle = '#ddd0b0';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.008, amount: 0.12 });
  paperDetail(g, w, h, { seed, fibers: 800, specks: 120, stains: 2 });
  g.strokeStyle = 'rgba(80,60,40,0.45)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w / 2, h * 0.58);
  g.lineTo(w, 0);
  g.stroke();
  // wax seal
  const sx = w / 2;
  const sy = h * 0.58;
  const sg = g.createRadialGradient(sx - 20, sy - 20, 5, sx, sy, 70);
  sg.addColorStop(0, '#b3343c');
  sg.addColorStop(1, '#5e141a');
  g.fillStyle = sg;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = 66 + (i % 2 ? 6 : 0);
    g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
  }
  g.fill();
  g.strokeStyle = 'rgba(255,210,200,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(sx, sy, 44, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,210,200,0.5)';
  g.font = 'italic 600 50px "Bodoni Moda"';
  g.textAlign = 'center';
  g.fillText('C', sx, sy + 17);
  g.fillStyle = '#2a3b5a';
  g.font = '500 34px "Barlow Condensed"';
  spacedText(g, label, w / 2, h - 60, 8, 'center');
  return toTexture(c);
}

export function cassetteLabel() {
  const { c, g, w, h } = canvas(800, 500);
  g.fillStyle = '#1c1b1a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8dcc0';
  g.fillRect(50, 40, w - 100, 250);
  g.fillStyle = '#7b2530';
  g.fillRect(50, 40, w - 100, 40);
  g.fillStyle = '#2a241c';
  g.font = '500 44px "Barlow Condensed"';
  spacedText(g, 'SIDE A  ·  FILE 04', 80, 180, 6);
  g.font = 'italic 500 40px "Cormorant Garamond"';
  g.fillText('— sealed recording —', 80, 250);
  // reels window
  g.fillStyle = '#0c0b0a';
  g.fillRect(200, 320, 400, 120);
  for (const x of [300, 500]) {
    g.fillStyle = '#e8e4d8';
    g.beginPath();
    g.arc(x, 380, 42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0c0b0a';
    g.beginPath();
    g.arc(x, 380, 16, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c);
}

export function indexCard() {
  const { c, g, w, h } = canvas(900, 560);
  g.fillStyle = '#efe6d0';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed: 21, scale: 0.01, amount: 0.08 });
  g.strokeStyle = 'rgba(168,50,45,0.7)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 120);
  g.lineTo(w, 120);
  g.stroke();
  g.strokeStyle = 'rgba(60,90,140,0.3)';
  for (let y = 170; y < h; y += 50) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  g.fillStyle = '#2a241c';
  g.font = 'italic 500 64px "Bodoni Moda"';
  g.fillText('Mini Game Archive', 50, 90);
  g.font = '400 30px "IBM Plex Mono"';
  ['01  校園異聞 ........ OPEN', '02  黑森林試煉 ...... OPEN', '03  ████████ ..... SEALED', '04  ████████ ..... SEALED'].forEach((l, i) => g.fillText(l, 60, 210 + i * 50));
  return toTexture(c);
}

export function ticketStub(text, color = '#7b2530', seed = 1) {
  const { c, g, w, h } = canvas(600, 260);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.02, amount: 0.2 });
  g.strokeStyle = 'rgba(236,217,171,0.7)';
  g.lineWidth = 3;
  g.strokeRect(18, 18, w - 36, h - 36);
  g.fillStyle = '#ecd9ab';
  g.font = '600 40px "Barlow Condensed"';
  g.textAlign = 'center';
  spacedText(g, 'ADMIT ONE', w / 2, 90, 10, 'center');
  g.font = 'italic 500 56px "Bodoni Moda"';
  g.fillText(text, w / 2, 170);
  g.font = '400 24px "IBM Plex Mono"';
  g.fillText('No. 00' + seed + '42', w / 2, 220);
  return toTexture(c);
}

export function photoPrint(img, caption = '') {
  const { c, g, w, h } = canvas(520, 620);
  g.fillStyle = '#f2ece0';
  g.fillRect(0, 0, w, h);
  g.drawImage(img, 30, 30, w - 60, h - 150);
  g.fillStyle = '#3a2f25';
  g.font = 'italic 500 36px "Cormorant Garamond"';
  g.fillText(caption, 36, h - 60);
  grain(g, w, h, 8, 3);
  return toTexture(c);
}

export function notePaper(seed = 3) {
  const { c, g, w, h } = canvas(600, 700);
  g.fillStyle = '#e9dfc5';
  g.fillRect(0, 0, w, h);
  mottle(g, w, h, { seed, scale: 0.01, amount: 0.1 });
  fakeLines(g, 50, 80, w - 100, h - 140, { seed, lineH: 34, thickness: 3, color: 'rgba(40,50,80,0.5)' });
  paperDetail(g, w, h, { seed, fibers: 300, specks: 60, stains: 2 });
  return toTexture(c);
}
