import * as THREE from 'three';
import { Time } from './Time.js';
import { InputManager } from './InputManager.js';
import { SaveManager } from './SaveManager.js';
import { AudioManager } from './AudioManager.js';
import { Cursor } from './Cursor.js';
import { UIManager } from './UIManager.js';
import { PostFX } from './PostFX.js';
import { AssetManager } from './AssetManager.js';
import { SceneManager } from './SceneManager.js';
import { TransitionManager } from './TransitionManager.js';
import { DialogueManager } from './DialogueManager.js';
import { QuestManager } from './QuestManager.js';
import { CombatManager } from './CombatManager.js';
import { buildUITextures } from '../art/uiTextures.js';
import { TitleScreen } from '../ui/TitleScreen.js';

/**
 * Root of the platform. Owns every manager and the main loop.
 */
export class GameManager {
  constructor(container) {
    this.container = container;
    this.save = new SaveManager();
    this.time = new Time();

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.input = new InputManager(this.renderer.domElement);
    this.audio = new AudioManager(this.save);
    this.cursor = new Cursor(this.input);
    this.post = new PostFX(this.renderer, this.save);
    this.ui = new UIManager(this);
    this.assets = new AssetManager();
    this.scenes = new SceneManager(this);
    this.transitions = new TransitionManager(this);
    this.dialogue = new DialogueManager(this);
    this.quests = new QuestManager(this);
    this.combat = new CombatManager(this);

    this.shakeState = { amp: 0, dur: 0, t: 0, freq: 28 };
    this.shakeOffset = new THREE.Vector3();
    this._shakeSeed = Math.random() * 100;

    this.fpsEl = document.createElement('div');
    this.fpsEl.className = 'fps';
    document.body.appendChild(this.fpsEl);
    this._fps = { frames: 0, acc: 0 };

    this.applyResolution();
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('fullscreenchange', () => {
      this.save.settings.fullscreen = !!document.fullscreenElement;
    });

    this.input.on('key', (code) => {
      if (code !== 'Escape') return;
      if (this.transitions.busy) return;
      if (this.ui.closeTop()) return;
      if (this.dialogue.active) return;
      this.scenes.current && this.scenes.current.onEscape();
    });

    this._last = performance.now();
    this.loop = this.loop.bind(this);
  }

  async start() {
    buildUITextures();
    const grainEl = document.createElement('div');
    grainEl.className = 'grain-overlay';
    const dustEl = document.createElement('div');
    dustEl.className = 'dust-overlay';
    document.body.append(grainEl, dustEl);

    this.applySettings('fpsCounter');
    this.applySettings('mouseSensitivity');
    this.title = new TitleScreen(this);
    this.title.show();
    requestAnimationFrame(this.loop);

    await this.assets.loadFonts();
    const direct = new URLSearchParams(window.location.search).get('scene');
    if (direct && direct !== 'lobby' && this.scenes.registry[direct]) {
      // developer / QA shortcut: jump straight into a scene
      const sc = await this.scenes.load(direct, {});
      this.scenes.activate(sc, direct);
      this.title.ready(() => {
        this.audio.init();
        this.audio.applyVolumes();
        if (sc.afterReveal) sc.afterReveal();
      });
      return;
    }
    const lobby = await this.scenes.load('lobby', { fromTitle: true }, (p) => this.title.setProgress(p));
    this.scenes.activate(lobby, 'lobby');
    this.post.set('dofBoost', 1, true);
    this.post.set('dim', 0.7, true);
    this.title.ready(() => {
      this.audio.init();
      this.audio.applyVolumes();
      this.post.set('dofBoost', 0);
      this.post.set('dim', 0);
      lobby.playIntro();
    });
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.maxDt || 0.05, Math.max(0.0001, (now - this._last) / 1000));
    this._last = now;
    this.time.tick(dt);
    this.save.tick(dt);
    this._updateShake(dt);

    const sc = this.scenes.current;
    if (sc) {
      this.scenes.update(this.time);
      this.post.render(sc.scene, sc.camera, dt, this.time.elapsed);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(0x0c0b0a);
      this.renderer.clear();
    }
    this.cursor.update(dt);
    this.dialogue.update(dt);
    this.input.endFrame();

    if (this.save.settings.fpsCounter) {
      this._fps.frames++;
      this._fps.acc += dt;
      if (this._fps.acc >= 0.5) {
        const info = this.renderer.info.render;
        this.fpsEl.textContent = `${Math.round(this._fps.frames / this._fps.acc)} FPS · ${info.calls} DC · ${(info.triangles / 1000).toFixed(0)}K TRI`;
        this._fps.frames = 0;
        this._fps.acc = 0;
      }
    }
  }

  // ─────────────────────────── camera shake ───────────────────────────

  shake(amp = 0.1, dur = 0.2) {
    const k = this.save.settings.cameraShake;
    if (k <= 0) return;
    this.shakeState.amp = Math.max(this.shakeState.amp * (this.shakeState.t / Math.max(this.shakeState.dur, 0.001)), amp * k);
    this.shakeState.dur = dur;
    this.shakeState.t = dur;
  }

  _updateShake(dt) {
    const s = this.shakeState;
    if (s.t > 0) {
      s.t -= dt;
      const k = Math.max(0, s.t / s.dur);
      const a = s.amp * k * k;
      const t = this.time.elapsed * s.freq + this._shakeSeed;
      this.shakeOffset.set(Math.sin(t * 1.3) * a + Math.sin(t * 3.1) * a * 0.4, Math.cos(t * 1.7) * a * 0.8, 0);
    } else this.shakeOffset.set(0, 0, 0);
  }

  // ─────────────────────────── settings ───────────────────────────

  applyResolution() {
    let s = this.save.settings.resolutionScale;
    const qa = new URLSearchParams(window.location.search).get('qa');
    if (qa) s = parseFloat(qa) || 0.5;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(Math.min(2.5, dpr * s));
    this.onResize();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
    if (this.scenes.current) this.scenes.current.onResize(w, h);
  }

  applySettings(key) {
    const s = this.save.settings;
    switch (key) {
      case 'masterVolume':
      case 'musicVolume':
      case 'sfxVolume':
        this.audio.applyVolumes();
        break;
      case 'resolutionScale':
        this.applyResolution();
        break;
      case 'shadowQuality':
        this.renderer.shadowMap.enabled = s.shadowQuality !== 'off';
        if (this.scenes.current) this.scenes.current.applyShadowQuality(s.shadowQuality);
        this.scenes.current && this.scenes.current.scene.traverse((o) => {
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true));
        });
        break;
      case 'fullscreen':
        if (s.fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
        else if (!s.fullscreen && document.fullscreenElement) document.exitFullscreen?.();
        break;
      case 'fpsCounter':
        this.fpsEl.classList.toggle('is-on', s.fpsCounter);
        break;
      case 'mouseSensitivity':
        this.input.sensitivity = s.mouseSensitivity;
        break;
      default:
        break;
    }
  }

  // ─────────────────────────── navigation ───────────────────────────

  goArchive(fromRect) {
    return this.transitions.toScene('archive', { style: 'archive', fromRect });
  }

  playGame(id, fromRect) {
    this.save.data.stats.lastGame = id;
    this.save.save();
    return this.transitions.toScene(id, { style: id === 'campus' ? 'photo' : 'book', fromRect });
  }

  goLobby() {
    this.dialogue.forceClose();
    return this.transitions.toScene('lobby', { style: 'lobby' });
  }
}
