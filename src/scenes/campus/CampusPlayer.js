import * as THREE from 'three';
import { Humanoid } from '../../actors/Humanoid.js';
import { PLAYER_CFG } from './campusScript.js';

const COMBO = [
  { anim: 'attack1', dur: 0.3, hitAt: 0.09, dmg: 12, stop: 40, shake: 0.03, kb: 1.6, lunge: 0.35, arc: [-0.55, 2.3], sfx: 1.0 },
  { anim: 'attack2', dur: 0.3, hitAt: 0.09, dmg: 14, stop: 45, shake: 0.035, kb: 1.9, lunge: 0.4, arc: [0.5, 2.1], sfx: 1.15 },
  { anim: 'attack3', dur: 0.48, hitAt: 0.19, dmg: 26, stop: 75, shake: 0.09, kb: 3.4, lunge: 0.7, arc: [1.57, 2.8], sfx: 0.8, heavy: true },
];

/**
 * Akari — the campus protagonist. 2D rig in a 3D world with a small but
 * weighty action kit: 3-hit combo, dodge with afterimages, time rift.
 */
export class CampusPlayer {
  constructor(game, scene, fx) {
    this.game = game;
    this.scene = scene;
    this.fx = fx;
    this.h = new Humanoid(PLAYER_CFG, { ppm: 470, rimColor: 0xffc27a, rimStrength: 0.45, blobRadius: 0.4, blobOpacity: 0.5 });
    this.root = this.h.root;
    this.pos = this.root.position;
    this.facing = 1;
    this.hp = 100;
    this.maxHp = 100;
    this.state = 'free';
    this.stateT = 0;
    this.combo = -1;
    this.queued = false;
    this.hitDone = false;
    this.invuln = 0;
    this.dodgeCd = 0;
    this.dodgeDir = new THREE.Vector3();
    this.riftCd = 0;
    this.riftT = 0;
    this.riftMax = 8;
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.stepT = 0;
    this.locked = false;
    this.combat = false;
    this.ghosts = [];
    this._ghostMat = new THREE.MeshBasicMaterial({ map: this.h.rig.texture, transparent: true, alphaTest: 0.4, color: 0x7fd8ff, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
    this.blade = this._makeBlade();
  }

  _makeBlade() {
    // luminous "time blade" held during attacks
    const g = new THREE.PlaneGeometry(0.08, 0.95);
    g.translate(0, -0.52, 0);
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 32, 0);
    gr.addColorStop(0, 'rgba(120,220,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(120,220,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 32, 256);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, color: 0xaef0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, side: THREE.DoubleSide }));
    m.position.z = 0.04;
    m.renderOrder = 11;
    this.h.rig.nodes.handF.add(m);
    return m;
  }

  get center() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 1.0, this.pos.z);
  }

  setFacing(f) {
    if (!f) return;
    this.facing = f;
    this.h.setFacing(f);
  }

  // ─────────────────────────── actions ───────────────────────────

  attack() {
    if (this.state === 'free' || (this.state === 'attack' && this.stateT > COMBO[this.combo].dur * 0.45)) {
      if (this.state === 'attack') {
        if (this.combo >= 2) {
          this.queued = false;
          return;
        }
        this.queued = true;
        return;
      }
      this._startAttack(0);
    } else if (this.state === 'attack') this.queued = true;
  }

  _startAttack(i) {
    const a = COMBO[i];
    this.combo = i;
    this.state = 'attack';
    this.stateT = 0;
    this.hitDone = false;
    this.queued = false;
    this.h.play(a.anim);
    this.game.audio.play(a.heavy ? 'swing_heavy' : 'swing', { pitch: a.sfx, force: true });
    this.blade.material.opacity = 1;
  }

  dodge(ax, az) {
    if (this.dodgeCd > 0 || this.state === 'dodge' || this.state === 'dead') return;
    this.state = 'dodge';
    this.stateT = 0;
    this.dodgeCd = 0.5;
    this.invuln = 0.34;
    const d = new THREE.Vector3(ax, 0, az * 0.6);
    if (d.lengthSq() < 0.01) d.set(-this.facing, 0, 0);
    this.dodgeDir.copy(d.normalize());
    if (Math.abs(this.dodgeDir.x) > 0.1) this.setFacing(-Math.sign(this.dodgeDir.x) || this.facing);
    this.h.play('dodge');
    this.game.audio.play('dodge');
    this.blade.material.opacity = 0;
    this._ghostT = 0;
  }

  rift() {
    if (this.riftCd > 0 || this.riftT > 0 || this.state === 'dead') return false;
    this.riftT = 2;
    this.riftCd = this.riftMax;
    const g = this.game;
    g.time.setScales(0.25, 0.7);
    g.post.set('rift', 1);
    g.audio.setLowpass(750, 0.2);
    g.audio.play('rift_on');
    this.h.play('cast');
    g.shake(0.05, 0.25);
    this.fx.particles.burst(this.center, { count: 60, colors: [0x9fe6ff, 0xffffff, 0xd8c0ff], speed: [1, 4], life: [0.6, 1.4], size: [0.03, 0.08], drag: 1.5, shape: 0, jitter: 0.4 });
    return true;
  }

  hurt(dmg, dir) {
    if (this.invuln > 0 || this.state === 'dead') return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.8;
    const g = this.game;
    g.time.requestHitStop(60);
    g.shake(0.08, 0.3);
    g.post.set('flash', 0.25, true);
    g.post.fx.flash = 0.25;
    g.post.fxTarget.flash = 0;
    g.audio.play('player_hurt');
    this.knock.set(dir.x * 4, 0, dir.z * 2);
    this.h.play('hit');
    this.h.rig.material.uniforms.flash.value = 1;
    this.h.rig.material.uniforms.flashColor.value.set(0xff5a50);
    this.fx.particles.burst(this.center, { count: 14, colors: [0xff6a5a, 0xffc0a0], speed: [2, 5], life: [0.3, 0.6], size: [0.03, 0.06], gravity: 6, shape: 2 });
    if (this.hp <= 0) {
      this.state = 'dead';
      this.stateT = 0;
      this.blade.material.opacity = 0;
    } else {
      this.state = 'hurt';
      this.stateT = 0;
    }
    return true;
  }

  heal() {
    this.hp = this.maxHp;
    this.state = 'free';
    this.invuln = 1.5;
  }

  _spawnGhost() {
    const clone = this.h.rig.root.clone();
    clone.traverse((o) => {
      if (o.isMesh) {
        o.material = this._ghostMat.clone();
        o.castShadow = false;
      }
    });
    clone.position.copy(this.pos);
    clone.scale.copy(this.h.rig.root.scale);
    this.scene.add(clone);
    this.ghosts.push({ obj: clone, t: 0.35 });
  }

  // ─────────────────────────── per frame ───────────────────────────

  /**
   * @param dt player-scaled dt ; @param real real dt
   */
  update(dt, real, input, area, enemies) {
    const g = this.game;
    this.invuln -= real;
    this.dodgeCd -= dt;
    if (this.riftCd > 0 && this.riftT <= 0) this.riftCd = Math.max(0, this.riftCd - real);
    if (this.riftT > 0) {
      this.riftT -= real;
      if (Math.random() < 0.5) this.fx.particles.burst(this.center.add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.3) * 2, (Math.random() - 0.5) * 2)), { count: 1, colors: [0x9fe6ff, 0xd8c0ff], speed: [0.05, 0.2], life: [1, 1.8], size: [0.03, 0.07], drag: 0.5, shape: 0 });
      if (this.riftT <= 0) {
        g.time.setScales(1, 1);
        g.post.set('rift', 0);
        g.audio.setLowpass(20000, 0.4);
        g.audio.play('rift_off');
      }
    }
    const uf = this.h.rig.material.uniforms;
    uf.flash.value = Math.max(0, uf.flash.value - real * 6);
    this.h.rig.root.visible = !(this.invuln > 0 && this.state !== 'dodge' && Math.floor(this.invuln * 20) % 2 === 0 && this.state !== 'dead');

    // input
    let ax = 0;
    let az = 0;
    if (!this.locked && input.enabled && this.state !== 'dead') {
      const a = input.axis();
      ax = a.x;
      az = a.y;
      if (input.pressed('Mouse0', 'KeyJ')) this.attack();
      if (input.pressed('ShiftLeft', 'ShiftRight')) this.dodge(ax, az);
      if (input.pressed('Space') && this.combat) {
        if (!this.rift()) g.audio.play('deny');
      }
    }

    this.stateT += dt;
    let speed = 0;
    const move = new THREE.Vector3();
    switch (this.state) {
      case 'free': {
        if (ax || az) {
          move.set(ax, 0, az * 0.75).normalize();
          speed = 2.9;
          this.setFacing(Math.sign(ax) || this.facing);
        }
        this.blade.material.opacity = Math.max(0, this.blade.material.opacity - real * 4);
        break;
      }
      case 'attack': {
        const a = COMBO[this.combo];
        // forward lunge during the first half
        if (this.stateT < a.dur * 0.5) move.set(this.facing, 0, 0), (speed = (a.lunge / (a.dur * 0.5)) * (1 - this.stateT / (a.dur * 0.5)) * 1.6);
        if (!this.hitDone && this.stateT >= a.hitAt) {
          this.hitDone = true;
          this._resolveHit(a);
        }
        if (this.stateT >= a.dur) {
          if (this.queued && this.combo < 2) this._startAttack(this.combo + 1);
          else {
            this.state = 'free';
            this.combo = -1;
          }
        }
        break;
      }
      case 'dodge': {
        const k = 1 - this.stateT / 0.3;
        move.copy(this.dodgeDir);
        speed = 9.5 * Math.max(0, k);
        this._ghostT = (this._ghostT || 0) - real;
        if (this._ghostT <= 0) {
          this._spawnGhost();
          this._ghostT = 0.05;
        }
        if (this.stateT >= 0.3) this.state = 'free';
        break;
      }
      case 'hurt':
        if (this.stateT > 0.35) this.state = 'free';
        break;
      case 'dead':
        break;
      default:
        break;
    }
    // knockback
    this.knock.multiplyScalar(Math.exp(-dt * 8));
    const vx = move.x * speed + this.knock.x;
    const vz = move.z * speed + this.knock.z;
    this.pos.x += vx * dt;
    this.pos.z += vz * dt;
    this._collide(area);
    this.h.move(this.state === 'free' && speed > 0 ? 1.15 : 0, vx);
    this.h.update(dt);
    // footsteps
    if (this.state === 'free' && speed > 0) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.36;
        g.audio.play(area.floor === 'wood' ? 'step_wood' : 'step_tile', { gain: 0.8 });
      }
    } else this.stepT = 0.1;

    // ghosts fade
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const gh = this.ghosts[i];
      gh.t -= real;
      gh.obj.traverse((o) => o.material && (o.material.opacity = Math.max(0, gh.t / 0.35) * 0.45));
      if (gh.t <= 0) {
        this.scene.remove(gh.obj);
        gh.obj.traverse((o) => o.material && o.material.dispose());
        this.ghosts.splice(i, 1);
      }
    }
    void enemies;
  }

  _resolveHit(a) {
    const g = this.game;
    const c = this.center;
    // slash visual in the camera plane, centred in front of the player
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.facing > 0 ? 0 : Math.PI, a.arc[0]));
    this.fx.slash.spawn({ pos: new THREE.Vector3(c.x + this.facing * 0.45, c.y + (a.heavy ? 0.1 : 0.05), c.z + 0.1), quaternion: q, radius: a.heavy ? 1.15 : 0.9, width: a.heavy ? 0.42 : 0.3, arc: a.arc[1], color: a.heavy ? 0x8fd8ff : 0x9fe6ff, duration: a.heavy ? 0.3 : 0.2 });
    const hits = g.combat.attack({
      origin: new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z),
      dir: new THREE.Vector3(this.facing, 0, 0),
      range: a.heavy ? 1.75 : 1.45,
      arc: 2.0,
      team: 'player',
      damage: a.dmg,
      knockback: a.kb,
      strength: a.heavy ? 1.6 : 1,
      hitStop: a.stop,
      shake: a.shake,
      tag: 'combo' + this.combo,
    });
    if (hits) g.audio.play('hit', { strength: a.heavy ? 1.6 : 1, force: true });
  }

  _collide(area) {
    const b = area.bounds;
    this.pos.x = Math.min(b.xMax, Math.max(b.xMin, this.pos.x));
    this.pos.z = Math.min(b.zMax, Math.max(b.zMin, this.pos.z));
    const r = 0.22;
    for (const o of area.obstacles || []) {
      if (this.pos.x > o.x0 - r && this.pos.x < o.x1 + r && this.pos.z > o.z0 - r && this.pos.z < o.z1 + r) {
        const dl = this.pos.x - (o.x0 - r);
        const dr = o.x1 + r - this.pos.x;
        const db = this.pos.z - (o.z0 - r);
        const df = o.z1 + r - this.pos.z;
        const m = Math.min(dl, dr, db, df);
        if (m === dl) this.pos.x = o.x0 - r;
        else if (m === dr) this.pos.x = o.x1 + r;
        else if (m === db) this.pos.z = o.z0 - r;
        else this.pos.z = o.z1 + r;
      }
    }
  }

  dispose() {
    this.ghosts.forEach((gh) => this.scene.remove(gh.obj));
    this.h.dispose();
  }
}
