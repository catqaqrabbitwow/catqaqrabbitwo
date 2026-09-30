import gsap from 'gsap';
import { emblemSVG, decoRule } from '../ui/emblem.js';
import { paintCorridorPhoto, paintForestIllustration } from '../art/illustrations.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Scene transitions. The outgoing scene darkens and loses focus, a file card
 * flies toward the camera until it fills the screen, the next scene loads
 * behind it (the card shows a "developing" illustration instead of a
 * percentage), then the card is wiped away.
 */
export class TransitionManager {
  constructor(game) {
    this.game = game;
    this.busy = false;
    this._illos = {};
  }

  _illo(key, fn) {
    if (!this._illos[key]) this._illos[key] = fn().toDataURL('image/jpeg', 0.9);
    return this._illos[key];
  }

  _content(style) {
    switch (style) {
      case 'archive':
        return {
          cls: 'tx-card--archive paper--dark',
          html: `
            <div class="txa">
              <div class="txa__emblem">${emblemSVG({ size: 300 })}</div>
              <div class="txa__meta t-cond">CHRONO ARCHIVE · INDEX CARD · No.0001</div>
              <div class="txa__title t-title">Mini Game Archive</div>
              <div class="txa__zh">小遊戲檔案庫</div>
              ${decoRule(26)}
              <div class="txa__rows t-mono">
                <div class="txa__row"><span>01</span><span>校園異聞 · CAMPUS ANOMALY</span><span>DECLASSIFIED</span></div>
                <div class="txa__row"><span>02</span><span>黑森林試煉 · TRIAL OF THE BLACK FOREST</span><span>DECLASSIFIED</span></div>
                <div class="txa__row"><span>03</span><span>███████ · SEALED</span><span>—</span></div>
                <div class="txa__row"><span>04</span><span>███████ · SEALED</span><span>—</span></div>
              </div>
            </div>`,
          min: 900,
          anim: (el) => {
            gsap.fromTo(el.querySelectorAll('.txa__row'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, stagger: 0.12, delay: 0.3, duration: 0.4 });
            gsap.to(el.querySelector('.emblem__rays'), { rotation: 90, svgOrigin: '150 150', duration: 6, ease: 'none' });
          },
        };
      case 'photo':
        return {
          cls: 'tx-card--photo paper--cream',
          html: `
            <div class="txp">
              <div class="txp__left">
                <div class="txp__photo"><img src="${this._illo('corridor', () => paintCorridorPhoto(900, 620, { sepia: 0.35 }))}" alt=""></div>
                <div class="txp__caption t-italic">Exhibit A — the west corridor, 17:04.</div>
                <div class="clip txp__clip"></div>
              </div>
              <div class="txp__right">
                <div class="txp__meta t-cond"><span>STUDENT FILE</span><span>No. 0412-B</span></div>
                <div class="txp__title">校園異聞</div>
                <div class="txp__en t-title">Campus Anomaly</div>
                <div class="rule--double"></div>
                <div class="txp__lines t-mono">
                  <div><b>CASE</b><span>消失的學生 · THE MISSING STUDENT</span></div>
                  <div><b>SITE</b><span>私立暮見高等學校 · 二年B組</span></div>
                  <div><b>TIME</b><span>放學後 16:30 — 17:30</span></div>
                  <div><b>NOTE</b><span>最後目擊地點:舊圖書館資料室?</span></div>
                </div>
                <div class="stamp txp__stamp">CONFIDENTIAL · 機密</div>
                <div class="txp__dev t-cond"><span class="txp__dev-dot"></span>DEVELOPING PRINT · 相片顯影中</div>
              </div>
            </div>`,
          min: 2000,
          anim: (el) => {
            const img = el.querySelector('.txp__photo img');
            gsap.fromTo(img, { filter: 'brightness(2.6) contrast(0.25) sepia(1) blur(3px)' }, { filter: 'brightness(1) contrast(1) sepia(0.25) blur(0px)', duration: 2.2, ease: 'power1.inOut' });
            gsap.fromTo(el.querySelectorAll('.txp__lines > div'), { opacity: 0 }, { opacity: 1, stagger: 0.28, delay: 0.4, duration: 0.2 });
            gsap.fromTo(el.querySelector('.txp__stamp'), { opacity: 0, scale: 2.2, rotation: -20 }, { opacity: 0.8, scale: 1, rotation: -9, delay: 1.5, duration: 0.25, ease: 'back.out(2)', onStart: () => this.game.audio.play('click_stamp') });
            this.game.audio.play('develop');
          },
        };
      case 'book':
        return {
          cls: 'tx-card--book',
          html: `
            <div class="txb">
              <div class="txb__book">
                <div class="txb__page txb__page--l paper">
                  <div class="txb__chapter t-cond">CHAPTER I</div>
                  <div class="txb__title t-title">Trial of the<br>Black Forest</div>
                  <div class="txb__zh">黑森林試煉</div>
                  ${decoRule(16)}
                  <p class="txb__text">月亮沉進林子的那一夜,<br>三顆月光種子被偷走了。<br>循著黏稠的足跡前進吧,<br>小小的旅人。</p>
                  <div class="txb__folio t-mono">— 01 —</div>
                </div>
                <div class="txb__page txb__page--r paper"><img src="${this._illo('forest', () => paintForestIllustration(700, 900))}" alt=""></div>
                <div class="txb__flip paper"><div class="txb__flip-back paper"></div></div>
              </div>
              <div class="txb__dev t-cond">THE STORY UNFOLDS · 故事展開中</div>
            </div>`,
          min: 2000,
          anim: (el) => {
            gsap.fromTo(el.querySelector('.txb__flip'), { rotationY: 0 }, { rotationY: -180, duration: 1.4, delay: 0.2, ease: 'power2.inOut', onStart: () => this.game.audio.play('page') });
            gsap.fromTo(el.querySelector('.txb__page--r img'), { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, delay: 0.8, duration: 1.4, ease: 'power2.out' });
            gsap.fromTo(el.querySelectorAll('.txb__page--l > *'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.12, delay: 0.3, duration: 0.5 });
          },
        };
      case 'lobby':
      default:
        return {
          cls: 'tx-card--lobby paper--dark',
          html: `
            <div class="txl">
              <div class="txl__emblem">${emblemSVG({ size: 260 })}</div>
              <div class="txl__title t-title">Returning to the Archive</div>
              <div class="txl__zh">返 回 檔 案 室</div>
              ${decoRule(20)}
              <div class="txl__sub t-italic">the rain has not stopped since you left</div>
            </div>`,
          min: 700,
          anim: (el) => {
            gsap.fromTo(el.querySelector('.emblem__hands'), { rotation: 0 }, { rotation: -360, svgOrigin: '130 130', duration: 2, ease: 'power2.inOut' });
          },
        };
    }
  }

  /**
   * @param {string} key target scene
   * @param {{style:string, fromRect?:DOMRect}} opts
   */
  async toScene(key, { style = 'lobby', fromRect = null } = {}) {
    if (this.busy) return;
    this.busy = true;
    const g = this.game;
    g.input.enabled = false;
    g.input.clear();
    g.cursor.resetDom();
    g.cursor.set('default');
    const old = g.scenes.current;
    if (old && old.onTransitionOut) old.onTransitionOut();

    // 1. dim + deepen focus on the outgoing scene
    g.post.set('dim', 0.6);
    g.post.set('dofBoost', 1);
    g.audio.play('whoosh_big');

    // 2. card flies toward camera
    const W = window.innerWidth;
    const H = window.innerHeight;
    const content = this._content(style);
    const wrap = document.createElement('div');
    wrap.className = 'tx';
    wrap.innerHTML = `<div class="tx-card ${content.cls}"><div class="tx-card__inner">${content.html}</div><div class="tx-card__edge"></div></div>`;
    g.ui.overlay.appendChild(wrap);
    const card = wrap.querySelector('.tx-card');
    const r = fromRect || { left: W * 0.5 - W * 0.06, top: H * 0.55, width: W * 0.12, height: H * 0.12 };
    const s0 = Math.max(0.08, Math.min(0.4, r.width / W));
    const cx = r.left + r.width / 2 - W / 2;
    const cy = r.top + r.height / 2 - H / 2;
    gsap.set(card, { x: cx, y: cy, scale: s0, rotationZ: -8, rotationX: 22, opacity: 0 });
    const inner = card.querySelector('.tx-card__inner');
    gsap.set(inner, { opacity: 0 });
    await new Promise((res) => {
      gsap
        .timeline({ onComplete: res })
        .to(card, { opacity: 1, duration: 0.12 })
        .to(card, { x: 0, y: 0, scale: 0.62, rotationZ: -3, rotationX: 8, duration: 0.45, ease: 'power3.out' }, 0)
        .to(card, { scale: 1.02, rotationZ: 0, rotationX: 0, duration: 0.45, ease: 'power3.inOut' }, 0.4)
        .to(inner, { opacity: 1, duration: 0.3 }, 0.55)
        .add(() => g.audio.play('transition_hit'), 0.78);
    });
    content.anim(card);
    const t0 = performance.now();

    // 3. load behind the card
    let next;
    try {
      next = await g.scenes.load(key, {});
    } catch (e) {
      console.error(e);
      g.ui.toast('載入失敗', 'FAILED TO LOAD SCENE', { tone: 'dark' });
      gsap.to(card, { opacity: 0, duration: 0.4, onComplete: () => wrap.remove() });
      g.post.set('dim', 0);
      g.post.set('dofBoost', 0);
      g.input.enabled = true;
      this.busy = false;
      return;
    }
    const elapsed = performance.now() - t0;
    if (elapsed < content.min) await wait(content.min - elapsed);

    // 4. swap + reveal
    g.post.set('dim', 0, true);
    g.post.set('dofBoost', 0, true);
    g.scenes.activate(next, key);
    g.post.set('dofBoost', 1, true);
    g.post.set('dofBoost', 0);
    g.audio.play('whoosh_big');
    await new Promise((res) => {
      gsap
        .timeline({ onComplete: res })
        .to(inner, { opacity: 0, scale: 0.98, duration: 0.25, ease: 'power2.in' })
        .fromTo(card, { '--wipe': 0 }, { '--wipe': 140, duration: 0.75, ease: 'power3.inOut' }, 0.1);
    });
    wrap.remove();
    g.input.enabled = !g.ui.hasModal;
    this.busy = false;
    if (next.afterReveal) next.afterReveal();
  }

  /** Quick paper-sheet swipe used between areas inside a game. */
  async swipe(midpoint, { label = '', sub = '' } = {}) {
    const g = this.game;
    const el = document.createElement('div');
    el.className = 'swipe';
    el.innerHTML = `<div class="swipe__sheet paper--dark"><div class="swipe__label"><div class="swipe__zh">${label}</div><div class="swipe__en t-cond">${sub}</div></div></div>`;
    g.ui.overlay.appendChild(el);
    const sheet = el.querySelector('.swipe__sheet');
    g.audio.play('page');
    await new Promise((res) => gsap.fromTo(sheet, { xPercent: 110, skewX: -8 }, { xPercent: 0, skewX: 0, duration: 0.45, ease: 'power3.in', onComplete: res }));
    await midpoint();
    await wait(260);
    await new Promise((res) => gsap.to(sheet, { xPercent: -110, skewX: 8, duration: 0.5, ease: 'power3.out', onComplete: res }));
    el.remove();
  }
}
