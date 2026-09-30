import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './lobbyTextures.js';
import { paintRainyCity, paintPhoto, paintMap } from '../../art/illustrations.js';
import { toTexture, canvas, rng } from '../../art/painter.js';
import { createRainGlassMaterial } from '../../fx/RainGlass.js';

/**
 * The time traveller's private archive room.
 * Returns references to animated / interactive pieces.
 */
export function buildLobbyRoom(scene, assets) {
  const R = { interactables: [], anim: {} };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const add = (mesh, parent = scene, { cast = true, receive = true } = {}) => {
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  };

  // ─────────────────────────── materials ───────────────────────────
  const floorTex = T.woodFloor();
  const wallTex = T.wallpaper();
  wallTex.repeat.set(0.85, 0.85);
  const panelTex = T.panelWood();
  const M = {
    floor: std({ map: floorTex, roughness: 0.42, metalness: 0.0, color: 0xc8b8a8 }),
    wall: std({ map: wallTex, roughness: 0.9, color: 0xb8c0b6 }),
    panel: std({ map: panelTex, roughness: 0.6, color: 0xb09080 }),
    mahogany: std({ map: panelTex, color: 0x9a6a50, roughness: 0.38, metalness: 0.05 }),
    darkwood: std({ map: panelTex, color: 0x5a4032, roughness: 0.5 }),
    frame: std({ color: 0x1d2320, roughness: 0.55, metalness: 0.1 }),
    brass: std({ color: 0xc09a58, roughness: 0.3, metalness: 1 }),
    brassDark: std({ color: 0x8a6a38, roughness: 0.45, metalness: 1 }),
    black: std({ color: 0x141312, roughness: 0.4, metalness: 0.2 }),
    leatherGreen: std({ map: T.leatherTexture('#284236'), roughness: 0.6 }),
    leatherBrown: std({ map: T.leatherTexture('#4a2c1e', 512, 512, 3), roughness: 0.55 }),
    velvet: std({ color: 0x5e1a22, roughness: 0.95, side: THREE.DoubleSide }),
    olive: std({ color: 0x46503f, roughness: 0.5, metalness: 0.45 }),
    paper: std({ map: T.paperTex(1), roughness: 0.95 }),
    cork: std({ map: T.corkTexture(), roughness: 1 }),
    ceramic: std({ color: 0x2f4a3e, roughness: 0.25, metalness: 0.05 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xdfe8e4, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, envMapIntensity: 2.5, clearcoat: 1 }),
    amber: std({ color: 0x9a4a12, roughness: 0.1, transparent: true, opacity: 0.85, emissive: 0x2a0c00 }),
  };

  // ─────────────────────────── room shell ───────────────────────────
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M.floor), scene, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.6);

  // back wall with arched window hole
  const WX = -0.6; // window centre
  const WW = 2.2;
  const WB = 0.95;
  const WS = 2.85; // straight top
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-5, 0);
  wallShape.lineTo(5, 0);
  wallShape.lineTo(5, 4.6);
  wallShape.lineTo(-5, 4.6);
  wallShape.lineTo(-5, 0);
  const hole = new THREE.Path();
  hole.moveTo(WX - WW / 2, WB);
  hole.lineTo(WX + WW / 2, WB);
  hole.lineTo(WX + WW / 2, WS);
  hole.absarc(WX, WS, WW / 2, 0, Math.PI, false);
  hole.lineTo(WX - WW / 2, WB);
  wallShape.holes.push(hole);
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: 0.3, bevelEnabled: false, curveSegments: 32 });
  const backWall = add(new THREE.Mesh(wallGeo, M.wall), scene);
  backWall.position.z = -2.7;

  const leftWall = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 4.6), M.wall), scene, { cast: false });
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-4.8, 2.3, 0);
  const rightWall = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 4.6), M.wall), scene, { cast: false });
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(4.8, 2.3, 0);
  const ceiling = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 10), std({ color: 0x1a1816, roughness: 1 })), scene, { cast: false });
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.6, 0);

  // wainscot + mouldings along back wall (skip window span above sill)
  const wains = (x0, x1) => {
    const w = x1 - x0;
    const p = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.92, 0.05), M.panel), scene);
    p.position.set((x0 + x1) / 2, 0.46, -2.37);
    const cap = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.09), M.darkwood), scene);
    cap.position.set((x0 + x1) / 2, 0.94, -2.35);
    const n = Math.max(1, Math.round(w / 0.8));
    for (let i = 0; i < n; i++) {
      const pw = w / n - 0.12;
      const raised = add(new THREE.Mesh(new THREE.BoxGeometry(pw, 0.62, 0.02), M.darkwood), scene);
      raised.position.set(x0 + (i + 0.5) * (w / n), 0.5, -2.335);
    }
    const base = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.07), M.frame), scene);
    base.position.set((x0 + x1) / 2, 0.07, -2.34);
  };
  wains(-4.8, 4.8);
  // crown moulding
  const crown = add(new THREE.Mesh(new THREE.BoxGeometry(10, 0.16, 0.12), M.darkwood), scene);
  crown.position.set(0, 4.36, -2.34);

  // ─────────────────────────── window ───────────────────────────
  const cityTex = toTexture(paintRainyCity(1024, 1024), { mipmaps: true });
  const glassMat = createRainGlassMaterial(cityTex);
  glassMat.uniforms.aspect.value = (WS + WW / 2 - WB) / WW;
  const glassShape = new THREE.Shape();
  glassShape.moveTo(-WW / 2, 0);
  glassShape.lineTo(WW / 2, 0);
  glassShape.lineTo(WW / 2, WS - WB);
  glassShape.absarc(0, WS - WB, WW / 2, 0, Math.PI, false);
  glassShape.lineTo(-WW / 2, 0);
  const glassGeo = new THREE.ShapeGeometry(glassShape, 32);
  // normalise uvs to 0..1
  glassGeo.computeBoundingBox();
  const bb = glassGeo.boundingBox;
  const uvA = glassGeo.attributes.uv;
  const posA = glassGeo.attributes.position;
  for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (posA.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (posA.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(WX, WB, -2.55);
  scene.add(glass);
  R.anim.glass = glassMat;

  // frame: outer arch ring + mullions
  const frameShape = new THREE.Shape();
  const fo = 0.1;
  frameShape.moveTo(-WW / 2 - fo, 0);
  frameShape.lineTo(WW / 2 + fo, 0);
  frameShape.lineTo(WW / 2 + fo, WS - WB);
  frameShape.absarc(0, WS - WB, WW / 2 + fo, 0, Math.PI, false);
  frameShape.lineTo(-WW / 2 - fo, 0);
  const inner = new THREE.Path();
  inner.moveTo(-WW / 2, 0.02);
  inner.lineTo(WW / 2, 0.02);
  inner.lineTo(WW / 2, WS - WB);
  inner.absarc(0, WS - WB, WW / 2, 0, Math.PI, false);
  inner.lineTo(-WW / 2, 0.02);
  frameShape.holes.push(inner);
  const frame = add(new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 32 }), M.frame), scene);
  frame.position.set(WX, WB, -2.5);
  const mull = (w, h, x, y) => {
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), M.frame), scene);
    m.position.set(WX + x, WB + y, -2.47);
  };
  for (const x of [-WW / 6, WW / 6]) mull(0.045, WS - WB + WW / 2 - 0.1, x, (WS - WB + WW / 2) / 2 - 0.05);
  for (const y of [0.55, 1.1, 1.62]) mull(WW, 0.045, 0, y);
  // semicircle transom spokes
  for (let i = 1; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    const s = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, WW / 2, 0.06), M.frame), scene);
    s.position.set(WX + (Math.cos(a) * WW) / 4, WS + (Math.sin(a) * WW) / 4, -2.47);
    s.rotation.z = a - Math.PI / 2;
  }
  const sill = add(new THREE.Mesh(new RoundedBoxGeometry(WW + 0.5, 0.07, 0.36, 2, 0.015), M.darkwood), scene);
  sill.position.set(WX, WB - 0.02, -2.3);

  // curtains (animated verts)
  const curtainGeo = () => {
    const g = new THREE.PlaneGeometry(1.05, 3.9, 36, 24);
    g.userData.base = g.attributes.position.array.slice();
    return g;
  };
  const curtains = [];
  for (const side of [-1, 1]) {
    const c = add(new THREE.Mesh(curtainGeo(), M.velvet), scene);
    c.position.set(WX + side * (WW / 2 + 0.38), 2.33, -2.18);
    c.userData.side = side;
    curtains.push(c);
  }
  const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, WW + 1.9, 12), M.brass), scene);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(WX, 4.25, -2.15);
  for (const s of [-1, 1]) {
    const fin = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), M.brass), scene);
    fin.position.set(WX + s * (WW / 2 + 0.95), 4.25, -2.15);
  }
  // tie-backs
  for (const s of [-1, 1]) {
    const tb = add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 20), M.brassDark), scene);
    tb.position.set(WX + s * (WW / 2 + 0.3), 1.35, -2.1);
    tb.scale.set(1.4, 0.6, 1);
  }
  R.anim.curtains = curtains;

  // ─────────────────────────── desk ───────────────────────────
  const desk = new THREE.Group();
  desk.position.set(1.6, 0, -0.9);
  desk.rotation.y = -0.12;
  scene.add(desk);
  const top = add(new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.07, 1.02, 3, 0.02), M.mahogany), desk);
  top.position.y = 0.78;
  const inset = add(new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.78), M.leatherGreen), desk, { cast: false });
  inset.rotation.x = -Math.PI / 2;
  inset.position.set(0, 0.816, 0.02);
  for (const s of [-1, 1]) {
    const ped = add(new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.74, 0.92, 2, 0.015), M.mahogany), desk);
    ped.position.set(s * 0.8, 0.37, 0);
    for (let i = 0; i < 3; i++) {
      const dr = add(new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.2, 0.03, 2, 0.008), M.darkwood), desk);
      dr.position.set(s * 0.8, 0.14 + i * 0.22, 0.47);
      const h = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), M.brass), desk);
      h.rotation.z = Math.PI / 2;
      h.position.set(s * 0.8, 0.16 + i * 0.22, 0.5);
    }
  }
  const modesty = add(new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.6, 0.03), M.darkwood), desk);
  modesty.position.set(0, 0.45, -0.38);
  const center = add(new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.1, 0.03, 2, 0.008), M.darkwood), desk);
  center.position.set(0, 0.69, 0.47);

  // chair behind desk
  const chair = new THREE.Group();
  chair.position.set(1.95, 0, -1.72);
  chair.rotation.y = -0.35;
  scene.add(chair);
  const seat = add(new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.16, 0.62, 3, 0.05), M.leatherBrown), chair);
  seat.position.y = 0.5;
  const back = add(new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.95, 0.16, 3, 0.06), M.leatherBrown), chair);
  back.position.set(0, 0.98, -0.26);
  for (const s of [-1, 1]) {
    const arm = add(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.3, 0.6, 3, 0.05), M.leatherBrown), chair);
    arm.position.set(s * 0.38, 0.66, 0);
  }
  for (let i = 0; i < 12; i++) {
    const stud = add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), M.brass), chair);
    stud.position.set(-0.33 + i * 0.06, 1.44, -0.18);
  }

  // banker's lamp
  const lamp = new THREE.Group();
  lamp.position.set(0.95, 0.815, -1.2);
  scene.add(lamp);
  const lampBase = add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.14, 0), new THREE.Vector2(0.15, 0.02), new THREE.Vector2(0.1, 0.05), new THREE.Vector2(0.03, 0.07), new THREE.Vector2(0.018, 0.1)], 32), M.brass), lamp);
  lampBase.scale.set(1.2, 1, 0.8);
  const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.36, 12), M.brass), lamp);
  stem.position.y = 0.26;
  const shadeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.46, 32, 1, true, 0, Math.PI);
  const shadeMat = std({ color: 0x1f5a3c, roughness: 0.15, metalness: 0.1, emissive: 0x0a2a18, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const shade = add(new THREE.Mesh(shadeGeo, shadeMat), lamp);
  shade.rotation.z = Math.PI / 2;
  shade.rotation.y = 0;
  shade.position.set(0, 0.45, 0);
  shade.scale.set(1, 1, 0.75);
  const shadeInner = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false }));
  shadeInner.rotation.x = Math.PI / 2;
  shadeInner.position.set(0, 0.44, 0);
  lamp.add(shadeInner);
  const bulbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2d8, toneMapped: false }));
  bulbGlow.scale.set(4, 0.8, 1);
  bulbGlow.position.set(0, 0.41, 0);
  lamp.add(bulbGlow);
  const pull = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.18, 4), M.brass), lamp);
  pull.position.set(0.1, 0.32, 0.05);
  const pullBall = add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.brass), lamp);
  pullBall.position.set(0.1, 0.22, 0.05);
  R.anim.lampPull = pull;

  // hourglass
  const hg = new THREE.Group();
  hg.position.set(2.6, 0.815, -0.75);
  scene.add(hg);
  const hgGlassPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    hgGlassPts.push(new THREE.Vector2(0.018 + Math.pow(Math.abs(Math.sin(t * Math.PI)), 0.8) * 0.055, 0.02 + t * 0.24));
  }
  add(new THREE.Mesh(new THREE.LatheGeometry(hgGlassPts, 24), M.glass), hg, { cast: false });
  const sandTop = add(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.06, 20), std({ color: 0xd9b27a, roughness: 1 })), hg);
  sandTop.position.y = 0.19;
  sandTop.rotation.x = Math.PI;
  const sandBot = add(new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.05, 20), std({ color: 0xd9b27a, roughness: 1 })), hg);
  sandBot.position.y = 0.05;
  for (const y of [0.01, 0.27]) {
    const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.022, 20), M.darkwood), hg);
    cap.position.y = y;
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const post = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), M.brass), hg);
    post.position.set(Math.cos(a) * 0.07, 0.14, Math.sin(a) * 0.07);
  }
  R.anim.sand = { top: sandTop, bot: sandBot };

  // candlestick telephone
  const phone = new THREE.Group();
  phone.position.set(2.3, 0.815, -1.15);
  phone.rotation.y = -0.4;
  scene.add(phone);
  add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.075, 0), new THREE.Vector2(0.078, 0.02), new THREE.Vector2(0.05, 0.04), new THREE.Vector2(0.02, 0.06)], 24), M.black), phone);
  const pstem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.3, 12), M.black), phone);
  pstem.position.y = 0.2;
  const mouth = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.06, 16), M.black), phone);
  mouth.position.set(0, 0.36, 0.03);
  mouth.rotation.x = 1.2;
  const hook = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), M.brass), phone);
  hook.position.set(0.04, 0.3, 0);
  const receiver = new THREE.Group();
  receiver.position.set(0.075, 0.26, 0);
  phone.add(receiver);
  const rcv = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 12), M.black), receiver);
  rcv.position.y = -0.02;
  const ear = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.018, 0.04, 16), M.black), receiver);
  ear.position.y = -0.1;
  // cord
  const cordCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.075, 0.2, 0), new THREE.Vector3(0.12, 0.05, 0.05), new THREE.Vector3(0.1, 0.0, 0.14), new THREE.Vector3(-0.05, 0.0, 0.2)]);
  add(new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 24, 0.005, 5), M.black), phone);
  R.anim.receiver = receiver;

  // papers, letters, book, magnifier, inkwell on desk
  const paperMeshes = [];
  const paperOn = (x, z, rot, tex, w = 0.21, h = 0.297, y = 0.818) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: 0.95 })), scene, { cast: false });
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.position.set(x, y, z);
    paperMeshes.push(m);
    return m;
  };
  const letterTex = toTexture(T.letterSheet(400, 560, 3, { title: 'Dear Traveller,' }));
  const letterTex2 = toTexture(T.letterSheet(400, 560, 7, { title: 'Re: Case 0412', ink: '#3a2a2a' }));
  paperOn(1.35, -0.62, 0.25, letterTex, 0.25, 0.34, 0.819);
  paperOn(1.55, -0.7, -0.18, letterTex2, 0.25, 0.34, 0.821);
  // envelopes with wax seal — interactive "letters"
  const env = new THREE.Group();
  env.position.set(1.95, 0.82, -0.52);
  env.rotation.y = 0.35;
  scene.add(env);
  const envTex = (() => {
    const { c, g } = canvas(512, 340);
    g.fillStyle = '#d9c9a2';
    g.fillRect(0, 0, 512, 340);
    g.strokeStyle = 'rgba(90,70,40,0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(256, 190);
    g.lineTo(512, 0);
    g.stroke();
    g.fillStyle = '#2a3b5a';
    g.font = 'italic 500 30px "Cormorant Garamond"';
    g.fillText('To the Keeper of Hours', 150, 280);
    g.strokeStyle = '#a8322d';
    g.lineWidth = 2;
    g.strokeRect(420, 24, 70, 86);
    return toTexture(c);
  })();
  const envMat = std({ map: envTex, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const e = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.006, 0.17), envMat), env);
    e.position.set(i * 0.012, i * 0.007, i * 0.01);
    e.rotation.y = (i - 1) * 0.12;
  }
  const seal = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.008, 16), std({ color: 0x8a1f22, roughness: 0.35, emissive: 0x200404 })), env);
  seal.position.set(0.012, 0.03, 0.02);
  R.interactables.push({ object: env, id: 'letters', label: '<b>信件</b>LETTERS' });

  // open book
  const bookTex = toTexture(T.letterSheet(512, 380, 13, { title: 'Chapter VII', ink: '#2a241c' }));
  const book = new THREE.Group();
  book.position.set(1.2, 0.82, -0.9);
  book.rotation.y = 0.2;
  scene.add(book);
  for (const s of [-1, 1]) {
    const pg = new THREE.PlaneGeometry(0.2, 0.28, 12, 1);
    const pos = pg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + 0.1;
      pos.setZ(i, Math.sin((x / 0.2) * Math.PI) * 0.012 + (x / 0.2) * 0.01);
    }
    pg.computeVertexNormals();
    const page = add(new THREE.Mesh(pg, std({ map: bookTex, roughness: 0.95, side: THREE.DoubleSide })), book, { cast: false });
    page.rotation.x = -Math.PI / 2;
    page.position.set(s * 0.1, 0.02, 0);
    page.scale.x = s;
  }
  const bookCover = add(new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.015, 0.3), std({ color: 0x5a1f24, roughness: 0.6 })), book);
  bookCover.position.y = 0.005;

  // magnifier
  const mag = new THREE.Group();
  mag.position.set(1.72, 0.83, -0.35);
  mag.rotation.set(-Math.PI / 2, 0, 0.9);
  scene.add(mag);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 32), M.brass), mag);
  add(new THREE.Mesh(new THREE.CircleGeometry(0.058, 32), M.glass), mag, { cast: false });
  const hdl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.13, 10), M.darkwood), mag);
  hdl.rotation.z = Math.PI / 2;
  hdl.position.x = 0.13;

  // inkwell + quill
  const ink = add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.045, 0), new THREE.Vector2(0.05, 0.03), new THREE.Vector2(0.03, 0.06), new THREE.Vector2(0.015, 0.07), new THREE.Vector2(0.015, 0.085)], 20), std({ color: 0x101820, roughness: 0.05, metalness: 0.3 })), scene);
  ink.position.set(0.62, 0.815, -0.68);
  const quillTex = (() => {
    const { c, g } = canvas(64, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#f0ece2');
    gr.addColorStop(1, '#8a8278');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(32, 250);
    g.quadraticCurveTo(0, 120, 30, 4);
    g.quadraticCurveTo(64, 120, 34, 250);
    g.fill();
    g.strokeStyle = 'rgba(80,70,60,0.6)';
    g.beginPath();
    g.moveTo(32, 250);
    g.lineTo(31, 10);
    g.stroke();
    return new THREE.CanvasTexture(c);
  })();
  const quill = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.3), new THREE.MeshStandardMaterial({ map: quillTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 }));
  quill.position.set(0.66, 0.97, -0.66);
  quill.rotation.set(0.1, 0.4, -0.35);
  quill.castShadow = true;
  scene.add(quill);

  // decanter + glasses on silver tray (desk right)
  const tray = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 32), M.brass), scene);
  tray.position.set(2.62, 0.822, -1.25);
  const decPts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.085, 0.04), new THREE.Vector2(0.08, 0.12), new THREE.Vector2(0.05, 0.17), new THREE.Vector2(0.018, 0.2), new THREE.Vector2(0.02, 0.26), new THREE.Vector2(0.03, 0.27)];
  const dec = add(new THREE.Mesh(new THREE.LatheGeometry(decPts, 28), M.glass), scene, { cast: false });
  dec.position.set(2.6, 0.83, -1.28);
  const liquid = add(new THREE.Mesh(new THREE.LatheGeometry(decPts.slice(0, 4).map((v) => new THREE.Vector2(v.x * 0.9, v.y * 0.95)), 28), M.amber), scene, { cast: false });
  liquid.position.copy(dec.position);
  const stopper = add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), M.glass), scene, { cast: false });
  stopper.position.set(2.6, 1.12, -1.28);
  for (const [x, z] of [[2.72, -1.15], [2.5, -1.14]]) {
    const gl = add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.035, 0), new THREE.Vector2(0.04, 0.08)], 20), M.glass), scene, { cast: false });
    gl.position.set(x, 0.83, z);
  }

  // ─────────────────────────── gramophone ───────────────────────────
  const gram = new THREE.Group();
  gram.position.set(-2.55, 0, -1.25);
  gram.rotation.y = 0.5;
  scene.add(gram);
  const tbl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32), M.mahogany), gram);
  tbl.position.y = 0.72;
  add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.22, 0), new THREE.Vector2(0.2, 0.03), new THREE.Vector2(0.05, 0.08), new THREE.Vector2(0.04, 0.4), new THREE.Vector2(0.06, 0.5), new THREE.Vector2(0.03, 0.7)], 24), M.darkwood), gram);
  const box = add(new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.16, 0.44, 2, 0.015), M.mahogany), gram);
  box.position.y = 0.82;
  const recordMat = std({ map: T.recordTexture(), roughness: 0.25, metalness: 0.2 });
  const record = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.006, 48), [std({ color: 0x0d0c0c }), recordMat, recordMat]), gram);
  record.position.set(0, 0.905, 0);
  const plinth = add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.004, 48), std({ color: 0x2a1f1a, roughness: 0.9 })), gram);
  plinth.position.set(0, 0.902, 0);
  const arm = new THREE.Group();
  arm.position.set(0.17, 0.93, -0.15);
  gram.add(arm);
  const armTube = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.22, 8), M.brass), arm);
  armTube.rotation.z = Math.PI / 2;
  armTube.rotation.y = -0.6;
  armTube.position.set(-0.09, 0, 0.07);
  const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.3, 12), M.brass), gram);
  neck.position.set(-0.12, 1.02, -0.16);
  neck.rotation.x = -0.6;
  const hornPts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    hornPts.push(new THREE.Vector2(0.02 + Math.pow(t, 3.2) * 0.34, t * 0.62));
  }
  const hornMat = std({ color: 0xc9a060, roughness: 0.25, metalness: 1, side: THREE.DoubleSide });
  const horn = add(new THREE.Mesh(new THREE.LatheGeometry(hornPts, 40), hornMat), gram);
  horn.position.set(-0.14, 1.1, -0.26);
  horn.rotation.set(0.9, 0, 0.35);
  // horn petals seams
  for (let i = 0; i < 8; i++) {
    const seam = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hornPts.filter((_, k) => k % 3 === 0).map((p) => new THREE.Vector3(Math.cos((i / 8) * Math.PI * 2) * p.x * 1.003, p.y, Math.sin((i / 8) * Math.PI * 2) * p.x * 1.003))), 16, 0.003, 4), M.brassDark), horn);
    seam.castShadow = false;
  }
  const crank = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6), M.brass), gram);
  crank.rotation.z = Math.PI / 2;
  crank.position.set(0.27, 0.82, 0.05);
  R.anim.record = record;
  R.anim.toneArm = arm;
  R.interactables.push({ object: gram, id: 'gramophone', label: '<b>留聲機</b>GRAMOPHONE' });

  // ─────────────────────────── bookshelf ───────────────────────────
  const shelf = new THREE.Group();
  shelf.position.set(-3.85, 0, -2.05);
  shelf.rotation.y = 0.18;
  scene.add(shelf);
  const SW = 1.5;
  const SH = 3.0;
  const SD = 0.42;
  for (const s of [-1, 1]) {
    const side = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, SH, SD), M.darkwood), shelf);
    side.position.set((s * SW) / 2, SH / 2, 0);
  }
  const backP = add(new THREE.Mesh(new THREE.BoxGeometry(SW, SH, 0.02), M.darkwood), shelf);
  backP.position.set(0, SH / 2, -SD / 2);
  const shelfYs = [0.12, 0.62, 1.1, 1.58, 2.06, 2.54, 2.98];
  for (const y of shelfYs) {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(SW, 0.035, SD), M.darkwood), shelf);
    b.position.set(0, y, 0);
  }
  // instanced books
  const spines = T.bookSpines(4);
  const bookMatSide = std({ color: 0x3a2a22, roughness: 0.8 });
  const pageMat = std({ color: 0xd8ccb0, roughness: 0.95 });
  const bookMat = [pageMat, std({ map: spines.texture, roughness: 0.7 }), pageMat, pageMat, bookMatSide, bookMatSide];
  const bookGeo = new THREE.BoxGeometry(1, 1, 1);
  const rb = rng(31);
  const bookData = [];
  for (let si = 0; si < shelfYs.length - 1; si++) {
    let x = -SW / 2 + 0.05;
    while (x < SW / 2 - 0.08) {
      if (rb() < 0.06) {
        x += rb.range(0.08, 0.2);
        continue;
      }
      const bw = rb.range(0.03, 0.065);
      const bh = rb.range(0.26, 0.42);
      const bd = rb.range(0.2, 0.3);
      const lean = rb() < 0.08 ? rb.range(0.15, 0.3) : 0;
      bookData.push({ x: x + bw / 2, y: shelfYs[si] + 0.018 + bh / 2, z: 0.02, bw, bh, bd, lean, uv: rb.int(0, spines.count - 1) });
      x += bw + 0.003;
    }
  }
  // spine UV per instance via separate geometry groups is costly; emulate with instanced uv offset attribute
  const ig = bookGeo.clone();
  const offs = new Float32Array(bookData.length);
  bookData.forEach((b, i) => (offs[i] = b.uv));
  ig.setAttribute('spineIdx', new THREE.InstancedBufferAttribute(offs, 1));
  const spineMat = bookMat[1];
  spineMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float spineIdx;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((uv.x + spineIdx) / ${spines.count}.0, uv.y);\n#endif`);
  };
  const books = new THREE.InstancedMesh(ig, bookMat, bookData.length);
  const dm = new THREE.Object3D();
  bookData.forEach((b, i) => {
    dm.position.set(b.x, b.y, b.z);
    dm.rotation.set(0, Math.PI / 2, b.lean);
    dm.scale.set(b.bd, b.bh, b.bw);
    dm.updateMatrix();
    books.setMatrixAt(i, dm.matrix);
  });
  books.castShadow = true;
  books.receiveShadow = true;
  shelf.add(books);
  // file boxes on bottom shelf
  const boxTex = toTexture(T.labelCard('CASE FILES', 256, 96));
  for (let i = 0; i < 3; i++) {
    const fb = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.32), [std({ color: 0x7a6040 }), std({ color: 0x7a6040 }), std({ color: 0x8a7050 }), std({ color: 0x7a6040 }), std({ map: boxTex }), std({ color: 0x7a6040 })]), shelf);
    fb.position.set(-0.5 + i * 0.36, 0.29, 0.03);
    fb.rotation.y = (i - 1) * 0.04;
  }

  // ─────────────────────────── filing cabinet + radio ───────────────────────────
  const cab = new THREE.Group();
  cab.position.set(3.55, 0, -2.0);
  cab.rotation.y = -0.25;
  scene.add(cab);
  const cabBody = add(new THREE.Mesh(new RoundedBoxGeometry(0.66, 1.5, 0.64, 2, 0.02), M.olive), cab);
  cabBody.position.y = 0.75;
  const labels = ['A — F', 'G — M', 'N — S', '1929'];
  const drawers = [];
  labels.forEach((l, i) => {
    const d = add(new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.32, 0.03, 2, 0.01), M.olive), cab);
    d.position.set(0, 1.28 - i * 0.35, 0.33);
    const lb = add(new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.055), std({ map: toTexture(T.labelCard(l, 256, 96)), roughness: 0.9 })), cab, { cast: false });
    lb.position.set(0, 1.34 - i * 0.35, 0.35);
    const holder = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.006), M.brass), cab);
    holder.position.set(0, 1.34 - i * 0.35, 0.346);
    const handle = add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), M.brass), cab);
    handle.position.set(0, 1.25 - i * 0.35, 0.36);
    drawers.push(d);
  });
  R.interactables.push({ object: cab, id: 'cabinet', label: '<b>收藏</b>COLLECTION' });

  // cathedral radio on top of cabinet
  const radio = new THREE.Group();
  radio.position.set(0, 1.5, 0.02);
  cab.add(radio);
  const rShape = new THREE.Shape();
  rShape.moveTo(-0.2, 0);
  rShape.lineTo(0.2, 0);
  rShape.lineTo(0.2, 0.22);
  rShape.absarc(0, 0.22, 0.2, 0, Math.PI, false);
  rShape.lineTo(-0.2, 0);
  const rBody = add(new THREE.Mesh(new THREE.ExtrudeGeometry(rShape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 24 }), M.mahogany), radio);
  rBody.position.z = -0.1;
  const grilleTex = (() => {
    const { c, g } = canvas(256, 256);
    g.fillStyle = '#6a5a3a';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, y, 256, 2);
    }
    g.fillStyle = '#2a1a10';
    for (let i = 0; i < 5; i++) g.fillRect(40 + i * 40, 0, 10, 256);
    return toTexture(c);
  })();
  const gShape = new THREE.Shape();
  gShape.moveTo(-0.13, 0.14);
  gShape.lineTo(0.13, 0.14);
  gShape.lineTo(0.13, 0.24);
  gShape.absarc(0, 0.24, 0.13, 0, Math.PI, false);
  gShape.lineTo(-0.13, 0.14);
  const grille = new THREE.Mesh(new THREE.ShapeGeometry(gShape, 16), std({ map: grilleTex, roughness: 1 }));
  grille.position.z = 0.114;
  radio.add(grille);
  const dialMat = new THREE.MeshBasicMaterial({ color: 0xffb860, toneMapped: false });
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), dialMat);
  dial.position.set(0, 0.075, 0.114);
  radio.add(dial);
  for (const s of [-1, 1]) {
    const k = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12), M.brass), radio);
    k.rotation.x = Math.PI / 2;
    k.position.set(s * 0.11, 0.07, 0.12);
  }
  R.anim.radioDial = dialMat;
  R.interactables.push({ object: radio, id: 'radio', label: '<b>收音機</b>RADIO' });

  // stack of old newspapers & file boxes on the floor
  for (let i = 0; i < 7; i++) {
    const np = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), std({ map: T.paperTex(40 + i, i % 2 ? '#d2c6a8' : '#ddd2b6'), roughness: 1 })), scene);
    np.position.set(2.95, 0.006 + i * 0.013, -1.2);
    np.rotation.y = (Math.random() - 0.5) * 0.3;
  }

  // ─────────────────────────── cork board ───────────────────────────
  const board = new THREE.Group();
  board.position.set(2.05, 2.25, -2.37);
  scene.add(board);
  const BW = 1.9;
  const BH = 1.25;
  const corkTex = M.cork.map;
  corkTex.repeat.set(2, 1.3);
  add(new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.03), M.cork), board);
  for (const [w, h, x, y] of [[BW + 0.08, 0.05, 0, BH / 2], [BW + 0.08, 0.05, 0, -BH / 2], [0.05, BH, -BW / 2, 0], [0.05, BH, BW / 2, 0]]) {
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), M.darkwood), board);
    f.position.set(x, y, 0.01);
  }
  const pinMat = std({ color: 0xa8322d, roughness: 0.3 });
  const pins = [];
  const pinItem = (tex, w, h, x, y, rot) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: 0.9 })), board, { cast: true, receive: true });
    m.position.set(x, y, 0.02 + pins.length * 0.001);
    m.rotation.z = rot;
    const pin = add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), pinMat), board);
    const px = x + Math.sin(-rot) * (h / 2 - 0.03);
    const py = y + Math.cos(rot) * (h / 2 - 0.03);
    pin.position.set(px, py, 0.04);
    pins.push(pin.position.clone());
    return m;
  };
  pinItem(toTexture(paintMap(700, 500)), 0.62, 0.44, -0.45, 0.2, 0.03);
  pinItem(toTexture(T.clipping('THE CLOCK\nTHAT STOPPED', 'Nine witnesses, one missing hour', 420, 560, 5)), 0.3, 0.4, 0.2, 0.22, -0.06);
  pinItem(toTexture(paintPhoto('portrait', 360, 460, 3)), 0.22, 0.28, 0.62, 0.28, 0.08);
  pinItem(toTexture(paintPhoto('tower', 360, 460, 5)), 0.2, 0.26, -0.72, -0.32, -0.08);
  pinItem(toTexture(paintPhoto('school', 460, 360, 9)), 0.3, 0.23, -0.2, -0.3, 0.05);
  pinItem(toTexture(T.clipping('時間異常\n觀測記錄', '第七號檔案 · 絕對機密', 420, 560, 8, 'zh')), 0.28, 0.37, 0.3, -0.26, 0.04);
  pinItem(toTexture(paintPhoto('forest', 460, 360, 12)), 0.28, 0.21, 0.7, -0.22, -0.1);
  // red string
  const strMat = new THREE.MeshBasicMaterial({ color: 0x9a2a26 });
  const order = [0, 4, 1, 5, 2, 6, 3, 0];
  for (let i = 0; i < order.length - 1; i++) {
    const a = pins[order[i]];
    const b = pins[order[i + 1]];
    if (!a || !b) continue;
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.03;
    mid.z += 0.01;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    board.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0025, 4), strMat));
  }
  R.interactables.push({ object: board, id: 'board', label: '<b>檔案</b>ARCHIVES' });

  // ─────────────────────────── wall clock ───────────────────────────
  const clock = new THREE.Group();
  clock.position.set(0.95, 3.25, -2.36);
  scene.add(clock);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 48), M.darkwood), clock).rotation.x = Math.PI / 2;
  const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.022, 12, 48), M.brass), clock);
  rim.position.z = 0.035;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.265, 48), std({ map: T.clockFace(), roughness: 0.6 }));
  face.position.z = 0.032;
  clock.add(face);
  const handMat = std({ color: 0x151312, roughness: 0.4, metalness: 0.4 });
  const mkHand = (len, w) => {
    const g = new THREE.BoxGeometry(w, len, 0.004);
    g.translate(0, len / 2 - 0.03, 0);
    const m = new THREE.Mesh(g, handMat);
    m.position.z = 0.04;
    clock.add(m);
    return m;
  };
  const hH = mkHand(0.15, 0.018);
  const hM = mkHand(0.22, 0.012);
  const hS = mkHand(0.24, 0.004);
  hS.material = std({ color: 0x8a1f22 });
  hS.position.z = 0.045;
  const pend = new THREE.Group();
  pend.position.set(0, -0.3, 0);
  clock.add(pend);
  const pRod = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.01), M.brass), pend);
  pRod.position.y = -0.21;
  const bob = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 24), M.brass), pend);
  bob.rotation.x = Math.PI / 2;
  bob.position.y = -0.44;
  const pcase = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.05), std({ color: 0x3a2518, roughness: 0.4, transparent: true, opacity: 0.35 })), clock);
  pcase.position.set(0, -0.58, -0.005);
  R.anim.clock = { h: hH, m: hM, s: hS, pend };
  R.interactables.push({ object: clock, id: 'clock', label: '<b>時鐘</b>CLOCK' });

  // ─────────────────────────── old TV on cabinet ───────────────────────────
  const tvG = new THREE.Group();
  tvG.position.set(3.55, 0, -0.35);
  tvG.rotation.y = -0.85;
  scene.add(tvG);
  const tvCab = add(new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.56, 0.52, 2, 0.02), M.mahogany), tvG);
  tvCab.position.y = 0.28;
  const tvBody = add(new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.54, 0.5, 4, 0.06), std({ color: 0x5a3a24, roughness: 0.35 })), tvG);
  tvBody.position.set(-0.08, 0.83, 0);
  const tvCanvas = T.tvCanvas();
  T.drawTV(tvCanvas, 0);
  const tvTex = toTexture(tvCanvas.c, { mipmaps: false });
  const screenMat = new THREE.MeshBasicMaterial({ map: tvTex, color: 0x9ab0c0 });
  const screenGeo = new THREE.SphereGeometry(0.6, 24, 16, Math.PI / 2 - 0.34, 0.68, Math.PI / 2 - 0.26, 0.52);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(-0.12, 0.83, -0.345);
  tvG.add(screen);
  for (let i = 0; i < 2; i++) {
    const k = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), M.brass), tvG);
    k.rotation.x = Math.PI / 2;
    k.position.set(0.19, 0.95 - i * 0.12, 0.25);
  }
  const ant = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.black), tvG);
  ant.position.set(-0.08, 1.12, 0);
  for (const s of [-1, 1]) {
    const rod2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), M.brass), tvG);
    rod2.position.set(-0.08 + s * 0.12, 1.33, 0);
    rod2.rotation.z = -s * 0.5;
  }
  R.anim.tv = { canvas: tvCanvas, tex: tvTex, mat: screenMat };
  R.interactables.push({ object: tvG, id: 'tv', label: '<b>電視</b>TELEVISION' });

  // ─────────────────────────── suitcase, film reels, plant ───────────────────────────
  const suit = new THREE.Group();
  suit.position.set(-1.95, 0, 0.35);
  suit.rotation.y = 0.55;
  scene.add(suit);
  const sBody = add(new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.5, 0.24, 3, 0.04), M.leatherBrown), suit);
  sBody.position.y = 0.26;
  sBody.rotation.z = 0.04;
  for (const x of [-0.22, 0.22]) {
    const st = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.25), std({ color: 0x2a1a12, roughness: 0.7 })), suit);
    st.position.set(x, 0.26, 0);
    st.rotation.z = 0.04;
  }
  const hand2 = add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), M.leatherBrown), suit);
  hand2.position.set(0.01, 0.52, 0);
  const sticker = (text, x, y, color, rot) => {
    const { c, g } = canvas(256, 160);
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(128, 80, 124, 76, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#efe4c8';
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(128, 80, 110, 64, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#efe4c8';
    g.font = '600 40px "Barlow Condensed"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 82);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), std({ map: toTexture(c), transparent: true, alphaTest: 0.5, roughness: 0.8 }));
    m.position.set(x, y, 0.125);
    m.rotation.z = rot;
    suit.add(m);
  };
  sticker('PARIS 1929', -0.1, 0.34, '#7b2530', 0.2);
  sticker('KYOTO', 0.12, 0.18, '#2a4a3a', -0.15);
  sticker('ARCHIVE', 0.28, 0.36, '#2a3b5a', 0.1);

  const reelTex = (() => {
    const { c, g } = canvas(256, 256);
    g.fillStyle = '#8a8a88';
    g.beginPath();
    g.arc(128, 128, 126, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1816';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.arc(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70, 32, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.arc(128, 128, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a2622';
    g.beginPath();
    g.arc(128, 128, 104, 0, Math.PI * 2);
    g.arc(128, 128, 30, 0, Math.PI * 2, true);
    g.globalAlpha = 0.35;
    g.fill();
    return toTexture(c);
  })();
  const reelMat = std({ map: reelTex, metalness: 0.7, roughness: 0.35, transparent: true, alphaTest: 0.1 });
  for (let i = 0; i < 2; i++) {
    const reel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32), [std({ color: 0x5a5a58, metalness: 0.7, roughness: 0.4 }), reelMat, reelMat]), scene);
    reel.position.set(-1.25 + i * 0.05, 0.015 + i * 0.032, 0.95 - i * 0.04);
    reel.rotation.y = i * 0.8;
  }
  const filmCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.1, 0.07, 0.9), new THREE.Vector3(-0.8, 0.01, 1.1), new THREE.Vector3(-0.55, 0.04, 1.0), new THREE.Vector3(-0.4, 0.005, 1.3)]);
  const film = new THREE.Mesh(new THREE.TubeGeometry(filmCurve, 40, 0.018, 2), std({ color: 0x2a2018, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide }));
  film.scale.y = 0.4;
  film.castShadow = true;
  scene.add(film);

  // plant (fern-ish) by the window
  const plant = new THREE.Group();
  plant.position.set(-2.15, 0, -1.9);
  scene.add(plant);
  add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.22, 0.34), new THREE.Vector2(0.24, 0.4), new THREE.Vector2(0.2, 0.42)], 28), M.ceramic), plant);
  const leafTex = (() => {
    const { c, g } = canvas(128, 512);
    g.strokeStyle = '#2a4028';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(64, 512);
    g.quadraticCurveTo(60, 250, 64, 0);
    g.stroke();
    for (let i = 0; i < 26; i++) {
      const y = 480 - i * 18;
      const len = 58 * Math.sin(((i + 1) / 27) * Math.PI) + 6;
      for (const s of [-1, 1]) {
        g.fillStyle = i % 3 ? '#3a5a34' : '#46683c';
        g.beginPath();
        g.moveTo(64, y);
        g.quadraticCurveTo(64 + s * len * 0.6, y - 16, 64 + s * len, y - 22);
        g.quadraticCurveTo(64 + s * len * 0.5, y - 4, 64, y + 6);
        g.fill();
      }
    }
    return toTexture(c);
  })();
  const leafMat = std({ map: leafTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
  const leaves = [];
  for (let i = 0; i < 18; i++) {
    const lg = new THREE.PlaneGeometry(0.28, 1.0);
    lg.translate(0, 0.5, 0);
    const leaf = new THREE.Mesh(lg, leafMat);
    leaf.position.y = 0.38;
    const a = (i / 18) * Math.PI * 2;
    leaf.rotation.set(0, a, 0);
    leaf.rotateX(0.5 + Math.random() * 0.5);
    leaf.scale.setScalar(0.7 + Math.random() * 0.5);
    leaf.castShadow = true;
    leaf.userData.base = leaf.rotation.clone();
    leaf.userData.ph = Math.random() * 6;
    plant.add(leaf);
    leaves.push(leaf);
  }
  R.anim.leaves = leaves;

  // wall sconce left of the shelf and framed photos on the back wall
  const frames = [
    ['portrait', -2.65, 2.5, 0.34, 0.44],
    ['sea', -2.05, 2.9, 0.4, 0.3],
    ['street', -2.55, 3.25, 0.28, 0.36],
  ];
  frames.forEach(([k, x, y, w, h], i) => {
    const fr = add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.03), M.brassDark), scene);
    fr.position.set(x, y, -2.38);
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: toTexture(paintPhoto(k, 360, 460, 20 + i)), roughness: 0.6 }));
    ph.position.set(x, y, -2.36);
    scene.add(ph);
  });
  const sconce = new THREE.Group();
  sconce.position.set(-1.75, 2.35, -2.3);
  scene.add(sconce);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.03, 16), M.brass), sconce).rotation.x = Math.PI / 2;
  const scArm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8), M.brass), sconce);
  scArm.position.set(0, 0.06, 0.08);
  scArm.rotation.x = 0.8;
  const scShade = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.12, 20, 1, true), std({ color: 0xe8d4a8, emissive: 0xffa860, emissiveIntensity: 0.8, side: THREE.DoubleSide, roughness: 0.9 })), sconce, { cast: false });
  scShade.position.set(0, 0.17, 0.14);

  // rug
  const rug = add(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), std({ map: T.rugTexture(), roughness: 1 })), scene, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.2, 0.004, 0.2);

  return R;
}
