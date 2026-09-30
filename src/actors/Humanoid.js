import * as THREE from 'three';
import { PaperRig, blobShadow } from '../art/rig/PaperRig.js';
import { humanoidParts } from '../art/characters/humanoid.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Keyframed one-shot actions (angles in radians, offsets in character px).
 * Each key: [time, { part: rotation } ] ; special keys: _dx, _dy (hips), _lean
 */
const ACTIONS = {
  attack1: { dur: 0.3, keys: [[0, { upperArmF: 0.2, foreArmF: -0.3, _lean: 0 }], [0.07, { upperArmF: 2.4, foreArmF: -0.6, _lean: 0.08 }], [0.14, { upperArmF: -1.2, foreArmF: -0.2, _lean: -0.12 }], [0.3, { upperArmF: -0.5, foreArmF: -0.3, _lean: -0.04 }]] },
  attack2: { dur: 0.3, keys: [[0, { upperArmF: -0.5, foreArmF: -0.3 }], [0.07, { upperArmF: -1.9, foreArmF: -1.2, _lean: 0.06 }], [0.14, { upperArmF: 1.6, foreArmF: 0.2, _lean: -0.14 }], [0.3, { upperArmF: 0.9, foreArmF: 0, _lean: -0.05 }]] },
  attack3: { dur: 0.46, keys: [[0, { upperArmF: 0.9, _dy: 0 }], [0.12, { upperArmF: 3.0, foreArmF: -0.4, upperArmB: 2.2, _dy: 14, _lean: 0.1, _sy: 1.06 }], [0.2, { upperArmF: -1.6, foreArmF: -0.1, upperArmB: -0.8, _dy: -18, _lean: -0.22, _sy: 0.9 }], [0.46, { upperArmF: -0.6, foreArmF: -0.3, _dy: 0, _lean: -0.05, _sy: 1 }]] },
  hit: { dur: 0.32, keys: [[0, { _lean: 0.25, head: 0.25, upperArmF: 0.6, upperArmB: -0.5 }], [0.32, { _lean: 0, head: 0 }]] },
  dodge: { dur: 0.32, keys: [[0, { _lean: -0.45, _dy: -30, _sy: 0.92, thighF: -0.9, shinF: 1.2, thighB: 0.8, shinB: 0.6, upperArmF: -1.2, upperArmB: 1.1 }], [0.32, { _lean: 0, _dy: 0, _sy: 1 }]] },
  cast: { dur: 0.5, keys: [[0, { upperArmF: 0, upperArmB: 0 }], [0.15, { upperArmF: -2.6, upperArmB: 2.6, foreArmF: 0.4, foreArmB: -0.4, _dy: 10, head: -0.15 }], [0.5, { upperArmF: -0.2, upperArmB: 0.2, _dy: 0, head: 0 }]] },
  wave: { dur: 1.2, keys: [[0, { upperArmF: 0 }], [0.2, { upperArmF: -2.6, foreArmF: -0.6 }], [0.4, { upperArmF: -2.6, foreArmF: 0.2 }], [0.6, { upperArmF: -2.6, foreArmF: -0.6 }], [0.8, { upperArmF: -2.6, foreArmF: 0.2 }], [1.2, { upperArmF: 0, foreArmF: 0 }]] },
  nod: { dur: 0.5, keys: [[0, { head: 0 }], [0.15, { head: -0.12, _dy: -2 }], [0.3, { head: 0.02 }], [0.5, { head: 0, _dy: 0 }]] },
  surprise: { dur: 0.6, keys: [[0, { _dy: 0 }], [0.1, { _dy: 12, upperArmF: -0.5, upperArmB: 0.5, head: 0.08 }], [0.6, { _dy: 0, upperArmF: 0, upperArmB: 0, head: 0 }]] },
};

const PARTS_ANIM = ['hips', 'torso', 'head', 'upperArmF', 'foreArmF', 'handF', 'upperArmB', 'foreArmB', 'handB', 'thighF', 'shinF', 'footF', 'thighB', 'shinB', 'footB', 'hairFront', 'hairBack', 'tail', 'tailL', 'tailR', 'skirt', 'eyes', 'mouth', 'umbrella'];

/**
 * A 2D skeletal character (paper rig) with procedural animation:
 * idle (breathing, weight shift), walk / run, blink, secondary hair and
 * skirt motion, talking, look-at, and keyframed actions.
 */
export class Humanoid {
  constructor(cfg, o = {}) {
    this.cfg = cfg;
    const S = cfg.S || 1;
    this.rig = new PaperRig(humanoidParts(cfg), {
      ppm: (o.ppm || 470) * S,
      atlasSize: o.atlasSize || (S > 1 ? 2048 : 1024),
      rimColor: o.rimColor ?? 0xffc07a,
      rimStrength: o.rimStrength ?? 1,
      castShadow: o.castShadow,
      silhouette: o.silhouette,
      silhouetteColor: o.silhouetteColor,
      alphaCut: o.alphaCut,
      name: cfg.name,
    });
    this.root = new THREE.Group();
    this.root.add(this.rig.root);
    this.scale = o.scale || 1;
    this.rig.root.scale.setScalar(this.scale);
    if (o.blob !== false) {
      this.blob = blobShadow(o.blobRadius || 0.42, o.blobOpacity ?? 0.5);
      this.blob.position.y = 0.01;
      this.root.add(this.blob);
    }
    this.ppm = (o.ppm || 470) * S;
    this.px = 1 / this.ppm; // metres per character px (before S scaling)
    this.S = S;
    this.t = Math.random() * 10;
    this.walkPhase = 0;
    this.speed = 0; // 0..1 walk, >1 run
    this.targetSpeed = 0;
    this.facing = 1;
    this.talking = false;
    this.mouthT = 0;
    this.blinkT = 1 + Math.random() * 3;
    this.blinkStage = -1;
    this.action = null;
    this.actionT = 0;
    this.lookDir = 0;
    this.lookTarget = 0;
    this.hairSpring = { v: 0, x: 0 };
    this.skirtSpring = { v: 0, x: 0 };
    this.velX = 0;
    this.expression = cfg.smile ? 'smile' : 'closed';
    this.idleStyle = o.idleStyle || 'normal';
    this.timeScale = 1;
  }

  get position() {
    return this.root.position;
  }

  setFacing(f) {
    if (f === 0 || f === this.facing) return;
    this.facing = f;
    this.rig.setFacing(f);
  }

  /** speed: 0 idle, 1 walk, 2 run ; velX in m/s for secondary motion */
  move(speed, velX = 0) {
    this.targetSpeed = speed;
    this.velX = velX;
  }

  play(name) {
    if (!ACTIONS[name]) return;
    this.action = ACTIONS[name];
    this.actionName = name;
    this.actionT = 0;
  }

  setTalking(v) {
    this.talking = v;
    if (!v) this.rig.setFrame('mouth', this.expression);
  }

  setExpression(e) {
    this.expression = e;
    if (!this.talking) this.rig.setFrame('mouth', e);
  }

  lookAt(dir) {
    this.lookTarget = dir;
  }

  update(dt) {
    dt *= this.timeScale;
    this.t += dt;
    const t = this.t;
    const rig = this.rig;
    const S = this.S;
    const px = (v) => (v * S) / this.ppm; // character px → metres

    this.speed = lerp(this.speed, this.targetSpeed, 1 - Math.exp(-dt * 10));
    const sp = this.speed;
    const walkAmt = Math.min(1, sp);
    const runAmt = Math.max(0, Math.min(1, sp - 1));
    const freq = lerp(7.2, 11.5, runAmt);
    this.walkPhase += dt * freq * (sp > 0.05 ? 1 : 0);
    const ph = this.walkPhase;
    const s1 = Math.sin(ph);
    const c1 = Math.cos(ph);

    // idle breathing
    const br = Math.sin(t * 2.1);
    const idleW = 1 - walkAmt;
    const pose = {};
    for (const k of PARTS_ANIM) pose[k] = 0;

    const legA = lerp(0.42, 0.72, runAmt) * walkAmt;
    pose.thighF = legA * s1;
    pose.thighB = -legA * s1;
    pose.shinF = -Math.max(0, Math.sin(ph + 1.9)) * lerp(0.7, 1.3, runAmt) * walkAmt;
    pose.shinB = -Math.max(0, Math.sin(ph + 1.9 + Math.PI)) * lerp(0.7, 1.3, runAmt) * walkAmt;
    pose.footF = -pose.shinF * 0.3;
    pose.footB = -pose.shinB * 0.3;
    const armA = lerp(0.32, 0.8, runAmt) * walkAmt;
    pose.upperArmF = -armA * s1 + idleW * (0.05 + 0.02 * br);
    pose.upperArmB = armA * s1 - idleW * (0.05 + 0.02 * br);
    pose.foreArmF = -(0.15 + runAmt * 0.9) * walkAmt - 0.05 * idleW;
    pose.foreArmB = -(0.15 + runAmt * 0.9) * walkAmt - 0.05 * idleW;
    let lean = -(0.05 * walkAmt + 0.12 * runAmt);
    let hipsDy = Math.abs(c1) * lerp(5, 12, runAmt) * walkAmt + br * 1.2 * idleW;
    let hipsDx = Math.sin(t * 0.55) * 2.5 * idleW;
    pose.head = Math.sin(t * 0.8) * 0.025 * idleW + s1 * 0.02 * walkAmt;
    let torsoSy = 1 + br * 0.012 * idleW;
    let bodySy = 1;

    if (this.idleStyle === 'lean' && idleW > 0.5) {
      pose.upperArmF += -0.1;
      pose.foreArmF += -0.35;
    }

    // keyframed action overlays
    if (this.action) {
      this.actionT += dt;
      const a = this.action;
      const at = this.actionT;
      if (at >= a.dur) this.action = null;
      else {
        const keys = a.keys;
        let k0 = keys[0];
        let k1 = keys[keys.length - 1];
        for (let i = 0; i < keys.length - 1; i++) {
          if (at >= keys[i][0] && at <= keys[i + 1][0]) {
            k0 = keys[i];
            k1 = keys[i + 1];
            break;
          }
        }
        const u = ease(Math.min(1, (at - k0[0]) / Math.max(0.0001, k1[0] - k0[0])));
        const names = new Set([...Object.keys(k0[1]), ...Object.keys(k1[1])]);
        for (const n of names) {
          const v0 = k0[1][n] ?? (n === '_sy' ? 1 : 0);
          const v1 = k1[1][n] ?? (n === '_sy' ? 1 : 0);
          const v = lerp(v0, v1, u);
          if (n === '_lean') lean += v;
          else if (n === '_dy') hipsDy += v;
          else if (n === '_dx') hipsDx += v;
          else if (n === '_sy') bodySy = v;
          else pose[n] = v;
        }
      }
    }

    // secondary motion — hair & skirt springs driven by velocity + wind
    const wind = Math.sin(t * 1.3) * 0.03 + Math.sin(t * 2.7) * 0.015;
    const hairTarget = -this.velX * 0.05 * this.facing + wind + lean * 0.6;
    const hs = this.hairSpring;
    const ss = this.skirtSpring;
    const skTarget = -Math.abs(this.velX) * 0.03 + s1 * 0.04 * walkAmt;
    // semi-implicit springs, sub-stepped so long frames stay stable
    for (let rem = dt; rem > 1e-6; rem -= 1 / 90) {
      const h = Math.min(rem, 1 / 90);
      hs.v += ((hairTarget - hs.x) * 60 - hs.v * 9) * h;
      hs.x += hs.v * h;
      ss.v += ((skTarget - ss.x) * 90 - ss.v * 10) * h;
      ss.x += ss.v * h;
    }
    hs.x = Math.max(-0.6, Math.min(0.6, hs.x));
    ss.x = Math.max(-0.4, Math.min(0.4, ss.x));

    rig.pose('hips', lean * 0.4, px(hipsDx), px(hipsDy), 1, bodySy);
    rig.pose('torso', lean * 0.6 + br * 0.006 * idleW, 0, px(br * 0.6 * idleW), 1, torsoSy);
    const lt = this.lookTarget;
    this.lookDir = lerp(this.lookDir, lt, 1 - Math.exp(-dt * 6));
    rig.pose('head', pose.head - lean * 0.3 + this.lookDir * 0.04 * this.facing, 0, 0);
    rig.pose('eyes', 0, px(this.lookDir * 4 * this.facing), 0);
    rig.pose('mouth', 0, px(this.lookDir * 3 * this.facing), 0);
    rig.pose('hairFront', hs.x * 0.35, 0, 0);
    rig.pose('hairBack', hs.x * 0.8, 0, 0);
    rig.pose('tail', hs.x * 1.6 + Math.sin(t * 2.4) * 0.05, 0, 0);
    rig.pose('tailL', hs.x * 1.3 + Math.sin(t * 2.2) * 0.04, 0, 0);
    rig.pose('tailR', hs.x * 1.3 + Math.sin(t * 2.2 + 1) * 0.04, 0, 0);
    rig.pose('skirt', ss.x, 0, 0, 1 + Math.abs(ss.x) * 0.3, 1);
    for (const n of ['upperArmF', 'foreArmF', 'upperArmB', 'foreArmB', 'thighF', 'shinF', 'footF', 'thighB', 'shinB', 'footB', 'handF', 'handB']) {
      rig.pose(n, pose[n]);
    }
    if (rig.nodes.umbrella) rig.pose('umbrella', -pose.upperArmF - pose.foreArmF + 0.12);

    // blink
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blinkStage < 0) {
      this.blinkStage = 0;
      this.blinkClock = 0;
    }
    if (this.blinkStage >= 0) {
      this.blinkClock += dt;
      const frames = ['half', 'closed', 'closed', 'half', 'open'];
      const idx = Math.min(frames.length - 1, Math.floor(this.blinkClock / 0.035));
      rig.setFrame('eyes', frames[idx]);
      if (idx === frames.length - 1) {
        this.blinkStage = -1;
        this.blinkT = 1.8 + Math.random() * 3.5 + (Math.random() < 0.15 ? -1.6 : 0);
      }
    }

    // talking mouth
    if (this.talking) {
      this.mouthT -= dt;
      if (this.mouthT <= 0) {
        const r = Math.random();
        rig.setFrame('mouth', r < 0.45 ? 'open' : r < 0.7 ? 'o' : this.expression);
        this.mouthT = 0.06 + Math.random() * 0.09;
      }
    }
  }

  dispose() {
    this.rig.dispose();
  }
}
