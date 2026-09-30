import * as THREE from 'three';
import gsap from 'gsap';
import { BaseScene } from '../BaseScene.js';
import { buildCorridor, buildClassroom, buildLibrary } from './campusAreas.js';
import { sunsetSky, indicatorSprite } from './campusArt.js';
import { CampusPlayer } from './CampusPlayer.js';
import { ShadowEnemy } from './ShadowEnemy.js';
import { CampusHUD } from './CampusHUD.js';
import { Humanoid } from '../../actors/Humanoid.js';
import { NPCS, YUKI_CFG, dialogueFor, NOTEBOOK_LINES, ANOMALY_LINES, RESCUE_LINES, QUEST } from './campusScript.js';
import { Particles } from '../../fx/Particles.js';
import { SlashTrail } from '../../fx/SlashTrail.js';
import { orientShaft } from '../../fx/Dust.js';
import { PauseMenu } from '../../ui/PauseMenu.js';
import { Panel } from '../../ui/Panel.js';

const PROFILES = {
  corridor: {
    exposure: 0.92,
    bloom: { strength: 0.55, radius: 0.75, threshold: 0.74 },
    dof: { focus: 8, range: 3.4, maxBlur: 6.5, near: 1.6 },
    grade: { saturation: 1.04, contrast: 1.04, brightness: 0, shadowTint: [0.84, 0.88, 1.14], highlightTint: [1.12, 1.0, 0.84], lift: [0.035, 0.028, 0.05], vignette: 0.38, vignetteSoft: 1.0, grain: 0.05, ca: 0.0018 },
  },
  classroom: {
    exposure: 0.94,
    bloom: { strength: 0.6, radius: 0.8, threshold: 0.72 },
    dof: { focus: 10, range: 3.6, maxBlur: 6.5, near: 1.4 },
    grade: { saturation: 1.05, contrast: 1.05, brightness: 0, shadowTint: [0.84, 0.88, 1.14], highlightTint: [1.14, 1.0, 0.82], lift: [0.035, 0.028, 0.05], vignette: 0.4, vignetteSoft: 1.0, grain: 0.05, ca: 0.0018 },
  },
  library: {
    exposure: 0.95,
    bloom: { strength: 0.6, radius: 0.8, threshold: 0.7 },
    dof: { focus: 9, range: 3.0, maxBlur: 7, near: 1.4 },
    grade: { saturation: 0.95, contrast: 1.08, brightness: -0.01, shadowTint: [0.84, 0.86, 1.12], highlightTint: [1.14, 0.98, 0.8], lift: [0.03, 0.022, 0.045], vignette: 0.5, vignetteSoft: 0.95, grain: 0.06, ca: 0.002 },
  },
};

const COOL = {
  corridor: new THREE.Color(0.66, 0.64, 0.8),
  classroom: new THREE.Color(0.68, 0.64, 0.8),
  library: new THREE.Color(0.48, 0.44, 0.56),
};
const WARM = {
  corridor: new THREE.Color(1.12, 0.94, 0.78),
  classroom: new THREE.Color(1.14, 0.95, 0.78),
  library: new THREE.Color(1.0, 0.82, 0.62),
};

/**
 * 《校園異聞》 — Campus Anomaly.
 */
export class CampusGame extends BaseScene {
  constructor(game, params) {
    super(game, params);
    this.camera.fov = 32;
    this.camera.far = 80;
    this.postProfile = PROFILES.corridor;
    this.areas = {};
    this.area = null;
    this.npcs = [];
    this.enemies = [];
    this.flags = { done: false };
    this.combatOn = false;
    this.camX = 0;
    this.camZ = 0;
    this.talkTarget = null;
    this.talkK = 0;
    this.clockMin = 30;
    this.busy = false;
  }

  async init(progress) {
    const g = this.game;
    await g.assets.loadFonts();
    await g.assets.ensureGlyphs('二年B組課表國語數學英語理科社會體育美術音樂十月三十日值日生青山早瀨放學後請打掃教室舊圖書館資料室禁止進入期中考範圍校園文化祭全校參加閱讀週暫停開放走廊奔跑安全第一生活指導組失物招領請至教務處領取社招募中第二打掃分配表本週合唱比賽體育館總類自然文學歷史雪筆記');
    const steps = [
      () => (this.res = { sky: sunsetSky(2048, 1024, { seed: 3 }), sky2: sunsetSky(2048, 1024, { seed: 5, town: false }) }),
      () => (this.areas.corridor = buildCorridor(this.res)),
      () => (this.areas.classroom = buildClassroom(this.res)),
      () => (this.areas.library = buildLibrary(this.res)),
      () => this._lights(),
      () => this._actors(),
    ];
    await g.assets.runSteps(steps, progress);
    g.quests.define(QUEST);
  }

  _lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0x9a94c0, 0xc09070, 1.0);
    s.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffae6a, 4);
    sun.castShadow = true;
    const sc = sun.shadow.camera;
    sc.left = -13;
    sc.right = 13;
    sc.top = 9;
    sc.bottom = -9;
    sc.near = 1;
    sc.far = 60;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);
    this.sun = sun;
    this.shadowLights.push({ light: sun, high: 2048, low: 1024 });
    this.fx = { particles: new Particles(900), slash: new SlashTrail(s, 6) };
    s.add(this.fx.particles.points);
  }

  _actors() {
    const g = this.game;
    this.player = new CampusPlayer(g, this.scene, this.fx);
    this.scene.add(this.player.root);
    const ind = indicatorSprite('talk');
    const indQ = indicatorSprite('quest');
    for (const def of NPCS) {
      const h = new Humanoid({ ...def.cfg, name: def.id }, { ppm: 470, scale: def.scale || 1, rimColor: 0xffc27a, rimStrength: 0.45, blobRadius: 0.4 });
      h.root.position.set(def.pos[0], 0, def.pos[1]);
      h.setFacing(def.facing || 1);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: def.quest ? indQ : ind, transparent: true, depthWrite: false, opacity: 0 }));
      sprite.scale.setScalar(0.28);
      sprite.position.y = 1.95 * (def.scale || 1);
      sprite.renderOrder = 20;
      h.root.add(sprite);
      this.areas[def.area].group.add(h.root);
      this.npcs.push({ def, h, sprite, dir: 1, home: def.pos[0] });
    }
    // Yuki (appears after the anomaly)
    this.yuki = new Humanoid(YUKI_CFG, { ppm: 470, rimColor: 0xffc27a, rimStrength: 0.5 });
    this.yuki.root.visible = false;
    this.yuki.setFacing(-1);
    this.areas.library.group.add(this.yuki.root);
    // shadows
    for (let i = 0; i < 3; i++) {
      const e = new ShadowEnemy(g, this.scene, this.fx, i, this.player);
      e.onDeath = () => this._onShadowDown();
      this.areas.library.group.add(e.root);
      this.enemies.push(e);
    }
  }

  // ─────────────────────────── lifecycle ───────────────────────────

  enter() {
    const g = this.game;
    this.hud = new CampusHUD(g);
    g.ui.setHUD(this.hud.el);
    g.audio.playMusic('campus');
    g.audio.setAmbience('campus');
    g.combat.reset();
    this.enemies.forEach((e) => (e.unreg = g.combat.register(e)));
    this.setArea('corridor', { x: -14.2, z: 0.2 }, true);
    this.player.setFacing(1);
    this.player.locked = true;
    this.unsubKey = g.input.on('key', (code) => this._onKey(code));
  }

  afterReveal() {
    const g = this.game;
    if (g.save.data.quests[QUEST.id]?.status === 'complete') {
      // replay: start fresh but acknowledge
    }
    setTimeout(async () => {
      await g.dialogue.start([
        { who: '', text: '十月三十日,十六點三十分。放學的鐘聲已經響過了。' },
        { who: '', text: '走廊上只剩下夕陽,和被拉得很長很長的影子。' },
        { who: '早瀨 灯', whoEn: 'AKARI HAYASE', text: '雪……妳到底去哪裡了?', pitch: 660 },
      ]);
      this.player.locked = false;
      g.quests.start(QUEST.id);
    }, 500);
  }

  exit() {
    super.exit();
    if (this.unsubKey) this.unsubKey();
    const g = this.game;
    g.time.setScales(1, 1);
    g.post.set('rift', 0, true);
    g.post.set('letterbox', 0, true);
    g.post.set('desat', 0, true);
    g.post.focusOverride = null;
    g.audio.setLowpass(20000, 0.1);
    g.quests.trackerEl = null;
    g.quests.reset(QUEST.id);
    g.combat.numLayer = null;
  }

  onEscape() {
    const g = this.game;
    if (this.pause && this.pause.isOpen) return;
    this.pause = new PauseMenu(g, {
      gameTitle: 'Campus Anomaly',
      gameTitleZh: '校園異聞',
      controls: [
        [['A', 'D'], '左右移動', 'MOVE'],
        [['W', 'S'], '前後移動', 'DEPTH'],
        [['E'], '互動 / 對話', 'INTERACT'],
        [['LMB', 'J'], '三段攻擊', 'ATTACK'],
        [['SHIFT'], '閃避', 'DODGE'],
        [['SPACE'], '時間裂痕', 'TIME RIFT'],
      ],
      onRestart: () => g.playGame('campus'),
    }).open();
  }

  // ─────────────────────────── areas ───────────────────────────

  setArea(id, spawn, instant = false) {
    const g = this.game;
    if (this.area) this.scene.remove(this.area.group);
    const a = this.areas[id];
    this.area = a;
    this.scene.add(a.group);
    this.scene.fog = new THREE.FogExp2(a.fog.color, a.fog.density);
    this.scene.background = new THREE.Color(a.fog.color);
    this.hemi.color.set(a.hemi.sky);
    this.hemi.groundColor.set(a.hemi.ground);
    this.hemi.intensity = a.hemi.intensity;
    this.sun.color.set(a.sun.color);
    this.sun.intensity = a.sun.intensity;
    this.player.pos.set(spawn.x, 0, spawn.z);
    this.camera.fov = a.cam.fov;
    this.camera.updateProjectionMatrix();
    this.camX = THREE.MathUtils.clamp(spawn.x, a.cam.xMin, a.cam.xMax);
    this.camZ = spawn.z;
    g.post.setProfile(PROFILES[id], instant);
    this.hud.setArea(a.name, a.nameEn);
    this.player.h.rig.setRimSide(a.sunDir.x > 0 ? -1 : 1, 0.6);
    for (const n of this.npcs) n.h.rig.setRimSide(a.sunDir.x > 0 ? -1 : 1, 0.6);
    this._updateCamera(1, true);
  }

  async _useDoor(d) {
    const g = this.game;
    if (d.locked) {
      g.audio.play('deny');
      await g.dialogue.start([{ who: '', text: d.locked }]);
      return;
    }
    if (d.special === 'archive') return this._archiveDoor();
    if (this.combatOn) {
      g.audio.play('deny');
      g.ui.toast('無法離開', 'THE SHADOWS BLOCK THE WAY', { tone: 'dark' });
      return;
    }
    this.busy = true;
    this.player.locked = true;
    g.audio.play('door_slide');
    const target = this.areas[d.to];
    await g.transitions.swipe(() => {
      this.setArea(d.to, d.spawn, true);
      return Promise.resolve();
    }, { label: target.name, sub: target.nameEn });
    this.player.locked = false;
    this.busy = false;
    if (d.to === 'classroom' && g.quests.stage(QUEST.id) === 1) g.ui.toast('二年B組', '青山的座位在窗邊最後一排', { tone: 'dark' });
  }

  async _archiveDoor() {
    const g = this.game;
    const st = g.quests.stage(QUEST.id);
    if (this.flags.done) {
      await g.dialogue.start([{ who: '', text: '資料室裡只剩下安靜的書架,和一張寫滿時間的書桌。' }]);
      return;
    }
    if (st < 2) {
      g.audio.play('deny');
      await g.dialogue.start([{ who: '', text: '一扇上了鎖的舊木門。門牌上寫著「資料室」。' }, { who: '', text: '門縫裡……好像有紅色的光在閃爍。' }]);
      return;
    }
    if (st === 2) {
      this.player.locked = true;
      this.talkTarget = this.area.archiveDoor.group.position.clone().add(new THREE.Vector3(-1, 1.2, 1));
      g.audio.play('anomaly');
      await g.dialogue.start(ANOMALY_LINES, { onEvent: (e) => e === 'anomaly' && this._anomalyFX() });
      this.talkTarget = null;
      this.player.locked = false;
      g.quests.advance(QUEST.id);
      this._startCombat();
      return;
    }
    if (st === 4) this._rescue();
  }

  _anomalyFX() {
    const g = this.game;
    g.shake(0.12, 0.8);
    g.post.set('flash', 0.3, true);
    g.post.fx.flash = 0.35;
    this.area.archiveDoor.glow.intensity = 6;
  }

  // ─────────────────────────── combat ───────────────────────────

  _startCombat() {
    const g = this.game;
    this.combatOn = true;
    this.player.combat = true;
    g.post.set('letterbox', 0.075);
    g.post.set('desat', 0.28);
    g.post.target.exposure = 0.85;
    g.audio.playMusic('campus_battle', 0.6);
    this.hud.showCombat(true);
    this.sun.color.set(0xff6a5a);
    this.area.lamps.forEach((L) => gsap.to(L, { intensity: 1.2, duration: 1 }));
    const px = this.player.pos.x;
    const spots = [
      [px + 2.6, 0.2],
      [px - 2.6, 1.2],
      [px + 4.4, -0.3],
    ].map(([x, z]) => [THREE.MathUtils.clamp(x, this.area.bounds.xMin + 0.5, this.area.bounds.xMax - 0.5), z]);
    this.enemies.forEach((e, i) => {
      e.hp = e.maxHp;
      setTimeout(() => e.emerge(spots[i][0], spots[i][1]), 400 + i * 650);
    });
    g.ui.toast('SPACE — 時間裂痕', '世界變慢 25% · 冷卻 8 秒', { tone: 'dark', duration: 4 });
  }

  _onShadowDown() {
    const g = this.game;
    g.quests.progress(QUEST.id, 'shadows');
    if (this.enemies.every((e) => !e.alive)) setTimeout(() => this._endCombat(), 900);
  }

  _endCombat() {
    const g = this.game;
    this.combatOn = false;
    this.player.combat = false;
    g.post.set('letterbox', 0);
    g.post.set('desat', 0);
    g.post.set('rift', 0);
    g.post.target.exposure = PROFILES.library.exposure;
    g.time.setScales(1, 1);
    g.audio.setLowpass(20000, 0.3);
    g.audio.playMusic('campus', 1.5);
    this.hud.showCombat(false);
    this.sun.color.set(this.area.sun.color);
    this.area.lamps.forEach((L) => gsap.to(L, { intensity: 5, duration: 1.5 }));
    gsap.to(this.area.archiveDoor.glow, { intensity: 1.2, duration: 1.5 });
    g.ui.toast('影子消散了', '資料室的門……打開了一道縫', { tone: 'ivory' });
  }

  async _playerDown() {
    const g = this.game;
    g.save.stat('deaths');
    g.time.setScales(0.2, 0.2);
    g.post.set('desat', 0.9);
    g.audio.setLowpass(500, 0.5);
    await new Promise((r) => setTimeout(r, 900));
    const p = new Panel(g, { className: 'confirm rewind', formNo: 'T-00', title: 'Rewind', titleZh: '時間回溯', subtitle: 'The hands of the clock turn back.', width: 60, closable: false });
    p.content.innerHTML = `<p class="confirm__msg stagger">早瀨灯倒下了。要讓時間倒轉,重新面對影子嗎?<br><span class="t-cond">THE SHADOWS WILL RETURN.</span></p>`;
    const mk = (label, zh, primary, fn) =>
      g.ui.button({ className: `doc-btn ${primary ? '' : 'doc-btn--ghost'}`, html: `<span class="doc-btn__in"><span class="t-cond ls">${label}</span><span class="t-zh">${zh}</span></span>`, sfx: ['hover_paper', primary ? 'confirm' : 'cancel'], onClick: fn });
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(
      mk('LOBBY', '返回大廳', false, () => {
        p.close();
        g.goLobby();
      }),
      mk('REWIND', '再試一次', true, () => {
        p.close();
        this._rewind();
      }),
    );
    p.foot.appendChild(btns);
    p.open();
  }

  _rewind() {
    const g = this.game;
    g.time.setScales(1, 1);
    g.post.set('desat', 0.28);
    g.audio.setLowpass(20000, 0.3);
    g.audio.play('rift_off');
    this.player.heal();
    this.player.riftCd = 0;
    this.player.h.play('surprise');
    g.post.fx.flash = 0.5;
    const px = this.player.pos.x;
    this.enemies.forEach((e, i) => {
      if (!e.alive) return;
      e.hp = e.maxHp;
      e.pos.set(THREE.MathUtils.clamp(px + (i - 1) * 3 + 0.5, this.area.bounds.xMin + 0.5, this.area.bounds.xMax - 0.5), 0, 0.5);
      e.state = 'emerge';
      e.t = 0;
    });
  }

  async _rescue() {
    const g = this.game;
    this.player.locked = true;
    const door = this.area.archiveDoor;
    g.audio.play('door_slide');
    gsap.to(door.panel.rotation, { y: -1.4, duration: 1.4, ease: 'power2.inOut' });
    gsap.to(door.panel.position, { x: -0.55, z: 0.55, duration: 1.4, ease: 'power2.inOut' });
    gsap.to(door.glow, { intensity: 0, duration: 1.2 });
    const y = this.yuki;
    y.root.position.set(door.group.position.x, 0, door.group.position.z + 0.3);
    y.root.visible = true;
    y.rig.material.uniforms.dissolve.value = 1;
    y.rig.material.uniforms.dissolveColor.value.set(0xffd9a0);
    gsap.to(y.rig.material.uniforms.dissolve, { value: 0, duration: 1.6, delay: 0.5 });
    gsap.to(y.root.position, { z: 0.2, x: door.group.position.x - 0.6, duration: 1.6, delay: 0.6, onStart: () => y.move(1, -1), onComplete: () => y.move(0) });
    await new Promise((r) => setTimeout(r, 2300));
    this.player.setFacing(1);
    this.talkTarget = new THREE.Vector3((this.player.pos.x + y.root.position.x) / 2, 1.2, 0.3);
    await g.dialogue.start(RESCUE_LINES, {
      onLine: (line) => {
        y.setTalking(line.who === '青山 雪');
        this.player.h.setTalking(line.who === '早瀨 灯');
      },
      onEvent: (e) => {
        if (e === 'reward') {
          g.audio.play('pickup');
          y.play('nod');
        }
      },
    });
    y.setTalking(false);
    this.player.h.setTalking(false);
    this.talkTarget = null;
    this.flags.done = true;
    g.quests.progress(QUEST.id, 'enter');
    this.player.locked = false;
    setTimeout(() => this._endCard(), 4200);
  }

  _endCard() {
    const g = this.game;
    const p = new Panel(g, { className: 'confirm', formNo: 'E-01', title: 'Case Closed', titleZh: '檔案結案 · 校園異聞', subtitle: 'Kuremi High, 17:30. The sun finally sets.', width: 66 });
    p.content.innerHTML = `<p class="confirm__msg stagger">青山雪平安回到了走廊。夕陽終於落下,影子也回到了它們該在的地方。<br><span class="t-cond">REWARD: KEY TO THE OLD LIBRARY — ADDED TO COLLECTION</span></p>`;
    const mk = (label, zh, primary, fn) =>
      g.ui.button({ className: `doc-btn ${primary ? '' : 'doc-btn--ghost'}`, html: `<span class="doc-btn__in"><span class="t-cond ls">${label}</span><span class="t-zh">${zh}</span></span>`, sfx: ['hover_paper', primary ? 'click_ticket' : 'cancel'], onClick: fn });
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(
      mk('STAY', '繼續散步', false, () => p.close()),
      mk('RETURN', '返回檔案室', true, () => {
        p.close();
        g.goLobby();
      }),
    );
    p.foot.appendChild(btns);
    p.open();
  }

  // ─────────────────────────── interaction ───────────────────────────

  _onKey(code) {
    const g = this.game;
    if (code !== 'KeyE' || g.dialogue.active || g.ui.hasModal || this.busy || this.player.locked || g.transitions.busy) return;
    if (performance.now() - (g.dialogue.endedAt || 0) < 300) return;
    const it = this.nearest;
    if (!it) return;
    if (it.type === 'npc') this._talk(it.npc);
    else if (it.type === 'door') this._useDoor(it.door);
    else if (it.type === 'notebook') this._readNotebook();
  }

  async _talk(n) {
    const g = this.game;
    const st = g.quests.stage(QUEST.id);
    const lines = dialogueFor(n.def.id, st, this.flags);
    this.player.locked = true;
    this.talkTarget = new THREE.Vector3((this.player.pos.x + n.h.root.position.x) / 2, 1.25, (this.player.pos.z + n.h.root.position.z) / 2);
    const dx = n.h.root.position.x - this.player.pos.x;
    this.player.setFacing(Math.sign(dx) || 1);
    n.h.setFacing(-Math.sign(dx) || 1);
    n.talking = true;
    g.audio.play('interact');
    await g.dialogue.start(lines, {
      onLine: (line) => {
        n.h.setTalking(line.who === n.def.name);
        this.player.h.setTalking(line.who === '早瀨 灯');
        if (line.who === n.def.name && Math.random() < 0.35) n.h.play('nod');
      },
      onEvent: (e) => {
        if (e === 'lean') n.h.play('surprise');
        if (e === 'clue_hana') {
          g.audio.play('clue');
          if (g.quests.stage(QUEST.id) === 0) g.quests.progress(QUEST.id, 'ask');
        }
      },
    });
    n.h.setTalking(false);
    this.player.h.setTalking(false);
    n.talking = false;
    this.talkTarget = null;
    this.player.locked = false;
  }

  async _readNotebook() {
    const g = this.game;
    const nb = this.area.notebook;
    this.player.locked = true;
    this.talkTarget = nb.pos.clone().add(new THREE.Vector3(0, 0.4, 0));
    g.audio.play('page');
    await g.dialogue.start(NOTEBOOK_LINES, {
      onEvent: (e) => {
        if (e === 'clue_note') g.audio.play('clue');
      },
    });
    this.talkTarget = null;
    this.player.locked = false;
    nb.glint.visible = false;
    g.quests.progress(QUEST.id, 'desk');
    g.ui.toast('線索:舊圖書館資料室', 'KEYWORD ACQUIRED', { tone: 'ivory' });
  }

  _findNearest() {
    const p = this.player.pos;
    const g = this.game;
    let best = null;
    let bd = Infinity;
    for (const n of this.npcs) {
      if (n.def.area !== this.area.id) continue;
      const d = Math.hypot(n.h.root.position.x - p.x, (n.h.root.position.z - p.z) * 1.4);
      if (d < 1.5 && d < bd) {
        bd = d;
        best = { type: 'npc', npc: n, verb: '交談', name: n.def.name };
      }
    }
    for (const d of this.area.doors) {
      const dist = Math.hypot(d.x - p.x, (d.z - p.z) * 0.6);
      if (dist < 1.3 && dist < bd) {
        bd = dist;
        best = { type: 'door', door: d, verb: d.special ? '調查' : '進入', name: d.label };
      }
    }
    if (this.area.notebook && g.quests.stage(QUEST.id) === 1) {
      const nb = this.area.notebook.pos;
      const dist = Math.hypot(nb.x - p.x, nb.z - p.z);
      if (dist < 1.3 && dist < bd) {
        bd = dist;
        best = { type: 'notebook', verb: '調查', name: '青山的筆記本' };
      }
    }
    return best;
  }

  // ─────────────────────────── per frame ───────────────────────────

  _updateCamera(dt, snap = false) {
    const a = this.area;
    const c = a.cam;
    const p = this.player.pos;
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.6);
    const tx = THREE.MathUtils.clamp(p.x, c.xMin, c.xMax);
    this.camX += (tx - this.camX) * k;
    this.camZ += (p.z - this.camZ) * k;
    const talkGoal = this.talkTarget ? 1 : 0;
    this.talkK += (talkGoal - this.talkK) * (snap ? 1 : 1 - Math.exp(-dt * 3));
    if (this.talkTarget) this._lastTalk = this.talkTarget;
    const T = this._lastTalk || new THREE.Vector3(this.camX, c.lookY, 0);
    const fz = c.followZ || 0.15;
    const base = new THREE.Vector3(this.camX, c.y, c.z + this.camZ * fz);
    const combatOut = this.combatOn ? 0.8 : 0;
    const pushed = new THREE.Vector3(T.x, T.y + 0.35, T.z + c.z * 0.52);
    this.camera.position.lerpVectors(base, pushed, this.talkK * 0.55);
    this.camera.position.z += combatOut;
    this.camera.position.y += combatOut * 0.2;
    const s = this.game.save.settings;
    const t = this.game.time.elapsed;
    if (s.motionEffect) {
      this.camera.position.x += Math.sin(t * 0.3) * 0.03;
      this.camera.position.y += Math.sin(t * 0.43) * 0.015;
    }
    this.camera.position.add(this.game.shakeOffset);
    const look = new THREE.Vector3(this.camX, c.lookY, c.lookZ);
    look.lerp(T, this.talkK * 0.6);
    this.camera.lookAt(look);
    // focus on the player (or the conversation)
    const focusPt = this.talkK > 0.05 ? T : new THREE.Vector3(p.x, 1.1, p.z);
    this.game.post.focusOverride = this.camera.position.distanceTo(focusPt);
    this.game.post.target.dof.range = PROFILES[a.id].dof.range * (1 - this.talkK * 0.65);
    this.game.post.set('dofBoost', this.talkK * 0.6);
    // sun follows the camera so its shadow frustum stays tight
    const sd = a.sunDir;
    this.sun.target.position.set(this.camX, 0, 0);
    this.sun.position.set(this.camX - sd.x * 30, -sd.y * 30, -sd.z * 30);
  }

  _lightCharacter(h, t) {
    const a = this.area;
    const lit = a.lightAt(h.root.position);
    const u = h.rig.material.uniforms;
    u.ambient.value.copy(COOL[a.id]).lerp(WARM[a.id], lit);
    if (this.combatOn) u.ambient.value.multiplyScalar(0.85);
    u.rimStrength.value = 0.22 + lit * 0.6;
    u.time.value = t;
  }

  update(time) {
    const g = this.game;
    const dt = time.worldDt;
    const pdt = time.playerDt;
    const real = time.realDt;
    const t = time.elapsed;
    const a = this.area;
    if (!a) return;

    this.player.update(pdt, real, g.input, a, this.enemies);
    if (this.player.state === 'dead' && !this._downShown) {
      this._downShown = true;
      this._playerDown();
    }
    if (this.player.state !== 'dead') this._downShown = false;
    this._lightCharacter(this.player.h, t);

    // NPCs: idle / patrol / face the player
    for (const n of this.npcs) {
      if (n.def.area !== a.id) continue;
      const h = n.h;
      const dx = this.player.pos.x - h.root.position.x;
      const dist = Math.abs(dx) + Math.abs(this.player.pos.z - h.root.position.z);
      if (n.def.patrol && !n.talking && dist > 2.2) {
        const [x0, x1] = n.def.patrol;
        h.root.position.x += n.dir * 0.8 * dt;
        if (h.root.position.x > x1) n.dir = -1;
        if (h.root.position.x < x0) n.dir = 1;
        h.setFacing(n.dir);
        h.move(0.8, n.dir * 0.8);
      } else {
        h.move(0);
        if (dist < 3.2 && !n.talking) {
          h.setFacing(Math.sign(dx) || 1);
          h.lookAt(0.6);
        } else h.lookAt(0);
      }
      h.update(dt);
      this._lightCharacter(h, t);
      const near = this.nearest && this.nearest.npc === n && !g.dialogue.active;
      const sm = n.sprite.material;
      sm.opacity += ((near ? 1 : dist < 4 ? 0.35 : 0) - sm.opacity) * Math.min(1, real * 8);
      n.sprite.position.y = 1.95 * (n.def.scale || 1) + Math.sin(t * 3) * 0.03;
      n.sprite.scale.setScalar(near ? 0.3 : 0.22);
    }
    if (this.yuki.root.visible) {
      this.yuki.update(dt);
      this._lightCharacter(this.yuki, t);
    }
    if (a.id === 'library') {
      for (const e of this.enemies) {
        e.update(dt, real);
        if (e.shown) {
          const u = e.h.rig.material.uniforms;
          u.ambient.value.setRGB(0.5, 0.45, 0.5);
        }
      }
      // separation
      for (let i = 0; i < this.enemies.length; i++) {
        for (let j = i + 1; j < this.enemies.length; j++) {
          const A = this.enemies[i];
          const B = this.enemies[j];
          if (!A.alive || !B.alive) continue;
          const dx = B.pos.x - A.pos.x;
          const dz = B.pos.z - A.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.8 && d > 0.001) {
            const push = (0.8 - d) * 0.5;
            A.pos.x -= (dx / d) * push;
            B.pos.x += (dx / d) * push;
          }
        }
        const e = this.enemies[i];
        e.pos.x = THREE.MathUtils.clamp(e.pos.x, a.bounds.xMin, a.bounds.xMax);
        e.pos.z = THREE.MathUtils.clamp(e.pos.z, a.bounds.zMin, a.bounds.zMax);
      }
      a.archiveDoor.glow.intensity = this.flags.done ? 0 : g.quests.stage(QUEST.id) >= 2 ? a.archiveDoor.glow.intensity : 0.6 + Math.sin(t * 2) * 0.4;
    }

    // interaction prompt
    this.nearest = !g.dialogue.active && !this.player.locked && !this.combatOn ? this._findNearest() : this.combatOn ? null : null;
    if (this.combatOn) this.nearest = null;
    this.hud.prompt(this.nearest ? this.nearest.verb : null, this.nearest ? this.nearest.name : '');
    // cursor language: talk near NPCs, enter near doors, aim in combat
    if (!g.ui.hasModal && !g.dialogue.active) {
      if (this.combatOn) g.cursor.set('aim');
      else if (this.nearest && this.nearest.type === 'npc') g.cursor.set('talk', `<b>E</b>${this.nearest.name}`);
      else if (this.nearest && this.nearest.type === 'door') g.cursor.set('enter', `<b>E</b>${this.nearest.name}`);
      else if (this.nearest) g.cursor.set('pick', `<b>E</b>${this.nearest.name}`);
      else g.cursor.set('default');
    } else g.cursor.set('default');

    // world
    a.update(t);
    this._updateCamera(real);
    for (const s of a.shafts) orientShaft(s, this.camera);
    this.fx.particles.update(dt > 0 ? dt : real * 0.1);
    this.fx.slash.update(real);
    this.hud.update(this.player, real);

    // in-game clock 16:30 → 17:30 (one minute every 8 seconds)
    this.clockMin = Math.min(89, 30 + t / 8);
    const hh = 16 + Math.floor(this.clockMin / 60);
    this.hud.setTime(hh, Math.floor(this.clockMin % 60));
  }

  dispose() {
    for (const k of Object.keys(this.areas)) this.scene.add(this.areas[k].group);
    super.dispose();
    this.player.dispose();
    this.npcs.forEach((n) => n.h.dispose());
    this.enemies.forEach((e) => e.dispose());
    this.yuki.dispose();
    this.fx.particles.dispose();
    for (const k of Object.keys(this.res || {})) this.res[k].dispose && this.res[k].dispose();
  }
}
