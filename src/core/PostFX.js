import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { DOFShader, GradeShader } from '../fx/shaders.js';

/**
 * Renders the scene into a target that owns a depth texture, then applies a
 * depth-aware bokeh (scatter-as-gather) so alpha-tested 2D characters blur correctly.
 */
class SceneDOFPass extends Pass {
  constructor() {
    super();
    this.scene = null;
    this.camera = null;
    this.dofEnabled = true;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.rt.depthTexture = new THREE.DepthTexture(1, 1);
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DOFShader.uniforms),
      vertexShader: DOFShader.vertexShader,
      fragmentShader: DOFShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.material.uniforms.resolution.value = new THREE.Vector2(1, 1);
    this.copy = new THREE.MeshBasicMaterial({ map: this.rt.texture, depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.material);
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    this.material.uniforms.resolution.value.set(w, h);
  }

  render(renderer, writeBuffer) {
    if (!this.scene || !this.camera) return;
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    const u = this.material.uniforms;
    u.cameraNear.value = this.camera.near;
    u.cameraFar.value = this.camera.far;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    this.quad.material = this.dofEnabled && u.maxBlur.value * u.amount.value > 0.3 ? this.material : this.copy;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.rt.dispose();
    this.material.dispose();
    this.copy.dispose();
    this.quad.dispose();
  }
}

const v3 = (a) => new THREE.Vector3(...a);

export const DEFAULT_PROFILE = {
  exposure: 1,
  bloom: { strength: 0.6, radius: 0.6, threshold: 0.8 },
  dof: { focus: 6, range: 4, maxBlur: 6, near: 1 },
  grade: {
    saturation: 1,
    contrast: 1,
    brightness: 0,
    shadowTint: [0.92, 0.96, 1.06],
    highlightTint: [1.06, 1.0, 0.92],
    lift: [0.01, 0.01, 0.015],
    vignette: 0.35,
    vignetteSoft: 0.95,
    grain: 0.05,
    ca: 0.0015,
  },
};

/**
 * Post-processing chain:
 *   SceneDOF → Bloom → Afterimage(rift) → Output(tonemap+sRGB) → Grade → SMAA
 * Each scene provides a profile; values ease toward it every frame.
 */
export class PostFX {
  constructor(renderer, save) {
    this.renderer = renderer;
    this.save = save;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, rt);

    this.scenePass = new SceneDOFPass();
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.6, 0.6, 0.8);
    this.after = new AfterimagePass(0.8);
    this.after.enabled = false;
    this.output = new OutputPass();
    this.grade = new ShaderPass(GradeShader);
    const gu = this.grade.uniforms;
    gu.resolution.value = new THREE.Vector2(size.x, size.y);
    gu.shadowTint.value = new THREE.Vector3(1, 1, 1);
    gu.highlightTint.value = new THREE.Vector3(1, 1, 1);
    gu.lift.value = new THREE.Vector3();
    gu.fadeColor.value = new THREE.Color(0x0d0c0b);
    gu.flashColor.value = new THREE.Color(0xffffff);
    this.smaa = new SMAAPass();

    this.composer.addPass(this.scenePass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.after);
    this.composer.addPass(this.output);
    this.composer.addPass(this.grade);
    this.composer.addPass(this.smaa);

    // Live values ease toward `target`
    this.cur = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    this.target = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    // Transient overrides from gameplay (dialogue focus, menus, rift...)
    this.fx = { letterbox: 0, fade: 0, desat: 0, rift: 0, flash: 0, dofBoost: 0, dim: 0, scanline: 0 };
    this.fxTarget = { ...this.fx };
    this.focusOverride = null;
    this.simple = null; // fallback when post-processing disabled
  }

  setProfile(profile, instant = false) {
    const merge = (base, p) => {
      const out = JSON.parse(JSON.stringify(base));
      if (!p) return out;
      for (const k of Object.keys(p)) {
        if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k])) out[k] = { ...out[k], ...p[k] };
        else out[k] = p[k];
      }
      return out;
    };
    this.target = merge(DEFAULT_PROFILE, profile);
    if (instant) this.cur = JSON.parse(JSON.stringify(this.target));
  }

  /** Ease transient fx: letterbox, fade, desat, rift, flash, dofBoost, dim. */
  set(key, value, instant = false) {
    this.fxTarget[key] = value;
    if (instant) this.fx[key] = value;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.grade.uniforms.resolution.value.set(w * pr, h * pr);
    this.bloom.setSize(Math.floor((w * pr) / 2), Math.floor((h * pr) / 2));
  }

  _lerpProfile(dt) {
    const k = 1 - Math.exp(-dt * 3.5);
    const c = this.cur;
    const t = this.target;
    const L = (a, b) => a + (b - a) * k;
    c.exposure = L(c.exposure, t.exposure);
    for (const key of ['strength', 'radius', 'threshold']) c.bloom[key] = L(c.bloom[key], t.bloom[key]);
    for (const key of ['focus', 'range', 'maxBlur', 'near']) c.dof[key] = L(c.dof[key], t.dof[key]);
    for (const key of Object.keys(t.grade)) {
      if (Array.isArray(t.grade[key])) c.grade[key] = c.grade[key].map((v, i) => L(v, t.grade[key][i]));
      else c.grade[key] = L(c.grade[key], t.grade[key]);
    }
    const kf = 1 - Math.exp(-dt * 7);
    for (const key of Object.keys(this.fx)) {
      const spd = key === 'flash' ? 1 - Math.exp(-dt * 18) : kf;
      this.fx[key] += (this.fxTarget[key] - this.fx[key]) * spd;
    }
  }

  render(scene, camera, dt, time) {
    this._lerpProfile(dt);
    const s = this.save.settings;
    const c = this.cur;
    this.renderer.toneMappingExposure = c.exposure * (1 - this.fx.dim * 0.55);

    if (!s.postProcessing) {
      this.renderer.setRenderTarget(null);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.render(scene, camera);
      return;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scenePass.scene = scene;
    this.scenePass.camera = camera;
    this.scenePass.dofEnabled = s.depthOfField;
    const du = this.scenePass.material.uniforms;
    const focus = this.focusOverride != null ? this.focusOverride : c.dof.focus;
    du.focusDist.value = focus;
    du.focusRange.value = Math.max(0.2, c.dof.range * (1 - this.fx.dofBoost * 0.6));
    du.maxBlur.value = c.dof.maxBlur * (1 + this.fx.dofBoost * 1.2) * (this.renderer.getPixelRatio() > 1.4 ? 1.4 : 1);
    du.nearScale.value = c.dof.near;
    du.amount.value = 1;

    this.bloom.enabled = s.bloom;
    this.bloom.strength = c.bloom.strength;
    this.bloom.radius = c.bloom.radius;
    this.bloom.threshold = c.bloom.threshold;

    this.after.enabled = this.fx.rift > 0.05 && s.motionEffect;
    this.after.uniforms.damp.value = 0.72 + this.fx.rift * 0.12;

    const g = this.grade.uniforms;
    const gr = c.grade;
    g.time.value = time;
    g.saturation.value = gr.saturation;
    g.contrast.value = gr.contrast;
    g.brightness.value = gr.brightness;
    g.shadowTint.value.set(...gr.shadowTint);
    g.highlightTint.value.set(...gr.highlightTint);
    g.lift.value.set(...gr.lift);
    g.vignette.value = gr.vignette + this.fx.dim * 0.25;
    g.vignetteSoft.value = gr.vignetteSoft;
    g.grain.value = gr.grain;
    g.ca.value = gr.ca;
    g.letterbox.value = this.fx.letterbox;
    g.fade.value = this.fx.fade;
    g.desat.value = this.fx.desat;
    g.rift.value = s.motionEffect ? this.fx.rift : this.fx.rift * 0.3;
    g.flash.value = this.fx.flash;
    g.scanline.value = this.fx.scanline;
    if (this.fx.flash > 0.001) this.fxTarget.flash = 0;

    this.composer.render(dt);
  }
}

export { v3 };
