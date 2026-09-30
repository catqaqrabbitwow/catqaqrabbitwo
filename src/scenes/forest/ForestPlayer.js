import * as THREE from 'three';
import { ChibiActor } from '../../actors/ChibiActor.js';
import { wandererParts } from '../../art/characters/chibi.js';
import { constrain } from './ForestWorld.js';

const COMBO = [
  { dur: 0.3, hitAt: 0.08, dmg: 10, stop: 40, shake: 0.05, kb: 5, lunge: 3.2, range: 1.75, arc: 2.1, swing: [-2.2, 1.0], trail: 0.2 },
  { dur: 0.3, hitAt: 0.08, dmg: 12, stop: 45, shake: 0.06, kb: 5.5, lunge: 3.2, range: 1.8, arc: 2.1, swing: [1.2, -2.0], trail: 0.2 },
  { dur: 0.5, hitAt: 0.16, dmg: 22, stop: 80, shake: 0.14, kb: 9, lunge: 5.0, range: 2.3, arc: 2.6, swing: [-2.8, 1.6], trail: 0.28, big: true },
];

/**
 * The little wanderer. Twin-stick-ish: moves with WASD, attacks toward the
 * mouse on the ground plane. Every hit: anticipation, blade flash, hit-stop,
 * enemy squash + knockback, camera kick, particles and sound.
 */
export class ForestPlayer {
  constructor(game, scene, fx) {
    this.game = game;
    this.scene = scene;
    this.fx = fx;
    this.a = new ChibiActor(wandererParts({}), { ppm: 250, rimColor: 0xa8d8ff, rimStrength: 0.55, blobRadius: 0.45 });
    this.a.rig.setRimSide(-1, 0.8);
    this.root = this.a.root;
    this.pos = this.root.position;
    this.hp = 100;
    this.maxHp = 100;
    this.state = 'free';
    this.stateT = 0;
    this.combo = -1;
    this.queued = false;
    this.hitDone = false;
    this.aim = new THREE.Vector3(1, 0, 0);
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.invuln = 0;
    this.rollCd = 0;
    this.burstCd = 0;
    this.burstMax = 10;
    this.heavyCharge = 0;
    this.locked = false;
    this.gateClosed = true;
    this.stepT = 0;
    this._ray = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  get center() {
    return new THREE.Vector3(this.pos.x, 0.7, this.pos.z);
  }

  _aimFromMouse(camera, input) {
    this._ray.setFromCamera({ x: input.mouse.nx, y: input.mouse.ny }, camera);
    const hit = new THREE.Vector3();
    if (this._ray.ray.intersectPlane(this._plane, hit)) {
      const d = hit.sub(this.pos);
      d.y = 0;
      if (d.lengthSq() > 0.04) this.aim.copy(d.normalize());
    }
  }

  attack() {
    if (this.state === 'free') return this._startAttack(0);
    if (this.state === 'attack') {
      if (this.stateT > COMBO[this.combo].dur * 0.4 && this.combo < 2) this.queued = true;
    }
  }

  _startAttack(i) {
    this.state = 'attack';
    this.combo = i;
    this.stateT = 0;
    this.hitDone = false;
    this.queued = false;
    this.a.setFacing(this.aim.x >= 0 ? 1 : -1);
    this.a.punch(1.18, 0.84);
    this.a.pose.armF = COMBO[i].swing[0];
    this.game.audio.play(COMBO[i].big ? 'swing_heavy' : 'swing', { pitch: 1 + i * 0.12, force: true });
  }

  heavy() {
    if (this.state !== 'free') return;
    this.state = 'heavy';
    this.stateT = 0;
    this.hitDone = false;
    this.a.setFacing(this.aim.x >= 0 ? 1 : -1);
    this.a.punch(1.3, 0.72);
    this.a.pose.armF = -3.0;
    this.game.audio.play('slime_charge');
  }

  roll(ax, az) {
    if (this.rollCd > 0 || this.state === 'roll' || this.state === 'dead') return;
    this.state = 'roll';
    this.stateT = 0;
    this.rollCd = 0.55;
    this.invuln = 0.38;
    this.rollDir = new THREE.Vector3(ax, 0, az);
    if (this.rollDir.lengthSq() < 0.01) this.rollDir.copy(this.aim);
    this.rollDir.normalize();
    this.a.setFacing(this.rollDir.x >= 0 ? 1 : -1);
    this.a.punch(1.25, 0.75);
    this.game.audio.play('roll');
    this.fx.particles.burst(new THREE.Vector3(this.pos.x, 0.1, this.pos.z), { count: 8, colors: [0x6a5a48, 0x4a4034], speed: [0.5, 1.6], dir: new THREE.Vector3(0, 1, 0), spread: 1.2, life: [0.3, 0.6], size: [0.08, 0.16], drag: 3, shape: 0 });
  }

  burst() {
    if (this.burstCd > 0 || this.state === 'dead') return false;
    this.burstCd = this.burstMax;
    this.state = 'burst';
    this.stateT = 0;
    this.hitDone = false;
    this.invuln = 0.6;
    this.a.pose.armF = -2.6;
    this.a.pose.armB = 2.6;
    this.a.punch(0.8, 1.25);
    this.a.setEyes('angry', false);
    this.game.audio.play('dark_burst');
    this.game.post.set('dim', 0.35);
    return true;
  }

  hurt(dmg, dir) {
    if (this.invuln > 0 || this.state === 'dead') return false;
    const g = this.game;
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.9;
    g.time.requestHitStop(70);
    g.shake(0.22, 0.3);
    g.post.fx.flash = 0.22;
    g.post.fxTarget.flash = 0;
    g.post.grade.uniforms.flashColor.value.set(0xff4040);
    setTimeout(() => g.post.grade.uniforms.flashColor.value.set(0xffffff), 200);
    g.audio.play('player_hurt');
    this.knock.set(dir.x * 8, 0, dir.z * 8);
    this.a.punch(0.75, 1.25);
    this.a.rig.material.uniforms.flash.value = 1;
    this.a.rig.material.uniforms.flashColor.value.set(0xff5050);
    this.a.setEyes('closed', false);
    setTimeout(() => this.a.setEyes('open'), 300);
    this.fx.particles.burst(this.center, { count: 16, colors: [0xff5a5a, 0xffd0d0], speed: [2, 6], life: [0.3, 0.6], size: [0.06, 0.12], gravity: 8, shape: 2 });
    if (this.hp <= 0) {
      this.state = 'dead';
      this.stateT = 0;
    } else {
      this.state = 'hurt';
      this.stateT = 0;
    }
    return true;
  }

  heal(full = true) {
    this.hp = full ? this.maxHp : Math.min(this.maxHp, this.hp + 25);
    this.state = 'free';
    this.invuln = 1.2;
  }

  _hit(opts) {
    const g = this.game;
    return g.combat.attack({ origin: this.pos.clone(), dir: this.aim.clone(), team: 'player', yRange: 3, ...opts });
  }

  _slash(radius, width, arc, dur, big = false, color = 0xdff4ff) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.atan2(-this.aim.z, this.aim.x)));
    this.fx.slash.spawn({ pos: new THREE.Vector3(this.pos.x, 0.55, this.pos.z), quaternion: q, radius, width, arc, color, core: 0xffffff, duration: dur, opacity: big ? 1 : 0.9 });
  }

  update(dt, real, input, camera) {
    const g = this.game;
    this.invuln -= real;
    this.rollCd -= dt;
    this.burstCd = Math.max(0, this.burstCd - real);
    const uf = this.a.rig.material.uniforms;
    uf.flash.value = Math.max(0, uf.flash.value - real * 6);
    this.root.visible = !(this.invuln > 0 && this.state === 'hurt' && Math.floor(this.invuln * 24) % 2 === 0);

    let ax = 0;
    let az = 0;
    if (!this.locked && input.enabled && this.state !== 'dead') {
      const a = input.axis();
      ax = a.x;
      az = a.y;
      if (input.mouse.moved || input.pressed('Mouse0', 'Mouse2')) this._aimFromMouse(camera, input);
      if (input.pressed('Mouse0', 'KeyJ')) this.attack();
      if (input.pressed('Mouse2', 'KeyK')) this.heavy();
      if (input.pressed('ShiftLeft', 'ShiftRight')) this.roll(ax, az);
      if (input.pressed('Space') && !this.burst()) g.audio.play('deny');
    }
    this.stateT += dt;
    const move = new THREE.Vector3();
    let speed = 0;
    switch (this.state) {
      case 'free':
        if (ax || az) {
          move.set(ax, 0, az).normalize();
          speed = 5.2;
          if (!input.mouse.moved) this.aim.copy(move);
          this.a.setFacing(ax ? Math.sign(ax) : this.a.facing);
        }
        this.a.pose.armF = undefined;
        this.a.pose.armB = undefined;
        break;
      case 'attack': {
        const c = COMBO[this.combo];
        const k = this.stateT / c.dur;
        this.a.pose.armF = THREE.MathUtils.lerp(c.swing[0], c.swing[1], Math.min(1, k * 3));
        if (k < 0.35) {
          move.copy(this.aim);
          speed = c.lunge * (1 - k / 0.35);
        }
        if (!this.hitDone && this.stateT >= c.hitAt) {
          this.hitDone = true;
          this._slash(c.big ? 2.0 : 1.6, c.big ? 0.8 : 0.55, c.arc, c.trail, c.big);
          this.a.punch(0.88, 1.14);
          const n = this._hit({ range: c.range, arc: c.arc, damage: c.dmg, knockback: c.kb, strength: c.big ? 1.8 : 1, hitStop: c.stop, shake: c.shake, tag: 'combo' });
          if (n) g.audio.play('hit', { strength: c.big ? 1.7 : 1, force: true });
        }
        if (this.stateT >= c.dur) {
          if (this.queued) {
            this._aimFromMouse(camera, input);
            this._startAttack(this.combo + 1);
          } else {
            this.state = 'free';
            this.combo = -1;
          }
        }
        break;
      }
      case 'heavy': {
        // 0.42s wind-up, then a wide sweeping strike
        if (this.stateT < 0.42) {
          this.a.pose.armF = -3.0 - Math.sin(this.stateT * 30) * 0.05;
          if (Math.random() < 0.4) this.fx.particles.burst(new THREE.Vector3(this.pos.x + (Math.random() - 0.5), 0.3, this.pos.z + (Math.random() - 0.5)), { count: 1, color: 0xdff4ff, speed: [0.5, 1.2], dir: new THREE.Vector3(0, 1, 0), spread: 0.3, life: [0.3, 0.5], size: [0.05, 0.1], shape: 0 });
        } else {
          this.a.pose.armF = THREE.MathUtils.lerp(-3.0, 2.0, Math.min(1, (this.stateT - 0.42) * 8));
          if (!this.hitDone) {
            this.hitDone = true;
            this._slash(2.6, 1.0, 3.6, 0.32, true, 0xfff0c8);
            this.a.punch(0.7, 1.3);
            g.audio.play('swing_heavy');
            const n = this._hit({ range: 2.9, arc: 3.6, damage: 30, knockback: 13, strength: 2.2, hitStop: 110, shake: 0.22, tag: 'heavy' });
            if (n) g.audio.play('hit', { strength: 2.2, force: true });
            move.copy(this.aim);
            speed = 6;
          }
        }
        if (this.stateT > 0.75) this.state = 'free';
        break;
      }
      case 'roll': {
        const k = this.stateT / 0.34;
        move.copy(this.rollDir);
        speed = 12 * (1 - k * 0.7);
        this.a.pose.spin = -this.a.facing * k * Math.PI * 2;
        if (this.stateT >= 0.34) {
          this.state = 'free';
          this.a.pose.spin = 0;
          this.a.punch(1.15, 0.85);
        }
        break;
      }
      case 'burst': {
        const lift = Math.min(1, this.stateT / 0.3);
        this._float = lift * 0.5;
        if (!this.hitDone && this.stateT >= 0.3) {
          this.hitDone = true;
          this._float = 0;
          this.a.punch(1.4, 0.6);
          g.post.set('dim', 0);
          g.post.fx.flash = 0.25;
          g.post.grade.uniforms.flashColor.value.set(0xd0a0ff);
          setTimeout(() => g.post.grade.uniforms.flashColor.value.set(0xffffff), 250);
          g.shake(0.3, 0.45);
          this.fx.ring.spawn(this.pos, 3.8, 0x8a4aff);
          this.fx.particles.burst(new THREE.Vector3(this.pos.x, 0.4, this.pos.z), { count: 90, colors: [0x6a2aff, 0xd0a0ff, 0x120818, 0xffffff], speed: [3, 10], dir: new THREE.Vector3(0, 1, 0), spread: 1.5, flatZ: 1, life: [0.4, 1.0], size: [0.08, 0.2], drag: 3, shape: 0 });
          const n = this._hit({ range: 3.8, arc: Math.PI * 2, damage: 40, knockback: 16, strength: 2.4, hitStop: 120, shake: 0.2, tag: 'burst' });
          if (n) g.audio.play('hit', { strength: 2.4, force: true });
        }
        if (this.stateT > 0.6) {
          this.state = 'free';
          this.a.setEyes('open');
          this.a.pose.armB = undefined;
        }
        break;
      }
      case 'hurt':
        if (this.stateT > 0.3) this.state = 'free';
        break;
      default:
        break;
    }
    this.knock.multiplyScalar(Math.exp(-dt * 7));
    const vx = move.x * speed + this.knock.x;
    const vz = move.z * speed + this.knock.z;
    this.pos.x += vx * dt;
    this.pos.z += vz * dt;
    constrain(this.pos, this.gateClosed);
    this.a.update(dt, { speed: this.state === 'free' && speed > 0 ? 1 : 0, velX: vx, float: this.state === 'burst' ? this._float || 0 : 0 });
    if (this.state === 'free' && speed > 0) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.23;
        g.audio.play('step_grass', { gain: 0.9 });
        if (Math.random() < 0.5) this.fx.particles.burst(new THREE.Vector3(this.pos.x, 0.05, this.pos.z), { count: 2, colors: [0x5a5040, 0x4a6a40], speed: [0.3, 0.9], dir: new THREE.Vector3(0, 1, 0), spread: 1, life: [0.25, 0.5], size: [0.05, 0.1], drag: 3, shape: 0 });
      }
    }
  }

  dispose() {
    this.a.dispose();
  }
}
