import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene } from '../BaseScene.js';
import { buildForest, constrain } from './ForestWorld.js';
import { ForestPlayer } from './ForestPlayer.js';
import { Slime } from './Slime.js';
import { ChibiActor } from '../../actors/ChibiActor.js';
import { spiritParts } from '../../art/characters/chibi.js';
import { SPRITES } from './forestArt.js';
import { Particles } from '../../fx/Particles.js';
import { SlashTrail } from '../../fx/SlashTrail.js';
import { Shockwave } from '../../fx/Shockwave.js';
import { PauseMenu } from '../../ui/PauseMenu.js';
import { Panel } from '../../ui/Panel.js';
import { ICON } from '../../ui/icons.js';

const QUEST = {
  id: 'forest_seeds',
  game: 'forest',
  title: '月光種子',
  titleEn: 'THE MOONLIGHT SEEDS',
  exp: 300,
  reward: { id: 'forest_charm', name: '森林護符', nameEn: 'Charm of the Wood' },
  objectives: [
    { id: 'talk', text: '與森林精靈交談', textEn: 'SPEAK WITH THE FOREST SPIRIT' },
    { id: 'seeds', text: '從史萊姆手中取回月光種子', textEn: 'RECOVER THE MOONLIGHT SEEDS', target: 3 },
    { id: 'elite', text: '進入巢穴,擊倒紫晶史萊姆', textEn: 'DEFEAT THE AMETHYST SLIME' },
    { id: 'return', text: '把被污染的種子交給森林精靈', textEn: 'RETURN TO THE SPIRIT' },
  ],
};

const SPIRIT = (t, extra = {}) => ({ who: '森林精靈', whoEn: 'FOREST SPIRIT', text: t, pitch: 900, ...extra });
const ME = (t) => ({ who: '旅人', whoEn: 'THE WANDERER', text: t, pitch: 560 });

/**
 * 《黑森林試煉》 — Trial of the Black Forest.
 */
export class ForestGame extends BaseScene {
  constructor(game, params) {
    super(game, params);
    this.camera.fov = 38;
    this.camera.far = 90;
    this.camOffset = new THREE.Vector3(0, 10.5, 10.2);
    this.camPos = new THREE.Vector3();
    this.camVel = new THREE.Vector3();
    this.postProfile = {
      exposure: 1.25,
      bloom: { strength: 0.85, radius: 0.75, threshold: 0.62 },
      dof: { focus: 14.5, range: 5.5, maxBlur: 7.5, near: 1.5 },
      grade: { saturation: 1.2, contrast: 1.12, brightness: 0.0, shadowTint: [0.78, 0.92, 1.16], highlightTint: [1.12, 1.0, 0.86], lift: [0.02, 0.035, 0.055], vignette: 0.55, vignetteSoft: 0.92, grain: 0.045, ca: 0.0022 },
    };
    this.slimes = [];
    this.seeds = [];
    this.seedCount = 0;
    this.combatMusic = false;
  }

  async init(progress) {
    const g = this.game;
    await g.assets.loadFonts();
    await g.assets.ensureGlyphs('月光祭壇史萊姆巢穴黑森林');
    const steps = [
      () => this._env(),
      () => (this.world = buildForest(this.scene)),
      () => this._actors(),
    ];
    await g.assets.runSteps(steps, progress);
    g.quests.define(QUEST);
  }

  _env() {
    const s = this.scene;
    s.background = new THREE.Color(0x132228);
    s.fog = new THREE.FogExp2(0x18303a, 0.022);
    this.hemi = new THREE.HemisphereLight(0x6a8ab8, 0x2a2a3c, 2.1);
    s.add(this.hemi);
    const moon = new THREE.DirectionalLight(0xa8c4f0, 2.0);
    moon.castShadow = true;
    const c = moon.shadow.camera;
    c.left = -16;
    c.right = 16;
    c.top = 16;
    c.bottom = -16;
    c.near = 1;
    c.far = 70;
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.04;
    s.add(moon, moon.target);
    this.moon = moon;
    this.moonDir = new THREE.Vector3(-0.5, -1, -0.35).normalize();
    this.shadowLights.push({ light: moon, high: 2048, low: 1024 });
    this.fx = { particles: new Particles(1400), slash: new SlashTrail(s, 6), ring: new Shockwave(s, 6) };
    s.add(this.fx.particles.points);
  }

  _actors() {
    const g = this.game;
    this.player = new ForestPlayer(g, this.scene, this.fx);
    this.player.pos.set(0.5, 0, 20.5);
    this.scene.add(this.player.root);
    // forest spirit at the entrance
    this.spirit = new ChibiActor(spiritParts({}), { ppm: 240, rimColor: 0x9affd0, rimStrength: 0.7, blobRadius: 0.4, blobOpacity: 0.4, tilt: -0.3 });
    this.spirit.root.position.set(-2.4, 0, 16.4);
    this.spirit.setFacing(1);
    this.spirit.rig.material.uniforms.ambient.value.setRGB(1.1, 1.15, 1.1);
    this.scene.add(this.spirit.root);
    this.spiritLight = new THREE.PointLight(0xffd080, 8, 7, 1.7);
    this.spiritLight.position.set(-1.9, 1.3, 16.8);
    this.scene.add(this.spiritLight);
    this.spiritMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._markTex(), transparent: true, depthWrite: false }));
    this.spiritMark.scale.setScalar(0.5);
    this.spiritMark.position.set(-2.4, 2.4, 16.4);
    this.scene.add(this.spiritMark);
    // slimes
    const defs = [
      { x: -1, z: 1, seed: true },
      { x: -4.5, z: -3 },
      { x: 0.5, z: -17, seed: true },
      { x: 4.5, z: -20.5 },
      { x: -1, z: -22, seed: true },
    ];
    for (const d of defs) {
      const s = new Slime(g, this.scene, this.fx, this.player, d);
      s.onDeath = (sl) => this._onSlimeDeath(sl);
      this.slimes.push(s);
    }
    this.elite = new Slime(g, this.scene, this.fx, this.player, { elite: true, x: 0, z: -43, name: 'elite' });
    this.elite.onDeath = () => this._onEliteDeath();
    this.elite.onDamaged = () => this._bossBar();
    this.slimes.push(this.elite);
    this.seedTex = SPRITES.seed();
    this.seedLights = [0, 1, 2].map(() => {
      const L = new THREE.PointLight(0xcfe8ff, 0, 4, 2);
      L.position.set(0, -50, 0);
      this.scene.add(L);
      return L;
    });
  }

  _markTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(14,12,18,0.8)';
    x.beginPath();
    x.arc(64, 60, 40, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#f2c46a';
    x.lineWidth = 4;
    x.stroke();
    x.fillStyle = '#f2c46a';
    x.fillRect(59, 34, 10, 32);
    x.beginPath();
    x.arc(64, 78, 6, 0, Math.PI * 2);
    x.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ─────────────────────────── lifecycle ───────────────────────────

  enter() {
    const g = this.game;
    this._hud();
    g.audio.playMusic('forest');
    g.audio.setAmbience('forest');
    g.combat.reset();
    for (const s of this.slimes) s.unreg = g.combat.register(s);
    this.camPos.copy(this.player.pos).add(this.camOffset);
    this.camera.position.copy(this.camPos);
    this.player.locked = true;
    this.unsubKey = g.input.on('key', (code) => this._onKey(code));
  }

  afterReveal() {
    setTimeout(async () => {
      await this.game.dialogue.start([
        { who: '', text: '月亮忘記升起的夜晚。黑森林裡,只有螢火蟲和蘑菇在發光。' },
        { who: '', text: '入口處,一盞小小的燈籠正輕輕搖晃著,好像在等誰。' },
      ]);
      this.player.locked = false;
      this.game.ui.toast('與森林精靈交談', 'E — INTERACT', { tone: 'dark' });
    }, 400);
  }

  exit() {
    super.exit();
    if (this.unsubKey) this.unsubKey();
    const g = this.game;
    g.post.focusOverride = null;
    g.post.set('dim', 0, true);
    g.quests.trackerEl = null;
    g.quests.reset(QUEST.id);
    g.combat.numLayer = null;
    g.time.setScales(1, 1);
  }

  onEscape() {
    const g = this.game;
    if (this.pause && this.pause.isOpen) return;
    this.pause = new PauseMenu(g, {
      gameTitle: 'Trial of the Black Forest',
      gameTitleZh: '黑森林試煉',
      controls: [
        [['W', 'A', 'S', 'D'], '移動', 'MOVE'],
        [['LMB'], '三段攻擊(朝游標)', 'ATTACK'],
        [['RMB'], '重擊', 'HEAVY'],
        [['SHIFT'], '翻滾', 'ROLL'],
        [['SPACE'], '黑暗爆發', 'DARK BURST'],
        [['E'], '互動', 'INTERACT'],
      ],
      onRestart: () => g.playGame('forest'),
    }).open();
  }

  // ─────────────────────────── HUD ───────────────────────────

  _hud() {
    const g = this.game;
    const el = document.createElement('div');
    el.className = 'fhud';
    el.innerHTML = `
      <div class="fhud-title"><span class="t-cond">FILE 02</span><span class="fhud-title__zh">黑森林試煉</span><span class="t-italic">Trial of the Black Forest</span></div>
      <div class="fhud-quest"></div>
      <div class="fhud-seeds">${[0, 1, 2].map(() => `<span class="fhud-seed"><i>${ICON.moon}</i></span>`).join('')}<span class="fhud-seeds__lbl t-cond">MOONLIGHT SEEDS</span></div>
      <div class="fhud-life">
        <div class="fhud-hearts">${Array.from({ length: 5 }, () => '<span class="fhud-heart"><svg viewBox="0 0 24 22"><path d="M12 21 2.5 11.3A5.6 5.6 0 0 1 12 4.6a5.6 5.6 0 0 1 9.5 6.7z"/></svg><i></i></span>').join('')}</div>
        <div class="fhud-skills">
          <div class="fhud-skill fhud-skill--burst"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="arc" pathLength="100"/></svg><span class="keycap">SPACE</span><span class="t-zh">黑暗爆發</span></div>
          <div class="fhud-skill"><span class="keycap">RMB</span><span class="t-zh">重擊</span></div>
          <div class="fhud-skill"><span class="keycap">SHIFT</span><span class="t-zh">翻滾</span></div>
        </div>
      </div>
      <div class="fhud-boss">
        <div class="fhud-boss__name"><span class="fhud-boss__zh">紫晶史萊姆</span><span class="t-cond">THE AMETHYST SLIME · NEST GUARDIAN</span></div>
        <div class="fhud-boss__bar"><i class="lag"></i><i class="fill"></i></div>
      </div>
      <div class="fhud-prompt"><span class="keycap">E</span><span class="fhud-prompt__verb"></span></div>
      <div class="fhud-help t-cond"><span class="keycap">ESC</span>MENU · 選單</div>`;
    g.ui.setHUD(el);
    g.quests.mountTracker(el.querySelector('.fhud-quest'));
    g.combat.mount(el);
    this.hud = el;
    this.bossShown = 1;
    gsap.fromTo(el.querySelectorAll('.fhud-title, .fhud-life, .fhud-help'), { opacity: 0, y: -10 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, delay: 0.4 });
  }

  _updateHud(real) {
    const p = this.player;
    const hearts = this.hud.querySelectorAll('.fhud-heart');
    const per = p.maxHp / hearts.length;
    hearts.forEach((h, i) => {
      const fill = Math.max(0, Math.min(1, (p.hp - i * per) / per));
      h.style.setProperty('--fill', fill);
      h.classList.toggle('is-empty', fill <= 0);
    });
    const k = p.burstCd > 0 ? 1 - p.burstCd / p.burstMax : 1;
    const burst = this.hud.querySelector('.fhud-skill--burst');
    burst.querySelector('.arc').style.strokeDashoffset = `${100 - k * 100}`;
    burst.classList.toggle('is-ready', k >= 1);
    if (this.elite.alive && this.bossOn) {
      const f = this.elite.hp / this.elite.maxHp;
      this.bossShown += (f - this.bossShown) * Math.min(1, real * 3);
      this.hud.querySelector('.fhud-boss .fill').style.transform = `scaleX(${f})`;
      this.hud.querySelector('.fhud-boss .lag').style.transform = `scaleX(${this.bossShown})`;
    }
  }

  _setSeeds(n) {
    this.seedCount = n;
    this.hud.querySelectorAll('.fhud-seed').forEach((s, i) => {
      const on = i < n;
      if (on && !s.classList.contains('is-on')) gsap.fromTo(s, { scale: 2 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
      s.classList.toggle('is-on', on);
    });
  }

  _bossBar() {
    if (this.bossOn) return;
    this.bossOn = true;
    const b = this.hud.querySelector('.fhud-boss');
    gsap.fromTo(b, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
  }

  // ─────────────────────────── story ───────────────────────────

  _onKey(code) {
    const g = this.game;
    if (code !== 'KeyE' || g.dialogue.active || g.ui.hasModal || this.player.locked || g.transitions.busy) return;
    if (performance.now() - (g.dialogue.endedAt || 0) < 300) return;
    if (this.nearSpirit) this._talkSpirit();
  }

  async _talkSpirit() {
    const g = this.game;
    const st = g.quests.stage(QUEST.id);
    const done = g.quests.state.get(QUEST.id)?.done;
    this.player.locked = true;
    this.talkFocus = this.spirit.root.position.clone().lerp(this.player.pos, 0.5);
    this.spirit.setEyes('open');
    let lines;
    if (st < 0) {
      lines = [
        SPIRIT('啊……是旅人。你終於來了。'),
        SPIRIT('我是這片森林的精靈。今晚,月亮沒有升起——因為月光種子被偷走了。'),
        SPIRIT('是那些黏呼呼的史萊姆。牠們把三顆種子吞進肚子裡,在林子裡跳來跳去。'),
        ME('……要我去把種子拿回來?'),
        SPIRIT('拜託你了。帶著種子的史萊姆,身體裡會發出淡淡的光。'),
        SPIRIT('收集三顆種子,巢穴的荊棘之門就會打開。巢穴深處住著一隻紫色的大傢伙……小心牠的跳躍。'),
        SPIRIT('記住:翻滾可以躲過衝擊。被包圍的時候,用黑暗爆發把牠們震開。', { event: 'start' }),
      ];
    } else if (done) {
      lines = [SPIRIT('月亮回來了。你聽,連蟲子都在唱歌。'), SPIRIT('森林會記得你的,小小的旅人。')];
    } else if (st === 3) {
      lines = [
        SPIRIT('你回來了!那是……被污染的種子。'),
        SPIRIT('沒關係。只要放進我的燈籠裡,月光就會把它洗乾淨。'),
        { who: '', text: '精靈的燈籠亮了起來。紫色的污濁慢慢褪去,化成銀白色的光,升上了夜空。' },
        SPIRIT('看,月亮升起來了。'),
        SPIRIT('這個給你——用月光種子的碎片編成的護符。有它在,你就不會在黑暗裡迷路。', { event: 'reward' }),
      ];
    } else if (st === 1) {
      lines = [SPIRIT(`種子還差 ${3 - this.seedCount} 顆。帶著光的史萊姆,就在祭壇和空地那邊。`)];
    } else lines = [SPIRIT('荊棘之門已經打開了。巢穴在小溪的另一邊,過橋時小心腳下。')];
    await g.dialogue.start(lines, {
      onLine: (l) => this.spirit.setEyes(l.who ? 'open' : 'closed'),
      onEvent: (e) => {
        if (e === 'start') {
          g.quests.start(QUEST.id);
          setTimeout(() => g.quests.progress(QUEST.id, 'talk'), 600);
        }
        if (e === 'reward') this._moonrise();
      },
    });
    this.spirit.setEyes('open');
    this.talkFocus = null;
    this.player.locked = false;
    if (st === 3) {
      g.quests.progress(QUEST.id, 'return');
      setTimeout(() => this._endCard(), 4200);
    }
  }

  _moonrise() {
    const g = this.game;
    g.audio.play('unlock');
    gsap.to(this.hemi, { intensity: 2.0, duration: 3 });
    gsap.to(this.moon, { intensity: 3.2, duration: 3 });
    gsap.to(this.scene.fog, { density: 0.018, duration: 3 });
    this.fx.particles.burst(this.spirit.root.position.clone().setY(1.2), { count: 120, colors: [0xfffbe8, 0xcfe8ff, 0xb0f0d0], speed: [1, 5], dir: new THREE.Vector3(0, 1, 0), spread: 0.9, life: [1, 2.4], size: [0.06, 0.16], drag: 1, gravity: -1, shape: 0 });
  }

  _onSlimeDeath(s) {
    const g = this.game;
    if (s.seed) {
      // drop a moonlight seed pickup
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.seedTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      m.scale.setScalar(0.9);
      m.position.set(s.pos.x, 0.6, s.pos.z);
      this.scene.add(m);
      // reuse a pre-allocated light (adding lights at runtime forces shader recompiles)
      const L = this.seedLights.find((l) => !l.userData.used) || this.seedLights[0];
      L.userData.used = true;
      L.intensity = 4;
      this.seeds.push({ m, t: 0, L });
      g.audio.play('interact');
    }
  }

  _collectSeed(sd) {
    const g = this.game;
    this.scene.remove(sd.m);
    sd.L.intensity = 0;
    sd.L.userData.used = false;
    g.audio.play('pickup');
    this.fx.particles.burst(sd.m.position.clone(), { count: 40, colors: [0xfffbe8, 0xcfe8ff], speed: [1, 4], life: [0.4, 0.9], size: [0.05, 0.1], drag: 2, gravity: -2, shape: 0 });
    this._setSeeds(this.seedCount + 1);
    if (g.quests.stage(QUEST.id) === 1) g.quests.progress(QUEST.id, 'seeds');
    else if (g.quests.stage(QUEST.id) < 1) g.ui.toast('月光種子', `${this.seedCount}/3 — 先去找森林精靈吧`, { tone: 'dark' });
    this.player.heal(false);
    if (this.seedCount >= 3) this._openGate();
  }

  _openGate() {
    const g = this.game;
    const gate = this.world.gate;
    if (gate.open) return;
    gate.open = true;
    this.player.gateClosed = false;
    setTimeout(() => {
      g.audio.play('gate_open');
      g.shake(0.15, 1.2);
      gsap.to(gate.thorns.scale, { y: 0.01, duration: 1.6, ease: 'power2.in' });
      gsap.to(gate.thorns.position, { y: 0, duration: 1.6, ease: 'power2.in' });
      gsap.to(gate.glow.material, { opacity: 0, duration: 1.2 });
      gsap.to(gate.light, { intensity: 0, duration: 1.6 });
      this.fx.particles.burst(new THREE.Vector3(0, 1.2, -32), { count: 80, colors: [0xb070ff, 0xe0c8ff, 0x2a1a34], speed: [1, 4], life: [0.6, 1.4], size: [0.08, 0.18], drag: 2, jitter: 3, shape: 0 });
      g.ui.toast('荊棘之門開啟了', 'THE NEST AWAITS BEYOND THE STREAM', { tone: 'dark' });
    }, 900);
  }

  _onEliteDeath() {
    const g = this.game;
    this.bossOn = false;
    gsap.to(this.hud.querySelector('.fhud-boss'), { opacity: 0, duration: 0.8, delay: 0.6 });
    g.audio.playMusic('forest', 1.5);
    this.combatMusic = false;
    setTimeout(() => {
      g.quests.progress(QUEST.id, 'elite');
      g.ui.toast('取得「被污染的月光種子」', 'RETURN IT TO THE FOREST SPIRIT', { tone: 'dark', duration: 4 });
      g.audio.play('pickup');
    }, 1200);
  }

  async _playerDown() {
    const g = this.game;
    g.save.stat('deaths');
    g.time.setScales(0.25, 0.25);
    g.post.set('desat', 0.8);
    await new Promise((r) => setTimeout(r, 800));
    const p = new Panel(g, { className: 'confirm', formNo: 'F-00', title: 'Fallen', titleZh: '旅人倒下了', subtitle: 'The fireflies gather around you.', width: 60, closable: false });
    p.content.innerHTML = `<p class="confirm__msg stagger">螢火蟲圍繞著你。要從最近的篝火重新出發嗎?<br><span class="t-cond">YOUR SEEDS ARE KEPT.</span></p>`;
    const mk = (label, zh, primary, fn) => g.ui.button({ className: `doc-btn ${primary ? '' : 'doc-btn--ghost'}`, html: `<span class="doc-btn__in"><span class="t-cond ls">${label}</span><span class="t-zh">${zh}</span></span>`, sfx: ['hover_paper', primary ? 'confirm' : 'cancel'], onClick: fn });
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(
      mk('LOBBY', '返回大廳', false, () => {
        p.close();
        g.goLobby();
      }),
      mk('RISE', '重新出發', true, () => {
        p.close();
        g.time.setScales(1, 1);
        g.post.set('desat', 0);
        const pz = this.player.pos.z;
        const checkpoints = [[0.5, 18], [-1, 2], [2, -12], [0.5, -34]];
        let cp = checkpoints[0];
        for (const c of checkpoints) if (c[1] >= pz - 1) cp = c;
        this.player.pos.set(cp[0], 0, cp[1]);
        this.player.heal();
        if (this.elite.alive) {
          this.elite.hp = this.elite.maxHp;
          this.elite.pos.copy(this.elite.home);
          this.elite.state = 'idle';
          this.elite.aggro = false;
        }
      }),
    );
    p.foot.appendChild(btns);
    p.open();
  }

  _endCard() {
    const g = this.game;
    const p = new Panel(g, { className: 'confirm', formNo: 'E-02', title: 'Moonrise', titleZh: '檔案結案 · 黑森林試煉', subtitle: 'The moon remembers the way home.', width: 66 });
    p.content.innerHTML = `<p class="confirm__msg stagger">月亮重新升上了黑森林的夜空。史萊姆們安靜了下來,螢火蟲又開始唱歌。<br><span class="t-cond">REWARD: CHARM OF THE WOOD — ADDED TO COLLECTION</span></p>`;
    const mk = (label, zh, primary, fn) => g.ui.button({ className: `doc-btn ${primary ? '' : 'doc-btn--ghost'}`, html: `<span class="doc-btn__in"><span class="t-cond ls">${label}</span><span class="t-zh">${zh}</span></span>`, sfx: ['hover_paper', primary ? 'click_ticket' : 'cancel'], onClick: fn });
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(
      mk('STAY', '留在森林', false, () => p.close()),
      mk('RETURN', '返回檔案室', true, () => {
        p.close();
        g.goLobby();
      }),
    );
    p.foot.appendChild(btns);
    p.open();
  }

  // ─────────────────────────── per frame ───────────────────────────

  update(time) {
    const g = this.game;
    const dt = time.worldDt;
    const pdt = time.playerDt;
    const real = time.realDt;
    const t = time.elapsed;
    const p = this.player;

    p.update(pdt, real, g.input, this.camera);
    if (p.state === 'dead' && !this._down) {
      this._down = true;
      this._playerDown();
    }
    if (p.state !== 'dead') this._down = false;
    const pu = p.a.rig.material.uniforms;
    pu.time.value = t;
    // light the paper characters: moonlit ambient + warm near fire/lanterns
    const warm = Math.max(0, 1 - Math.hypot(p.pos.x + 5, p.pos.z + 5.5) / 6) + Math.max(0, 1 - Math.hypot(p.pos.x + 2, p.pos.z - 16.6) / 5);
    pu.ambient.value.setRGB(0.72 + warm * 0.35, 0.78 + warm * 0.2, 0.92);

    // spirit
    const sp = this.spirit;
    sp.update(dt, { float: 0.35 + Math.sin(t * 1.4) * 0.12 });
    const dxs = p.pos.x - sp.root.position.x;
    if (Math.abs(dxs) > 0.3) sp.setFacing(Math.sign(dxs));
    this.spiritLight.intensity = 7 + Math.sin(t * 5) * 0.6;
    const st = g.quests.stage(QUEST.id);
    const showMark = st < 0 || st === 3;
    this.spiritMark.visible = showMark;
    this.spiritMark.position.y = 2.5 + Math.sin(t * 3) * 0.08;
    const dSpirit = Math.hypot(p.pos.x - sp.root.position.x, p.pos.z - sp.root.position.z);
    this.nearSpirit = dSpirit < 2.2 && !g.dialogue.active;
    const pr = this.hud.querySelector('.fhud-prompt');
    pr.classList.toggle('is-on', this.nearSpirit && !p.locked);
    pr.querySelector('.fhud-prompt__verb').textContent = '交談 · 森林精靈';
    if (g.ui.hasModal || g.dialogue.active) g.cursor.set('default');
    else if (this.nearSpirit) g.cursor.set('talk', '<b>E</b>森林精靈');
    else g.cursor.set('aim');

    // slimes
    let anyAggro = false;
    for (const s of this.slimes) {
      if (s.gone) continue;
      s.update(dt, real);
      if (s.alive && s.aggro) anyAggro = true;
      s.rig.material.uniforms.ambient.value.setRGB(0.85, 0.9, 1.0);
      if (s.alive) {
        const pp = s.pos;
        if (!s.elite) constrain(pp, true); // keep regular slimes on walkable ground
        if (s.elite && Math.hypot(pp.x, pp.z + 41) > 7.8) {
          const a = Math.atan2(pp.z + 41, pp.x);
          pp.x = Math.cos(a) * 7.8;
          pp.z = -41 + Math.sin(a) * 7.8;
        }
      }
    }
    if (this.elite.alive && this.elite.aggro) this._bossBar();
    if (anyAggro !== this.combatMusic) {
      this.combatMusic = anyAggro;
      g.audio.playMusic(anyAggro ? 'forest_battle' : 'forest', anyAggro ? 0.6 : 2);
    }
    // seeds bob & pickup
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const sd = this.seeds[i];
      sd.t += real;
      sd.m.position.y = 0.6 + Math.sin(sd.t * 3) * 0.12;
      sd.L.position.copy(sd.m.position);
      sd.m.material.rotation = sd.t;
      if (Math.hypot(p.pos.x - sd.m.position.x, p.pos.z - sd.m.position.z) < 1.0) {
        this.seeds.splice(i, 1);
        this._collectSeed(sd);
      }
    }

    // camera: lagging smooth follow + look-ahead toward aim, dialogue push-in
    const s = g.save.settings;
    const look = this.talkFocus || p.pos.clone().addScaledVector(p.aim, 0.8);
    const want = look.clone().add(this.camOffset);
    if (this.talkFocus) want.sub(this.camOffset.clone().multiplyScalar(0.35));
    // critically damped spring (smooth damp, ~0.2s lag)
    const omega = 2 / 0.22;
    const x = omega * real;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = this.camPos.clone().sub(want);
    const temp = this.camVel.clone().addScaledVector(change, omega).multiplyScalar(real);
    this.camVel.sub(temp.clone().multiplyScalar(omega)).multiplyScalar(exp);
    this.camPos.copy(want).add(change.add(temp).multiplyScalar(exp));
    this.camera.position.copy(this.camPos).add(g.shakeOffset);
    if (s.motionEffect) this.camera.position.x += Math.sin(t * 0.4) * 0.04;
    this.camera.lookAt(this.camPos.clone().sub(this.camOffset).add(new THREE.Vector3(0, 0.6, 0)));
    const focusP = this.talkFocus || p.pos;
    g.post.focusOverride = this.camera.position.distanceTo(focusP);
    g.post.target.dof.range = this.talkFocus ? 2.5 : 5.5;

    // moon shadow frustum follows the player
    this.moon.target.position.set(p.pos.x, 0, p.pos.z - 2);
    this.moon.position.copy(this.moon.target.position).addScaledVector(this.moonDir, -30);

    // foreground foliage fades (screen-door) when it covers the player
    const ps = new THREE.Vector3(p.pos.x, 0.7, p.pos.z).project(this.camera);
    const corner = new THREE.Vector3();
    for (const tree of this.world.fgTrees) {
      const u = tree.material.userData.uniforms;
      let want = 1;
      if (tree.position.z > p.pos.z - 0.2) {
        const sx = Math.abs(tree.scale.x) * 0.42;
        const sy = tree.scale.y * 1.9;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const [cx, cy] of [[-sx, 0], [sx, 0], [-sx, sy], [sx, sy]]) {
          corner.set(tree.position.x + cx, cy * Math.cos(0.18), tree.position.z - cy * Math.sin(0.18)).project(this.camera);
          minX = Math.min(minX, corner.x);
          maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y);
          maxY = Math.max(maxY, corner.y);
        }
        if (ps.x > minX && ps.x < maxX && ps.y > minY && ps.y < maxY) want = 0.3;
      }
      u.fade.value += (want - u.fade.value) * Math.min(1, real * 8);
    }

    this.world.update(t, this.camera);
    this.fx.particles.update(dt > 0 ? dt : real * 0.05);
    this.fx.slash.update(real);
    this.fx.ring.update(real);
    this._updateHud(real);
  }

  dispose() {
    super.dispose();
    this.player.dispose();
    this.spirit.dispose();
    this.slimes.forEach((s) => s.dispose());
    this.fx.particles.dispose();
  }
}
