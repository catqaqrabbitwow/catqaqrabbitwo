import { nextFrame } from '../art/painter.js';

/**
 * Procedural asset cache + font readiness. Generators run lazily and are
 * shared between scenes (e.g. paper textures, character atlases).
 */
export class AssetManager {
  constructor() {
    this.cache = new Map();
    this.fontsReady = null;
  }

  /** Get or create a cached asset. */
  get(key, factory) {
    if (!this.cache.has(key)) this.cache.set(key, factory());
    return this.cache.get(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  release(prefix) {
    for (const [k, v] of this.cache) {
      if (k.startsWith(prefix)) {
        if (v && v.dispose) v.dispose();
        this.cache.delete(k);
      }
    }
  }

  /** Wait until the web fonts used by canvas-painted textures are available. */
  loadFonts() {
    if (this.fontsReady) return this.fontsReady;
    const zh = '時光檔案館校園異聞黑森林試煉小遊戲收藏設定信件任務旅人第章消失的學生舊圖書館資料室月光種子森林護符號外';
    const specs = [
      ['600 40px "Bodoni Moda"', 'ABCabc'],
      ['italic 500 40px "Bodoni Moda"', 'ABCabc'],
      ['500 40px "Barlow Condensed"', 'ABC123'],
      ['600 40px "Barlow Condensed"', 'ABC123'],
      ['400 40px "IBM Plex Mono"', '0123'],
      ['italic 500 40px "Cormorant Garamond"', 'Abc'],
      ['400 40px "Noto Serif TC"', zh],
      ['700 40px "Noto Serif TC"', zh],
    ];
    const timeout = new Promise((r) => setTimeout(r, 6000));
    this.fontsReady = Promise.race([Promise.all(specs.map(([f, t]) => document.fonts.load(f, t).catch(() => null))), timeout]);
    return this.fontsReady;
  }

  /** Make sure specific CJK glyph subsets exist before painting them into a canvas. */
  async ensureGlyphs(text, weights = [400, 700]) {
    await Promise.race([Promise.all(weights.map((w) => document.fonts.load(`${w} 40px "Noto Serif TC"`, text).catch(() => null))), new Promise((r) => setTimeout(r, 3000))]);
  }

  /**
   * Run a list of async/sync steps, yielding to the browser between them so
   * loading illustrations keep animating. onProgress(0..1)
   */
  async runSteps(steps, onProgress) {
    for (let i = 0; i < steps.length; i++) {
      await steps[i]();
      if (onProgress) onProgress((i + 1) / steps.length);
      await nextFrame();
    }
  }
}
