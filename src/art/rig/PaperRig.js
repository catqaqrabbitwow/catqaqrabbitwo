import * as THREE from 'three';
import { toTexture } from '../painter.js';

/**
 * 2D paper-cut character built from painted parts packed into one atlas.
 *
 * Part definition:
 *   { name, parent?, w, h, pivot:[px,py] (canvas px), joint:[X,Y] (character px, y up),
 *     layer, draw(g,w,h) | frames:{ key: draw } , shadow?:bool }
 * Every part becomes a pivot Object3D with a plane mesh child. The rig lives in
 * real world space (x,y,z) so it is correctly depth-sorted against the scene.
 */

const RIG_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main(){
    vUv = uv;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const RIG_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform vec3 ambient;
  uniform vec3 rimColor;
  uniform sampler2D rimMap;
  uniform vec3 rimWeights;
  uniform float rimStrength;
  uniform float flash;
  uniform vec3 flashColor;
  uniform float opacity;
  uniform float dissolve;
  uniform vec3 dissolveColor;
  uniform float time;
  uniform float glitch;
  uniform float silhouette;
  uniform vec3 silhouetteColor;
  uniform float alphaCut;
  uniform vec3 keyColor;
  uniform float keyAmount;
  uniform vec3 keyCenter;
  uniform float keySide;
  uniform float keyWidth;
  varying vec2 vUv;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  void main(){
    vec2 uv = vUv;
    if (glitch > 0.0) {
      float band = step(0.82, hash(vec2(floor(uv.y * 60.0), floor(time * 14.0))));
      uv.x += band * (hash(vec2(floor(time * 20.0), floor(uv.y * 30.0))) - 0.5) * 0.02 * glitch;
    }
    vec4 tex = texture2D(map, uv);
    if (tex.a < alphaCut) discard;
    float rim = dot(texture2D(rimMap, uv).rgb, rimWeights);
    float keyF = smoothstep(-keyWidth, keyWidth, (vWorld.x - keyCenter.x) * keySide);
    vec3 col = tex.rgb * tint * (ambient + keyColor * keyAmount * keyF);
    col = mix(col, silhouetteColor * (0.6 + 0.4 * tex.r), silhouette);
    col += rimColor * rim * rimStrength;
    if (glitch > 0.0) {
      vec3 rm = texture2D(rimMap, uv).rgb;
      col.r += (rm.r + rm.g) * 1.6 * glitch;
    }
    if (dissolve > 0.0) {
      float n = vnoise(vUv * 90.0);
      float edge = n - dissolve;
      if (edge < 0.0) discard;
      col = mix(col, dissolveColor * 3.0, smoothstep(0.08, 0.0, edge));
    }
    col = mix(col, flashColor, flash);
    gl_FragColor = vec4(col, opacity);
    #include <fog_fragment>
  }
`;

export function createRigMaterial(texture, opts = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        map: { value: texture },
        tint: { value: new THREE.Color(1, 1, 1) },
        ambient: { value: new THREE.Color(1, 1, 1) },
        rimColor: { value: new THREE.Color(opts.rimColor ?? 0xffc98a) },
        rimMap: { value: null },
        rimWeights: { value: new THREE.Vector3(0, 1, 0.5) },
        rimStrength: { value: opts.rimStrength ?? 0.9 },
        flash: { value: 0 },
        flashColor: { value: new THREE.Color(1, 1, 1) },
        opacity: { value: 1 },
        dissolve: { value: 0 },
        dissolveColor: { value: new THREE.Color(opts.dissolveColor ?? 0xff5040) },
        time: { value: 0 },
        glitch: { value: 0 },
        silhouette: { value: opts.silhouette ?? 0 },
        silhouetteColor: { value: new THREE.Color(opts.silhouetteColor ?? 0x0a0808) },
        alphaCut: { value: opts.alphaCut ?? 0.42 },
        keyColor: { value: new THREE.Color(opts.keyColor ?? 0xffb070) },
        keyAmount: { value: 0 },
        keyCenter: { value: new THREE.Vector3() },
        keySide: { value: 1 },
        keyWidth: { value: 0.3 },
      },
    ]),
    vertexShader: RIG_VERT,
    fragmentShader: RIG_FRAG,
    fog: true,
    transparent: false,
    side: THREE.DoubleSide,
  });
  mat.uniforms.map.value = texture;
  return mat;
}

/** Shelf-pack part canvases into one atlas canvas. */
function packAtlas(items, size, pad = 6) {
  const atlas = document.createElement('canvas');
  atlas.width = size;
  atlas.height = size;
  const g = atlas.getContext('2d');
  const sorted = [...items].sort((a, b) => b.h - a.h);
  let x = pad;
  let y = pad;
  let rowH = 0;
  for (const it of sorted) {
    if (x + it.w + pad > size) {
      x = pad;
      y += rowH + pad * 2;
      rowH = 0;
    }
    if (y + it.h + pad > size) throw new Error(`atlas overflow (${size})`);
    it.ax = x;
    it.ay = y;
    g.drawImage(it.canvas, x, y);
    x += it.w + pad * 2;
    rowH = Math.max(rowH, it.h);
  }
  return atlas;
}

/**
 * Bake soft edge bands from the atlas alpha using canvas compositing:
 *   R = left-facing edges, G = right-facing edges, B = top edges.
 */
function buildRimMask(atlas, width) {
  const size = atlas.width;
  const band = (dx, dy) => {
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const og = out.getContext('2d');
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = size;
    const tg = tmp.getContext('2d');
    for (const [k, a] of [[1, 0.4], [0.62, 0.35], [0.3, 0.3]]) {
      tg.globalCompositeOperation = 'source-over';
      tg.clearRect(0, 0, size, size);
      tg.drawImage(atlas, 0, 0);
      tg.globalCompositeOperation = 'destination-out';
      tg.drawImage(atlas, dx * k, dy * k);
      og.globalAlpha = a;
      og.drawImage(tmp, 0, 0);
    }
    return out;
  };
  const mask = document.createElement('canvas');
  mask.width = mask.height = size;
  const mg = mask.getContext('2d');
  mg.fillStyle = '#000';
  mg.fillRect(0, 0, size, size);
  const channels = [
    [band(width, 0), '#ff0000'],
    [band(-width, 0), '#00ff00'],
    [band(0, Math.round(width * 0.8)), '#0000ff'],
  ];
  for (const [b, color] of channels) {
    const bg = b.getContext('2d');
    bg.globalCompositeOperation = 'source-in';
    bg.globalAlpha = 1;
    bg.fillStyle = color;
    bg.fillRect(0, 0, size, size);
    mg.globalCompositeOperation = 'lighter';
    mg.drawImage(b, 0, 0);
  }
  return mask;
}

export class PaperRig {
  /**
   * @param {Array} parts part defs (see header)
   * @param {object} o { ppm: pixels per metre, atlasSize, rimColor, castShadow, name }
   */
  constructor(parts, o = {}) {
    this.ppm = o.ppm || 420;
    this.root = new THREE.Group();
    this.root.name = o.name || 'rig';
    this.body = new THREE.Group(); // inner group used for squash / lean / flip
    this.root.add(this.body);
    this.nodes = {};
    this.meshes = {};
    this.frames = {};
    this.base = {};

    // render every part (and frames) to its own canvas
    const items = [];
    for (const p of parts) {
      const variants = p.frames ? Object.entries(p.frames) : [['_', p.draw]];
      for (const [key, fn] of variants) {
        const c = document.createElement('canvas');
        c.width = p.w;
        c.height = p.h;
        const g = c.getContext('2d');
        g.lineJoin = 'round';
        g.lineCap = 'round';
        fn(g, p.w, p.h);
        items.push({ part: p, key, canvas: c, w: p.w, h: p.h });
      }
    }
    let size = o.atlasSize || 1024;
    let atlas;
    for (;;) {
      try {
        atlas = packAtlas(items, size);
        break;
      } catch {
        size *= 2;
        if (size > 4096) throw new Error('rig atlas too large');
      }
    }
    this.atlas = atlas;
    this.texture = toTexture(atlas, { mipmaps: true });
    this.texture.premultiplyAlpha = false;
    this.material = createRigMaterial(this.texture, o);
    this.rimTexture = toTexture(buildRimMask(atlas, o.rimWidth || Math.round(size / 256) + 2), { srgb: false, mipmaps: true });
    this.material.uniforms.rimMap.value = this.rimTexture;
    this.depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.texture, alphaTest: 0.5, side: THREE.DoubleSide });

    const byName = {};
    for (const p of parts) byName[p.name] = p;

    // create pivot nodes
    for (const p of parts) {
      const node = new THREE.Group();
      node.name = p.name;
      this.nodes[p.name] = node;
    }
    for (const p of parts) {
      const node = this.nodes[p.name];
      const parent = p.parent ? this.nodes[p.parent] : this.body;
      const pj = p.parent ? byName[p.parent].joint : [0, 0];
      node.position.set((p.joint[0] - pj[0]) / this.ppm, (p.joint[1] - pj[1]) / this.ppm, 0);
      parent.add(node);
      this.base[p.name] = { x: node.position.x, y: node.position.y, r: 0, sx: 1, sy: 1 };
    }
    // meshes
    for (const it of items) {
      const p = it.part;
      const w = p.w / this.ppm;
      const h = p.h / this.ppm;
      const px = p.pivot[0] / this.ppm;
      const py = p.pivot[1] / this.ppm;
      const geo = new THREE.PlaneGeometry(w, h);
      geo.translate(w / 2 - px, -h / 2 + py, 0);
      const uv = geo.attributes.uv;
      const u0 = it.ax / size;
      const u1 = (it.ax + it.w) / size;
      const v1 = 1 - it.ay / size;
      const v0 = 1 - (it.ay + it.h) / size;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) === 0 ? u0 : u1, uv.getY(i) === 0 ? v0 : v1);
      }
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.position.z = (p.layer || 0) * 0.0035;
      mesh.castShadow = o.castShadow !== false && p.shadow !== false;
      mesh.customDepthMaterial = this.depthMaterial;
      mesh.renderOrder = o.renderOrder || 0;
      mesh.frustumCulled = false;
      this.nodes[p.name].add(mesh);
      if (p.frames) {
        this.frames[p.name] = this.frames[p.name] || {};
        this.frames[p.name][it.key] = mesh;
        mesh.visible = false;
      } else this.meshes[p.name] = mesh;
    }
    for (const [name, fr] of Object.entries(this.frames)) {
      const first = Object.keys(fr)[0];
      this.setFrame(name, byName[name].defaultFrame || first);
    }
    this.facing = 1;
  }

  setFrame(part, key) {
    const fr = this.frames[part];
    if (!fr || !fr[key]) return;
    if (this._cur && this._cur[part] === key) return;
    for (const [k, m] of Object.entries(fr)) m.visible = k === key;
    this._cur = this._cur || {};
    this._cur[part] = key;
  }

  /** Set a part pose relative to its rest position (radians / metres). */
  pose(name, r = 0, dx = 0, dy = 0, sx = 1, sy = 1) {
    const n = this.nodes[name];
    if (!n) return;
    const b = this.base[name];
    n.rotation.z = r;
    n.position.x = b.x + dx;
    n.position.y = b.y + dy;
    n.scale.set(sx, sy, 1);
  }

  setFacing(f) {
    this.facing = f;
    this.body.scale.x = Math.abs(this.body.scale.x) * f;
    this._syncRim();
  }

  /**
   * Screen-space direction the rim light comes from:
   *   side  -1 = from the left, +1 = from the right, 0 = both sides
   *   up    strength of the top-edge rim
   */
  setRimSide(side, up = 0.6) {
    this.rimSide = side;
    this.rimUp = up;
    this._syncRim();
  }

  _syncRim() {
    const side = this.rimSide ?? 1;
    const up = this.rimUp ?? 0.6;
    // mirrored rigs swap texture-left / texture-right
    const s = side * (this.facing || 1);
    const left = side === 0 ? 0.65 : s < 0 ? 1 : 0;
    const right = side === 0 ? 0.65 : s > 0 ? 1 : 0;
    this.material.uniforms.rimWeights.value.set(left, right, up);
  }

  set visible(v) {
    this.root.visible = v;
  }

  dispose() {
    this.root.traverse((o) => o.geometry && o.geometry.dispose());
    this.rimTexture.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.texture.dispose();
  }
}

/** Soft contact shadow under a character's feet. */
let _blobTex = null;
export function blobShadow(radius = 0.5, opacity = 0.55) {
  if (!_blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.45, 'rgba(0,0,0,0.6)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    _blobTex = new THREE.CanvasTexture(c);
    _blobTex.userData.shared = true;
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0x000000 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}
