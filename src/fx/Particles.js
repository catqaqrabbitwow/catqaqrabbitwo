import * as THREE from 'three';

/**
 * Pooled CPU particle system rendered as a single Points draw call.
 * Emit with burst(pos, preset). Particles: soft dots, sparks, shards.
 */
export class Particles {
  constructor(max = 600, { additive = true, depthTest = true } = {}) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.shape = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('palpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pshape', new THREE.BufferAttribute(this.shape, 1));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: { viewportH: { value: window.innerHeight }, pixelRatio: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float psize; attribute float palpha; attribute float pshape; attribute vec3 color;
        uniform float viewportH, pixelRatio;
        varying float vA; varying vec3 vC; varying float vS;
        void main(){
          vA = palpha; vC = color; vS = pshape;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = psize * viewportH * pixelRatio / max(0.1, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vC; varying float vS;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float a;
          if (vS < 0.5) { a = smoothstep(0.5, 0.0, length(c)); a *= a; }
          else if (vS < 1.5) { a = smoothstep(0.5, 0.35, length(c)); }
          else { a = step(abs(c.x) + abs(c.y) * 2.2, 0.5); }
          if (vA * a < 0.01) discard;
          gl_FragColor = vec4(vC, vA * a);
        }`,
      transparent: true,
      depthWrite: false,
      depthTest,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this._c = new THREE.Color();
  }

  /**
   * p: { count, color|colors[], speed:[min,max], spread (radians around dir), dir:Vector3,
   *      life:[min,max], size:[min,max], gravity, drag, shape (0 soft,1 dot,2 shard), jitter }
   */
  burst(origin, p) {
    const n = p.count || 10;
    const dir = p.dir || new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const j = p.jitter || 0;
      this.pos[i * 3] = origin.x + (Math.random() - 0.5) * j;
      this.pos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * j;
      this.pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * j;
      // random direction in a cone around dir
      const sp = (p.spread ?? Math.PI) * Math.random();
      const az = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.sin(sp) * Math.cos(az), Math.cos(sp), Math.sin(sp) * Math.sin(az));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      v.applyQuaternion(q);
      const speed = (p.speed ? p.speed[0] + Math.random() * (p.speed[1] - p.speed[0]) : 2);
      this.vel[i * 3] = v.x * speed;
      this.vel[i * 3 + 1] = v.y * speed;
      this.vel[i * 3 + 2] = v.z * speed * (p.flatZ ?? 1);
      const L = p.life ? p.life[0] + Math.random() * (p.life[1] - p.life[0]) : 0.6;
      this.life[i] = L;
      this.maxLife[i] = L;
      const s = p.size ? p.size[0] + Math.random() * (p.size[1] - p.size[0]) : 0.05;
      this.size0[i] = s;
      this.size[i] = s;
      this.drag[i] = p.drag ?? 2;
      this.grav[i] = p.gravity ?? 0;
      this.shape[i] = p.shape ?? 0;
      const cc = p.colors ? p.colors[Math.floor(Math.random() * p.colors.length)] : p.color ?? 0xffffff;
      this._c.set(cc);
      this.col[i * 3] = this._c.r;
      this.col[i * 3 + 1] = this._c.g;
      this.col[i * 3 + 2] = this._c.b;
      this.alpha[i] = 1;
    }
    this.geo.attributes.pshape.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = Math.min(1, k * 1.6);
      this.size[i] = this.size0[i] * (0.4 + 0.6 * k);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true;
    a.color.needsUpdate = true;
    a.psize.needsUpdate = true;
    a.palpha.needsUpdate = true;
    this.material.uniforms.viewportH.value = window.innerHeight;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
  }
}
