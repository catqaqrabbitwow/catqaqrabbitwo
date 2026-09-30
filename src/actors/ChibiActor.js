import * as THREE from 'three';
import { PaperRig, blobShadow } from '../art/rig/PaperRig.js';

/**
 * Paper-puppet actor for the forest (wanderer / spirit). The rig stands
 * upright in world space, leaning back toward the high camera, and is
 * animated procedurally: breathing, bounce-run with lean, squash & stretch.
 */
export class ChibiActor {
  constructor(parts, o = {}) {
    this.rig = new PaperRig(parts, { ppm: o.ppm || 260, atlasSize: o.atlasSize || 1024, rimColor: o.rimColor ?? 0x9ad0ff, rimStrength: o.rimStrength ?? 0.5, castShadow: o.castShadow, alphaCut: 0.5 });
    this.root = new THREE.Group();
    this.pivot = new THREE.Group(); // squash / roll pivot at the feet
    this.pivot.add(this.rig.root);
    this.root.add(this.pivot);
    this.rig.root.rotation.x = o.tilt ?? -0.32;
    if (o.blob !== false) {
      this.blob = blobShadow(o.blobRadius || 0.5, o.blobOpacity ?? 0.6);
      this.blob.position.y = 0.02;
      this.root.add(this.blob);
    }
    this.t = Math.random() * 5;
    this.runPhase = 0;
    this.speed = 0;
    this.facing = 1;
    this.squash = new THREE.Vector2(1, 1);
    this.squashV = new THREE.Vector2();
    this.lean = 0;
    this.blinkT = 2;
    this.blinkClock = -1;
    this.eyesDefault = 'open';
    this.pose = {};
  }

  setFacing(f) {
    if (!f || f === this.facing) return;
    this.facing = f;
    this.rig.setFacing(f);
  }

  /** Impulse into the squash spring (x,y scale offsets). */
  punch(sx, sy) {
    this.squash.set(sx, sy);
    this.squashV.set(0, 0);
  }

  update(dt, { speed = 0, velX = 0, float = 0 } = {}) {
    this.t += dt;
    const t = this.t;
    this.speed += (speed - this.speed) * Math.min(1, dt * 10);
    const sp = this.speed;
    this.runPhase += dt * 14 * (sp > 0.05 ? 1 : 0);
    const ph = this.runPhase;
    const rig = this.rig;
    const br = Math.sin(t * 3);
    // squash spring toward 1
    for (let rem = dt; rem > 1e-6; rem -= 1 / 90) {
      const h = Math.min(rem, 1 / 90);
      this.squashV.x += ((1 - this.squash.x) * 220 - this.squashV.x * 14) * h;
      this.squashV.y += ((1 - this.squash.y) * 220 - this.squashV.y * 14) * h;
      this.squash.x += this.squashV.x * h;
      this.squash.y += this.squashV.y * h;
    }
    const bounce = Math.abs(Math.sin(ph)) * 0.12 * Math.min(1, sp);
    const idleSq = (1 - Math.min(1, sp)) * br * 0.025;
    this.pivot.scale.set(this.squash.x * (1 - idleSq * 0.5), this.squash.y * (1 + idleSq), 1);
    this.pivot.position.y = bounce + float;
    const targetLean = -velX * 0.04;
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 8);
    this.pivot.rotation.z = this.lean + (this.pose.spin || 0);
    if (rig.nodes.legF) {
      rig.pose('legF', Math.sin(ph) * 0.7 * Math.min(1, sp));
      rig.pose('legB', -Math.sin(ph) * 0.7 * Math.min(1, sp));
    }
    if (rig.nodes.head) rig.pose('head', Math.sin(t * 1.6) * 0.03 + (this.pose.head || 0), 0, (this.pose.headDy || 0) + br * 0.004);
    if (rig.nodes.cape) rig.pose('cape', -velX * 0.04 * this.facing + Math.sin(t * 2.2) * 0.04);
    if (rig.nodes.armF) rig.pose('armF', this.pose.armF ?? Math.sin(ph) * 0.5 * Math.min(1, sp) + br * 0.03);
    if (rig.nodes.armB) rig.pose('armB', this.pose.armB ?? -Math.sin(ph) * 0.5 * Math.min(1, sp));
    if (rig.nodes.lantern) rig.pose('lantern', Math.sin(t * 1.4) * 0.12);
    // blink
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blinkClock < 0) this.blinkClock = 0;
    if (this.blinkClock >= 0) {
      this.blinkClock += dt;
      rig.setFrame('eyes', this.blinkClock < 0.12 ? 'closed' : this.eyesDefault);
      if (this.blinkClock >= 0.12) {
        this.blinkClock = -1;
        this.blinkT = 2 + Math.random() * 3;
      }
    }
  }

  setEyes(key, sticky = true) {
    if (sticky) this.eyesDefault = key;
    this.rig.setFrame('eyes', key);
  }

  dispose() {
    this.rig.dispose();
  }
}
