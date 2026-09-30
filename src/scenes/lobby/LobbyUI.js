import gsap from 'gsap';
import { ICON } from '../../ui/icons.js';
import { emblemSVG } from '../../ui/emblem.js';
import { paintPhoto } from '../../art/illustrations.js';
import { SettingsPanel } from '../../ui/SettingsPanel.js';
import { confirmDialog } from '../../ui/ConfirmDialog.js';
import { LettersPanel, CollectionPanel, ArchivesPanel, MissionsPanel, ProfilePanel, LETTERS } from './panels.js';

const HEADLINES = [
  ['號外', '暮見高校二年級學生放學後失蹤,最後目擊地點為舊圖書館'],
  ['EXTRA', 'SLIMES STEAL THREE MOONLIGHT SEEDS FROM THE BLACK FOREST'],
  ['徵人', '時光檔案館誠徵勇敢的旅人 · 待遇面議 · 雨天亦可'],
  ['NOTICE', 'THE CLOCK TOWER STRUCK THIRTEEN AT MIDNIGHT — WITNESSES CONFUSED'],
  ['天氣', '全日有雨 · 夜間轉大雨 · 請攜帶雨傘與懷錶'],
  ['BULLETIN', 'FOREST SPIRIT SEEKS ASSISTANCE · REWARD: ONE CHARM OF THE WOOD'],
];

const pad = (n) => String(n).padStart(2, '0');

/**
 * Collage-style lobby HUD: tickets, files, photos and slips overlapping in an
 * asymmetric editorial layout.
 */
export class LobbyUI {
  constructor(game, scene) {
    this.game = game;
    this.scene = scene;
    const save = game.save.data;
    const unread = LETTERS.filter((l) => !save.letters.read.includes(l.id)).length;
    const p = save.profile;
    const expPct = Math.min(100, (p.exp / game.save.expToNext()) * 100);
    const activeQuests = Object.values(save.quests).filter((q) => q.status !== 'complete').length;
    const doneQuests = Object.values(save.quests).filter((q) => q.status === 'complete').length;

    const el = document.createElement('div');
    el.className = 'lobby';
    el.innerHTML = `
      <header class="lb-mast">
        <div class="lb-mast__top t-cond"><span>VOL. VII</span><i></i><span>THE PRIVATE ARCHIVE</span></div>
        <div class="lb-mast__title t-title">Chrono Archive</div>
        <div class="lb-mast__zh">時光檔案館 <span>·</span> 私人檔案室</div>
      </header>

      <section class="lb-left">
        <div class="lb-id-slot"></div>
        <div class="lb-letters-slot"></div>
        <div class="lb-missions-slot"></div>
      </section>

      <section class="lb-status">
        <div class="lb-status__date">
          <span class="lb-status__y t-mono">1929</span>
          <span class="lb-status__md t-title"></span>
        </div>
        <div class="lb-status__sep"></div>
        <div class="lb-status__time t-mono"></div>
        <div class="lb-status__sep"></div>
        <div class="lb-status__wx"><span class="lb-ico">${ICON.rain}</span><span class="t-cond">RAIN</span><span class="t-zh">雨</span></div>
      </section>

      <section class="lb-right">
        <div class="lb-ticket-slot"></div>
        <div class="lb-folder-slot"></div>
        <div class="lb-photos-slot"></div>
      </section>

      <div class="lb-tools"></div>

      <footer class="lb-ticker paper">
        <div class="lb-ticker__tag paper--dark t-cond">EXTRA<span>號外</span></div>
        <div class="lb-ticker__track"><div class="lb-ticker__run"></div></div>
      </footer>

      <div class="lb-hint t-cond"><span class="keycap">ESC</span>SETTINGS · 設定 &nbsp;&nbsp; <span class="keycap">◎</span>CLICK OBJECTS IN THE ROOM · 點擊房間物件</div>
    `;
    this.el = el;
    const ui = game.ui;

    // ── ID card (profile)
    const id = ui.button({
      className: 'lb-id',
      html: `
        <span class="lb-id__card paper--cream">
          <span class="lb-id__band paper--dark t-cond"><span>TRAVELLER'S PASS</span><span>旅行證</span></span>
          <span class="lb-id__photo"><img src="${scene.portraitURL}" alt=""><span class="lb-id__photo-edge"></span></span>
          <span class="lb-id__info">
            <span class="lb-id__label t-cond">NAME · 姓名</span>
            <span class="lb-id__name">${p.name}</span>
            <span class="lb-id__row">
              <span class="lb-id__lv"><span class="t-cond">LV.</span><b class="t-title">${p.level}</b></span>
              <span class="lb-id__exp"><span class="lb-id__exp-bar"><i style="width:${expPct}%"></i></span><span class="t-mono">${p.exp}/${game.save.expToNext()} EXP</span></span>
            </span>
            <span class="lb-id__no t-mono">${p.id}</span>
          </span>
          <span class="stamp lb-id__stamp">VALID</span>
          <span class="lb-id__edit ico-shift">${ICON.pen}</span>
        </span>
        <span class="clip lb-id__clip"></span>`,
      sfx: ['hover_paper', 'click_photo'],
      label: '<b>個人檔案</b>PROFILE',
      magnet: 4,
      onClick: () => this.openProfile(),
    });
    el.querySelector('.lb-id-slot').appendChild(id);

    // ── letters envelope
    const letters = ui.button({
      className: 'lb-letters',
      html: `
        <span class="lb-letters__env paper">
          <span class="lb-letters__flap"></span>
          <span class="lb-letters__seal"><span>${ICON.seal}</span></span>
          <span class="lb-letters__txt">
            <span class="lb-letters__zh">信件</span>
            <span class="lb-letters__en t-cond ls">LETTERS</span>
          </span>
          <span class="lb-letters__stampbox"><span class="t-mono">2¢</span></span>
          <span class="lb-letters__count ${unread ? '' : 'is-zero'}"><b class="t-title">${unread}</b><span class="t-cond">UNREAD</span></span>
        </span>`,
      sfx: ['hover_paper', 'click_paper'],
      label: '<b>閱讀</b>READ',
      onClick: () => this.openLetters(),
    });
    el.querySelector('.lb-letters-slot').appendChild(letters);

    // ── missions note
    const qs = Object.entries(save.quests);
    const missions = ui.button({
      className: 'lb-missions',
      html: `
        <span class="lb-missions__note paper--cream">
          <span class="tape lb-missions__tape"></span>
          <span class="lb-missions__head"><span class="lb-missions__zh">任務</span><span class="t-cond ls">MISSIONS</span><span class="lb-missions__cnt t-mono">${String(doneQuests).padStart(2, '0')}/02</span></span>
          <span class="lb-missions__list">
            ${this._missionRow('campus_missing', '消失的學生', '校園異聞', qs)}
            ${this._missionRow('forest_seeds', '月光種子', '黑森林試煉', qs)}
          </span>
          <span class="lb-missions__foot t-cond">${activeQuests ? 'CASES IN PROGRESS' : 'OPEN THE ARCHIVE TO BEGIN'}<span class="ico-shift">${ICON.arrow}</span></span>
        </span>`,
      sfx: ['hover_paper', 'click_folder'],
      label: '<b>任務</b>MISSIONS',
      onClick: () => this.openMissions(),
    });
    el.querySelector('.lb-missions-slot').appendChild(missions);

    // ── main ticket
    const ticket = ui.button({
      className: 'lb-ticket',
      html: `
        <span class="lb-ticket__paper paper--wine">
          <span class="lb-ticket__main">
            <span class="lb-ticket__admit t-cond ls">ADMIT ONE · 通行票</span>
            <span class="lb-ticket__title t-title">Mini&nbsp;Game<br>Archive</span>
            <span class="lb-ticket__zh">小遊戲檔案庫</span>
            <span class="lb-ticket__meta t-cond"><span>02 FILES DECLASSIFIED</span><span class="lb-ticket__go ico-shift">ENTER ${ICON.arrow}</span></span>
          </span>
          <span class="lb-ticket__perf"></span>
          <span class="lb-ticket__stub">
            <span class="lb-ticket__no t-mono">No.<br>0001</span>
            <span class="lb-ticket__emb">${emblemSVG({ size: 110, color: '#ecd9ab', rays: 24 })}</span>
            <span class="lb-ticket__row t-cond">ROW&nbsp;VII</span>
          </span>
          <span class="lb-ticket__notch lb-ticket__notch--t"></span>
          <span class="lb-ticket__notch lb-ticket__notch--b"></span>
        </span>`,
      sfx: ['hover_ticket', 'click_ticket'],
      label: '<b>進入</b>ENTER',
      magnet: 7,
      scale: 1.025,
      onClick: () => {
        const r = ticket.getBoundingClientRect();
        game.goArchive(r);
      },
    });
    el.querySelector('.lb-ticket-slot').appendChild(ticket);
    this.ticketEl = ticket;

    // ── collection folder
    const folder = ui.button({
      className: 'lb-folder',
      html: `
        <span class="lb-folder__tab paper--kraft t-cond">No. 07</span>
        <span class="lb-folder__body paper--kraft">
          <span class="lb-folder__lines"></span>
          <span class="lb-folder__zh">收藏</span>
          <span class="lb-folder__en t-title">Collection</span>
          <span class="lb-folder__meta t-cond"><span>SPECIMENS & RELICS</span><span class="t-mono">${String(save.collection.length + 1).padStart(2, '0')} ITEMS</span></span>
          <span class="stamp lb-folder__stamp">CATALOGUED</span>
        </span>`,
      sfx: ['hover_paper', 'click_folder'],
      label: '<b>收藏</b>COLLECTION',
      onClick: () => this.openCollection(),
    });
    el.querySelector('.lb-folder-slot').appendChild(folder);

    // ── archives photos
    const photos = ui.button({
      className: 'lb-photos',
      html: `
        <span class="lb-photos__p lb-photos__p--3"></span>
        <span class="lb-photos__p lb-photos__p--2"></span>
        <span class="lb-photos__p lb-photos__p--1">
          <span class="lb-photos__img halftone"></span>
          <span class="lb-photos__cap"><span class="lb-photos__zh">檔案</span><span class="t-cond ls">ARCHIVES</span></span>
          <span class="lb-photos__sub t-italic">records of the journey</span>
        </span>`,
      sfx: ['hover_paper', 'click_photo'],
      label: '<b>紀錄</b>RECORDS',
      onClick: () => this.openArchives(),
    });
    el.querySelector('.lb-photos-slot').appendChild(photos);
    if (!LobbyUI.photoURL) LobbyUI.photoURL = paintPhoto('tower', 300, 380, 5).toDataURL('image/jpeg', 0.85);
    photos.querySelector('.lb-photos__img').style.backgroundImage = `url(${LobbyUI.photoURL}), var(--tex-halftone)`;

    // ── tools: settings gear + leave
    const tools = el.querySelector('.lb-tools');
    const gear = ui.button({
      className: 'lb-tool lb-tool--gear',
      html: `<span class="lb-tool__in"><span class="lb-tool__ico lb-gear">${ICON.gear}</span><span class="lb-tool__txt"><span class="t-zh">設定</span><span class="t-cond ls">SETTING</span></span></span>`,
      sfx: ['hover_metal', 'click_mech'],
      noShadow: true,
      onHover: (on) => gsap.to(gear.querySelector('.lb-gear'), { rotation: on ? 90 : 0, duration: 0.6, ease: 'back.out(2)' }),
      onClick: () => this.openSettings(),
    });
    const leave = ui.button({
      className: 'lb-tool',
      html: `<span class="lb-tool__in"><span class="lb-tool__ico ico-shift">${ICON.exit}</span><span class="lb-tool__txt"><span class="t-zh">離開</span><span class="t-cond ls">LEAVE</span></span></span>`,
      sfx: ['hover_metal', 'cancel'],
      noShadow: true,
      onClick: async () => {
        const ok = await confirmDialog(game, { title: 'Leave', titleZh: '離開檔案館', message: '要闔上檔案館,回到標題畫面嗎?<br><span class="t-cond">YOUR PROGRESS IS SAVED AUTOMATICALLY.</span>' });
        if (ok) window.location.reload();
      },
    });
    tools.append(gear, leave);

    // ticker text
    const run = el.querySelector('.lb-ticker__run');
    const html = HEADLINES.map(([tag, t]) => `<span class="lb-ticker__item"><b class="t-cond">${tag}</b>${t}</span><span class="lb-ticker__dot">◆</span>`).join('');
    run.innerHTML = html + html;
    this.tickerX = 0;

    this.dateEl = el.querySelector('.lb-status__md');
    this.timeEl = el.querySelector('.lb-status__time');
    this._clock();
    this._clockT = setInterval(() => this._clock(), 1000);
  }

  _missionRow(id, zh, game, qs) {
    const q = qs.find(([k]) => k === id);
    const st = q ? q[1].status : 'none';
    const mark = st === 'complete' ? '<span class="lb-mrow__st is-done">✓ SOLVED</span>' : st === 'active' ? '<span class="lb-mrow__st is-active">IN PROGRESS</span>' : '<span class="lb-mrow__st">UNOPENED</span>';
    return `<span class="lb-mrow ${st === 'complete' ? 'is-done' : ''}"><span class="lb-mrow__box"></span><span class="lb-mrow__t">${zh}<small>${game}</small></span>${mark}</span>`;
  }

  _clock() {
    const d = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    this.dateEl.textContent = `${months[d.getMonth()]} ${pad(d.getDate())}`;
    this.timeEl.innerHTML = `${pad(d.getHours())}<i>:</i>${pad(d.getMinutes())}`;
  }

  intro(delay = 0) {
    const q = (s) => this.el.querySelectorAll(s);
    const a = this.game.audio;
    const tl = gsap.timeline({ delay });
    gsap.set(this.el, { opacity: 1 });
    tl.fromTo(q('.lb-mast'), { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0)
      .fromTo(q('.lb-id'), { opacity: 0, x: -140, rotation: -10 }, { opacity: 1, x: 0, rotation: 0, duration: 0.9, ease: 'expo.out', onStart: () => a.play('hover_paper') }, 0.1)
      .fromTo(q('.lb-letters'), { opacity: 0, x: -120, rotation: 12 }, { opacity: 1, x: 0, rotation: 0, duration: 0.85, ease: 'expo.out', onStart: () => a.play('hover_paper') }, 0.22)
      .fromTo(q('.lb-missions'), { opacity: 0, x: -120, rotation: -8 }, { opacity: 1, x: 0, rotation: 0, duration: 0.85, ease: 'expo.out', onStart: () => a.play('hover_paper') }, 0.32)
      .fromTo(q('.lb-status'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.2)
      .fromTo(q('.lb-ticket'), { opacity: 0, y: -160, rotation: 14, scale: 1.1 }, { opacity: 1, y: 0, rotation: 0, scale: 1, duration: 1.0, ease: 'back.out(1.3)', onStart: () => a.play('hover_ticket') }, 0.3)
      .fromTo(q('.lb-folder'), { opacity: 0, y: -140, rotation: -12 }, { opacity: 1, y: 0, rotation: 0, duration: 0.9, ease: 'back.out(1.2)', onStart: () => a.play('hover_paper') }, 0.45)
      .fromTo(q('.lb-photos'), { opacity: 0, y: -140, rotation: 16 }, { opacity: 1, y: 0, rotation: 0, duration: 0.9, ease: 'back.out(1.2)', onStart: () => a.play('click_photo') }, 0.55)
      .fromTo(q('.lb-tool'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 0.7)
      .fromTo(q('.lb-ticker'), { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.6)
      .fromTo(q('.lb-hint'), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.1)
      .fromTo(q('.lb-id__stamp, .lb-folder__stamp'), { opacity: 0, scale: 2.2 }, { opacity: 0.72, scale: 1, duration: 0.22, stagger: 0.18, ease: 'back.out(2)', onStart: () => a.play('click_stamp') }, 1.2);
  }

  update(dt) {
    this.tickerX -= dt * 60;
    const run = this.el.querySelector('.lb-ticker__run');
    const half = run.scrollWidth / 2;
    if (half > 0 && -this.tickerX > half) this.tickerX += half;
    run.style.transform = `translateX(${this.tickerX}px)`;
  }

  openSettings() {
    new SettingsPanel(this.game).open();
  }

  openLetters() {
    const p = new LettersPanel(this.game);
    const orig = p.onClose && p.onClose.bind(p);
    p.onClose = () => {
      if (orig) orig();
      this.refresh();
    };
    p.open();
  }

  openCollection() {
    new CollectionPanel(this.game).open();
  }

  openArchives() {
    new ArchivesPanel(this.game).open();
  }

  openMissions() {
    new MissionsPanel(this.game).open();
  }

  openProfile() {
    const p = new ProfilePanel(this.game);
    const orig = p.onClose && p.onClose.bind(p);
    p.onClose = () => {
      if (orig) orig();
      this.refresh();
    };
    p.open();
  }

  /** Update counters after panels changed data. */
  refresh() {
    const save = this.game.save.data;
    const unread = LETTERS.filter((l) => !save.letters.read.includes(l.id)).length;
    const cnt = this.el.querySelector('.lb-letters__count');
    cnt.querySelector('b').textContent = unread;
    cnt.classList.toggle('is-zero', !unread);
    this.el.querySelector('.lb-id__name').textContent = save.profile.name;
  }

  destroy() {
    clearInterval(this._clockT);
  }
}
