import * as THREE from 'three';

/**
 * Rain-on-glass: fogged, blurred exterior with static droplets and sliding
 * drops that leave clear trails. Samples a mip-mapped exterior texture with a
 * LOD bias so fogged areas are blurry and droplets focus the view.
 */
export function createRainGlassMaterial(exteriorTex) {
  exteriorTex.generateMipmaps = true;
  exteriorTex.minFilter = THREE.LinearMipmapLinearFilter;
  return new THREE.ShaderMaterial({
    uniforms: {
      tExt: { value: exteriorTex },
      time: { value: 0 },
      flash: { value: 0 },
      parallax: { value: new THREE.Vector2() },
      brightness: { value: 1.0 },
      aspect: { value: 0.75 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tExt;
      uniform float time, flash, brightness, aspect;
      uniform vec2 parallax;
      varying vec2 vUv;
      float N(float t){ return fract(sin(t * 12345.564) * 7658.76); }
      vec3 N13(float p){
        vec3 p3 = fract(vec3(p) * vec3(.1031,.11369,.13787));
        p3 += dot(p3, p3.yzx + 19.19);
        return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
      }
      float Saw(float b, float t){ return smoothstep(0., b, t) * smoothstep(1., b, t); }
      // sliding drop layer (after "Heartfelt" technique, rewritten)
      vec2 DropLayer(vec2 uv, float t){
        vec2 UV = uv;
        uv.y += t * 0.75;
        vec2 a = vec2(6., 1.);
        vec2 grid = a * 2.;
        vec2 id = floor(uv * grid);
        float colShift = N(id.x);
        uv.y += colShift;
        id = floor(uv * grid);
        vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
        vec2 st = fract(uv * grid) - vec2(.5, 0.);
        float x = n.x - .5;
        float y = UV.y * 20.;
        float wiggle = sin(y + sin(y));
        x += wiggle * (.5 - abs(x)) * (n.z - .5);
        x *= .7;
        float ti = fract(t + n.z);
        y = (Saw(.85, ti) - .5) * .9 + .5;
        vec2 p = vec2(x, y);
        float d = length((st - p) * a.yx);
        float mainDrop = smoothstep(.4, .0, d);
        float r = sqrt(smoothstep(1., y, st.y));
        float cd = abs(st.x - x);
        float trail = smoothstep(.23 * r, .15 * r * r, cd);
        float trailFront = smoothstep(-.02, .02, st.y - y);
        trail *= trailFront * r * r;
        y = UV.y;
        float trail2 = smoothstep(.2 * r, .0, cd);
        float droplets = max(0., (sin(y * (1. - y) * 120.) - st.y)) * trail2 * trailFront * n.z;
        y = fract(y * 10.) + (st.y - .5);
        float dd = length(st - vec2(x, y));
        droplets = smoothstep(.3, 0., dd);
        float m = mainDrop + droplets * r * trailFront;
        return vec2(m, trail);
      }
      float StaticDrops(vec2 uv, float t){
        uv *= 40.;
        vec2 id = floor(uv);
        uv = fract(uv) - .5;
        vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
        vec2 p = (n.xy - .5) * .7;
        float d = length(uv - p);
        float fade = Saw(.025, fract(t + n.z));
        float c = smoothstep(.3, 0., d) * fract(n.z * 10.) * fade;
        return c;
      }
      vec2 Drops(vec2 uv, float t){
        float s = StaticDrops(uv, t);
        vec2 m1 = DropLayer(uv, t);
        vec2 m2 = DropLayer(uv * 1.85, t);
        float c = s + m1.x + m2.x;
        c = smoothstep(.3, 1., c);
        return vec2(c, max(m1.y, m2.y));
      }
      void main(){
        vec2 uv = vUv;
        vec2 duv = vec2(uv.x, uv.y * aspect) * 1.2;
        float t = time * 0.06;
        vec2 c = Drops(duv, t);
        vec2 e = vec2(.001, 0.);
        float cx = Drops(duv + e, t).x;
        float cy = Drops(duv + e.yx, t).x;
        vec2 n = vec2(cx - c.x, cy - c.x);
        float focus = mix(4.2 - c.y * 2.5, 0.6, smoothstep(.1, .2, c.x));
        vec2 suv = uv + parallax + n * 1.4;
        vec3 col = texture2D(tExt, suv, focus).rgb;
        // condensation haze (cool, slightly lifted), clear inside drops/trails
        float clear = max(smoothstep(0.05, 0.3, c.x), c.y * 0.6);
        col = mix(col, col * 0.85 + vec3(0.07, 0.085, 0.1), 0.55 * (1.0 - clear));
        // droplets catch the room light: bright rim at the top edge of each drop
        col += vec3(0.9, 0.8, 0.65) * smoothstep(0.004, 0.02, -n.y) * c.x * 0.35;
        col *= brightness;
        col += vec3(0.75, 0.82, 1.0) * flash;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
