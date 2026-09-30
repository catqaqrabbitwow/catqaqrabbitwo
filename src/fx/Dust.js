import * as THREE from 'three';

/**
 * Floating dust motes / pollen / fireflies. GPU-animated points so hundreds
 * of particles cost a single draw call.
 */
export function createDust({ count = 300, box = [[-3, 0, -2], [3, 3, 1]], color = 0xfff0d8, size = 0.03, opacity = 0.6, speed = 0.05, twinkle = 0.5, additive = true, rise = 0 } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box[0][0] + Math.random() * (box[1][0] - box[0][0]);
    pos[i * 3 + 1] = box[0][1] + Math.random() * (box[1][1] - box[0][1]);
    pos[i * 3 + 2] = box[0][2] + Math.random() * (box[1][2] - box[0][2]);
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(color) },
      size: { value: size },
      opacity: { value: opacity },
      speed: { value: speed },
      twinkle: { value: twinkle },
      rise: { value: rise },
      boxMin: { value: new THREE.Vector3(...box[0]) },
      boxMax: { value: new THREE.Vector3(...box[1]) },
      pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      viewportH: { value: window.innerHeight },
    },
    vertexShader: /* glsl */ `
      uniform float time, size, speed, rise, pixelRatio, viewportH;
      uniform vec3 boxMin, boxMax;
      attribute float seed;
      varying float vA;
      uniform float twinkle;
      void main(){
        vec3 p = position;
        float t = time * speed;
        p.x += sin(t * 3.1 + seed * 40.0) * 0.25 + sin(t * 1.3 + seed * 13.0) * 0.4;
        p.y += sin(t * 2.3 + seed * 20.0) * 0.18 + t * rise * (0.5 + seed);
        p.z += cos(t * 2.7 + seed * 30.0) * 0.25;
        vec3 sz = boxMax - boxMin;
        p = boxMin + mod(p - boxMin, sz);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * (0.5 + seed) * viewportH * pixelRatio / -mv.z;
        vA = mix(1.0, 0.5 + 0.5 * sin(time * (1.0 + seed * 3.0) + seed * 60.0), twinkle);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(color, a * opacity * vA);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return pts;
}

let _shaftTex = null;
function shaftTex() {
  if (_shaftTex) return _shaftTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 256);
  for (let y = 0; y < 256; y++) {
    const v = y / 255; // 0 top (source) → 1 bottom
    const fadeV = Math.pow(1 - v, 1.4) * Math.min(1, v * 8);
    for (let x = 0; x < 128; x++) {
      const u = (x / 127) * 2 - 1;
      const fadeU = Math.exp(-u * u * 4.5);
      const a = fadeU * fadeV;
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  _shaftTex = new THREE.CanvasTexture(c);
  _shaftTex.userData.shared = true;
  return _shaftTex;
}

/**
 * Soft additive god-ray: a quad hanging from `from` along `dir`, rotated
 * around its own axis every frame to face the camera (see orientShaft).
 */
export function createShaft({ from, dir, length = 5, width = 1, color = 0xffd8a0, opacity = 0.08 }) {
  const geo = new THREE.PlaneGeometry(width, length);
  geo.translate(0, -length / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ color, map: shaftTex(), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: true });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from);
  m.userData.axis = dir.clone().normalize();
  m.userData.len = length;
  m.renderOrder = 6;
  m.frustumCulled = false;
  return m;
}

const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _x = new THREE.Vector3();
const _c = new THREE.Vector3();
const _mat = new THREE.Matrix4();
export function orientShaft(m, camera) {
  const axis = m.userData.axis;
  _y.copy(axis).negate();
  _c.copy(m.position).addScaledVector(axis, m.userData.len * 0.5);
  _z.copy(camera.position).sub(_c);
  _z.addScaledVector(_y, -_z.dot(_y)).normalize();
  _x.crossVectors(_y, _z).normalize();
  _mat.makeBasis(_x, _y, _z);
  m.quaternion.setFromRotationMatrix(_mat);
}
