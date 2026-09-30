import * as THREE from 'three';
import { Humanoid } from '../../actors/Humanoid.js';
import { SHADOW_CFG } from './campusScript.js';

let _coreTex = null;
function coreTex() {
  if (_coreTex) return _coreTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,240,230,1)');
  gr.addColorStop(0.15, 'rgba(255,80,60,1)');
  gr.addColorStop(0.4, 'rgba(200,20,30,0.5)');
  gr.addColorStop(1, 'rgba(120,0,10,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  _coreTex = new THREE.CanvasTexture(c);
  return _coreTex;
}

/**
 * 異常之影 — black silhouette with a red core and a glitching outline.
 * Emerges from the floor shadows, stalks, telegraphs, lunges.
 */
export class ShadowEnemy {
  constructor(game, scene, fx, i, player) {
    this.game = game;
    this.scene = scene;
    this.fx = fx;
    this.player = player;
    this.h = new Humanoid(SHADOW_CFG(i), { ppm: 470, silhouette: 1, silhouetteColor: 0x0c0a0c, rimColor: 0xff3a30, rimStrength: 0.9, blobRadius: 0.5, blobOpacity: 0.75, scale: 1.02 + i * 0.03, castShadow: true });
    this.h.rig.setRimSide(0, 0.3);
    this.h.idleStyle = 'lean';
    this.root = this.h.root;
    this.pos = this.root.position;
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex(), color: 0xff4a3a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.core.scale.setScalar(0.34);
    this.core.position.set(0, 1.12, 0.06);
    this.root.add(this.core);
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex(), color: 0x7a1010, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    this.aura.scale.set(1.6, 2.4, 1);
    this.aura.position.set(0, 0.95, -0.08);
    this.root.add(this.aura);
    this.smokeT = 0;
    this.coreLight = new THREE.PointLight(0xff3020, 0, 2.2, 2);
    this.coreLight.position.set(0, 1.1, 0.3);
    this.root.add(this.coreLight);
    this.hp = 60;
    this.maxHp = 60;
    this.alive = false;
    this.state = 'hidden';
    this.t = 0;
    this.vel = new THREE.Vector3();
    this.lungeDir = new THREE.Vector3();
    this.cool = 0.6 + i * 0.7;
    this.radius = 0.35;
    this.team = 'enemy';
    this.hitCd = 0;
    this.root.visible = false;
    this.h.rig.material.uniforms.dissolveColor.value.set(0xff3a30);
    this.unreg = game.combat.register(this);
  }

  emerge(x, z) {
    this.pos.set(x, 0, z);
    this.root.visible = true;
    this.alive = true;
    this.state = 'emerge';
    this.t = 0;
    this.h.rig.material.uniforms.dissolve.value = 1;
    this.game.audio.play('shadow_spawn', { force: true });
    this.fx.particles.burst(new THREE.Vector3(x, 0.1, z), { count: 40, colors: [0x0a0808, 0x2a0a0a, 0xff3a30], speed: [0.5, 2.5], dir: new THREE.Vector3(0, 1, 0), spread: 0.8, life: [0.6, 1.3], size: [0.06, 0.16], drag: 1.5, shape: 0 });
  }

  onHit(hit) {
    if (!this.alive || this.state === 'emerge' || this.state === 'dead') return false;
    this.hp -= hit.damage;
    const g = this.game;
    const u = this.h.rig.material.uniforms;
    u.flash.value = 1;
    u.flashColor.value.set(0xffffff);
    this.vel.set(hit.dir.x * hit.knockback * 2.2, 0, hit.dir.z * hit.knockback);
    this.root.scale.set(0.9, 1.06, 1);
    this.state = 'stagger';
    this.t = 0;
    this.h.play('hit');
    const c = new THREE.Vector3(this.pos.x, 1.1, this.pos.z + 0.1);
    this.fx.particles.burst(c, { count: 18 + hit.strength * 10, colors: [0xff4a3a, 0xffd0c0, 0x100808], speed: [2, 6], dir: hit.dir, spread: 1.1, life: [0.25, 0.6], size: [0.03, 0.08], gravity: 5, drag: 3, shape: 2 });
    this.fx.particles.burst(c, { count: 10, colors: [0x0a0808, 0x1a1010], speed: [0.5, 2], life: [0.5, 0.9], size: [0.1, 0.2], drag: 2, shape: 0 });
    g.combat.number(new THREE.Vector3(this.pos.x, 1.9, this.pos.z), this.game.scenes.current.camera, hit.damage, { crit: hit.strength > 1.4 });
    g.audio.play('hit_glitch');
    u.glitch.value = 1.5;
    if (this.hp <= 0) this.die();
    return true;
  }

  die() {
    this.alive = false;
    this.state = 'dead';
    this.t = 0;
    const g = this.game;
    g.audio.play('enemy_die', { force: true });
    g.time.requestHitStop(90);
    g.shake(0.1, 0.35);
    this.fx.particles.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), { count: 70, colors: [0xff3a30, 0xffe0d0, 0x0a0808, 0x2a0a0a], speed: [1, 6], life: [0.5, 1.4], size: [0.04, 0.14], drag: 2, gravity: -0.5, shape: 0, jitter: 0.6 });
    g.save.stat('shadowsDefeated');
    g.save.stat('enemiesDefeated');
    if (this.onDeath) this.onDeath(this);
  }

  update(dt, real) {
    const u = this.h.rig.material.uniforms;
    u.time.value += real;
    u.flash.value = Math.max(0, u.flash.value - real * 8);
    u.glitch.value = Math.max(0.12, u.glitch.value - real * 3) + (Math.random() < 0.015 ? 0.8 : 0);
    const sc = this.root.scale;
    sc.x += (1 - sc.x) * Math.min(1, dt * 12);
    sc.y += (1 - sc.y) * Math.min(1, dt * 12);
    if (!this.root.visible) return;
    this.t += dt;
    const p = this.player;
    const dx = p.pos.x - this.pos.x;
    const dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    let move = 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
    this.core.material.opacity = 0.75 + pulse * 0.25;
    this.aura.material.opacity = this.state === 'dead' ? Math.max(0, 0.35 - this.t) : 0.25 + pulse * 0.15;
    this.smokeT -= dt;
    if (this.smokeT <= 0 && this.state !== 'dead') {
      this.smokeT = 0.08;
      this.fx.particles.burst(new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 1.4, this.pos.z), { count: 1, colors: [0x2a0808, 0x5a1010, 0xff3a30], speed: [0.2, 0.6], dir: new THREE.Vector3(0, 1, 0), spread: 0.4, life: [0.6, 1.1], size: [0.05, 0.12], drag: 1, shape: 0 });
    }
    this.coreLight.intensity = 1.2 + pulse * 0.8;
    switch (this.state) {
      case 'emerge':
        u.dissolve.value = Math.max(0, 1 - this.t / 1.1);
        this.h.rig.root.position.y = -0.4 * (1 - Math.min(1, this.t / 1.1));
        if (this.t > 1.2) {
          this.state = 'chase';
          this.t = 0;
        }
        break;
      case 'chase':
        this.cool -= dt;
        if (dist > 1.25) move = 1.55;
        else if (this.cool <= 0 && p.state !== 'dead') {
          this.state = 'windup';
          this.t = 0;
          this.game.audio.play('enemy_windup');
        }
        break;
      case 'windup': {
        const k = this.t / 0.55;
        this.core.scale.setScalar(0.34 + k * 0.35);
        this.coreLight.intensity = 2 + k * 6;
        u.flash.value = Math.max(u.flash.value, Math.sin(this.t * 40) > 0 ? 0.35 : 0);
        u.flashColor.value.set(0xff3a30);
        this.root.scale.set(1.08, 0.94, 1);
        if (this.t > 0.55) {
          this.state = 'lunge';
          this.t = 0;
          this.lungeDir.set(dx, 0, dz).normalize();
          this.hitCd = 0;
          this.h.play('attack3');
          this.game.audio.play('swing_heavy');
        }
        break;
      }
      case 'lunge':
        this.core.scale.setScalar(0.34);
        this.vel.copy(this.lungeDir).multiplyScalar(6.5 * (1 - this.t / 0.28));
        if (dist < 0.85 && this.hitCd === 0) {
          this.hitCd = 1;
          p.hurt(12, this.lungeDir);
        }
        if (this.t > 0.28) {
          this.state = 'recover';
          this.t = 0;
        }
        break;
      case 'recover':
        if (this.t > 0.9) {
          this.state = 'chase';
          this.t = 0;
          this.cool = 1.2 + Math.random() * 1.2;
        }
        break;
      case 'stagger':
        if (this.t > 0.3) {
          this.state = 'chase';
          this.t = 0;
          this.cool = Math.max(this.cool, 0.6);
        }
        break;
      case 'dead':
        u.dissolve.value = Math.min(1, this.t / 0.8);
        this.core.material.opacity = 1 - this.t / 0.5;
        this.coreLight.intensity = Math.max(0, 3 - this.t * 6);
        this.h.rig.root.position.y = this.t * 0.2;
        if (this.t > 0.9) this.root.visible = false;
        break;
      default:
        break;
    }
    if (move) {
      this.pos.x += (dx / dist) * move * dt;
      this.pos.z += (dz / dist) * move * dt * 0.7;
    }
    this.vel.multiplyScalar(Math.exp(-dt * 6));
    this.pos.addScaledVector(this.vel, dt);
    if (Math.abs(dx) > 0.2 && this.state !== 'lunge' && this.state !== 'dead') this.h.setFacing(Math.sign(dx));
    this.h.move(move ? 1 : 0, move * Math.sign(dx));
    this.h.update(dt);
  }

  dispose() {
    this.unreg();
    this.core.material.dispose();
    this.aura.material.dispose();
    this.h.dispose();
  }
}
