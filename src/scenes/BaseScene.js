import * as THREE from 'three';

/**
 * Common scene contract.
 *   init(onProgress)  async build
 *   enter() / exit()  lifecycle (HUD, music)
 *   update(time)      per-frame (time: Time)
 *   dispose()         free GPU resources
 */
export class BaseScene {
  constructor(game, params = {}) {
    this.game = game;
    this.params = params;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 200);
    this.postProfile = {};
    this.shadowLights = [];
    this.disposables = [];
    this._unsubs = [];
  }

  async init() {}

  enter() {}

  exit() {
    this.game.cursor.set('default');
    this._unsubs.forEach((u) => u());
    this._unsubs = [];
  }

  update() {}

  onEscape() {}

  onResize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Apply the Shadow Quality setting to lights registered in shadowLights. */
  applyShadowQuality(q) {
    for (const { light, high, low } of this.shadowLights) {
      light.castShadow = q !== 'off';
      const size = q === 'high' ? high || 2048 : low || 1024;
      if (light.shadow.mapSize.x !== size) {
        light.shadow.mapSize.set(size, size);
        if (light.shadow.map) {
          light.shadow.map.dispose();
          light.shadow.map = null;
        }
      }
    }
  }

  track(obj) {
    this.disposables.push(obj);
    return obj;
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          for (const k of Object.keys(m)) {
            const v = m[k];
            if (v && v.isTexture && !v.userData.shared) v.dispose();
          }
          if (m.uniforms) {
            for (const u of Object.values(m.uniforms)) if (u.value && u.value.isTexture && !u.value.userData.shared) u.value.dispose();
          }
          m.dispose();
        }
      }
    });
    for (const d of this.disposables) if (d && d.dispose) d.dispose();
    this.disposables = [];
  }
}
