import * as THREE from 'three';
import * as FA from './forestArt.js';
import { rng } from '../../art/painter.js';
import { createDust } from '../../fx/Dust.js';
import { Batcher } from '../../fx/Batcher.js';

/**
 * The Black Wood: entrance → road → altar → clearing → stream → rune gate → nest.
 * The camera looks down the −z direction from above (+y, +z).
 */
export const PATH = [
  [0, 22],
  [0.5, 16],
  [1.5, 9],
  [0, 3],
  [-2.5, -3],
  [-1.5, -9],
  [1, -14],
  [2, -19],
  [2, -24],
  [0.5, -28],
  [0, -33],
  [0, -40],
  [0, -47],
];

export const ZONES = [
  { type: 'circle', x: 0, z: 18, r: 6.2 },
  { type: 'capsule', a: [0.5, 16], b: [1.5, 9], r: 3.0 },
  { type: 'capsule', a: [1.5, 9], b: [0, 3], r: 3.0 },
  { type: 'circle', x: -3, z: -4, r: 5.4 },
  { type: 'capsule', a: [-2.5, -3], b: [-1.5, -9], r: 3.0 },
  { type: 'capsule', a: [-1.5, -9], b: [1, -14], r: 3.0 },
  { type: 'circle', x: 2, z: -19, r: 7.6 },
  { type: 'capsule', a: [2, -24], b: [0.8, -27.5], r: 2.5 },
  { type: 'capsule', a: [0.8, -26], b: [0.3, -29.5], r: 1.2 },
  { type: 'capsule', a: [0.3, -29], b: [0, -33], r: 2.6 },
  { type: 'circle', x: 0, z: -41, r: 8.6 },
];

const WORLD = { x0: -24, x1: 24, z0: -58, z1: 26 };

function inZone(z, x, zz, pad = 0) {
  if (z.type === 'circle') return Math.hypot(x - z.x, zz - z.z) <= z.r - pad;
  const [ax, az] = z.a;
  const [bx, bz] = z.b;
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (zz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + dx * t), zz - (az + dz * t)) <= z.r - pad;
}

/** Keep a point on walkable ground (projects to the closest zone boundary). */
export function constrain(p, gateClosed) {
  if (gateClosed && p.z < -31.2) p.z = -31.2;
  for (const z of ZONES) if (inZone(z, p.x, p.z)) return p;
  let best = null;
  let bd = Infinity;
  for (const z of ZONES) {
    let cx;
    let cz;
    let r;
    if (z.type === 'circle') {
      cx = z.x;
      cz = z.z;
      r = z.r;
    } else {
      const [ax, az] = z.a;
      const [bx, bz] = z.b;
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz)));
      cx = ax + dx * t;
      cz = az + dz * t;
      r = z.r;
    }
    const d = Math.hypot(p.x - cx, p.z - cz);
    const pen = d - r;
    if (pen < bd) {
      bd = pen;
      const k = (r - 0.001) / Math.max(d, 0.0001);
      best = [cx + (p.x - cx) * k, cz + (p.z - cz) * k];
    }
  }
  if (best) {
    p.x = best[0];
    p.z = best[1];
  }
  if (gateClosed && p.z < -31.2) p.z = -31.2;
  return p;
}

function walkable(x, z, pad = 0) {
  return ZONES.some((zz) => inZone(zz, x, z, pad));
}

export function buildForest(scene) {
  const W = { anim: [], fgTrees: [], mushrooms: [], flames: [], lights: [], swayMats: [] };
  const r = rng(21);

  // ── ground
  const ground = FA.paintGround({ world: WORLD, path: PATH, clearings: [[0, 18, 5.5], [-3, -4, 4.8], [2, -19, 7], [0, -41, 8]], stream: { width: 2.2, pts: [[-24, -25], [-10, -27.5], [0, -27.2], [10, -26], [24, -28.5]] } });
  const detail = FA.detailTexture();
  const gmat = FA.groundMaterial(ground, detail, 60);
  const gw = WORLD.x1 - WORLD.x0;
  const gh = WORLD.z1 - WORLD.z0;
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), gmat);
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.set((WORLD.x0 + WORLD.x1) / 2, 0, (WORLD.z0 + WORLD.z1) / 2);
  gnd.receiveShadow = true;
  scene.add(gnd);
  // far dark skirt so the edges never show
  const skirt = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x0a1214 }));
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.y = -0.05;
  scene.add(skirt);

  // ── stream (animated water) + broken bridge
  const water = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 } }]),
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float time; varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vW.xz * vec2(0.6, 1.4) + vec2(time * 0.9, 0.0);
        float w = n(p) * 0.6 + n(p * 2.3 + 7.0) * 0.4;
        float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        vec3 deep = vec3(0.03, 0.09, 0.11);
        vec3 lite = vec3(0.18, 0.42, 0.46);
        vec3 col = mix(deep, lite, w * 0.6);
        float spark = smoothstep(0.78, 0.9, n(p * 4.0 - time * 0.4));
        col += vec3(0.5, 0.8, 0.9) * spark * 0.5;
        col += vec3(0.25, 0.45, 0.5) * (1.0 - edge) * 0.6;
        gl_FragColor = vec4(col, 0.92);
        #include <fog_fragment>
      }`,
    transparent: true,
    fog: true,
    depthWrite: false,
  });
  const streamCurve = new THREE.CatmullRomCurve3([[-24, -25], [-10, -27.5], [0, -27.2], [10, -26], [24, -28.5]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
  const sg = new THREE.PlaneGeometry(1, 1, 80, 1);
  const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5;
    const v = pos.getY(i) + 0.5;
    const pt = streamCurve.getPoint(u);
    const tan = streamCurve.getTangent(u);
    const nrm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    pos.setXYZ(i, pt.x + nrm.x * (v - 0.5) * 2.4, 0.04, pt.z + nrm.z * (v - 0.5) * 2.4);
  }
  sg.computeVertexNormals();
  const stream = new THREE.Mesh(sg, water);
  stream.renderOrder = 2;
  scene.add(stream);
  W.water = water;
  const plank = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
  const bb = new Batcher();
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) continue; // broken planks
    const z = -25.6 - i * 0.4;
    bb.add(new THREE.BoxGeometry(2.3, 0.1, 0.32), plank, [0.55 + (i % 2) * 0.05, 0.12, z], [0, (i % 3 - 1) * 0.05, (i % 2 ? 0.03 : -0.02)]);
  }
  for (const s of [-1, 1]) {
    bb.add(new THREE.BoxGeometry(0.12, 0.12, 3.8), plank, [0.55 + s * 1.2, 0.3, -27.3]);
    for (const z of [-25.4, -29.2]) bb.add(new THREE.CylinderGeometry(0.1, 0.12, 1.0, 8), plank, [0.55 + s * 1.2, 0.4, z]);
  }
  bb.build(scene);

  // ── trees (billboards facing the camera, swaying, casting shadows)
  const treeTex = { round: [FA.treeTexture('round', 1), FA.treeTexture('round', 2)], pine: [FA.treeTexture('pine', 3)], dead: [FA.treeTexture('dead', 4)], willow: [FA.treeTexture('willow', 5)] };
  const treeMats = {};
  const depthMats = {};
  for (const [k, list] of Object.entries(treeTex)) {
    treeMats[k] = list.map((t) => {
      const m = FA.swayMaterial(t, { color: 0xffffff, sway: k === 'dead' ? 0.01 : 0.035, emissive: 0x16262a, emissiveIntensity: 1 });
      W.swayMats.push(m);
      return m;
    });
    depthMats[k] = list.map((t) => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.45 }));
  }
  const farMats = {};
  for (const [k, list] of Object.entries(treeTex)) farMats[k] = list.map((t) => new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xffffff, emissive: 0x16262a }));
  const treeGeo = new THREE.PlaneGeometry(1, 2);
  treeGeo.translate(0, 1, 0);
  const placeTree = (x, z, s, kind, fg = false) => {
    const i = Math.floor(r() * treeMats[kind].length);
    let mat = treeMats[kind][i];
    if (fg) {
      mat = FA.swayMaterial(treeTex[kind][i], { color: 0xd8e0e4, sway: 0.035, emissive: 0x10202a, emissiveIntensity: 1 });
      W.swayMats.push(mat);
    }
    const m = new THREE.Mesh(treeGeo, mat);
    m.scale.set(s * (r() < 0.5 ? -1 : 1), s, s);
    m.rotation.x = -0.18;
    m.castShadow = true;
    m.receiveShadow = false;
    m.customDepthMaterial = depthMats[kind][i];
    if (fg) {
      m.position.set(x, 0, z);
      scene.add(m);
      W.fgTrees.push(m);
      return m;
    }
    // LOD: far trees drop the wind shader and shadow casting
    const lod = new THREE.LOD();
    lod.position.set(x, 0, z);
    lod.addLevel(m, 0);
    const far = new THREE.Mesh(treeGeo, farMats[kind][i]);
    far.scale.copy(m.scale);
    far.rotation.copy(m.rotation);
    lod.addLevel(far, 30);
    scene.add(lod);
    return lod;
  };
  // scatter trees outside the walkable zones, dense near the edges
  let placed = 0;
  for (let k = 0; k < 900 && placed < 150; k++) {
    const x = r.range(WORLD.x0 + 1, WORLD.x1 - 1);
    const z = r.range(WORLD.z0 + 2, WORLD.z1 - 1);
    if (walkable(x, z, -1.6)) continue;
    const nearEdge = walkable(x, z, -5);
    if (!nearEdge && r() < 0.55) continue;
    const kind = r() < 0.12 ? 'dead' : r() < 0.3 ? 'pine' : r() < 0.42 ? 'willow' : 'round';
    const s = r.range(2.8, 4.8) * (kind === 'pine' ? 1.1 : 1);
    // trees in front of the path (towards the camera) may occlude the player
    placeTree(x, z, s, kind, nearEdge);
    placed++;
  }

  // ── grass (instanced, wind-driven)
  const grassTex = FA.grassBlade();
  const grassMat = FA.swayMaterial(grassTex, { color: 0xe0f0e0, sway: 0.06, emissive: 0x0e2016, emissiveIntensity: 1 });
  W.swayMats.push(grassMat);
  const gGeo = new THREE.PlaneGeometry(0.9, 0.7);
  gGeo.translate(0, 0.35, 0);
  const count = 2600;
  const grass = new THREE.InstancedMesh(gGeo, grassMat, count);
  const d = new THREE.Object3D();
  let gi = 0;
  for (let k = 0; k < count * 4 && gi < count; k++) {
    const x = r.range(-18, 18);
    const z = r.range(-54, 25);
    const onPath = walkable(x, z, 1.4);
    if (onPath && r() < 0.92) continue;
    d.position.set(x, 0, z);
    d.rotation.set(-0.3, r.range(-0.3, 0.3), 0);
    const sc = r.range(0.6, 1.5);
    d.scale.set(sc * (r() < 0.5 ? -1 : 1), sc, sc);
    d.updateMatrix();
    grass.setMatrixAt(gi++, d.matrix);
  }
  grass.count = gi;
  grass.receiveShadow = true;
  scene.add(grass);

  // ── rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a4448, roughness: 0.95, flatShading: true });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x2e4a38, roughness: 1, flatShading: true });
  const rb = new Batcher();
  for (let k = 0; k < 90; k++) {
    const x = r.range(-16, 16);
    const z = r.range(-52, 24);
    if (walkable(x, z, 0.8)) continue;
    const s = r.range(0.3, 1.1);
    rb.add(new THREE.DodecahedronGeometry(s, 0), r() < 0.4 ? mossMat : rockMat, [x, s * 0.35, z], [r() * 3, r() * 3, r() * 3], [1, 0.6, 1]);
  }
  rb.build(scene);

  // ── sprites helper (upright, facing camera)
  const sprite = (tex, w, h, x, z, { emissive = 0x000000, ei = 0, cast = true, tilt = -0.25, y = 0 } = {}) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, emissive, emissiveIntensity: ei, emissiveMap: ei ? tex : null, roughness: 1 }));
    m.position.set(x, y, z);
    m.rotation.x = tilt;
    m.castShadow = cast;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.4 });
    scene.add(m);
    return m;
  };

  // mushrooms (glowing, breathing)
  const mushTex = { cyan: FA.SPRITES.mushroom('cyan'), purple: FA.SPRITES.mushroom('purple'), red: FA.SPRITES.mushroom('red') };
  for (let k = 0; k < 70; k++) {
    const x = r.range(-14, 14);
    const z = r.range(-52, 24);
    if (walkable(x, z, 1.2) && r() < 0.8) continue;
    const kind = r.pick(['cyan', 'cyan', 'purple', 'red']);
    const s = r.range(0.5, 1.1);
    const m = sprite(mushTex[kind], s, s, x, z, { emissive: kind === 'cyan' ? 0x40ffd0 : kind === 'purple' ? 0xb070ff : 0xff6040, ei: 1.2, cast: false });
    m.userData.ph = r() * 6;
    W.mushrooms.push(m);
  }

  // candles with flames + a few real lights
  const candleTex = FA.SPRITES.candle();
  const flameTex = FA.SPRITES.flame();
  const candle = (x, z, s = 0.5, light = false) => {
    sprite(candleTex, s * 0.5, s, x, z, { cast: false });
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffc080 }));
    f.scale.set(s * 0.35, s * 0.6, 1);
    f.position.set(x, s * 1.05, z + 0.02);
    f.userData.base = f.scale.clone();
    f.userData.ph = r() * 6;
    scene.add(f);
    W.flames.push(f);
    if (light) {
      const L = new THREE.PointLight(0xff9a50, 6, 7, 1.8);
      L.position.set(x, s * 1.4 + 0.3, z);
      scene.add(L);
      W.lights.push({ L, base: 6, ph: r() * 6 });
    }
  };

  // ── altar
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a4a54, roughness: 0.95, flatShading: true });
  const ab = new Batcher();
  ab.add(new THREE.BoxGeometry(2.6, 0.7, 1.4), stone, [-5.2, 0.35, -6.2], [0, 0.1, 0]);
  ab.add(new THREE.BoxGeometry(3.0, 0.15, 1.7), stone, [-5.2, 0.77, -6.2], [0, 0.1, 0]);
  for (const s of [-1, 1]) {
    ab.add(new THREE.CylinderGeometry(0.28, 0.34, 2.6, 7), stone, [-5.2 + s * 2.2, 1.3, -6.6]);
    ab.add(new THREE.BoxGeometry(0.8, 0.2, 0.8), stone, [-5.2 + s * 2.2, 2.65, -6.6]);
  }
  ab.build(scene);
  const runeTex = FA.SPRITES.rune();
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xff4a50, opacity: 0.65, fog: true }));
  rune.rotation.x = -Math.PI / 2;
  rune.position.set(-4.5, 0.03, -4.5);
  scene.add(rune);
  W.rune = rune;
  [[-6.6, -5.5], [-3.8, -5.6], [-7, -7], [-3.4, -7.1], [-5.8, -5.3], [-4.6, -5.35]].forEach(([x, z], i) => candle(x, z, 0.5 + (i % 3) * 0.12, i === 0 || i === 3));
  const altarLight = new THREE.PointLight(0xff4050, 7, 8, 1.6);
  altarLight.position.set(-5, 1.5, -4.8);
  scene.add(altarLight);
  W.lights.push({ L: altarLight, base: 7, ph: 1 });
  const skullTex = FA.SPRITES.skull();
  [[-5.6, -6.4, 0.45], [-4.7, -6.3, 0.35], [-2.3, -2.2, 0.4], [3.4, -21.5, 0.5], [-2.2, -38, 0.6], [3, -44, 0.5]].forEach(([x, z, s]) => sprite(skullTex, s, s, x, z, { y: x === -5.6 || x === -4.7 ? 0.85 : 0 }));

  // ── totems with lanterns along the road, signs
  const totemTex = FA.SPRITES.totem();
  [[-2.6, 11], [4.6, 5], [-4.4, -12.5], [5.8, -24]].forEach(([x, z], i) => {
    sprite(totemTex, 0.9, 2.7, x, z);
    if (i % 2 === 0) candle(x + 0.55, z + 0.2, 0.45, true);
  });
  sprite(FA.SPRITES.sign('月光祭壇', 'MOON ALTAR'), 1.6, 1.28, 3.6, 4.2);
  sprite(FA.SPRITES.sign('史萊姆巢穴', 'SLIME NEST'), 1.6, 1.28, 4.2, -29.5);
  sprite(FA.SPRITES.sign('黑森林', 'THE BLACK WOOD'), 1.6, 1.28, -3.8, 20.5);

  // ── rune gate before the nest
  const gb = new Batcher();
  for (const s of [-1, 1]) {
    gb.add(new THREE.BoxGeometry(0.9, 3.4, 0.7), stone, [s * 2.9, 1.7, -32], [0, 0, s * 0.06]);
    gb.add(new THREE.BoxGeometry(1.2, 0.4, 0.9), stone, [s * 2.9, 3.45, -32]);
  }
  gb.build(scene);
  const thorns = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.2), new THREE.MeshBasicMaterial({ map: FA.SPRITES.thorns(), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, color: 0xc090ff, fog: true }));
  thorns.position.set(0, 1.6, -32);
  scene.add(thorns);
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 90, 4, 64, 80, 70);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const gateGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x9050ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  gateGlow.position.set(0, 1.7, -31.95);
  scene.add(gateGlow);
  const gateLight = new THREE.PointLight(0xa060ff, 5, 7, 1.8);
  gateLight.position.set(0, 1.5, -30.5);
  scene.add(gateLight);
  W.gate = { thorns, glow: gateGlow, light: gateLight, open: false };
  const gateRune = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xb070ff, opacity: 0.5 }));
  gateRune.rotation.x = -Math.PI / 2;
  gateRune.position.set(0, 0.04, -30.6);
  scene.add(gateRune);
  W.gate.rune = gateRune;

  // ── slime nest goo puddles + eerie light
  const gooTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const rr = rng(5);
    x.fillStyle = '#fff';
    x.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rad = 44 + rr() * 14;
      x.lineTo(64 + Math.cos(a) * rad, 64 + Math.sin(a) * rad);
    }
    x.fill();
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath();
    x.arc(74, 74, 30, 0, Math.PI * 2);
    x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const goo = new THREE.MeshStandardMaterial({ map: gooTex, color: 0x5a3480, roughness: 0.2, emissive: 0x1e0838, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, alphaTest: 0.1, depthWrite: false });
  const nb = new Batcher();
  for (let k = 0; k < 14; k++) {
    const a = r() * Math.PI * 2;
    const rr = r.range(2, 7);
    nb.add(new THREE.CircleGeometry(r.range(0.4, 1.2), 12), goo, [Math.cos(a) * rr, 0.02, -41 + Math.sin(a) * rr * 0.8], [-Math.PI / 2, 0, 0], [1, r.range(0.6, 1), 1]);
  }
  nb.build(scene, { cast: false });
  const nestLight = new THREE.PointLight(0xb060ff, 3.2, 12, 1.6);
  nestLight.position.set(0, 2.2, -41);
  scene.add(nestLight);
  W.lights.push({ L: nestLight, base: 6, ph: 3 });

  // ── fireflies + mist
  W.fireflies = createDust({ count: 500, box: [[-18, 0.3, -54], [18, 3.5, 25]], color: 0xd8ff9a, size: 0.05, opacity: 0.9, speed: 0.25, twinkle: 1 });
  scene.add(W.fireflies);
  W.spores = createDust({ count: 300, box: [[-8, 0.1, -48], [8, 2.2, 24]], color: 0xb89aff, size: 0.03, opacity: 0.6, speed: 0.12, rise: 0.02 });
  scene.add(W.spores);

  W.update = (t, camera, playerScreen) => {
    for (const m of W.swayMats) m.userData.uniforms.time.value = t;
    water.uniforms.time.value = t;
    for (const m of W.mushrooms) {
      const k = 1 + Math.sin(t * 1.6 + m.userData.ph) * 0.05;
      m.scale.set(k, 2 - k, 1);
      m.material.emissiveIntensity = 0.9 + Math.sin(t * 2 + m.userData.ph) * 0.35;
    }
    for (const f of W.flames) {
      const fl = 1 + Math.sin(t * 17 + f.userData.ph) * 0.08 + Math.sin(t * 9.3 + f.userData.ph * 2) * 0.06;
      f.scale.set(f.userData.base.x * (2 - fl), f.userData.base.y * fl, 1);
    }
    for (const l of W.lights) l.L.intensity = l.base * (1 + Math.sin(t * 13 + l.ph) * 0.05 + Math.sin(t * 7 + l.ph) * 0.05);
    rune.material.opacity = 0.5 + Math.sin(t * 1.5) * 0.15;
    rune.rotation.z = t * 0.05;
    W.gate.rune.rotation.z = -t * 0.08;
    if (!W.gate.open) W.gate.glow.material.opacity = 0.18 + Math.sin(t * 2.4) * 0.07;
    W.fireflies.material.uniforms.time.value = t;
    W.spores.material.uniforms.time.value = t;
    void camera;
    void playerScreen;
  };

  return W;
}
