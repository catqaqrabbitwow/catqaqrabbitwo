import gsap from 'gsap';
import { Panel } from '../../ui/Panel.js';
import { ICON } from '../../ui/icons.js';
import { confirmDialog } from '../../ui/ConfirmDialog.js';

export const LETTERS = [
  {
    id: 'welcome',
    from: '檔案管理員',
    fromEn: 'The Archivist',
    date: '10.30',
    title: '致新任的鐘點看守人',
    body: `親愛的旅人:<br><br>歡迎來到時光檔案館。這個房間不屬於任何一個年代,所以雨會一直下,唱片也不會停。<br><br>房間右側的票券能帶你進入「小遊戲檔案庫」。每一份檔案,都是一段被遺落的時間。請挑一份打開它,解決裡面的事件,再把結果帶回來。<br><br>房間裡的東西大多可以碰——留聲機、收音機、時鐘、電視、牆上的線索板。若累了,就停下來聽聽雨吧。`,
    sign: '— A.',
  },
  {
    id: 'kuremi',
    from: '暮見高校 · 匿名',
    fromEn: 'Kuremi High · Anonymous',
    date: '10.29',
    title: '請找到她',
    body: `我不知道該寄給誰,只好寄到這裡。<br><br>二年B組的同學,放學後就不見了。最後看到她的人說,她往圖書館的方向走去。可是舊圖書館的資料室,已經鎖了好多年。<br><br>夕陽落下以前,走廊上的影子會變得很長很長。拜託你,請在天黑以前找到她。`,
    sign: '— 一個還在等待的人',
  },
  {
    id: 'forest',
    from: '黑森林郵差',
    fromEn: 'Postman of the Black Wood',
    date: '10.27',
    title: '月亮忘記升起的夜晚',
    body: `嘿,是你嗎?森林精靈託我帶句話:<br><br>「三顆月光種子被史萊姆偷走了。沒有種子,月亮就不會回來。」<br><br>那些黏呼呼的傢伙一碰到就會彈開,記得用翻滾閃過牠們的撲擊。巢穴深處據說住著一隻紫色的大傢伙……祝你好運,小小的旅人。`,
    sign: '— P.S. 帶上一把好劍',
  },
  {
    id: 'manual',
    from: '時光檔案館',
    fromEn: 'Chrono Archive',
    date: '—',
    title: '操作說明書(第七版)',
    body: `<b>校園異聞</b>:A / D 左右移動,W / S 在部分區域前後移動,E 互動與對話。左鍵或 J 攻擊(三段連擊),Shift 閃避,Space 發動「時間裂痕」。<br><br><b>黑森林試煉</b>:WASD 移動,左鍵三段攻擊,右鍵重擊,Shift 翻滾,Space「黑暗爆發」,E 互動。<br><br>任何時候按 ESC 開啟選單,可調整設定或返回大廳。`,
    sign: '— 檔案館總務處',
  },
];

export const CATALOG = [
  { id: 'watch', name: '旅人懷錶', nameEn: "Traveller's Pocket Watch", icon: 'watch', desc: '指針永遠停在十一點五十九分。據說只要還握著它,就不會迷失在時間裡。', always: true },
  { id: 'library_key', name: '舊圖書館鑰匙', nameEn: 'Key to the Old Library', icon: 'key', desc: '從消失的學生手中取回的黃銅鑰匙。上面刻著「資料室 · 1929」。', from: '校園異聞' },
  { id: 'forest_charm', name: '森林護符', nameEn: 'Charm of the Wood', icon: 'leaf', desc: '森林精靈用月光種子的碎片編成的護符。夜裡會發出微弱的綠光。', from: '黑森林試煉' },
  { id: 'sealed_1', name: '？？？', nameEn: 'SEALED', icon: 'lock', desc: '尚未解密的檔案。', sealed: true },
  { id: 'sealed_2', name: '？？？', nameEn: 'SEALED', icon: 'lock', desc: '尚未解密的檔案。', sealed: true },
];

// ───────────────────────────── Letters ─────────────────────────────
export class LettersPanel extends Panel {
  constructor(game) {
    super(game, { className: 'letters', formNo: 'L-02', title: 'Correspondence', titleZh: '信件 · 往來書簡', width: 118 });
    const save = game.save.data;
    this.content.innerHTML = `<div class="letters__grid"><div class="letters__list"></div><article class="letters__read paper--cream"></article></div>`;
    const list = this.content.querySelector('.letters__list');
    this.reader = this.content.querySelector('.letters__read');
    this.items = LETTERS.map((L, i) => {
      const unread = !save.letters.read.includes(L.id);
      const b = game.ui.button({
        className: `letters__item stagger ${unread ? 'is-unread' : ''}`,
        html: `<span class="letters__item-in"><span class="letters__dot"></span><span class="letters__from">${L.from}<small class="t-cond">${L.fromEn}</small></span><span class="letters__title">${L.title}</span><span class="letters__date t-mono">${L.date}</span></span>`,
        sfx: ['hover_tick', 'page'],
        noShadow: true,
        magnet: 3,
        onClick: () => this.show(i),
      });
      list.appendChild(b);
      return b;
    });
    this.foot.innerHTML = '<span class="panel__foot-note">ALL LETTERS ARE KEPT IN THE ARCHIVE · 所有信件都會被保存</span>';
    this.show(LETTERS.findIndex((L) => !save.letters.read.includes(L.id)) >= 0 ? LETTERS.findIndex((L) => !save.letters.read.includes(L.id)) : 0, false);
  }

  show(i, anim = true) {
    const L = LETTERS[i];
    const save = this.game.save.data;
    if (!save.letters.read.includes(L.id)) {
      save.letters.read.push(L.id);
      this.game.save.save();
    }
    this.items.forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      if (k === i) b.classList.remove('is-unread');
    });
    this.reader.innerHTML = `
      <div class="letters__head"><span class="t-cond">FROM · ${L.fromEn.toUpperCase()}</span><span class="t-mono">${L.date}</span></div>
      <h3 class="letters__h">${L.title}</h3>
      <div class="letters__body">${L.body}</div>
      <div class="letters__sign t-italic">${L.sign}</div>
      <div class="stamp stamp--round letters__pm t-cond">CHRONO<br>POST<br>1929</div>`;
    if (anim) gsap.fromTo(this.reader, { opacity: 0, y: 12, rotation: 0.8 }, { opacity: 1, y: 0, rotation: 0, duration: 0.45, ease: 'power3.out' });
  }
}

// ───────────────────────────── Collection ─────────────────────────────
export class CollectionPanel extends Panel {
  constructor(game) {
    super(game, { className: 'collection', formNo: 'C-07', title: 'Collection', titleZh: '收藏 · 標本與遺物', subtitle: 'Objects recovered from other hours.', width: 124 });
    const save = game.save;
    this.content.innerHTML = `<div class="coll__grid"></div><div class="coll__detail paper--cream"></div>`;
    const grid = this.content.querySelector('.coll__grid');
    this.detail = this.content.querySelector('.coll__detail');
    this.cards = CATALOG.map((it, i) => {
      const owned = it.always || save.hasItem(it.id);
      const b = game.ui.button({
        className: `coll__card stagger ${owned ? '' : 'is-locked'} ${it.sealed ? 'is-sealed' : ''}`,
        html: `<span class="coll__card-in paper">
            <span class="coll__no t-mono">No.${String(i + 1).padStart(3, '0')}</span>
            <span class="coll__ico">${ICON[it.icon]}</span>
            <span class="coll__name">${owned ? it.name : '？？？'}</span>
            <span class="coll__en t-cond">${owned ? it.nameEn : it.sealed ? 'SEALED FILE' : 'NOT YET RECOVERED'}</span>
            ${owned ? '' : '<span class="coll__lock">' + ICON.lock + '</span>'}
          </span>`,
        sfx: ['hover_paper', 'click_paper'],
        magnet: 4,
        scale: 1.04,
        onClick: () => this.show(i),
      });
      b.style.setProperty('--r', `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg`);
      grid.appendChild(b);
      return b;
    });
    this.save = save;
    this.show(0, false);
    this.foot.innerHTML = `<span class="panel__foot-note">${CATALOG.filter((c) => c.always || save.hasItem(c.id)).length} / ${CATALOG.length} RECOVERED · 已收集</span>`;
  }

  show(i, anim = true) {
    const it = CATALOG[i];
    const owned = it.always || this.save.hasItem(it.id);
    this.cards.forEach((c, k) => c.classList.toggle('is-on', k === i));
    this.detail.innerHTML = owned
      ? `<div class="coll__big-ico">${ICON[it.icon]}</div>
         <div class="coll__d-name">${it.name}</div>
         <div class="coll__d-en t-title">${it.nameEn}</div>
         <div class="rule--double"></div>
         <p class="coll__d-desc">${it.desc}</p>
         <div class="coll__d-from t-cond">${it.from ? `RECOVERED FROM · ${it.from}` : 'ISSUED BY THE ARCHIVE'}</div>`
      : `<div class="coll__big-ico is-locked">${ICON.lock}</div>
         <div class="coll__d-name">尚未取得</div>
         <div class="coll__d-en t-title">${it.sealed ? 'Sealed File' : 'Not Yet Recovered'}</div>
         <div class="rule--double"></div>
         <p class="coll__d-desc">${it.sealed ? '這份檔案仍在封存中,未來將會開放。' : `完成「${it.from}」的任務即可取得。`}</p>`;
    if (anim) gsap.fromTo(this.detail.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.35 });
  }
}

// ───────────────────────────── Archives (records) ─────────────────────────────
export class ArchivesPanel extends Panel {
  constructor(game) {
    super(game, { className: 'records', formNo: 'R-12', title: 'Records', titleZh: '檔案 · 旅程紀錄', subtitle: 'Every hour spent here is written down.', width: 112 });
    const d = game.save.data;
    const st = d.stats;
    const h = Math.floor(st.playSeconds / 3600);
    const m = Math.floor((st.playSeconds % 3600) / 60);
    const rows = [
      ['總遊玩時間', 'TIME IN THE ARCHIVE', `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`],
      ['造訪次數', 'VISITS', st.sessions],
      ['旅人等級', 'TRAVELLER LEVEL', `LV.${d.profile.level}`],
      ['解決案件', 'CASES SOLVED', st.questsCompleted],
      ['擊退之影', 'SHADOWS DISPELLED', st.shadowsDefeated],
      ['擊敗史萊姆', 'SLIMES DEFEATED', st.slimesDefeated],
      ['倒下次數', 'TIMES FALLEN', st.deaths],
      ['最後造訪', 'LAST FILE OPENED', st.lastGame === 'campus' ? '校園異聞' : st.lastGame === 'forest' ? '黑森林試煉' : '—'],
    ];
    const cases = [
      ['campus_missing', '消失的學生', 'The Missing Student', '校園異聞'],
      ['forest_seeds', '月光種子', 'The Moonlight Seeds', '黑森林試煉'],
    ];
    this.content.innerHTML = `
      <div class="records__grid">
        <table class="records__table">${rows.map((r) => `<tr class="stagger"><td><span class="t-zh">${r[0]}</span><small class="t-cond">${r[1]}</small></td><td class="records__dots"></td><td class="t-mono">${r[2]}</td></tr>`).join('')}</table>
        <div class="records__cases">
          <div class="records__cases-h t-cond">CASE LOG · 案件紀錄</div>
          ${cases
            .map(([id, zh, en, g]) => {
              const q = d.quests[id];
              const s = q ? q.status : 'none';
              return `<div class="records__case stagger ${s}"><span class="records__case-g t-cond">${g}</span><span class="records__case-t">${zh}<small class="t-italic">${en}</small></span><span class="records__case-s t-cond">${s === 'complete' ? 'SOLVED' : s === 'active' ? 'OPEN' : 'SEALED'}</span></div>`;
            })
            .join('')}
          <div class="records__note t-italic stagger">“The rain keeps the count when we forget.”</div>
        </div>
      </div>`;
    this.foot.innerHTML = `<span class="panel__foot-note">RECORD No.${d.profile.id}</span>`;
  }
}

// ───────────────────────────── Missions ─────────────────────────────
export class MissionsPanel extends Panel {
  constructor(game) {
    super(game, { className: 'missions', formNo: 'M-03', title: 'Missions', titleZh: '任務 · 委託清單', subtitle: 'Requests received by the archive.', width: 104 });
    const d = game.save.data;
    const list = [
      { id: 'campus_missing', game: 'campus', zh: '消失的學生', en: 'The Missing Student', file: '01 · 校園異聞', desc: '暮見高校二年B組的學生在放學後失蹤。向走廊上的同學打聽消息,在教室中找出線索,前往圖書館。', goal: '找到失蹤的學生' },
      { id: 'forest_seeds', game: 'forest', zh: '月光種子', en: 'The Moonlight Seeds', file: '02 · 黑森林試煉', desc: '史萊姆偷走了三顆月光種子。擊敗牠們取回種子,打開巢穴,擊倒紫色精英史萊姆。', goal: '取回月光種子 0/3' },
    ];
    const wrap = document.createElement('div');
    wrap.className = 'missions__list';
    list.forEach((q) => {
      const st = d.quests[q.id]?.status || 'none';
      const row = document.createElement('div');
      row.className = `missions__row stagger is-${st}`;
      row.innerHTML = `
        <div class="missions__file t-cond">${q.file}</div>
        <div class="missions__t">${q.zh}<small class="t-title">${q.en}</small></div>
        <p class="missions__desc">${q.desc}</p>
        <div class="missions__goal t-cond"><span>OBJECTIVE · 目標</span>${st === 'complete' ? '已完成 — CASE CLOSED' : q.goal}</div>`;
      const go = game.ui.button({
        className: 'doc-btn missions__go',
        html: `<span class="doc-btn__in"><span class="t-cond ls">${st === 'complete' ? 'REPLAY' : 'GO'}</span><span class="t-zh">${st === 'complete' ? '重玩' : '前往'}</span><span class="ico-shift" style="width:1.6rem;display:inline-block">${ICON.arrow}</span></span>`,
        sfx: ['hover_paper', 'click_ticket'],
        onClick: () => {
          const r = go.getBoundingClientRect();
          this.close();
          setTimeout(() => game.playGame(q.game, r), 150);
        },
      });
      row.appendChild(go);
      if (st === 'complete') row.insertAdjacentHTML('beforeend', '<div class="stamp missions__stamp">SOLVED · 解決</div>');
      wrap.appendChild(row);
    });
    this.content.appendChild(wrap);
    this.foot.innerHTML = '<span class="panel__foot-note">MORE REQUESTS WILL ARRIVE · 更多委託即將送達</span>';
  }
}

// ───────────────────────────── Profile ─────────────────────────────
export class ProfilePanel extends Panel {
  constructor(game) {
    super(game, { className: 'profile', formNo: 'P-01', title: 'Traveller', titleZh: '個人檔案 · 旅行證', width: 84 });
    const d = game.save.data;
    const p = d.profile;
    this.content.innerHTML = `
      <div class="profile__grid">
        <div class="profile__photo stagger"><img src="${game.scenes.current.portraitURL || ''}" alt=""></div>
        <div class="profile__fields">
          <label class="profile__field stagger"><span class="t-cond">NAME · 姓名</span><input class="profile__input interactive" maxlength="18" value="${p.name.replace(/"/g, '&quot;')}"></label>
          <div class="profile__field stagger"><span class="t-cond">LEVEL · 等級</span><b class="t-title">${p.level}</b></div>
          <div class="profile__field stagger"><span class="t-cond">EXPERIENCE · 經驗</span><span class="t-mono">${p.exp} / ${game.save.expToNext()}</span></div>
          <div class="profile__field stagger"><span class="t-cond">PASS No. · 證號</span><span class="t-mono">${p.id}</span></div>
        </div>
      </div>`;
    const input = this.content.querySelector('.profile__input');
    input.addEventListener('pointerenter', () => game.cursor.domEnter('<b>編輯</b>EDIT'));
    input.addEventListener('pointerleave', () => game.cursor.domLeave());
    input.addEventListener('input', () => game.audio.play('typewriter'));
    input.addEventListener('keydown', (e) => e.stopPropagation());
    this.input = input;
    const reset = game.ui.button({
      className: 'doc-btn doc-btn--ghost',
      html: `<span class="doc-btn__in"><span class="t-cond ls">ERASE RECORDS</span><span class="t-zh">清除紀錄</span></span>`,
      sfx: ['hover_tick', 'click_mech'],
      onClick: async () => {
        const ok = await confirmDialog(game, { title: 'Erase', titleZh: '清除紀錄', message: '所有任務、收藏與統計都將被清除(設定會保留)。<br><span class="t-cond">THIS CANNOT BE UNDONE.</span>' });
        if (ok) {
          game.save.resetAll();
          this.close();
          game.ui.toast('紀錄已清除', 'RECORDS ERASED', { tone: 'dark' });
        }
      },
    });
    const saveBtn = game.ui.button({
      className: 'doc-btn',
      html: `<span class="doc-btn__in"><span class="t-cond ls">SIGN</span><span class="t-zh">簽署</span></span>`,
      sfx: ['hover_paper', 'click_stamp'],
      onClick: () => this.close(),
    });
    const btns = document.createElement('div');
    btns.className = 'panel__foot-btns';
    btns.append(reset, saveBtn);
    this.foot.appendChild(btns);
  }

  onClose() {
    const v = this.input.value.trim();
    if (v && v !== this.game.save.data.profile.name) {
      this.game.save.data.profile.name = v;
      this.game.save.save();
      this.game.ui.toast('旅行證已更新', 'PASS UPDATED');
    }
  }
}
