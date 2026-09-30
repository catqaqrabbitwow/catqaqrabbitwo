import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BaseScene } from '../BaseScene.js';
import { buildLobbyRoom } from './LobbyRoom.js';
import { LobbyUI } from './LobbyUI.js';
import { Humanoid } from '../../actors/Humanoid.js';
import { createDust, createShaft, orientShaft } from '../../fx/Dust.js';
import { drawTV } from './lobbyTextures.js';
import { toneAndAge } from '../../art/illustrations.js';

export const ARCHIVIST_CFG = {
  name: 'archivist',
  seed: 17,
  S: 2,
  gender: 'f',
  skin: '#f0d8c6',
  hair: { style: 'bob', color: '#cfc3ad' },
  eyes: { color: '#5a7c86' },
  outfit: { type: 'coat', main: '#2b2a2e', shirt: '#efe8d8', vest: '#5a2a2e', tie: true, accent: '#7b2530', bottom: '#232226', pants: true, shoes: '#1a1412', gloves: '#1d1b1c' },
  hat: 'fedora',
  hatColor: '#211f21',
  hatBand: '#7b2530',
  umbrella: true,
};

const ARCHIVIST_LINES = [
  [{ text: '雨已經下了很久了。不過在這個房間裡,時間走得比外面慢一些。', en: 'It has been raining for a long time.' }],
  [{ text: '桌上的信是寄給你的。有一封來自暮見高校——字跡很急。', en: 'A letter came from Kuremi High.' }],
  [{ text: '檔案庫裡收著兩份已解密的案卷。挑一份吧,旅人。', en: 'Two case files have been declassified.' }],
  [{ text: '留聲機的唱片是我最喜歡的一張。你可以讓它停下來,但別刮壞了。', en: 'Mind the record.' }],
  [{ text: '森林那邊的郵差說,月亮最近常常忘記升起。', en: 'The moon keeps forgetting to rise.' }, { text: '……真是奇怪的季節。', en: '' }],
  [{ text: '每一扇門後面都是另一個時代。請記得回來的路。', en: 'Remember the way back.' }],
];

/**
 * Lobby — the time traveller's private archive room.
 */
export class LobbyScene extends BaseScene {
  constructor(game, params) {
    super(game, params);
    this.camera.fov = 32;
    this.camera.near = 0.1;
    this.camera.far = 40;
    this.camBase = new THREE.Vector3(0.45, 1.62, 5.7);
    this.camTarget = new THREE.Vector3(0.15, 1.42, -1.0);
    this.camOffset = new THREE.Vector3();
    this.lookOffset = new THREE.Vector3();
    this.camera.position.copy(this.camBase);
    this.focusBase = 6.15;
    this.postProfile = {
      exposure: 1.1,
      bloom: { strength: 0.5, radius: 0.72, threshold: 0.78 },
      dof: { focus: this.focusBase, range: 2.4, maxBlur: 7, near: 1.4 },
      grade: {
        saturation: 0.84,
        contrast: 1.07,
        brightness: -0.005,
        shadowTint: [0.86, 0.94, 1.08],
        highlightTint: [1.1, 1.0, 0.86],
        lift: [0.022, 0.02, 0.024],
        vignette: 0.5,
        vignetteSoft: 0.98,
        grain: 0.065,
        ca: 0.0022,
      },
    };
    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
    this.musicOn = true;
    this.tvMode = 0;
    this.lightningT = 12 + Math.random() * 10;
    this.flash = 0;
    this.lineIdx = 0;
    this.pushIn = 0;
  }

  async init(progress) {
    const g = this.game;
    await g.assets.loadFonts();
    await g.assets.ensureGlyphs('時間異常觀測記錄第七號檔案絕對機密');
    progress(0.1);
    this.room = buildLobbyRoom(this.scene, g.assets);
    progress(0.5);

    // environment reflections (subtle)
    const pmrem = new THREE.PMREMGenerator(g.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.16;
    this.scene.background = new THREE.Color(0x0e0d0c);

    this._lights();
    progress(0.65);

    // archivist character
    this.archivist = new Humanoid(ARCHIVIST_CFG, { ppm: 470, scale: 1.06, rimColor: 0xa9c4dc, rimStrength: 0.38, blobRadius: 0.55, blobOpacity: 0.6 });
    this.archivist.root.position.set(-0.42, 0, -0.35);
    this.archivist.setFacing(1);
    this.archivist.rig.setRimSide(-1, 0.45);
    const u = this.archivist.rig.material.uniforms;
    u.ambient.value.setRGB(0.6, 0.57, 0.56);
    u.keyColor.value.set(0xffb070);
    u.keyAmount.value = 0.42;
    u.keySide.value = 1;
    u.keyWidth.value = 0.22;
    this.scene.add(this.archivist.root);
    this.room.interactables.push({ object: this.archivist.root, id: 'archivist', label: '<b>交談</b>TALK', mode: 'talk' });
    progress(0.8);

    // dust in the lamp + window light
    this.dust = createDust({ count: 360, box: [[-2.6, 0.2, -2.3], [3.2, 3.4, 1.2]], size: 0.022, opacity: 0.55, speed: 0.12, color: 0xffe6c0 });
    this.scene.add(this.dust);
    this.dustCool = createDust({ count: 160, box: [[-1.9, 0.9, -2.3], [0.8, 3.6, -0.4]], size: 0.018, opacity: 0.5, speed: 0.1, color: 0xc8dcf0 });
    this.scene.add(this.dustCool);

    // window light shafts (soft, camera-facing around their own axis)
    const dir = new THREE.Vector3(2.4, -5.2, 7.6).normalize();
    this.shafts = [];
    [[-1.35, 3.5, 0.5], [-0.75, 3.2, 0.7], [-0.15, 3.4, 0.45], [0.25, 2.2, 0.35]].forEach(([x, y, w], i) => {
      const s = createShaft({ from: new THREE.Vector3(x, y, -2.52), dir, length: 5.2, width: w, color: 0x9ab8d8, opacity: 0.075 - i * 0.008 });
      this.scene.add(s);
      this.shafts.push(s);
    });
    // lamp cone glow
    const cone = createShaft({ from: new THREE.Vector3(0.95, 1.2, -1.2), dir: new THREE.Vector3(0.25, -1, 0.15), length: 0.5, width: 0.9, color: 0xffc080, opacity: 0.16 });
    this.scene.add(cone);
    this.shafts.push(cone);

    // ID-card portrait rendered from the actual character
    this.portraitURL = this._renderPortrait();
    progress(1);
  }

  _lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x55677a, 0x2a1a12, 0.9));

    const win = new THREE.DirectionalLight(0x9db4d0, 2.6);
    win.position.set(-2.2, 5.6, -8.5);
    win.target.position.set(0.8, 0, 0.6);
    win.castShadow = true;
    win.shadow.camera.left = -5;
    win.shadow.camera.right = 5;
    win.shadow.camera.top = 5;
    win.shadow.camera.bottom = -5;
    win.shadow.camera.near = 2;
    win.shadow.camera.far = 20;
    win.shadow.bias = -0.0004;
    win.shadow.normalBias = 0.025;
    win.shadow.radius = 3;
    s.add(win, win.target);
    this.winLight = win;
    this.shadowLights.push({ light: win, high: 2048, low: 1024 });

    const lamp = new THREE.SpotLight(0xffb468, 26, 7, 0.95, 0.75, 1.6);
    lamp.position.set(0.95, 1.24, -1.2);
    lamp.target.position.set(1.45, 0.78, -0.85);
    lamp.castShadow = true;
    lamp.shadow.bias = -0.0008;
    lamp.shadow.normalBias = 0.02;
    lamp.shadow.radius = 4;
    s.add(lamp, lamp.target);
    this.lamp = lamp;
    this.shadowLights.push({ light: lamp, high: 1024, low: 512 });

    const spill = new THREE.PointLight(0xff9a50, 3.2, 6, 1.8);
    spill.position.set(0.95, 1.1, -0.9);
    s.add(spill);
    this.spill = spill;

    const sconce = new THREE.PointLight(0xffa060, 2.2, 5, 1.8);
    sconce.position.set(-1.75, 2.55, -2.05);
    s.add(sconce);

    this.tvLight = new THREE.PointLight(0x8ab0d0, 1.4, 3.5, 2);
    this.tvLight.position.set(3.1, 0.9, -0.1);
    s.add(this.tvLight);

    const fill = new THREE.PointLight(0xffd0a8, 9, 14, 1.5);
    fill.position.set(-1.2, 2.4, 3.8);
    s.add(fill);
    this.fill = fill;

    this.hoverLight = new THREE.PointLight(0xffd8a0, 0, 1.6, 2);
    s.add(this.hoverLight);
  }

  _renderPortrait() {
    const r = this.game.renderer;
    const W = 300;
    const H = 380;
    const rt = new THREE.WebGLRenderTarget(W, H);
    const cam = new THREE.PerspectiveCamera(22, W / H, 0.1, 20);
    const a = this.archivist.root;
    const head = new THREE.Vector3(a.position.x, 1.46, a.position.z);
    cam.position.set(head.x + 0.05, head.y, head.z + 1.55);
    cam.lookAt(head);
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x8c8272);
    this.archivist.update(0.016);
    const clone = this.archivist.rig.root.clone();
    clone.position.copy(a.position);
    sc.add(clone);
    const prevTM = r.toneMapping;
    r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(rt);
    r.render(sc, cam);
    const px = new Uint8Array(W * H * 4);
    r.readRenderTargetPixels(rt, 0, 0, W, H, px);
    r.setRenderTarget(null);
    r.toneMapping = prevTM;
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const si = ((H - 1 - y) * W + x) * 4;
        const di = (y * W + x) * 4;
        // renderer outputs linear here; approximate sRGB
        img.data[di] = Math.pow(px[si] / 255, 1 / 2.2) * 255;
        img.data[di + 1] = Math.pow(px[si + 1] / 255, 1 / 2.2) * 255;
        img.data[di + 2] = Math.pow(px[si + 2] / 255, 1 / 2.2) * 255;
        img.data[di + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // studio vignette backdrop
    const gr = g.createRadialGradient(W * 0.45, H * 0.35, 20, W / 2, H / 2, W * 0.8);
    gr.addColorStop(0, 'rgba(255,240,210,0.12)');
    gr.addColorStop(1, 'rgba(20,10,5,0.4)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    toneAndAge(g, W, H, { sepia: 0.85, seed: 3, contrast: 1.12, burn: 0.5 });
    return c.toDataURL('image/jpeg', 0.9);
  }

  enter() {
    const g = this.game;
    this.ui = new LobbyUI(g, this);
    g.ui.setHUD(this.ui.el);
    g.audio.playMusic(this.musicOn ? 'lobby' : null);
    g.audio.setAmbience('lobby');
    this.unsubDown = g.input.on('mousedown', (code) => {
      if (code === 'Mouse0' && this.hovered && !g.ui.hasModal && !g.transitions.busy && !g.dialogue.active) this._activate(this.hovered);
    });
    if (!this.params.fromTitle) {
      this.ui.intro(0.2);
      this._camIntro(0.4);
    }
  }

  /** Called by GameManager after the title curtain opens. */
  playIntro() {
    this.ui.intro(0.55);
    this._camIntro(1.6);
  }

  afterReveal() {}

  _camIntro(dur) {
    this.introT = { k: 1 };
    gsap.fromTo(this.introT, { k: 1 }, { k: 0, duration: dur + 1.4, ease: 'power3.out' });
  }

  exit() {
    super.exit();
    if (this.unsubDown) this.unsubDown();
    this.game.cursor.set('default');
    if (this.ui) this.ui.destroy();
  }

  onTransitionOut() {
    this.hovered = null;
    this.hoverLight.intensity = 0;
    this.game.cursor.set('default');
  }

  onEscape() {
    this.ui.openSettings();
  }

  // ─────────────────────────── interactions ───────────────────────────

  _pick() {
    const g = this.game;
    if (g.ui.hasModal || g.transitions.busy || g.dialogue.active || g.cursor.domHover > 0) return null;
    const m = g.input.mouse;
    this.raycaster.setFromCamera({ x: m.nx, y: m.ny }, this.camera);
    let best = null;
    let bestD = Infinity;
    for (const it of this.room.interactables) {
      const hits = this.raycaster.intersectObject(it.object, true);
      if (hits.length && hits[0].distance < bestD) {
        bestD = hits[0].distance;
        best = it;
      }
    }
    return best;
  }

  _activate(it) {
    const g = this.game;
    const A = this.room.anim;
    switch (it.id) {
      case 'letters':
        g.audio.play('click_paper');
        this.ui.openLetters();
        break;
      case 'cabinet':
        g.audio.play('click_folder');
        this.ui.openCollection();
        break;
      case 'board':
        g.audio.play('click_photo');
        this.ui.openArchives();
        break;
      case 'gramophone': {
        this.musicOn = !this.musicOn;
        g.audio.play('record_scratch');
        g.audio.playMusic(this.musicOn ? 'lobby' : null, this.musicOn ? 1.2 : 0.4);
        gsap.to(A.toneArm.rotation, { y: this.musicOn ? 0 : -0.5, x: this.musicOn ? 0 : -0.12, duration: 0.6, ease: 'power2.inOut' });
        g.ui.toast(this.musicOn ? '唱片重新轉動' : '唱針已抬起', this.musicOn ? 'NOCTURNE IN RAIN · PLAYING' : 'RECORD PAUSED', { tone: 'dark', sfx: 'hover_tick' });
        break;
      }
      case 'radio': {
        this.radioCh = ((this.radioCh || 0) + 1) % 3;
        g.audio.play('radio_tune');
        gsap.fromTo(A.radioDial.color, { r: 1, g: 1, b: 1 }, { r: 1, g: 0.72, b: 0.38, duration: 0.8 });
        const ch = [
          ['lobby', '頻道一 · 雨夜爵士', 'WCHR 1929 · RAINY JAZZ'],
          ['archive', '頻道二 · 八音盒夜曲', 'WCHR 1929 · MUSIC BOX'],
          ['campus', '頻道三 · 放學後', 'WCHR 1929 · AFTER SCHOOL'],
        ][this.radioCh];
        this.musicOn = true;
        g.audio.playMusic(ch[0], 1.0);
        gsap.to(A.toneArm.rotation, { y: 0, x: 0, duration: 0.4 });
        g.ui.toast(ch[1], ch[2], { tone: 'dark', sfx: 'hover_tick' });
        break;
      }
      case 'clock': {
        const d = new Date();
        g.audio.play('confirm');
        g.ui.toast(`現在時刻 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, 'THE CLOCK NEVER LIES · 時鐘從不說謊', { tone: 'ivory', sfx: 'hover_tick' });
        gsap.fromTo(A.clock.pend.rotation, { z: 0.35 }, { z: 0, duration: 1.4, ease: 'elastic.out(1, 0.3)' });
        break;
      }
      case 'tv':
        this.tvMode = (this.tvMode + 1) % 3;
        g.audio.play('click_mech');
        g.ui.toast(['訊號雜訊', '測試卡', '關閉'][this.tvMode], ['STATIC', 'TEST CARD', 'OFF'][this.tvMode], { tone: 'dark', sfx: 'hover_tick' });
        break;
      case 'archivist':
        this._talk();
        break;
      default:
        break;
    }
  }

  async _talk() {
    const g = this.game;
    const lines = ARCHIVIST_LINES[this.lineIdx % ARCHIVIST_LINES.length];
    this.lineIdx++;
    this.talkFocus = true;
    this.archivist.play('nod');
    // let the conversation own the frame: the collage steps back
    if (this.ui) gsap.to(this.ui.el, { opacity: 0.18, duration: 0.5, ease: 'power2.out' });
    await g.dialogue.start(
      lines.map((l) => ({ who: '檔案管理員', whoEn: 'THE ARCHIVIST', text: l.text, pitch: 700 })),
      {
        onLine: () => this.archivist.setTalking(true),
        onEnd: () => {
          this.archivist.setTalking(false);
          this.talkFocus = false;
          if (this.ui) gsap.to(this.ui.el, { opacity: 1, duration: 0.6, ease: 'power2.out' });
        },
      },
    );
  }

  lightning() {
    this.flash = 1;
    this.game.audio.play('thunder');
  }

  // ─────────────────────────── per-frame ───────────────────────────

  update(time) {
    const dt = time.realDt;
    const t = time.elapsed;
    const g = this.game;
    const A = this.room.anim;
    const s = g.save.settings;
    const motion = s.motionEffect ? 1 : 0.3;
    const sens = s.mouseSensitivity;
    const m = g.input.mouse;

    // camera parallax + intro dolly + dialogue push-in
    const intro = this.introT ? this.introT.k : 0;
    const talkK = (this.talkFocus ? 1 : 0);
    this.pushIn += (talkK - this.pushIn) * (1 - Math.exp(-dt * 3));
    const tx = m.nx * 0.2 * sens * motion;
    const ty = m.ny * 0.09 * sens * motion;
    this.camOffset.x += (tx - this.camOffset.x) * (1 - Math.exp(-dt * 3.2));
    this.camOffset.y += (ty - this.camOffset.y) * (1 - Math.exp(-dt * 3.2));
    const cam = this.camera;
    cam.position.set(
      this.camBase.x + this.camOffset.x - this.pushIn * 0.6 - intro * 0.8 + Math.sin(t * 0.25) * 0.02 * motion,
      this.camBase.y + this.camOffset.y + intro * 0.55 - this.pushIn * 0.05 + Math.sin(t * 0.33) * 0.012 * motion,
      this.camBase.z - this.pushIn * 1.4 + intro * 2.2,
    );
    cam.position.add(g.shakeOffset);
    this.lookOffset.set(-this.camOffset.x * 0.35 - this.pushIn * 0.5, -this.camOffset.y * 0.3 + this.pushIn * 0.02, 0);
    cam.lookAt(this.camTarget.clone().add(this.lookOffset));
    const focus = this.focusBase - this.pushIn * 1.45 + intro * 2.2;
    g.post.focusOverride = focus;
    g.post.target.dof.range = 2.4 - this.pushIn * 1.2;

    // archivist
    const a = this.archivist;
    a.lookAt(this.talkFocus ? 0.4 : Math.max(-1, Math.min(1, m.nx * 1.4 + 0.2)));
    a.update(dt);
    const au = a.rig.material.uniforms;
    au.time.value = t;
    au.keyCenter.value.copy(a.root.position);

    // world life
    for (const sh of this.shafts) orientShaft(sh, cam);
    A.glass.uniforms.time.value = t;
    A.glass.uniforms.parallax.value.set(-this.camOffset.x * 0.04, -this.camOffset.y * 0.04);
    this.dust.material.uniforms.time.value = t;
    this.dustCool.material.uniforms.time.value = t;
    if (this.musicOn) A.record.rotation.y -= dt * 3.5;
    const d = new Date();
    const secs = d.getSeconds() + d.getMilliseconds() / 1000;
    A.clock.s.rotation.z = -(Math.floor(secs) / 60) * Math.PI * 2 - Math.max(0, 1 - (secs % 1) * 8) * 0.02;
    A.clock.m.rotation.z = -((d.getMinutes() + secs / 60) / 60) * Math.PI * 2;
    A.clock.h.rotation.z = -(((d.getHours() % 12) + d.getMinutes() / 60) / 12) * Math.PI * 2;
    A.clock.pend.rotation.z += (Math.sin(t * Math.PI) * 0.09 - A.clock.pend.rotation.z) * Math.min(1, dt * 6);
    for (const c of A.curtains) {
      const pos = c.geometry.attributes.position;
      const base = c.geometry.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const fall = (1.95 - y) / 3.9;
        const fold = Math.sin(x * 22 + c.userData.side) * 0.045 + Math.sin(x * 9) * 0.02;
        const sway = Math.sin(t * 0.8 + x * 3 + y * 0.8) * 0.018 * fall * motion;
        pos.setZ(i, fold + sway);
        pos.setX(i, x * (1 - fall * 0.25 * (c.userData.side * x < 0 ? 0 : 0)) + sway * 0.5);
      }
      pos.needsUpdate = true;
      c.geometry.computeVertexNormals();
    }
    for (const l of A.leaves) {
      l.rotation.x = l.userData.base.x + Math.sin(t * 0.9 + l.userData.ph) * 0.03 * motion;
      l.rotation.z = l.userData.base.z + Math.sin(t * 0.6 + l.userData.ph * 2) * 0.02 * motion;
    }
    const sandK = (t * 0.01) % 1;
    A.sand.top.scale.setScalar(1 - sandK * 0.6);
    A.sand.bot.scale.setScalar(0.4 + sandK * 0.6);

    // TV
    this._tvAcc = (this._tvAcc || 0) + dt;
    if (this._tvAcc > 1 / 20) {
      this._tvAcc = 0;
      if (this.tvMode === 0) {
        drawTV(A.tv.canvas, t);
        A.tv.tex.needsUpdate = true;
        A.tv.mat.color.setHex(0x9ab0c0);
        this.tvLight.intensity = 1.1 + Math.random() * 0.8;
      } else if (this.tvMode === 1) {
        const tg = A.tv.canvas.g;
        const cols = ['#d8d4c8', '#d8c848', '#48c8c8', '#48c848', '#c848c8', '#c84848', '#4848c8'];
        cols.forEach((cc, i) => {
          tg.fillStyle = cc;
          tg.fillRect((i * 256) / 7, 0, 256 / 7 + 1, 140);
        });
        tg.fillStyle = '#101010';
        tg.fillRect(0, 140, 256, 52);
        tg.fillStyle = '#e8e4d8';
        tg.font = '600 20px "Barlow Condensed"';
        tg.textAlign = 'center';
        tg.fillText('CHRONO BROADCAST · 1929', 128, 172);
        A.tv.tex.needsUpdate = true;
        A.tv.mat.color.setHex(0x8a9aa0);
        this.tvLight.intensity = 1.2;
      } else {
        A.tv.mat.color.setHex(0x0a0c0c);
        this.tvLight.intensity = 0;
      }
    }

    // lamp breathing flicker
    const fl = 1 + Math.sin(t * 13) * 0.01 + (Math.random() - 0.5) * 0.015;
    this.lamp.intensity = 26 * fl;
    this.spill.intensity = 3.2 * fl;

    // lightning
    this.lightningT -= dt;
    if (this.lightningT <= 0) {
      this.lightningT = 18 + Math.random() * 22;
      this.flash = 1;
      setTimeout(() => this.game.audio.play('thunder'), 700 + Math.random() * 900);
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.4);
      const f = this.flash > 0.6 ? 1 : this.flash > 0.45 ? 0.2 : this.flash > 0.3 ? 0.8 : this.flash * 0.6;
      this.winLight.intensity = 2.6 + f * 9;
      A.glass.uniforms.flash.value = f * 0.9;
      for (const sh of this.shafts) sh.material.color.setScalar(1 + f * 2);
    }

    // hover picking
    const it = m.moved || this._forcePick ? this._pick() : this.hovered && !g.ui.hasModal && !g.dialogue.active && g.cursor.domHover === 0 ? this.hovered : null;
    this._forcePick = false;
    if (it !== this.hovered) {
      this.hovered = it;
      if (it) {
        g.cursor.set(it.mode || 'pick', it.label);
        g.audio.play('hover_tick');
        const box = new THREE.Box3().setFromObject(it.object);
        const c = box.getCenter(new THREE.Vector3());
        this.hoverLight.position.set(c.x, c.y + 0.25, c.z + 0.6);
      } else g.cursor.set('default');
    }
    const hk = this.hovered ? 1 : 0;
    this.hoverLight.intensity += (hk * 2.4 - this.hoverLight.intensity) * (1 - Math.exp(-dt * 10));
    if (this.ui) this.ui.update(dt);
  }

  dispose() {
    super.dispose();
    if (this.envRT) this.envRT.dispose();
    this.archivist.dispose();
  }
}
