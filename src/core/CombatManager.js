import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Shared combat resolution for both mini games.
 * Hurtables register with { pos:Vector3, radius, team, onHit(hit) , alive }.
 * Attacks are arcs/circles on the XZ plane. Feedback (hit-stop, shake,
 * damage numbers) is centralised here so both games feel consistent.
 */
export class CombatManager {
  constructor(game) {
    this.game = game;
    this.hurtables = new Set();
    this.numberPool = [];
    this.numLayer = null;
    this._v = new THREE.Vector3();
  }

  reset() {
    this.hurtables.clear();
  }

  register(h) {
    this.hurtables.add(h);
    return () => this.hurtables.delete(h);
  }

  /**
   * @param {object} a { origin:Vector3, dir:Vector3 (xz), range, arc (radians, full width), team, damage, knockback, strength, hitStop, shake, tag, onHit }
   * @returns number of targets hit
   */
  attack(a) {
    let hits = 0;
    const o = a.origin;
    for (const h of this.hurtables) {
      if (!h.alive || h.team === a.team) continue;
      const dx = h.pos.x - o.x;
      const dz = h.pos.z - o.z;
      const dist = Math.hypot(dx, dz);
      if (dist > a.range + h.radius) continue;
      if (a.arc < Math.PI * 2 - 0.01 && dist > 0.001) {
        const ang = Math.atan2(dz, dx) - Math.atan2(a.dir.z, a.dir.x);
        const d = Math.atan2(Math.sin(ang), Math.cos(ang));
        const tol = a.arc / 2 + Math.atan2(h.radius, Math.max(dist, 0.001));
        if (Math.abs(d) > tol) continue;
      }
      if (a.yRange != null && Math.abs(h.pos.y - o.y) > a.yRange) continue;
      const dir = new THREE.Vector3(dx, 0, dz);
      if (dir.lengthSq() < 1e-6) dir.copy(a.dir);
      dir.normalize();
      const res = h.onHit({ damage: a.damage, dir, knockback: a.knockback || 0, strength: a.strength || 1, tag: a.tag, source: a.source });
      if (res === false) continue;
      hits++;
      if (a.onHit) a.onHit(h);
    }
    if (hits > 0) {
      if (a.hitStop) this.game.time.requestHitStop(a.hitStop);
      if (a.shake) this.game.shake(a.shake, 0.18 + (a.strength || 1) * 0.06);
    }
    return hits;
  }

  // ─────────────────────────── damage numbers ───────────────────────────

  mount(parent) {
    this.numLayer = document.createElement('div');
    this.numLayer.className = 'dmg-layer';
    parent.appendChild(this.numLayer);
    this.numberPool = [];
  }

  /** Small restrained number at a world position (projected with camera). */
  number(worldPos, camera, value, { crit = false, color = null } = {}) {
    if (!this.numLayer) return;
    let el = this.numberPool.find((e) => !e._busy);
    if (!el) {
      el = document.createElement('div');
      el.className = 'dmg';
      this.numLayer.appendChild(el);
      this.numberPool.push(el);
    }
    el._busy = true;
    const p = this._v.copy(worldPos).project(camera);
    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight;
    el.textContent = value;
    el.classList.toggle('is-crit', crit);
    el.style.color = color || '';
    const dx = (Math.random() - 0.5) * 30;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { x: x + dx, y, opacity: 0, scale: crit ? 1.5 : 1.2 },
      {
        x: x + dx * 1.6,
        y: y - 46,
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: 'power3.out',
        onComplete: () => {
          gsap.to(el, { opacity: 0, y: y - 60, duration: 0.35, delay: 0.25, onComplete: () => (el._busy = false) });
        },
      },
    );
  }
}
