import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as CA from './campusArt.js';
import { Batcher } from '../../fx/Batcher.js';
import { createShaft, createDust } from '../../fx/Dust.js';
import { canvas, toTexture, rng } from '../../art/painter.js';
import { paintPhoto } from '../../art/illustrations.js';

/**
 * Three hand-built areas of Kuremi High at 16:30–17:30.
 * Camera looks toward −z. Each builder returns an Area description.
 */

const std = (o) => new THREE.MeshStandardMaterial(o);

let _mats = null;
function mats() {
  if (_mats) return _mats;
  const wall = CA.plasterWall(1024, 1024, { seed: 2 });
  wall.repeat.set(0.25, 0.3);
  _mats = {
    wall: std({ map: wall, roughness: 0.92, color: 0xfff6ea }),
    wallPlain: std({ color: 0xe6d8c2, roughness: 0.95 }),
    trim: std({ color: 0x8a6a52, roughness: 0.6 }),
    frame: std({ color: 0xd9d2c4, roughness: 0.5, metalness: 0.2 }),
    darkFrame: std({ color: 0x4a3a34, roughness: 0.6 }),
    wood: std({ map: CA.woodTex(3, [160, 108, 70]), roughness: 0.55 }),
    woodDark: std({ map: CA.woodTex(5, [110, 72, 50]), roughness: 0.55 }),
    metal: std({ color: 0x9aa4a0, roughness: 0.45, metalness: 0.5 }),
    steel: std({ color: 0x6e7874, roughness: 0.4, metalness: 0.6 }),
    red: std({ color: 0xc03a32, roughness: 0.45 }),
    ceiling: std({ color: 0xe8dccb, roughness: 1 }),
    lampTube: new THREE.MeshStandardMaterial({ color: 0xf2efe6, emissive: 0x302c26, roughness: 0.4 }),
    cork: std({ color: 0xa47a4c, roughness: 1 }),
    plantPot: std({ color: 0xb2694a, roughness: 0.8 }),
    leaf: std({ color: 0x4a6a3a, roughness: 0.8, side: THREE.DoubleSide }),
    chairLeg: std({ color: 0x8a908c, roughness: 0.4, metalness: 0.6 }),
    deskTop: std({ map: CA.woodTex(7, [196, 150, 104]), roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, depthWrite: false }),
    fgDark: std({ color: 0x5e4c4a, roughness: 0.95 }),
    fgFrame: std({ color: 0x2e2422, roughness: 0.7 }),
  };
  return _mats;
}

function planeTex(tex, w, h, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: o.rough ?? 0.9, ...o.mat }));
  m.castShadow = o.cast ?? false;
  m.receiveShadow = true;
  return m;
}

/** Sky backdrop far behind the windows. */
function skyBackdrop(group, tex, { z = -14, w = 60, h = 26, y = 6, x = 0, boost = 1.0 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: false, color: new THREE.Color(boost, boost, boost) }));
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

/** Foliage cluster planes (outside) — they sway and cast moving leaf shadows. */
function leafTexture(seed = 1) {
  const { c, g, w, h } = canvas(512, 512);
  const r = rng(seed);
  for (let i = 0; i < 260; i++) {
    const x = r() * w;
    const y = r() * h * 0.9;
    const s = r.range(8, 22);
    g.fillStyle = `rgba(${60 + r() * 30},${56 + r() * 30},${52 + r() * 20},1)`;
    g.beginPath();
    g.ellipse(x, y, s, s * 0.55, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(50,40,40,1)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(w * 0.5, h);
  g.quadraticCurveTo(w * 0.45, h * 0.6, w * 0.2, h * 0.3);
  g.moveTo(w * 0.47, h * 0.7);
  g.quadraticCurveTo(w * 0.6, h * 0.45, w * 0.85, h * 0.35);
  g.stroke();
  return toTexture(c);
}

function foliage(group, positions, seed = 1) {
  const tex = leafTexture(seed);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, color: 0x9a7a88, roughness: 1 });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  const list = [];
  positions.forEach(([x, y, z, s], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4 * s, 4 * s), mat);
    m.position.set(x, y, z);
    m.rotation.set(0, 0, i * 0.7);
    m.castShadow = true;
    m.customDepthMaterial = depth;
    m.userData.base = m.rotation.z;
    m.userData.ph = i * 1.7;
    group.add(m);
    list.push(m);
  });
  return list;
}

function curtain(w, h, tex) {
  const g = new THREE.PlaneGeometry(w, h, 20, 16);
  g.translate(0, -h / 2, 0);
  g.userData.base = g.attributes.position.array.slice();
  const m = new THREE.Mesh(g, std({ map: tex, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.94 }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function animateCurtain(c, t, strength = 1) {
  const pos = c.geometry.attributes.position;
  const base = c.geometry.userData.base;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const fall = -y / 2.2;
    const wave = Math.sin(t * 1.7 + x * 3 + y * 1.2) * 0.07 + Math.sin(t * 2.9 + x * 7) * 0.025;
    pos.setZ(i, Math.sin(x * 16) * 0.03 + (wave + 0.08) * fall * strength);
    pos.setX(i, x + Math.sin(t * 1.3 + y) * 0.03 * fall * strength);
  }
  pos.needsUpdate = true;
  c.geometry.computeVertexNormals();
}

function pottedPlant(b, M, x, z, s = 1) {
  b.add(new THREE.CylinderGeometry(0.22 * s, 0.17 * s, 0.4 * s, 16), M.plantPot, [x, 0.2 * s, z]);
  const leafGeo = new THREE.SphereGeometry(0.22 * s, 10, 8);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.add(leafGeo, M.leaf, [x + Math.cos(a) * 0.18 * s, (0.62 + (i % 3) * 0.14) * s, z + Math.sin(a) * 0.12 * s], [0, 0, 0], [1, 1.3, 0.7]);
  }
}

function fireExtinguisher(b, M, x, z) {
  b.add(new THREE.BoxGeometry(0.5, 0.8, 0.22), M.red, [x, 0.95, z]);
  b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 12), M.red, [x, 0.34, z + 0.05]);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), M.steel, [x, 0.66, z + 0.05]);
}

function wallClock(group, x, y, z) {
  const tex = (() => {
    const { c, g } = canvas(256, 256);
    g.fillStyle = '#f7f2e8';
    g.beginPath();
    g.arc(128, 128, 124, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a2420';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(128 + Math.cos(a) * 100 - 3, 128 + Math.sin(a) * 100 - 8, 6, 16);
    }
    return toTexture(c);
  })();
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 32), std({ color: 0x3a3a3a, roughness: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  grp.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), std({ map: tex }));
  face.position.z = 0.035;
  grp.add(face);
  const mk = (len, w) => {
    const g = new THREE.BoxGeometry(w, len, 0.01);
    g.translate(0, len / 2, 0);
    const h = new THREE.Mesh(g, std({ color: 0x151515 }));
    h.position.z = 0.045;
    grp.add(h);
    return h;
  };
  const hh = mk(0.13, 0.02);
  const mh = mk(0.2, 0.012);
  group.add(grp);
  return { set(min) { mh.rotation.z = -(min / 60) * Math.PI * 2; hh.rotation.z = -((16 + min / 60) / 12) * Math.PI * 2; } };
}

/** Common: window-wall with rectangular bays. Returns glass anchor points. */
function windowWall(group, M, { x0, x1, z, bay = 4, winW = 3, sill = 0.95, top = 2.85, height = 3.4, thickness = 0.25 }) {
  const shape = new THREE.Shape();
  shape.moveTo(x0, 0);
  shape.lineTo(x1, 0);
  shape.lineTo(x1, height);
  shape.lineTo(x0, height);
  shape.lineTo(x0, 0);
  const wins = [];
  for (let x = x0 + bay / 2; x < x1 - 0.5; x += bay) {
    const h = new THREE.Path();
    h.moveTo(x - winW / 2, sill);
    h.lineTo(x + winW / 2, sill);
    h.lineTo(x + winW / 2, top);
    h.lineTo(x - winW / 2, top);
    h.lineTo(x - winW / 2, sill);
    shape.holes.push(h);
    wins.push(x);
  }
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), M.wall);
  wall.position.z = z - thickness;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);
  // frames: aluminium sashes (2 panes each, 3 rows)
  const b = new Batcher();
  for (const x of wins) {
    const w = winW;
    const hh = top - sill;
    b.add(new THREE.BoxGeometry(w + 0.08, 0.06, 0.12), M.frame, [x, sill, z + 0.02]);
    b.add(new THREE.BoxGeometry(w + 0.08, 0.06, 0.12), M.frame, [x, top, z + 0.02]);
    b.add(new THREE.BoxGeometry(0.06, hh, 0.12), M.frame, [x - w / 2, sill + hh / 2, z + 0.02]);
    b.add(new THREE.BoxGeometry(0.06, hh, 0.12), M.frame, [x + w / 2, sill + hh / 2, z + 0.02]);
    b.add(new THREE.BoxGeometry(0.05, hh, 0.08), M.frame, [x, sill + hh / 2, z + 0.03]);
    b.add(new THREE.BoxGeometry(w, 0.04, 0.07), M.frame, [x, sill + hh * 0.66, z + 0.03]);
    // sill board
    b.add(new THREE.BoxGeometry(w + 0.3, 0.05, 0.28), M.trim, [x, sill - 0.02, z + 0.1]);
  }
  b.build(group);
  return wins;
}

// ═══════════════════════════════ CORRIDOR ═══════════════════════════════
export function buildCorridor(res) {
  const M = mats();
  const group = new THREE.Group();
  group.name = 'corridor';
  const X0 = -17;
  const X1 = 17;
  const Z = -1.9;

  // floor
  const floorTex = CA.schoolFloor(1024, 1024, 4);
  floorTex.repeat.set(8, 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 4, 6), std({ map: floorTex, roughness: 0.48, metalness: 0.0, color: 0xd8c4b0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.6);
  floor.receiveShadow = true;
  group.add(floor);
  // ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 4, 6), M.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.4, 0.6);
  ceil.receiveShadow = true;
  group.add(ceil);

  const wins = windowWall(group, M, { x0: X0, x1: X1, z: Z, bay: 4.25, winW: 3.1 });

  // outside: sky + trees (their foliage casts moving leaf shadows)
  const skyTex = res.sky;
  skyBackdrop(group, skyTex, { z: -16, w: 70, h: 30, y: 6 });
  const leaves = foliage(group, [[-12, 3.2, -4.5, 1.2], [-3, 3.6, -5, 1.4], [7, 3.1, -4.2, 1.1], [14, 3.5, -5, 1.3], [1.5, 1.8, -6, 1.0]], 3);

  // curtains on some windows
  const curtains = [];
  const ct = CA.curtainTex();
  wins.forEach((x, i) => {
    if (i % 2) return;
    const c = curtain(0.85, 2.0, ct);
    c.position.set(x - 1.1, 2.9, Z + 0.12);
    group.add(c);
    curtains.push(c);
  });

  // lower wall furniture along the window wall
  const b = new Batcher();
  // radiator-like lower cabinets
  for (const x of wins) b.add(new RoundedBoxGeometry(2.6, 0.55, 0.25, 2, 0.03), M.frame, [x, 0.33, Z + 0.14]);
  // skirting
  b.add(new THREE.BoxGeometry(X1 - X0, 0.12, 0.04), M.trim, [0, 0.06, Z + 0.02]);
  // ceiling lights
  for (let x = X0 + 2; x < X1; x += 4) {
    b.add(new THREE.BoxGeometry(1.3, 0.06, 0.22), M.frame, [x, 3.36, 0.1]);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), M.lampTube, [x, 3.3, 0.1], [0, 0, Math.PI / 2]);
  }
  // shoe cabinet block (left end)
  const lockerTex = CA.lockerTexture(6, 3, '#9aaaa2');
  const lockers = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 0.5), [M.metal, M.metal, M.metal, M.metal, std({ map: lockerTex, roughness: 0.45, metalness: 0.35 }), M.metal]);
  lockers.position.set(-14.6, 0.8, Z + 0.35);
  lockers.castShadow = lockers.receiveShadow = true;
  group.add(lockers);
  // water fountain
  b.add(new THREE.BoxGeometry(1.3, 0.85, 0.5), M.metal, [9.2, 0.43, Z + 0.35]);
  b.add(new THREE.BoxGeometry(1.3, 0.12, 0.6), M.steel, [9.2, 0.91, Z + 0.35]);
  for (let i = 0; i < 3; i++) b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), M.steel, [8.8 + i * 0.4, 1.03, Z + 0.4]);
  // fire extinguisher box
  fireExtinguisher(b, M, 1.1, Z + 0.25);
  // cleaning tools
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), M.woodDark, [-5.7, 0.7, Z + 0.3], [0, 0, 0.12]);
  b.add(new THREE.BoxGeometry(0.36, 0.08, 0.1), M.darkFrame, [-5.62, 0.04, Z + 0.34]);
  b.add(new THREE.CylinderGeometry(0.18, 0.15, 0.3, 14), std({ color: 0x4a7aa0, roughness: 0.5 }), [-5.25, 0.15, Z + 0.4]);
  b.add(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 6), M.woodDark, [-5.45, 0.62, Z + 0.25], [0.1, 0, -0.1]);
  pottedPlant(b, M, -16.2, Z + 0.35, 1.1);
  pottedPlant(b, M, 11.6, Z + 0.4, 1);
  b.build(group);

  // bulletin boards + posters on the pillars between windows
  const pillarXs = wins.slice(0, -1).map((x) => x + 4.25 / 2);
  const posterKinds = ['festival', 'run', 'library', 'lost', 'club', 'clean', 'choir'];
  pillarXs.forEach((x, i) => {
    if (i === 3) return;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.04), M.cork);
    board.position.set(x, 1.75, Z + 0.03);
    board.receiveShadow = true;
    group.add(board);
    const p = planeTex(CA.poster(posterKinds[i % posterKinds.length], i + 1), 0.5, 0.7);
    p.position.set(x - 0.15, 1.8, Z + 0.06);
    p.rotation.z = (i % 2 ? 1 : -1) * 0.04;
    group.add(p);
    const p2 = planeTex(CA.poster(posterKinds[(i + 3) % posterKinds.length], i + 11), 0.34, 0.47);
    p2.position.set(x + 0.25, 1.62, Z + 0.065);
    p2.rotation.z = (i % 2 ? -1 : 1) * 0.06;
    group.add(p2);
  });
  // student artwork frames
  [[pillarXs[3] - 0.25, 1.9, 'sea'], [pillarXs[3] + 0.28, 1.6, 'street']].forEach(([x, y, k], i) => {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.03), M.darkFrame);
    fr.position.set(x, y, Z + 0.03);
    group.add(fr);
    const ph = planeTex(toTexture(paintPhoto(k, 300, 260, 60 + i)), 0.4, 0.34);
    ph.position.set(x, y, Z + 0.05);
    group.add(ph);
  });
  const clock = wallClock(group, pillarXs[1], 2.95, Z + 0.04);

  // ── foreground (camera side): classroom wall pillars, door frames, class plates
  const fg = new Batcher();
  const doorXs = [-9.5, -2.5, 4.5];
  const plateNames = ['2-A', '2-B', '2-C'];
  const fgZ = 1.75;
  [-16.2, -6.2, 1.2, 7.8, 16.2].forEach((x) => fg.add(new THREE.BoxGeometry(0.34, 3.4, 0.34), M.fgDark, [x, 1.7, fgZ + 0.25]));
  doorXs.forEach((x) => {
    fg.add(new THREE.BoxGeometry(0.1, 2.1, 0.16), M.fgFrame, [x - 0.95, 1.05, fgZ]);
    fg.add(new THREE.BoxGeometry(0.1, 2.1, 0.16), M.fgFrame, [x + 0.95, 1.05, fgZ]);
    fg.add(new THREE.BoxGeometry(2.0, 0.12, 0.16), M.fgFrame, [x, 2.12, fgZ]);
    fg.add(new THREE.BoxGeometry(2.3, 1.2, 0.16), M.fgDark, [x, 2.8, fgZ + 0.02]);
  });
  fg.build(group, { cast: false });
  const plates = doorXs.map((x, i) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.8), [M.frame, M.frame, M.frame, M.frame, M.frame, M.frame]);
    plate.position.set(x + 0.9, 2.55, fgZ - 0.5);
    group.add(plate);
    const face = planeTex(CA.classPlate(plateNames[i]), 0.72, 0.28);
    face.rotation.y = Math.PI / 2;
    face.position.set(x + 0.94, 2.55, fgZ - 0.5);
    group.add(face);
    const face2 = face.clone();
    face2.rotation.y = -Math.PI / 2;
    face2.position.x = x + 0.86;
    group.add(face2);
    return plate;
  });
  void plates;

  // library end wall with double doors
  const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 4), M.wall);
  endWall.position.set(X1 + 0.15, 1.7, 0);
  endWall.receiveShadow = true;
  group.add(endWall);
  const libDoor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 1.8), M.woodDark);
  libDoor.position.set(X1 - 0.02, 1.15, -0.1);
  libDoor.castShadow = libDoor.receiveShadow = true;
  group.add(libDoor);
  const libSign = planeTex(CA.classPlate('圖書館'), 1.2, 0.45);
  libSign.rotation.y = -Math.PI / 2;
  libSign.position.set(X1 - 0.08, 2.62, -0.1);
  group.add(libSign);
  const leftEnd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 4), M.wall);
  leftEnd.position.set(X0 - 0.15, 1.7, 0);
  group.add(leftEnd);

  // light shafts through each window toward the camera + dust
  const sunDir = new THREE.Vector3(0.3, -0.42, 1).normalize();
  const shafts = [];
  wins.forEach((x) => {
    for (let k = 0; k < 2; k++) {
      const s = createShaft({ from: new THREE.Vector3(x - 0.6 + k * 1.2, 2.7, Z + 0.1), dir: sunDir, length: 4.2, width: 1.0, color: 0xffc080, opacity: 0.032 });
      group.add(s);
      shafts.push(s);
    }
  });
  const dust = createDust({ count: 420, box: [[X0, 0.2, -1.8], [X1, 3, 1.6]], size: 0.02, opacity: 0.7, speed: 0.1, color: 0xffe2b0 });
  group.add(dust);

  return {
    id: 'corridor',
    group,
    name: '二樓 西側走廊',
    nameEn: 'WEST CORRIDOR · 2F',
    bounds: { xMin: X0 + 0.8, xMax: X1 - 0.8, zMin: -1.0, zMax: 0.9 },
    cam: { y: 2.25, z: 6.6, lookY: 1.12, lookZ: -1.2, fov: 34, xMin: X0 + 4.4, xMax: X1 - 4.4, dist: 8.2 },
    floor: 'tile',
    sunDir,
    sun: { color: 0xffae6a, intensity: 3.6 },
    hemi: { sky: 0x8a86b4, ground: 0xa87a60, intensity: 0.75 },
    fog: { color: 0xb88870, density: 0.005 },
    doors: [
      { id: 'toClass', x: -2.5, z: 0.7, to: 'classroom', spawn: { x: 5.2, z: 1.9 }, label: '二年B組', labelEn: 'CLASS 2-B', mode: 'enter' },
      { id: 'toClassA', x: -9.5, z: 0.7, locked: '二年A組的門鎖著。裡面已經沒有人了。', label: '二年A組', labelEn: 'CLASS 2-A', mode: 'enter' },
      { id: 'toClassC', x: 4.5, z: 0.7, locked: '二年C組正在開班會,還是別打擾吧。', label: '二年C組', labelEn: 'CLASS 2-C', mode: 'enter' },
      { id: 'toLib', x: X1 - 1.2, z: -0.1, to: 'library', spawn: { x: -8.8, z: 0.6 }, label: '圖書館', labelEn: 'LIBRARY', mode: 'enter' },
    ],
    obstacles: [
      { x0: 8.5, x1: 9.9, z0: -2, z1: -1.05 },
      { x0: -16.3, x1: -12.9, z0: -2, z1: -1.05 },
    ],
    lightAt(p) {
      // warm where sunlight falls through a window (projected onto floor band), cool elsewhere
      let lit = 0;
      for (const x of wins) {
        const sx = x + sunDir.x * ((p.z - Z) / sunDir.z) * 0.9;
        const d = Math.abs(p.x - sx);
        lit = Math.max(lit, 1 - THREE.MathUtils.smoothstep(d, 1.1, 1.9));
      }
      return lit;
    },
    update(t) {
      for (const c of curtains) animateCurtain(c, t, 1);
      for (const l of leaves) l.rotation.z = l.userData.base + Math.sin(t * 0.9 + l.userData.ph) * 0.05;
      dust.material.uniforms.time.value = t;
      clock.set(Math.min(59, 30 + t / 20));
    },
    shafts,
  };
}

// ═══════════════════════════════ CLASSROOM ═══════════════════════════════
export function buildClassroom(res) {
  const M = mats();
  const group = new THREE.Group();
  group.name = 'classroom';
  const X0 = -7.5;
  const X1 = 7.5;
  const Z = -4.8;
  const floorTex = CA.schoolFloor(1024, 1024, 9, [168, 118, 82]);
  floorTex.repeat.set(4, 2.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 10), std({ map: floorTex, roughness: 0.4, color: 0xf2e0cc }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 6, 22), M.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.3, 6);
  group.add(ceil);
  // front beam + fluorescent fixtures (seen at the top edge of the frame)
  const fb = new Batcher();
  fb.add(new THREE.BoxGeometry(X1 - X0 + 6, 0.35, 0.3), M.wallPlain, [0, 3.15, 5.2]);
  for (const x of [-4.5, 0, 4.5]) for (const z of [-2.5, 1.5]) {
    fb.add(new THREE.BoxGeometry(1.3, 0.06, 0.22), M.frame, [x, 3.26, z]);
    fb.add(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), M.lampTube, [x, 3.2, z], [0, 0, Math.PI / 2]);
  }
  fb.build(group, { cast: false });

  const wins = windowWall(group, M, { x0: X0, x1: X1, z: Z, bay: 3.75, winW: 3.1, sill: 0.9, top: 2.95, height: 3.3 });
  skyBackdrop(group, res.sky2, { z: -18, w: 70, h: 30, y: 5 });
  const leaves = foliage(group, [[-4, 3.4, -7.5, 1.4], [5, 3.0, -8, 1.3]], 7);
  const ct = CA.curtainTex();
  const curtains = [];
  wins.forEach((x) => {
    for (const s of [-1, 1]) {
      const c = curtain(0.75, 2.2, ct);
      c.position.set(x + s * 1.2, 3.0, Z + 0.15);
      group.add(c);
      curtains.push(c);
    }
  });

  // side walls
  const lw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 10), M.wall);
  lw.position.set(X0 - 0.1, 1.65, 0);
  lw.receiveShadow = true;
  group.add(lw);
  const rw = lw.clone();
  rw.position.x = X1 + 0.1;
  group.add(rw);
  // blackboard on the left wall
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.45), std({ map: CA.blackboard(), roughness: 0.85 }));
  bb.rotation.y = Math.PI / 2;
  bb.position.set(X0 + 0.02, 1.75, -1.2);
  bb.receiveShadow = true;
  group.add(bb);
  const bbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 4.8), M.trim);
  bbFrame.position.set(X0 + 0.01, 1.75, -1.2);
  group.add(bbFrame);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 4.6), M.trim);
  tray.position.set(X0 + 0.08, 0.98, -1.2);
  group.add(tray);
  // timetable + notices on the right wall
  const tt = planeTex(CA.timetable(), 0.9, 0.7);
  tt.rotation.y = -Math.PI / 2;
  tt.position.set(X1 - 0.02, 1.7, -2.2);
  group.add(tt);
  const np = planeTex(CA.poster('clean', 4), 0.5, 0.7);
  np.rotation.y = -Math.PI / 2;
  np.position.set(X1 - 0.02, 1.6, -0.9);
  group.add(np);
  const clock = wallClock(group, 0, 2.3, Z + 0.04);

  // desks grid (5 rows along z × 6 columns along x) facing the blackboard (−x)
  const b = new Batcher();
  const desks = [];
  const deskTopGeo = new THREE.BoxGeometry(0.62, 0.04, 0.46);
  const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.72, 6);
  const chairSeat = new THREE.BoxGeometry(0.4, 0.03, 0.4);
  const chairBack = new THREE.BoxGeometry(0.03, 0.34, 0.4);
  const bookGeo = new THREE.BoxGeometry(0.2, 0.03, 0.27);
  const bagGeo = new RoundedBoxGeometry(0.3, 0.24, 0.1, 2, 0.03);
  const bookMats = [std({ color: 0x7a2a2a, roughness: 0.7 }), std({ color: 0x2a4a6a, roughness: 0.7 }), std({ color: 0xe8e0d0, roughness: 0.9 }), std({ color: 0x3a6a4a, roughness: 0.7 })];
  const bagMat = std({ color: 0x2a2a34, roughness: 0.6 });
  const r = rng(12);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const x = -3.6 + col * 1.55;
      const z = -3.9 + row * 1.05;
      b.add(deskTopGeo, M.deskTop, [x, 0.74, z]);
      for (const [dx, dz] of [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]]) b.add(legGeo, M.chairLeg, [x + dx, 0.37, z + dz]);
      b.add(new THREE.BoxGeometry(0.56, 0.12, 0.4), M.chairLeg, [x, 0.64, z]);
      const cx = x + 0.48;
      b.add(chairSeat, M.deskTop, [cx, 0.44, z]);
      b.add(chairBack, M.deskTop, [cx + 0.2, 0.72, z]);
      for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 6), M.chairLeg, [cx + dx, 0.22, z + dz]);
      if (r() < 0.45) b.add(bookGeo, r.pick(bookMats), [x + r.range(-0.1, 0.1), 0.78, z + r.range(-0.08, 0.08)], [0, r.range(-0.4, 0.4), 0]);
      if (r() < 0.25) b.add(bagGeo, bagMat, [cx + 0.02, 0.6, z + 0.25], [0.2, 0, 0]);
      desks.push({ x, z, col, row });
    }
  }
  // teacher desk + podium
  b.add(new RoundedBoxGeometry(1.6, 0.8, 0.8, 2, 0.02), M.woodDark, [-5.6, 0.4, -1.2]);
  b.add(new THREE.BoxGeometry(0.5, 0.1, 0.35), bookMats[2], [-5.5, 0.85, -1.4]);
  b.add(new THREE.BoxGeometry(1.2, 0.18, 4.4), M.wood, [-6.9, 0.09, -1.2]);
  // lockers at the back (camera side, right)
  b.add(new THREE.BoxGeometry(3.4, 1.1, 0.45), M.steel, [4.8, 0.55, 3.7]);
  // cleaning cabinet
  b.add(new THREE.BoxGeometry(0.8, 1.9, 0.5), M.steel, [6.9, 0.95, -4.3]);
  b.build(group);
  const lockTex = CA.lockerTexture(6, 2, '#b0b8a8');
  const lockFace = planeTex(lockTex, 3.4, 1.1);
  lockFace.rotation.y = Math.PI;
  lockFace.position.set(4.8, 0.55, 3.47);
  group.add(lockFace);

  // Yuki's desk: back row by the window (col 3, row 0) — notebook
  const yuki = desks.find((d) => d.col === 3 && d.row === 0);
  const note = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.27), [0, 0, 0, 0, 0, 0].map((_, i) => (i === 2 ? std({ map: CA.noteCover(), roughness: 0.8 }) : std({ color: 0x3a5a8a }))));
  note.position.set(yuki.x - 0.05, 0.775, yuki.z + 0.02);
  note.rotation.y = 0.3;
  note.castShadow = true;
  group.add(note);
  const glint = new THREE.PointLight(0xffd9a0, 0, 1.2, 2);
  glint.position.set(yuki.x, 1.0, yuki.z + 0.2);
  group.add(glint);

  // shafts + dust
  const sunDir = new THREE.Vector3(-0.25, -0.45, 1).normalize();
  const shafts = [];
  wins.forEach((x) => {
    for (let k = 0; k < 2; k++) {
      const s = createShaft({ from: new THREE.Vector3(x - 0.7 + k * 1.4, 2.8, Z + 0.1), dir: sunDir, length: 5.5, width: 1.2, color: 0xffc27e, opacity: 0.035 });
      group.add(s);
      shafts.push(s);
    }
  });
  const dust = createDust({ count: 380, box: [[X0, 0.3, Z], [X1, 3.1, 2.5]], size: 0.02, opacity: 0.75, speed: 0.08, color: 0xffe2b0 });
  group.add(dust);

  // desk collision boxes (each desk + chair)
  const obstacles = desks.map((d) => ({ x0: d.x - 0.36, x1: d.x + 0.72, z0: d.z - 0.28, z1: d.z + 0.28 }));
  obstacles.push({ x0: -6.5, x1: -4.7, z0: -1.7, z1: -0.7 }, { x0: 3, x1: 6.6, z0: 3.4, z1: 4 }, { x0: 6.4, x1: 7.4, z0: -4.8, z1: -3.9 });

  return {
    id: 'classroom',
    group,
    name: '二年B組 教室',
    nameEn: 'CLASSROOM 2-B',
    bounds: { xMin: X0 + 1.0, xMax: X1 - 0.6, zMin: -4.3, zMax: 2.6 },
    cam: { y: 2.9, z: 9.6, lookY: 1.0, lookZ: -1.6, fov: 34, xMin: -2.2, xMax: 2.2, dist: 10.5, followZ: 0.35 },
    floor: 'wood',
    sunDir,
    sun: { color: 0xffb070, intensity: 3.8 },
    hemi: { sky: 0x8a86b4, ground: 0xa87a60, intensity: 0.75 },
    fog: { color: 0xb88870, density: 0.006 },
    doors: [{ id: 'toCorr', x: 6.4, z: 2.4, to: 'corridor', spawn: { x: -2.5, z: 0.5 }, label: '走廊', labelEn: 'CORRIDOR', mode: 'enter' }],
    obstacles,
    notebook: { mesh: note, glint, pos: new THREE.Vector3(yuki.x, 0.8, yuki.z + 0.5) },
    lightAt(p) {
      let lit = 0;
      for (const x of wins) {
        const sx = x + sunDir.x * ((p.z - Z) / sunDir.z) * 0.9;
        lit = Math.max(lit, 1 - THREE.MathUtils.smoothstep(Math.abs(p.x - sx), 1.2, 2.0));
      }
      return lit;
    },
    update(t) {
      for (const c of curtains) animateCurtain(c, t, 1.2);
      for (const l of leaves) l.rotation.z = l.userData.base + Math.sin(t * 0.8 + l.userData.ph) * 0.06;
      dust.material.uniforms.time.value = t;
      clock.set(Math.min(59, 30 + t / 20));
      glint.intensity = 0.6 + Math.sin(t * 3) * 0.4;
    },
    shafts,
  };
}

// ═══════════════════════════════ LIBRARY ═══════════════════════════════
export function buildLibrary(res) {
  const M = mats();
  const group = new THREE.Group();
  group.name = 'library';
  const X0 = -10.5;
  const X1 = 10.5;
  const Z = -3.8;
  const floorTex = CA.schoolFloor(1024, 1024, 13, [120, 78, 58]);
  floorTex.repeat.set(6, 2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 2, 10), std({ map: floorTex, roughness: 0.45, color: 0xd8c0a8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 2, 10), std({ color: 0x5a4a40, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 4.4;
  group.add(ceil);

  // back wall with high clerestory windows
  const shape = new THREE.Shape();
  shape.moveTo(X0, 0);
  shape.lineTo(X1, 0);
  shape.lineTo(X1, 4.4);
  shape.lineTo(X0, 4.4);
  shape.lineTo(X0, 0);
  const hiWins = [];
  for (let x = X0 + 2.2; x < X1 - 1; x += 3.4) {
    const h = new THREE.Path();
    h.moveTo(x - 1.1, 3.0);
    h.lineTo(x + 1.1, 3.0);
    h.lineTo(x + 1.1, 4.1);
    h.lineTo(x - 1.1, 4.1);
    h.lineTo(x - 1.1, 3.0);
    shape.holes.push(h);
    hiWins.push(x);
  }
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), std({ color: 0x8a6e5a, roughness: 0.9 }));
  wall.position.z = Z - 0.3;
  wall.castShadow = wall.receiveShadow = true;
  group.add(wall);
  skyBackdrop(group, res.sky2, { z: -14, w: 60, h: 26, y: 7, boost: 0.9 });

  // tall shelves along the back wall, full of books (instanced)
  const booksAtlas = CA.libraryBooks(9);
  const bookMat = [std({ color: 0xd8ccb0 }), std({ map: booksAtlas.texture, roughness: 0.75 }), std({ color: 0xd8ccb0 }), std({ color: 0xd8ccb0 }), std({ color: 0x4a3a30 }), std({ color: 0x4a3a30 })];
  bookMat[1].onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float spineIdx;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((uv.x + spineIdx) / ${booksAtlas.count}.0, uv.y);\n#endif`);
  };
  const shelfB = new Batcher();
  const books = [];
  const r = rng(4);
  const addShelf = (cx, cz, w, h, rotY = 0, levels = 6) => {
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const P = (lx, ly, lz) => [cx + lx * cos + lz * sin, ly, cz - lx * sin + lz * cos];
    shelfB.add(new THREE.BoxGeometry(w, h, 0.05), M.woodDark, P(0, h / 2, -0.22), [0, rotY, 0]);
    for (const s of [-1, 1]) shelfB.add(new THREE.BoxGeometry(0.06, h, 0.5), M.woodDark, P((s * w) / 2, h / 2, 0), [0, rotY, 0]);
    for (let l = 0; l <= levels; l++) {
      const y = 0.08 + (l * (h - 0.12)) / levels;
      shelfB.add(new THREE.BoxGeometry(w, 0.04, 0.5), M.woodDark, P(0, y, 0), [0, rotY, 0]);
      if (l === levels) continue;
      let x = -w / 2 + 0.05;
      const lh = (h - 0.12) / levels;
      while (x < w / 2 - 0.06) {
        if (r() < 0.05) {
          x += 0.15;
          continue;
        }
        const bw = r.range(0.03, 0.06);
        const bh = r.range(0.6, 0.9) * lh;
        books.push({ p: P(x + bw / 2, y + 0.02 + bh / 2, 0.02), rotY, bw, bh, bd: r.range(0.22, 0.32), lean: r() < 0.05 ? r.range(0.1, 0.25) : 0, uv: r.int(0, booksAtlas.count - 1) });
        x += bw + 0.004;
      }
    }
  };
  for (let x = X0 + 1.2; x < X1 - 1; x += 2.3) addShelf(x, Z + 0.3, 2.1, 2.8, 0, 6);
  // perpendicular stacks (depth) in the middle distance
  for (const x of [-6, -2.5, 3.5, 7]) addShelf(x, -1.9, 2.4, 2.2, Math.PI / 2, 5);
  shelfB.build(group);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const idx = new Float32Array(books.length);
  books.forEach((bk, i) => (idx[i] = bk.uv));
  geo.setAttribute('spineIdx', new THREE.InstancedBufferAttribute(idx, 1));
  const inst = new THREE.InstancedMesh(geo, bookMat, books.length);
  const d = new THREE.Object3D();
  books.forEach((bk, i) => {
    d.position.set(...bk.p);
    d.rotation.set(0, bk.rotY + Math.PI / 2, bk.lean);
    d.scale.set(bk.bd, bk.bh, bk.bw);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  });
  inst.castShadow = inst.receiveShadow = true;
  group.add(inst);

  // reading tables + green lamps, counter, cart, notice board
  const b = new Batcher();
  const tables = [[-3.8, 0.2], [1.2, 0.2], [5.8, -0.2]];
  const lampLights = [];
  for (const [x, z] of tables) {
    b.add(new RoundedBoxGeometry(2.4, 0.06, 1.0, 2, 0.02), M.wood, [x, 0.76, z - 1.1]);
    for (const [dx, dz] of [[-1.05, -0.4], [1.05, -0.4], [-1.05, 0.4], [1.05, 0.4]]) b.add(new THREE.BoxGeometry(0.06, 0.74, 0.06), M.woodDark, [x + dx, 0.37, z - 1.1 + dz]);
    for (const s of [-0.6, 0.6]) {
      b.add(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 16), M.metal, [x + s, 0.8, z - 1.3]);
      b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), M.metal, [x + s, 0.95, z - 1.3]);
      b.add(new THREE.CylinderGeometry(0.02, 0.14, 0.12, 16, 1, true), std({ color: 0x2a5a3a, emissive: 0x1a3a22, side: THREE.DoubleSide, roughness: 0.3 }), [x + s, 1.12, z - 1.3]);
    }
    const L = new THREE.PointLight(0xffc27a, 5, 4, 1.8);
    L.position.set(x, 1.3, z - 1.2);
    group.add(L);
    lampLights.push(L);
    // chairs
    for (const s of [-0.7, 0.7]) b.add(new THREE.BoxGeometry(0.42, 0.04, 0.42), M.wood, [x + s, 0.46, z - 0.35]);
    // open books / papers
    b.add(new THREE.BoxGeometry(0.4, 0.02, 0.28), std({ color: 0xe8dfc8, roughness: 0.9 }), [x - 0.3, 0.8, z - 1.0], [0, 0.2, 0]);
  }
  // counter
  b.add(new RoundedBoxGeometry(3.2, 1.05, 0.8, 2, 0.02), M.woodDark, [-8.2, 0.52, 1.2]);
  b.add(new RoundedBoxGeometry(3.3, 0.05, 0.9, 2, 0.02), M.wood, [-8.2, 1.07, 1.2]);
  b.add(new THREE.BoxGeometry(0.4, 0.25, 0.3), std({ color: 0x3a3a3a, roughness: 0.5 }), [-7.6, 1.22, 1.1]);
  // book cart
  b.add(new THREE.BoxGeometry(1.0, 0.05, 0.45), M.metal, [8.4, 0.35, 1.5]);
  b.add(new THREE.BoxGeometry(1.0, 0.05, 0.45), M.metal, [8.4, 0.8, 1.5]);
  for (const [dx, dz] of [[-0.48, -0.2], [0.48, -0.2], [-0.48, 0.2], [0.48, 0.2]]) b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), M.metal, [8.4 + dx, 0.45, 1.5 + dz]);
  for (let i = 0; i < 12; i++) b.add(new THREE.BoxGeometry(0.05, 0.28, 0.22), bookMat[i % 2 ? 4 : 0], [8.0 + i * 0.07, 0.95, 1.5], [0, 0, (i % 5) * 0.05]);
  b.build(group);
  // classification labels on the stacks
  ['000 總類', '400 自然', '800 文學', '900 歷史'].forEach((t, i) => {
    const lb = planeTex(CA.classPlate(t, 320, 96), 0.7, 0.21);
    lb.position.set([-6, -2.5, 3.5, 7][i] + 0.02, 2.35, -0.65);
    group.add(lb);
  });
  // notice board by the counter
  const nb = planeTex(CA.poster('library', 22), 0.6, 0.84);
  nb.position.set(-9.6, 1.8, -3.45);
  group.add(nb);

  // the old archive room door (right end), ominous
  const doorG = new THREE.Group();
  doorG.position.set(X1 - 0.6, 0, -2.6);
  group.add(doorG);
  const dFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.2), M.darkFrame);
  dFrame.position.y = 1.25;
  doorG.add(dFrame);
  const dPanel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.25, 0.1), std({ color: 0x3a2a24, roughness: 0.6 }));
  dPanel.position.set(0, 1.15, 0.1);
  dPanel.castShadow = true;
  doorG.add(dPanel);
  const sign = planeTex(CA.classPlate('資料室'), 0.8, 0.3);
  sign.position.set(0, 2.72, 0.12);
  doorG.add(sign);
  const doorGlow = new THREE.PointLight(0xff3a30, 0, 4, 2);
  doorGlow.position.set(0, 1.2, 0.8);
  doorG.add(doorGlow);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), std({ color: 0xc9a45c, metalness: 1, roughness: 0.3 }));
  knob.position.set(0.45, 1.05, 0.18);
  doorG.add(knob);

  // shafts from the high windows + dust
  const sunDir = new THREE.Vector3(0.35, -0.7, 1).normalize();
  const shafts = hiWins.map((x) => {
    const s = createShaft({ from: new THREE.Vector3(x, 3.9, Z), dir: sunDir, length: 6, width: 1.6, color: 0xffb070, opacity: 0.05 });
    group.add(s);
    return s;
  });
  const dust = createDust({ count: 320, box: [[X0, 0.4, Z], [X1, 4, 1.8]], size: 0.022, opacity: 0.6, speed: 0.07, color: 0xffd6a0 });
  group.add(dust);

  const obstacles = [
    ...tables.map(([x, z]) => ({ x0: x - 1.25, x1: x + 1.25, z0: z - 1.65, z1: z - 0.55 })),
    { x0: -9.9, x1: -6.5, z0: 0.75, z1: 1.7 },
    { x0: 7.8, x1: 9.0, z0: 1.2, z1: 1.8 },
  ];
  return {
    id: 'library',
    group,
    name: '圖書館 · 閱覽室',
    nameEn: 'LIBRARY · READING ROOM',
    bounds: { xMin: X0 + 1.2, xMax: X1 - 0.8, zMin: -0.5, zMax: 1.9 },
    cam: { y: 2.3, z: 8.6, lookY: 1.35, lookZ: -1.4, fov: 34, xMin: X0 + 4.5, xMax: X1 - 4.5, dist: 9 },
    floor: 'wood',
    sunDir,
    sun: { color: 0xff9e5a, intensity: 2.5 },
    hemi: { sky: 0x6a6490, ground: 0x7a5040, intensity: 0.55 },
    fog: { color: 0x3a2c34, density: 0.012 },
    doors: [
      { id: 'toCorr', x: X0 + 1.4, z: 0.9, to: 'corridor', spawn: { x: 15.2, z: 0 }, label: '走廊', labelEn: 'CORRIDOR', mode: 'enter' },
      { id: 'archive', x: X1 - 0.6, z: -0.4, special: 'archive', label: '資料室', labelEn: 'OLD ARCHIVE ROOM', mode: 'enter' },
    ],
    obstacles,
    archiveDoor: { group: doorG, glow: doorGlow, panel: dPanel },
    lamps: lampLights,
    lightAt(p) {
      let lit = 0;
      for (const [x, z] of tables) lit = Math.max(lit, 1 - THREE.MathUtils.smoothstep(Math.hypot(p.x - x, p.z - (z - 1)), 1.0, 2.6));
      return lit * 0.7;
    },
    update(t) {
      dust.material.uniforms.time.value = t;
      lampLights.forEach((L, i) => (L.intensity = 5 + Math.sin(t * 7 + i * 3) * 0.08));
    },
    shafts,
  };
}
