/** Full-screen shaders used by the post-processing chain. */

export const DOFShader = {
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    resolution: { value: null },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 100 },
    focusDist: { value: 5 },
    focusRange: { value: 3 },
    maxBlur: { value: 8 },
    nearScale: { value: 1 },
    amount: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, focusDist, focusRange, maxBlur, nearScale, amount;
    varying vec2 vUv;
    #define TAPS 36
    float linDepth(float d){
      float z = d * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }
    float coc(float z){
      float c = (z - focusDist) / focusRange;
      c = c < 0.0 ? -c * nearScale : c;
      return clamp(c, 0.0, 1.0) * maxBlur * amount;
    }
    void main(){
      vec4 base = texture2D(tColor, vUv);
      float cz = linDepth(texture2D(tDepth, vUv).x);
      float cc = coc(cz);
      if (maxBlur * amount < 0.3) { gl_FragColor = base; return; }
      vec3 acc = base.rgb;
      float wsum = 1.0;
      float ga = 2.39996323;
      for (int i = 0; i < TAPS; i++){
        float fi = float(i);
        float r = sqrt((fi + 0.5) / float(TAPS)) * maxBlur * amount;
        vec2 dir = vec2(cos(fi * ga), sin(fi * ga));
        vec2 uv = vUv + dir * r / resolution;
        vec3 col = texture2D(tColor, uv).rgb;
        float sz = linDepth(texture2D(tDepth, uv).x);
        float sc = coc(sz);
        // background samples can't bleed over sharper foreground
        float eff = sz > cz ? min(sc, cc * 1.6 + 0.5) : sc;
        float w = smoothstep(r - 1.25, r + 0.25, eff);
        acc += col * w;
        wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.0);
    }
  `,
};

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: null },
    time: { value: 0 },
    saturation: { value: 1 },
    contrast: { value: 1 },
    brightness: { value: 0 },
    shadowTint: { value: null },
    highlightTint: { value: null },
    lift: { value: null },
    vignette: { value: 0.35 },
    vignetteSoft: { value: 0.6 },
    grain: { value: 0.05 },
    ca: { value: 0.0 },
    letterbox: { value: 0.0 },
    fade: { value: 0.0 },
    fadeColor: { value: null },
    desat: { value: 0.0 },
    rift: { value: 0.0 },
    flash: { value: 0.0 },
    flashColor: { value: null },
    scanline: { value: 0.0 },
  },
  vertexShader: DOFShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time, saturation, contrast, brightness, vignette, vignetteSoft, grain, ca, letterbox, fade, desat, rift, flash, scanline;
    uniform vec3 shadowTint, highlightTint, lift, fadeColor, flashColor;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main(){
      vec2 uv = vUv;
      vec2 cUv = uv - 0.5;
      float aspect = resolution.x / resolution.y;
      float dist = length(cUv * vec2(aspect, 1.0));
      // time-rift lens warp: gentle inward pull with a rippling ring
      if (rift > 0.001) {
        float ring = sin(dist * 34.0 - time * 7.0) * 0.004 * rift;
        uv -= cUv * (0.035 * rift * dist) - normalize(cUv + 1e-5) * ring;
      }
      float caAmt = ca + rift * 0.012;
      vec2 dir = cUv * dist * caAmt;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir).b;

      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // split toning: cool shadows / warm highlights
      vec3 tint = mix(shadowTint, highlightTint, smoothstep(0.08, 0.8, l));
      col *= tint;
      col += lift * (1.0 - col);
      col = mix(vec3(l), col, saturation * (1.0 - desat));
      col = (col - 0.5) * contrast + 0.5 + brightness;

      // vignette
      float v = 1.0 - smoothstep(vignetteSoft - 0.75, vignetteSoft, dist * (1.0 + vignette * 0.4));
      col *= mix(1.0 - vignette, 1.0, v);
      // rift: cold edges
      col = mix(col, col * vec3(0.72, 0.9, 1.15), rift * smoothstep(0.25, 0.85, dist));

      // film grain, strongest in the mid tones
      float gr = hash(uv * resolution + fract(time * 13.7) * 91.0) - 0.5;
      float midW = 1.0 - abs(l - 0.5) * 1.4;
      col += gr * grain * max(midW, 0.25);
      if (scanline > 0.0) col *= 1.0 - scanline * (0.5 + 0.5 * sin(uv.y * resolution.y * 1.2));

      col = mix(col, flashColor, flash);
      col = mix(col, fadeColor, fade);
      // cinematic bars
      float lb = letterbox;
      if (lb > 0.0005) {
        float edge = min(vUv.y, 1.0 - vUv.y);
        float bar = step(edge, lb);
        float line = (1.0 - smoothstep(lb + 0.0010, lb + 0.0022, edge)) * (1.0 - bar);
        col = mix(col, vec3(0.03, 0.028, 0.026), bar);
        col += vec3(0.55, 0.45, 0.3) * line * 0.35;
      }
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};
