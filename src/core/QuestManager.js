import gsap from 'gsap';

/**
 * Quests with objectives. Each quest:
 *   { id, title, titleEn, game, objectives: [{ id, text, textEn, target=1 }] }
 * The tracker lives in the HUD of the running game; completion shows a
 * platform-styled "QUEST COMPLETE" slip and records into the save.
 */
export class QuestManager {
  constructor(game) {
    this.game = game;
    this.defs = new Map();
    this.state = new Map(); // id -> { stage, counts:{}, done }
    this.trackerEl = null;
    this.listeners = new Set();
  }

  define(q) {
    this.defs.set(q.id, q);
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(type, id, extra) {
    for (const fn of this.listeners) fn(type, id, extra);
  }

  start(id) {
    const q = this.defs.get(id);
    if (!q) return;
    this.state.set(id, { stage: 0, counts: {}, done: false });
    const saved = this.game.save.data.quests;
    saved[id] = { ...(saved[id] || {}), status: saved[id]?.status === 'complete' ? 'complete' : 'active', title: q.title, titleEn: q.titleEn, game: q.game };
    this.game.save.save();
    this.render(true);
    this._emit('start', id);
    this.game.audio.play('clue');
    this.banner('NEW MISSION', '新任務', q.title, q.titleEn, 'start');
  }

  reset(id) {
    this.state.delete(id);
    this.render();
  }

  isActive(id) {
    const s = this.state.get(id);
    return !!s && !s.done;
  }

  stage(id) {
    const s = this.state.get(id);
    return s ? s.stage : -1;
  }

  current(id) {
    const q = this.defs.get(id);
    const s = this.state.get(id);
    if (!q || !s) return null;
    return q.objectives[s.stage];
  }

  count(id, objId) {
    const s = this.state.get(id);
    return s ? s.counts[objId] || 0 : 0;
  }

  /** Progress the current objective; advances the stage when target reached. */
  progress(id, objId, n = 1) {
    const q = this.defs.get(id);
    const s = this.state.get(id);
    if (!q || !s || s.done) return;
    const obj = q.objectives[s.stage];
    if (!obj || obj.id !== objId) return;
    s.counts[objId] = (s.counts[objId] || 0) + n;
    const target = obj.target || 1;
    this.render(false, true);
    this._emit('progress', id, { objId, count: s.counts[objId], target });
    if (s.counts[objId] >= target) this.advance(id);
  }

  advance(id) {
    const q = this.defs.get(id);
    const s = this.state.get(id);
    if (!q || !s || s.done) return;
    s.stage++;
    if (s.stage >= q.objectives.length) {
      this.complete(id);
      return;
    }
    this.game.audio.play('interact');
    this.render(true);
    this._emit('stage', id, s.stage);
  }

  complete(id) {
    const q = this.defs.get(id);
    const s = this.state.get(id);
    if (!q || !s) return;
    s.done = true;
    const save = this.game.save;
    const firstTime = save.data.quests[id]?.status !== 'complete';
    save.data.quests[id] = { status: 'complete', title: q.title, titleEn: q.titleEn, game: q.game, date: Date.now() };
    if (firstTime) save.stat('questsCompleted');
    if (q.reward) save.addItem(q.reward);
    const leveled = save.addExp(q.exp || 250);
    this.render(true);
    this._emit('complete', id);
    this.game.audio.play('quest_complete');
    this.banner('QUEST COMPLETE', '任務完成', q.title, q.titleEn, 'complete', q.reward, leveled);
  }

  // ─────────────────────────── HUD tracker ───────────────────────────

  mountTracker(parent) {
    this.trackerEl = document.createElement('div');
    this.trackerEl.className = 'qtrack';
    parent.appendChild(this.trackerEl);
    this.render();
  }

  render(animate = false, bump = false) {
    if (!this.trackerEl) return;
    const active = [...this.state.entries()].filter(([, s]) => !s.done);
    const done = [...this.state.entries()].filter(([, s]) => s.done);
    const rows = [...active, ...done].slice(0, 2);
    if (!rows.length) {
      this.trackerEl.innerHTML = '';
      return;
    }
    this.trackerEl.innerHTML = rows
      .map(([id, s]) => {
        const q = this.defs.get(id);
        const obj = q.objectives[Math.min(s.stage, q.objectives.length - 1)];
        const target = obj.target || 1;
        const cnt = s.counts[obj.id] || 0;
        return `<div class="qtrack__card ${s.done ? 'is-done' : ''}">
          <div class="qtrack__tag t-cond"><span>${s.done ? 'COMPLETE' : 'MISSION'}</span><span class="t-mono">${String(Math.min(s.stage + 1, q.objectives.length)).padStart(2, '0')}/${String(q.objectives.length).padStart(2, '0')}</span></div>
          <div class="qtrack__title">${q.title}</div>
          <div class="qtrack__obj">${s.done ? '— 已完成 —' : obj.text}${!s.done && target > 1 ? ` <span class="qtrack__count t-mono">${cnt}/${target}</span>` : ''}</div>
          ${!s.done && obj.textEn ? `<div class="qtrack__en t-cond">${obj.textEn}</div>` : ''}
        </div>`;
      })
      .join('');
    if (animate) gsap.fromTo(this.trackerEl.querySelectorAll('.qtrack__card'), { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.08 });
    if (bump) {
      const c = this.trackerEl.querySelector('.qtrack__count');
      if (c) gsap.fromTo(c, { scale: 1.6, color: '#dcc084' }, { scale: 1, color: 'inherit', duration: 0.5, ease: 'back.out(3)' });
    }
  }

  /** Large centred slip announcing mission start / completion. */
  banner(en, zh, title, titleEn, kind = 'complete', reward = null, leveled = false) {
    const el = document.createElement('div');
    el.className = `qbanner qbanner--${kind}`;
    el.innerHTML = `
      <div class="qbanner__slip paper--cream">
        <div class="qbanner__edge"></div>
        <div class="qbanner__head t-cond"><span>${kind === 'complete' ? 'CASE CLOSED' : 'CASE OPENED'}</span><span class="qbanner__dots"></span><span>CHRONO ARCHIVE</span></div>
        <div class="qbanner__en t-title">${en}</div>
        <div class="qbanner__zh">${zh}</div>
        <div class="qbanner__title">「${title}」<span class="t-cond">${titleEn || ''}</span></div>
        ${reward ? `<div class="qbanner__reward"><span class="t-cond">REWARD · 獲得</span><b>${reward.name}</b><span class="t-cond">${reward.nameEn || ''}</span></div>` : ''}
        ${leveled ? `<div class="qbanner__lv t-cond">LEVEL UP · 等級提升 → LV.${this.game.save.data.profile.level}</div>` : ''}
        ${kind === 'complete' ? '<div class="stamp qbanner__stamp">SOLVED · 解決</div>' : ''}
      </div>`;
    document.getElementById('toast-layer').appendChild(el);
    const slip = el.querySelector('.qbanner__slip');
    const tl = gsap.timeline({ onComplete: () => el.remove() });
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo(slip, { y: 60, rotation: -6, scale: 0.9 }, { y: 0, rotation: -1.5, scale: 1, duration: 0.7, ease: 'expo.out' }, 0)
      .fromTo(el.querySelectorAll('.qbanner__en, .qbanner__zh, .qbanner__title, .qbanner__reward, .qbanner__lv'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.4 }, 0.2);
    const st = el.querySelector('.qbanner__stamp');
    if (st) tl.fromTo(st, { opacity: 0, scale: 2.4, rotation: -30 }, { opacity: 0.85, scale: 1, rotation: -12, duration: 0.25, ease: 'back.out(2)', onStart: () => this.game.audio.play('click_stamp') }, 0.75);
    tl.to(slip, { y: -30, opacity: 0, rotation: 2, duration: 0.5, ease: 'power3.in' }, kind === 'complete' ? 3.6 : 2.3).to(el, { opacity: 0, duration: 0.3 }, '<0.2');
  }
}
