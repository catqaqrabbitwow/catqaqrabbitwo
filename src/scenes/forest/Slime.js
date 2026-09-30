import * as THREE from 'three';
import { PaperRig, blobShadow } from '../../art/rig/PaperRig.js';
import { slimeParts } from '../../art/characters/chibi.js';

/**
 * Paper slime. Wobbles, hops, squashes before pouncing. Carriers hold a
 * moonlight seed that drops on death. The elite adds a shockwave slam.
 */
export class Slime {
  constructor(game, scene, fx, player, { elite = false, seed = false, x = 0, z = 0, name = 'slime' } = {}) {
    this.game = game;
    this.fx = fx;
    this.player = player;
    this.elite = elite;
    this.seed = seed;
    this.color = elite ? '#9a5ae0' : '#6ecb5a';
    this.rig = new PaperRig(slimeParts({ color: this.color, seed, crown: elite, angryColor: elite ? '#2a0a3a' : '#141018' }), { ppm: elite ? 150 : 230, atlasSize: 1024, rimColor: elite ? 0xe0b0ff : 0xc0ffb0, rimStrength: 0.55, alphaCut: 0.5, name });
    this.rig.setRimSide(-1, 0.8);
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.add(this.rig.root);
    this.rig.root.rotation.x = -0.35;
    this.root.add(this.pivot);
    this.blob = blobShadow(elite ? 1.6 : 0.62, 0.6);
    this.blob.position.y = 0.02;
    this.root.add(this.blob);
    this.root.position.set(x, 0, z);
    this.pos = this.root.position;
    this.home = new THREE.Vector3(x, 0, z);
    scene.add(this.root);
    if (seed) {
      this.glow = new THREE.PointLight(0xcfe8ff, 2, 3, 2);
      this.glow.position.set(0.2, 0.5, 0.3);
      this.root.add(this.glow);
    }
    if (elite) {
      this.eliteLight = new THREE.PointLight(0xb070ff, 4, 6, 1.8);
      this.eliteLight.position.set(0, 1.5, 1);
      this.root.add(this.eliteLight);
    }
    this.maxHp = elite ? 300 : 42;
    this.hp = this.maxHp;
    this.radius = elite ? 1.35 : 0.55;
    this.team = 'enemy';
    this.alive = true;
    this.state = 'idle';
    this.t = Math.random();
    this.cool = 1 + Math.random();
    this.vel = new THREE.Vector3();
    this.jump = null;
    this.sq = new THREE.Vector2(1, 1);
    this.sqV = new THREE.Vector2();
    this.facing = 1;
    this.aggro = false;
    this.phase = Math.random() * 6;
    this.hitFlash = 0;
    this.unreg = game.combat.register(this);
  }

  punch(x, y) {
    this.sq.set(x, y);
    this.sqV.set(0, 0);
  }

  onHit(hit) {
    if (!this.alive) return false;
    const g = this.game;
    this.hp -= hit.damage;
    this.hitFlash = 1;
    const u = this.rig.material.uniforms;
    u.flash.value = 1;
    u.flashColor.value.set(0xffffff);
    this.punch(1.3, 0.72);
    this.rig.setFrame('eyes', 'hurt');
    this.rig.setFrame('mouth', 'open');
    const kb = hit.knockback * (this.elite ? 0.25 : 1);
    this.vel.set(hit.dir.x * kb, 0, hit.dir.z * kb);
    if (this.state === 'windup' && !this.elite) this.state = 'idle';
    if (this.jump && !this.elite) this.jump = null;
    this.stun = this.elite ? 0.1 : 0.35;
    this.aggro = true;
    const c = new THREE.Vector3(this.pos.x, this.elite ? 1.2 : 0.5, this.pos.z);
    this.fx.particles.burst(c, { count: 16 + hit.strength * 10, colors: this.elite ? [0xc08aff, 0xf0d8ff, 0x6a2aa0] : [0x8ae070, 0xd8ffc8, 0x3a8a3a], speed: [2, 7], dir: hit.dir.clone().setY(0.6), spread: 1.0, life: [0.3, 0.7], size: [0.07, 0.16], gravity: 9, drag: 2, shape: 1 });
    g.combat.number(new THREE.Vector3(this.pos.x, this.elite ? 2.8 : 1.3, this.pos.z), g.scenes.current.camera, hit.damage, { crit: hit.strength >= 1.8 });
    g.audio.play('hit_slime');
    if (this.hp <= 0) this.die();
    if (this.onDamaged) this.onDamaged(this);
    return true;
  }

  die() {
    this.alive = false;
    this.state = 'dead';
    this.t = 0;
    const g = this.game;
    g.audio.play('enemy_die', { force: true });
    g.time.requestHitStop(this.elite ? 200 : 90);
    g.shake(this.elite ? 0.4 : 0.14, this.elite ? 0.6 : 0.3);
    this.punch(1.6, 0.4);
    this.rig.material.transparent = true;
    this.rig.material.depthWrite = false;
    this.rig.material.needsUpdate = true;
    this.fx.particles.burst(new THREE.Vector3(this.pos.x, 0.4, this.pos.z), { count: this.elite ? 160 : 60, colors: this.elite ? [0xc08aff, 0xf0d8ff, 0x6a2aa0, 0xffffff] : [0x8ae070, 0xd8ffc8, 0x3a8a3a], speed: [2, this.elite ? 12 : 8], dir: new THREE.Vector3(0, 1, 0), spread: 1.4, life: [0.4, 1.1], size: [0.08, this.elite ? 0.3 : 0.2], gravity: 9, drag: 1.5, shape: 1, jitter: this.elite ? 1.5 : 0.5 });
    this.fx.ring.spawn(this.pos, this.elite ? 5 : 2, this.elite ? 0xb070ff : 0x9aff80, 0.5);
    g.save.stat('slimesDefeated');
    g.save.stat('enemiesDefeated');
    if (this.onDeath) this.onDeath(this);
  }

  update(dt, real) {
    const u = this.rig.material.uniforms;
    u.flash.value = Math.max(0, u.flash.value - real * 7);
    u.time.value += real;
    // squash spring
    for (let rem = dt; rem > 1e-6; rem -= 1 / 90) {
      const h = Math.min(rem, 1 / 90);
      this.sqV.x += ((1 - this.sq.x) * 260 - this.sqV.x * 12) * h;
      this.sqV.y += ((1 - this.sq.y) * 260 - this.sqV.y * 12) * h;
      this.sq.x += this.sqV.x * h;
      this.sq.y += this.sqV.y * h;
    }
    this.t += dt;
    if (this.state === 'dead') {
      const k = Math.min(1, this.t / 0.35);
      this.pivot.scale.set(this.sq.x * (1 + k * 0.6), this.sq.y * (1 - k), 1);
      u.opacity.value = 1 - k;
      if (k >= 1) this.root.visible = false;
      return;
    }
    const p = this.player;
    const dx = p.pos.x - this.pos.x;
    const dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < (this.elite ? 12 : 7.5)) this.aggro = true;
    const wob = Math.sin(this.t * (this.elite ? 3 : 4.5) + this.phase);
    let sx = 1 + wob * 0.05;
    let sy = 1 - wob * 0.05;
    let y = 0;
    if (this.stun > 0) this.stun -= dt;
    this.cool -= dt;

    switch (this.state) {
      case 'idle':
        if (this.hitFlash <= 0.05) {
          this.rig.setFrame('eyes', this.aggro ? 'angry' : 'open');
          this.rig.setFrame('mouth', this.aggro ? 'open' : 'smile');
        }
        if (this.stun > 0) break;
        if (this.cool <= 0) {
          if (this.aggro && dist < (this.elite ? 5.5 : 3.2)) {
            this.state = 'windup';
            this.t = 0;
            this.slam = this.elite && Math.random() < 0.45;
            this.game.audio.play('slime_charge');
          } else {
            // hop toward the player (or wander around home)
            const target = this.aggro ? p.pos : this.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
            const d = new THREE.Vector3(target.x - this.pos.x, 0, target.z - this.pos.z);
            const len = Math.min(d.length(), this.elite ? 2.8 : this.aggro ? 2.0 : 1.2);
            d.normalize().multiplyScalar(len);
            this._hop(d, this.elite ? 0.55 : 0.4, this.elite ? 1.0 : 0.6);
            this.cool = this.aggro ? (this.elite ? 0.9 : 0.55) : 1.2 + Math.random();
          }
        }
        break;
      case 'windup': {
        const T = this.slam ? 0.8 : this.elite ? 0.6 : 0.5;
        const k = Math.min(1, this.t / T);
        sx = 1 + k * 0.35 + Math.sin(this.t * 60) * 0.02;
        sy = 1 - k * 0.35;
        u.flash.value = Math.max(u.flash.value, Math.sin(this.t * 30) > 0.6 ? 0.4 : 0);
        u.flashColor.value.set(this.elite ? 0xff80ff : 0xffff80);
        this.rig.setFrame('eyes', 'angry');
        this.rig.setFrame('mouth', 'open');
        if (this.t >= T) {
          const d = new THREE.Vector3(dx, 0, dz);
          if (this.slam) {
            this._hop(d.multiplyScalar(0.85), 0.9, 3.8, 'slam');
            this.game.audio.play('swing_heavy');
          } else {
            d.normalize().multiplyScalar(Math.min(dist + 0.6, this.elite ? 6 : 4.2));
            this._hop(d, this.elite ? 0.5 : 0.42, this.elite ? 1.4 : 0.9, 'pounce');
            this.game.audio.play('slime_hop');
          }
          this.punch(0.7, 1.4);
        }
        break;
      }
      case 'jump': {
        const j = this.jump;
        const k = Math.min(1, this.t / j.dur);
        this.pos.x = j.from.x + j.d.x * k;
        this.pos.z = j.from.z + j.d.z * k;
        y = Math.sin(k * Math.PI) * j.h;
        sx = 0.85;
        sy = 1.2;
        if (j.kind === 'pounce' && !j.hit && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius + 0.35 && y < 0.8) {
          j.hit = true;
          p.hurt(this.elite ? 18 : 10, new THREE.Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize());
        }
        if (k >= 1) this._land(j);
        break;
      }
      case 'recover':
        if (this.t > (this.elite ? 0.7 : 0.6)) {
          this.state = 'idle';
          this.cool = this.elite ? 0.5 : 0.7 + Math.random() * 0.6;
        }
        break;
      default:
        break;
    }
    this.hitFlash = Math.max(0, this.hitFlash - real * 4);
    this.vel.multiplyScalar(Math.exp(-dt * 6));
    this.pos.addScaledVector(this.vel, dt);
    if (Math.abs(dx) > 0.2) {
      const f = Math.sign(dx);
      if (f !== this.facing) {
        this.facing = f;
        this.rig.setFacing(f);
      }
    }
    this.pivot.scale.set(sx * this.sq.x, sy * this.sq.y, 1);
    this.pivot.position.y = y;
    this.blob.scale.setScalar(1 - Math.min(0.5, y * 0.2));
    if (this.glow) this.glow.intensity = 1.5 + Math.sin(this.t * 4) * 0.6;
  }

  _hop(d, dur, h, kind = 'hop') {
    this.state = 'jump';
    this.t = 0;
    this.jump = { from: this.pos.clone(), d, dur, h, kind, hit: false };
    if (kind === 'hop') this.game.audio.play('slime_hop');
    this.punch(1.2, 0.8);
  }

  _land(j) {
    this.state = j.kind === 'hop' ? 'idle' : 'recover';
    this.t = 0;
    this.jump = null;
    this.punch(1.35, 0.65);
    const g = this.game;
    this.fx.particles.burst(new THREE.Vector3(this.pos.x, 0.1, this.pos.z), { count: this.elite ? 20 : 6, colors: this.elite ? [0xa06ae0, 0x5a3a7a] : [0x6ecb5a, 0x4a6a3a], speed: [1, 3], dir: new THREE.Vector3(0, 1, 0), spread: 1.3, life: [0.3, 0.6], size: [0.06, 0.14], gravity: 8, shape: 1 });
    if (j.kind === 'slam') {
      g.shake(0.35, 0.45);
      g.audio.play('hit', { strength: 2, force: true });
      this.fx.ring.spawn(this.pos, 5.2, 0xc080ff, 0.55);
      const p = this.player;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d < 5 && p.state !== 'roll') p.hurt(22, new THREE.Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize());
    } else if (j.kind === 'pounce') {
      g.shake(this.elite ? 0.18 : 0.06, 0.2);
      if (this.elite) this.fx.ring.spawn(this.pos, 2.4, 0xc080ff, 0.4);
    }
  }

  dispose() {
    this.unreg();
    this.rig.dispose();
  }
}
