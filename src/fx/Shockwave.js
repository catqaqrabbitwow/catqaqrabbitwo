import * as THREE from 'three';

/** Expanding ground rings (dark burst, slime slams, landing impacts). */
export class Shockwave {
  constructor(scene, count = 6) {
    this.pool = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { k: { value: 0 }, color: { value: new THREE.Color() }, opacity: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: /* glsl */ `
          uniform float k, opacity; uniform vec3 color; varying vec2 vUv;
          void main(){
            float d = length(vUv - 0.5) * 2.0;
            float ring = smoothstep(k - 0.16, k - 0.02, d) * smoothstep(k + 0.02, k - 0.02, d);
            float fill = smoothstep(k, 0.0, d) * 0.15;
            float a = (ring + fill) * (1.0 - k) * opacity;
            gl_FragColor = vec4(color * (1.0 + ring), a);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 8;
      scene.add(m);
      this.pool.push({ m, t: 0, dur: 0.5, active: false });
    }
  }

  spawn(pos, radius = 3, color = 0xffffff, dur = 0.5) {
    const s = this.pool.find((p) => !p.active) || this.pool[0];
    s.m.position.set(pos.x, 0.06, pos.z);
    s.m.scale.setScalar(radius);
    s.m.material.uniforms.color.value.set(color);
    s.t = 0;
    s.dur = dur;
    s.active = true;
    s.m.visible = true;
    return s;
  }

  update(dt) {
    for (const s of this.pool) {
      if (!s.active) continue;
      s.t += dt;
      const k = s.t / s.dur;
      s.m.material.uniforms.k.value = Math.min(1, k);
      if (k >= 1) {
        s.active = false;
        s.m.visible = false;
      }
    }
  }
}
