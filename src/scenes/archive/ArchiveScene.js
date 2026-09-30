import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BaseScene } from '../BaseScene.js';
import * as A from './archiveArt.js';
import { woodFloor, leatherTexture, clockFace } from '../lobby/lobbyTextures.js';
import { paintPhoto, paintMap } from '../../art/illustrations.js';
import { toTexture } from '../../art/painter.js';
import { createDust } from '../../fx/Dust.js';
import { ICON } from '../../ui/icons.js';
import { emblemSVG } from '../../ui/emblem.js';

const FILES = {
  campus: {
    no: '01',
    zh: '校園異聞',
    en: 'Campus Anomaly',
    genre: ['2.5D 劇情探索', 'STORY ADVENTURE', '動作戰鬥'],
    desc: '暮見高校,放學後的十七點。夕陽把走廊的影子拉得很長,一名二年級學生消失了。向同學打聽、在教室裡搜尋線索,前往圖書館——在時間裂開的那一刻,影子會動起來。',
    meta: [['地點', 'KUREMI HIGH'], ['時段', '16:30 — 17:30'], ['區域', '走廊 · 教室 · 圖書館']],
    controls: 'A/D 移動 · E 互動 · 左鍵/J 攻擊 · Shift 閃避 · Space 時間裂痕',
  },
  forest: {
    no: '02',
    zh: '黑森林試煉',
    en: 'Trial of the Black Forest',
    genre: ['2.5D 動作冒險', 'ACTION ADVENTURE', '俯視角'],
    desc: '月亮忘記升起的夜晚,史萊姆偷走了三顆月光種子。帶上短劍穿過森林小徑、祭壇與空地,打開史萊姆巢穴,擊倒紫色的精英史萊姆,把種子還給森林精靈。',
    meta: [['地點', 'THE BLACK WOOD'], ['時段', 'MOONLESS NIGHT'], ['區域', '入口 · 祭壇 · 空地 · 巢穴']],
    controls: 'WASD 移動 · 左鍵 三段攻擊 · 右鍵 重擊 · Shift 翻滾 · Space 黑暗爆發',
  },
};

/**
 * Mini Game Archive — files, photos, tapes and books scattered on a desk.
 */
export class ArchiveScene extends BaseScene {
  constructor(game, params) {
    super(game, params);
    this.camera.fov = 30;
    this.camBase = new THREE.Vector3(0, 7.6, 4.6);
    this.camLook = new THREE.Vector3(0, 0, 0.35);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camLook);
    this.postProfile = {
      exposure: 1.08,
      bloom: { strength: 0.4, radius: 0.6, threshold: 0.8 },
      dof: { focus: 8.7, range: 2.2, maxBlur: 6, near: 1.2 },
      grade: { saturation: 0.86, contrast: 1.08, shadowTint: [0.88, 0.94, 1.06], highlightTint: [1.1, 1.0, 0.86], lift: [0.02, 0.018, 0.02], vignette: 0.55, vignetteSoft: 0.95, grain: 0.06, ca: 0.002 },
    };
    this.items = [];
    this.hovered = null;
    this.selected = null;
    this.raycaster = new THREE.Raycaster();
    this.cam = new THREE.Vector2();
  }

  async init(progress) {
    const g = this.game;
    await g.assets.loadFonts();
    await g.assets.ensureGlyphs('校園異聞黑森林試煉');
    const s = this.scene;
    s.background = new THREE.Color(0x0c0b0a);
    const pmrem = new THREE.PMREMGenerator(g.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    s.environment = this.envRT.texture;
    s.environmentIntensity = 0.12;

    // desk surface
    const wood = woodFloor(1024, 1024, 7);
    wood.repeat.set(2, 1.2);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 7), new THREE.MeshStandardMaterial({ map: wood, color: 0xa87a60, roughness: 0.4 }));
    desk.position.y = -0.15;
    desk.receiveShadow = true;
    s.add(desk);
    const blotter = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.6), new THREE.MeshStandardMaterial({ map: leatherTexture('#253c31', 1024, 1024, 5), roughness: 0.65 }));
    blotter.rotation.x = -Math.PI / 2;
    blotter.position.set(-0.2, 0.002, 0.25);
    blotter.receiveShadow = true;
    s.add(blotter);
    progress(0.15);

    // lights: warm desk lamp from the upper left, cool window fill
    s.add(new THREE.HemisphereLight(0x6a7a8a, 0x2a1a10, 0.7));
    const key = new THREE.SpotLight(0xffc27a, 75, 20, 0.75, 0.9, 1.6);
    key.position.set(-3.2, 6.5, -1.2);
    key.target.position.set(0.2, 0, 0.4);
    key.castShadow = true;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    s.add(key, key.target);
    this.key = key;
    this.shadowLights.push({ light: key, high: 2048, low: 1024 });
    const rim = new THREE.DirectionalLight(0x8aa4c8, 0.9);
    rim.position.set(5, 4, -3);
    s.add(rim);

    const mk = (geo, mat, pos, rot = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      m.rotation.set(...rot);
      m.castShadow = true;
      m.receiveShadow = true;
      s.add(m);
      return m;
    };
    const paperMat = (tex, extra = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, ...extra });

    // ── 01 campus folder
    const folder = new THREE.Group();
    const fBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 2.0), new THREE.MeshStandardMaterial({ color: 0xb8955e, roughness: 0.9 }));
    fBack.castShadow = fBack.receiveShadow = true;
    folder.add(fBack);
    for (let i = 0; i < 3; i++) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.006, 1.92), new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.95 }));
      sheet.position.set(0.03 + i * 0.012, 0.014 + i * 0.006, -0.02 + i * 0.01);
      sheet.rotation.y = (i - 1) * 0.02;
      sheet.castShadow = sheet.receiveShadow = true;
      folder.add(sheet);
    }
    const fCover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 2.0), [paperMat(null, { color: 0xb8955e }), paperMat(null, { color: 0xb8955e }), paperMat(A.folderCover()), paperMat(null, { color: 0xa88550 }), paperMat(null, { color: 0xb8955e }), paperMat(null, { color: 0xb8955e })]);
    fCover.position.y = 0.04;
    fCover.castShadow = fCover.receiveShadow = true;
    folder.add(fCover);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.16), new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.9 }));
    tab.position.set(-0.35, 0.04, -1.06);
    folder.add(tab);
    folder.position.set(-1.35, 0.03, 0.35);
    folder.rotation.y = 0.14;
    s.add(folder);
    this._addItem(folder, 'campus', 0.14);
    progress(0.35);

    // ── 02 forest storybook
    const book = new THREE.Group();
    const cover = A.bookCover();
    const cloth = new THREE.MeshStandardMaterial({ color: 0x1f3a30, roughness: 0.75 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xe0d4b8, roughness: 0.95 });
    const bBody = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.22, 1.8, 2, 0.02), [pages, cloth, cloth, cloth, pages, pages]);
    bBody.castShadow = bBody.receiveShadow = true;
    book.add(bBody);
    const bTop = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.78), new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6, metalness: 0.05 }));
    bTop.rotation.x = -Math.PI / 2;
    bTop.position.y = 0.112;
    bTop.receiveShadow = true;
    book.add(bTop);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 16, 1, false, 0, Math.PI), cloth);
    spine.rotation.x = Math.PI / 2;
    spine.rotation.z = Math.PI / 2;
    spine.position.x = -0.68;
    book.add(spine);
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x8a1f26, roughness: 0.6, side: THREE.DoubleSide }));
    ribbon.rotation.x = -Math.PI / 2 + 0.1;
    ribbon.position.set(0.3, 0.02, 1.05);
    book.add(ribbon);
    book.position.set(0.95, 0.11, 0.1);
    book.rotation.y = -0.2;
    s.add(book);
    this._addItem(book, 'forest', -0.2);
    progress(0.55);

    // ── sealed items
    const env = mk(new THREE.BoxGeometry(1.3, 0.012, 0.87), [paperMat(null, { color: 0xddd0b0 }), paperMat(null, { color: 0xddd0b0 }), paperMat(A.envelopeCover('FILE 03 · SEALED', 3)), paperMat(null, { color: 0xc8bb9a }), paperMat(null, { color: 0xddd0b0 }), paperMat(null, { color: 0xddd0b0 })], [2.55, 0.01, 1.05], [0, 0.32, 0]);
    this._addItem(env, 'sealed3', 0.32);
    const cas = new THREE.Group();
    const casBody = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.1, 0.5, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.4 }));
    casBody.castShadow = casBody.receiveShadow = true;
    cas.add(casBody);
    const casLbl = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.47), new THREE.MeshStandardMaterial({ map: A.cassetteLabel(), roughness: 0.6 }));
    casLbl.rotation.x = -Math.PI / 2;
    casLbl.position.y = 0.051;
    cas.add(casLbl);
    cas.position.set(-3.05, 0.05, 1.25);
    cas.rotation.y = -0.4;
    s.add(cas);
    this._addItem(cas, 'sealed4', -0.4);

    // ── decor (not selectable): index card, photos, tickets, map, pen, cup, watch, film can
    mk(new THREE.BoxGeometry(1.25, 0.006, 0.78), [0, 0, 0, 0, 0, 0].map((_, i) => (i === 2 ? paperMat(A.indexCard()) : paperMat(null, { color: 0xefe6d0 }))), [-0.2, 0.005, -1.15], [0, -0.05, 0]);
    const photos = [
      ['portrait', -2.9, -0.55, 0.3, 'the keeper, 1921'],
      ['sea', 2.4, -0.7, -0.25, 'harbour, dawn'],
      ['street', -2.35, -1.3, 0.55, 'rue des heures'],
    ];
    photos.forEach(([k, x, z, r, cap], i) => {
      const img = paintPhoto(k, 460, 460, 30 + i);
      mk(new THREE.BoxGeometry(0.62, 0.005, 0.74), [0, 0, 0, 0, 0, 0].map((_, j) => (j === 2 ? paperMat(A.photoPrint(img, cap)) : paperMat(null, { color: 0xf2ece0 }))), [x, 0.012 + i * 0.004, z], [0, r, 0]);
    });
    mk(new THREE.BoxGeometry(0.72, 0.004, 0.31), [0, 0, 0, 0, 0, 0].map((_, j) => (j === 2 ? paperMat(A.ticketStub('Nocturne', '#7b2530', 1)) : paperMat(null, { color: 0x7b2530 }))), [1.65, 0.02, 1.45], [0, 0.5, 0]);
    mk(new THREE.BoxGeometry(0.72, 0.004, 0.31), [0, 0, 0, 0, 0, 0].map((_, j) => (j === 2 ? paperMat(A.ticketStub('Matinée', '#2a4a3a', 2)) : paperMat(null, { color: 0x2a4a3a }))), [1.95, 0.016, 1.62], [0, 0.2, 0]);
    mk(new THREE.BoxGeometry(1.4, 0.004, 1.0), [0, 0, 0, 0, 0, 0].map((_, j) => (j === 2 ? paperMat(toTexture(paintMap(700, 500, 11))) : paperMat(null, { color: 0xd9c9a2 }))), [2.35, 0.003, -1.55], [0, -0.12, 0]);
    mk(new THREE.BoxGeometry(0.9, 0.004, 1.05), [0, 0, 0, 0, 0, 0].map((_, j) => (j === 2 ? paperMat(A.notePaper(4)) : paperMat(null, { color: 0xe9dfc5 }))), [-1.0, 0.004, 1.55], [0, 0.35, 0]);
    // fountain pen
    const pen = new THREE.Group();
    const penBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0x151414, roughness: 0.2, metalness: 0.3 }));
    penBody.rotation.z = Math.PI / 2;
    pen.add(penBody);
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 1, roughness: 0.3 }));
    nib.rotation.z = -Math.PI / 2;
    nib.position.x = 0.53;
    pen.add(nib);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.05, 16), nib.material);
    band.rotation.z = Math.PI / 2;
    band.position.x = -0.1;
    pen.add(band);
    pen.traverse((o) => (o.castShadow = true));
    pen.position.set(0.1, 0.05, 1.35);
    pen.rotation.y = 0.35;
    s.add(pen);
    // coffee cup + saucer
    const cup = new THREE.Group();
    const porcelain = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.25 });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.04, 40), porcelain);
    cup.add(saucer);
    const cupBody = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0), new THREE.Vector2(0.24, 0.1), new THREE.Vector2(0.26, 0.3), new THREE.Vector2(0.25, 0.3)], 32), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.25, side: THREE.DoubleSide }));
    cupBody.position.y = 0.02;
    cup.add(cupBody);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.235, 32), new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.08 }));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.27;
    cup.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI * 1.2), porcelain);
    handle.position.set(0.27, 0.17, 0);
    handle.rotation.z = -0.6;
    cup.add(handle);
    cup.traverse((o) => (o.castShadow = o.receiveShadow = true));
    cup.position.set(3.35, 0, -0.35);
    s.add(cup);
    this.coffee = coffee;
    // pocket watch
    const watch = new THREE.Group();
    const wCase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40), new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 1, roughness: 0.28 }));
    watch.add(wCase);
    const wFace = new THREE.Mesh(new THREE.CircleGeometry(0.26, 40), new THREE.MeshStandardMaterial({ map: clockFace(256), roughness: 0.5 }));
    wFace.rotation.x = -Math.PI / 2;
    wFace.position.y = 0.032;
    watch.add(wFace);
    const wHand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 0.2), new THREE.MeshStandardMaterial({ color: 0x151414 }));
    wHand.position.set(0, 0.036, -0.08);
    const wPivot = new THREE.Group();
    wPivot.position.y = 0;
    wPivot.add(wHand);
    watch.add(wPivot);
    const chainPts = [];
    for (let i = 0; i < 20; i++) chainPts.push(new THREE.Vector3(-0.3 - i * 0.07, 0.01, Math.sin(i * 0.5) * 0.2 - i * 0.02));
    watch.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 60, 0.012, 5), wCase.material));
    watch.traverse((o) => (o.castShadow = o.receiveShadow = true));
    watch.position.set(-3.2, 0.03, -1.45);
    watch.rotation.y = 0.6;
    s.add(watch);
    this.watchHand = wPivot;
    // film canister
    const can = mk(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0x5a5854, metalness: 0.8, roughness: 0.35 }), [3.3, 0.06, 0.95]);
    void can;
    progress(0.75);

    // dust in the lamp beam
    this.dust = createDust({ count: 220, box: [[-4, 0.2, -2.5], [4, 4, 2.5]], size: 0.03, opacity: 0.5, speed: 0.1, color: 0xffe2b8 });
    s.add(this.dust);
    progress(1);
  }

  _addItem(obj, id, baseRot) {
    obj.userData.base = { pos: obj.position.clone(), rotY: baseRot, rotX: obj.rotation.x, rotZ: obj.rotation.z };
    obj.userData.lift = 0;
    obj.userData.id = id;
    this.items.push(obj);
  }

  enter() {
    const g = this.game;
    g.audio.playMusic('archive');
    g.audio.setAmbience('archive');
    this._buildHUD();
    this.unsub = g.input.on('mousedown', (code) => {
      if (code !== 'Mouse0' || g.ui.hasModal || g.transitions.busy) return;
      if (this.selected) {
        if (!this.hovered || this.hovered !== this.selected) this.deselect();
        return;
      }
      if (this.hovered) this.select(this.hovered);
    });
    // items settle onto the desk
    this.items.forEach((it, i) => {
      gsap.from(it.position, { y: it.position.y + 1.4, duration: 0.9, delay: 0.25 + i * 0.09, ease: 'bounce.out' });
      gsap.delayedCall(0.55 + i * 0.09, () => g.audio.play(i % 2 ? 'hover_paper' : 'click_paper'));
    });
  }

  exit() {
    super.exit();
    if (this.unsub) this.unsub();
    this.game.cursor.set('default');
  }

  _buildHUD() {
    const g = this.game;
    const el = document.createElement('div');
    el.className = 'arc';
    el.innerHTML = `
      <header class="arc-head">
        <div class="arc-head__meta t-cond"><span>INDEX CARD · No.0001</span><i></i><span>04 FILES</span></div>
        <div class="arc-head__title t-title">Mini Game Archive</div>
        <div class="arc-head__zh">小遊戲檔案庫</div>
      </header>
      <div class="arc-back-slot"></div>
      <div class="arc-hint t-cond"><span class="keycap">◎</span>SELECT A FILE ON THE DESK · 選擇桌上的檔案 &nbsp;&nbsp;<span class="keycap">ESC</span>BACK · 返回</div>
      <aside class="arc-card">
        <div class="arc-card__paper paper--cream">
          <div class="arc-card__edge"></div>
          <div class="arc-card__top t-cond"><span>FILE</span><span class="arc-card__dots"></span><span class="arc-card__genre"></span></div>
          <div class="arc-card__no t-title"></div>
          <div class="arc-card__zh"></div>
          <div class="arc-card__en t-title"></div>
          <div class="rule--double"></div>
          <div class="arc-card__tags"></div>
          <p class="arc-card__desc"></p>
          <div class="arc-card__meta"></div>
          <div class="arc-card__ctl t-cond"></div>
          <div class="arc-card__btns"></div>
          <div class="stamp arc-card__stamp">DECLASSIFIED</div>
        </div>
      </aside>
      <div class="arc-sealed t-cond"><div class="arc-sealed__in paper--dark"><span class="arc-sealed__ico">${ICON.lock}</span><span class="arc-sealed__zh">此檔案尚未解密</span><span>THIS FILE IS STILL SEALED · COMING SOON</span></div></div>
    `;
    const back = g.ui.button({
      className: 'arc-back',
      html: `<span class="arc-back__in"><span class="arc-back__ico ico-shift">${ICON.back}</span><span class="arc-back__txt"><span class="t-zh">返回檔案室</span><span class="t-cond ls">BACK TO THE ARCHIVE ROOM</span></span></span>`,
      sfx: ['hover_metal', 'cancel'],
      onClick: () => g.goLobby(),
    });
    el.querySelector('.arc-back-slot').appendChild(back);
    this.card = el.querySelector('.arc-card');
    const play = g.ui.button({
      className: 'arc-play',
      html: `<span class="arc-play__in paper--wine"><span class="arc-play__en t-cond ls">PLAY</span><span class="arc-play__zh">開始遊戲</span><span class="arc-play__emb">${emblemSVG({ size: 60, color: '#ecd9ab', rays: 18 })}</span></span>`,
      sfx: ['hover_ticket', 'click_ticket'],
      label: '<b>開始</b>PLAY',
      magnet: 6,
      scale: 1.04,
      onClick: () => {
        if (!this.selected) return;
        const r = play.getBoundingClientRect();
        g.playGame(this.selected.userData.id, r);
      },
    });
    const close = g.ui.button({
      className: 'doc-btn doc-btn--ghost',
      html: `<span class="doc-btn__in"><span class="t-cond ls">PUT BACK</span><span class="t-zh">放回</span></span>`,
      sfx: ['hover_tick', 'cancel'],
      onClick: () => this.deselect(),
    });
    el.querySelector('.arc-card__btns').append(close, play);
    g.ui.setHUD(el);
    this.hud = el;
    gsap.fromTo(el.querySelectorAll('.arc-head, .arc-back, .arc-hint'), { opacity: 0, y: -16 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, delay: 0.3, ease: 'power3.out' });
  }

  select(obj) {
    const id = obj.userData.id;
    const g = this.game;
    if (id.startsWith('sealed')) {
      g.audio.play('deny');
      const sealed = this.hud.querySelector('.arc-sealed');
      gsap.killTweensOf(sealed);
      gsap.fromTo(sealed, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
      gsap.to(sealed, { opacity: 0, delay: 1.8, duration: 0.4 });
      gsap.fromTo(obj.rotation, { z: obj.userData.base.rotZ + 0.08 }, { z: obj.userData.base.rotZ, duration: 0.6, ease: 'elastic.out(1.2, 0.3)' });
      return;
    }
    this.selected = obj;
    this.hovered = null;
    g.cursor.set('default');
    g.audio.play('open');
    g.audio.play('whoosh_big');
    // float toward camera
    const camDir = new THREE.Vector3().subVectors(this.camera.position, this.camLook).normalize();
    const target = this.camLook.clone().addScaledVector(camDir, 3.2);
    target.x -= 0.9;
    target.y -= 0.25;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), camDir);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), id === 'campus' ? 0.035 : -0.03);
    q.multiply(tilt);
    obj.userData.qBase = obj.quaternion.clone();
    const st = { t: 0 };
    const q0 = obj.quaternion.clone();
    const p0 = obj.position.clone();
    gsap.to(st, {
      t: 1,
      duration: 0.85,
      ease: 'power3.inOut',
      onUpdate: () => {
        obj.position.lerpVectors(p0, target, st.t);
        obj.position.y += Math.sin(st.t * Math.PI) * 0.4;
        obj.quaternion.slerpQuaternions(q0, q, st.t);
      },
    });
    this.focusTo = target.distanceTo(this.camera.position);
    // fill the card
    const F = FILES[id];
    const c = this.card;
    c.querySelector('.arc-card__no').textContent = F.no;
    c.querySelector('.arc-card__zh').textContent = F.zh;
    c.querySelector('.arc-card__en').textContent = F.en;
    c.querySelector('.arc-card__genre').textContent = F.genre[1];
    c.querySelector('.arc-card__tags').innerHTML = F.genre.map((t) => `<span>${t}</span>`).join('');
    c.querySelector('.arc-card__desc').textContent = F.desc;
    c.querySelector('.arc-card__meta').innerHTML = F.meta.map(([a, b]) => `<div><span class="t-zh">${a}</span><span class="t-cond">${b}</span></div>`).join('');
    const st2 = g.save.data.quests[id === 'campus' ? 'campus_missing' : 'forest_seeds'];
    c.querySelector('.arc-card__ctl').innerHTML = `<b>CONTROLS</b> ${F.controls}`;
    c.querySelector('.arc-card__stamp').textContent = st2?.status === 'complete' ? 'SOLVED · 已解決' : 'DECLASSIFIED';
    c.classList.add('is-on');
    gsap.fromTo(c, { x: 120, rotation: 4, opacity: 0 }, { x: 0, rotation: -1.2, opacity: 1, duration: 0.7, delay: 0.25, ease: 'expo.out' });
    gsap.fromTo(c.querySelectorAll('.arc-card__paper > *:not(.arc-card__edge)'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.035, delay: 0.4, duration: 0.4 });
    gsap.fromTo(c.querySelector('.arc-card__stamp'), { scale: 2, opacity: 0 }, { scale: 1, opacity: 0.75, duration: 0.25, delay: 0.95, ease: 'back.out(2)', onStart: () => g.audio.play('click_stamp') });
    gsap.to(this.hud.querySelector('.arc-hint'), { opacity: 0, duration: 0.3 });
  }

  deselect() {
    const obj = this.selected;
    if (!obj) return;
    this.selected = null;
    this.focusTo = null;
    const g = this.game;
    g.audio.play('close');
    const b = obj.userData.base;
    const st = { t: 0 };
    const q0 = obj.quaternion.clone();
    const q1 = obj.userData.qBase;
    const p0 = obj.position.clone();
    obj.userData.anim = true;
    gsap.to(st, {
      t: 1,
      duration: 0.65,
      ease: 'power3.inOut',
      onUpdate: () => {
        obj.position.lerpVectors(p0, b.pos, st.t);
        obj.quaternion.slerpQuaternions(q0, q1, st.t);
      },
      onComplete: () => {
        obj.userData.anim = false;
        obj.userData.lift = 0;
        g.audio.play('click_paper');
      },
    });
    gsap.to(this.card, { x: 100, opacity: 0, rotation: 3, duration: 0.4, ease: 'power3.in', onComplete: () => this.card.classList.remove('is-on') });
    gsap.to(this.hud.querySelector('.arc-hint'), { opacity: 1, duration: 0.4, delay: 0.3 });
  }

  onEscape() {
    if (this.selected) this.deselect();
    else this.game.goLobby();
  }

  onTransitionOut() {
    this.game.cursor.set('default');
  }

  update(time) {
    const dt = time.realDt;
    const t = time.elapsed;
    const g = this.game;
    const m = g.input.mouse;
    const s = g.save.settings;
    const motion = s.motionEffect ? 1 : 0.3;
    const k = 1 - Math.exp(-dt * 3);
    this.cam.x += (m.nx * 0.45 * s.mouseSensitivity * motion - this.cam.x) * k;
    this.cam.y += (m.ny * 0.3 * s.mouseSensitivity * motion - this.cam.y) * k;
    const sel = this.selected ? 1 : 0;
    this.camera.position.set(this.camBase.x + this.cam.x * (1 - sel * 0.6), this.camBase.y + this.cam.y * 0.4, this.camBase.z - this.cam.y * 0.5 * (1 - sel * 0.6));
    this.camera.position.add(g.shakeOffset);
    this.camera.lookAt(this.camLook.x + this.cam.x * 0.15, this.camLook.y, this.camLook.z);
    g.post.focusOverride = this.focusTo || 8.6;
    g.post.target.dof.range = this.selected ? 0.8 : 2.2;
    g.post.target.dof.maxBlur = this.selected ? 10 : 6;
    g.post.set('dim', this.selected ? 0.25 : 0);

    this.dust.material.uniforms.time.value = t;
    this.watchHand.rotation.y = -t * 0.8;

    // hover pick
    let hit = null;
    if (!g.ui.hasModal && !g.transitions.busy && g.cursor.domHover === 0) {
      this.raycaster.setFromCamera({ x: m.nx, y: m.ny }, this.camera);
      const hits = this.raycaster.intersectObjects(this.items, true);
      if (hits.length) {
        let o = hits[0].object;
        while (o && !this.items.includes(o)) o = o.parent;
        hit = o;
      }
    }
    if (this.selected && hit !== this.selected) hit = null;
    if (hit !== this.hovered) {
      this.hovered = hit;
      if (hit) {
        const id = hit.userData.id;
        g.audio.play(id.startsWith('sealed') ? 'hover_tick' : 'hover_paper');
        const label = this.selected ? '' : id === 'campus' ? '<b>01 校園異聞</b>OPEN FILE' : id === 'forest' ? '<b>02 黑森林試煉</b>OPEN FILE' : '<b>尚未解密</b>SEALED';
        g.cursor.set('pick', label);
      } else g.cursor.set('default');
    }
    // hover lift + idle breathing of the items
    for (const it of this.items) {
      if (it.userData.anim) continue;
      if (it === this.selected) {
        it.position.y += Math.sin(t * 1.6) * 0.0008;
        continue;
      }
      const target = it === this.hovered ? 1 : 0;
      it.userData.lift += (target - it.userData.lift) * (1 - Math.exp(-dt * 10));
      const L = it.userData.lift;
      const b = it.userData.base;
      if (!gsap.isTweening(it.position)) it.position.y = b.pos.y + L * 0.22;
      it.rotation.y = b.rotY + L * 0.04;
      it.rotation.z = b.rotZ + L * 0.03 * Math.sin(t * 2);
      it.rotation.x = b.rotX - L * 0.04;
    }
  }

  dispose() {
    super.dispose();
    if (this.envRT) this.envRT.dispose();
  }
}
