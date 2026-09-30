import * as THREE from 'three';

/**
 * Crescent slash effect: an additive ring segment whose visible arc sweeps
 * open (head) and then closes (tail), with a hot core and soft falloff.
 * Pooled; call spawn({ pos, rotation(Euler), radius, arc, color, width, duration, flip }).
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const FRAG = /* glsl */ `
  uniform float head, tail, opacity;
  uniform vec3 color, core;
  varying vec2 vUv;
  void main(){
    float a = vUv.x;               // 0..1 along the arc
    float r = vUv.y;               // 0 inner .. 1 outer
    if (a > head || a < tail) discard;
    float along = smoothstep(tail, tail + 0.25, a) * (0.35 + 0.65 * smoothstep(head - 0.02, head - 0.3, a) + smoothstep(head - 0.06, head, a) * 0.0);
    float lead = smoothstep(head - 0.12, head, a);
    float prof = smoothstep(0.0, 0.55, r) * smoothstep(1.0, 0.72, r);
    float edge = smoothstep(0.55, 0.85, r) * smoothstep(1.0, 0.86, r);
    vec3 c = mix(color, core, edge * 0.9 + lead * 0.5);
    float alpha = prof * (along + lead * 0.6) * opacity;
    gl_FragColor = vec4(c * (1.0 + lead), alpha);
  }
`;

export class SlashTrail {
  constructor(scene, count = 6) {
    this.pool = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { head: { value: 0 }, tail: { value: 0 }, opacity: { value: 1 }, color: { value: new THREE.Color() }, core: { value: new THREE.Color(0xffffff) } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 12;
      scene.add(mesh);
      this.pool.push({ mesh, t: 0, dur: 0, active: false, key: '' });
    }
  }

  _geo(radius, width, arc) {
    const seg = 40;
    const pos = [];
    const uv = [];
    const idx = [];
    const start = -arc / 2;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const ang = start + arc * u;
      // taper: thinner at the ends
      const taper = Math.sin(u * Math.PI) * 0.8 + 0.2;
      const r0 = radius - width * taper;
      const r1 = radius;
      pos.push(Math.cos(ang) * r0, Math.sin(ang) * r0, 0, Math.cos(ang) * r1, Math.sin(ang) * r1, 0);
      uv.push(u, 0, u, 1);
      if (i < seg) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  spawn({ pos, quaternion = null, rotation = null, radius = 1, width = 0.3, arc = 2.4, color = 0x9fe6ff, core = 0xffffff, duration = 0.22, opacity = 1, flip = false }) {
    const s = this.pool.find((p) => !p.active) || this.pool[0];
    const key = `${radius}|${width}|${arc}`;
    if (s.key !== key) {
      s.mesh.geometry.dispose();
      s.mesh.geometry = this._geo(radius, width, arc);
      s.key = key;
    }
    s.mesh.position.copy(pos);
    if (quaternion) s.mesh.quaternion.copy(quaternion);
    else if (rotation) s.mesh.rotation.copy(rotation);
    s.mesh.scale.set(1, flip ? -1 : 1, 1);
    const u = s.mesh.material.uniforms;
    u.color.value.set(color);
    u.core.value.set(core);
    u.opacity.value = opacity;
    u.head.value = 0;
    u.tail.value = 0;
    s.t = 0;
    s.dur = duration;
    s.active = true;
    s.mesh.visible = true;
    return s;
  }

  update(dt) {
    for (const s of this.pool) {
      if (!s.active) continue;
      s.t += dt;
      const k = s.t / s.dur;
      const u = s.mesh.material.uniforms;
      u.head.value = Math.min(1.05, k * 2.2);
      u.tail.value = Math.max(0, (k - 0.35) * 1.6);
      if (k >= 1) {
        s.active = false;
        s.mesh.visible = false;
      }
    }
  }
}
