import gsap from 'gsap';

/**
 * DOM interface manager:
 *  - layers (#hud / #modal / #toast-layer / #overlay)
 *  - the shared button feedback language (frame → magnet → scale → sheen,
 *    press squash, spring release, per-button sound pair)
 *  - modal stack (ESC closes the top-most), toasts
 */
export class UIManager {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this.hud = document.getElementById('hud');
    this.modal = document.getElementById('modal');
    this.toastLayer = document.getElementById('toast-layer');
    this.overlay = document.getElementById('overlay');
    this.stack = [];
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty('--ui-scale', Math.max(0.5, s).toFixed(4));
  }

  get audio() {
    return this.game.audio;
  }

  get cursor() {
    return this.game.cursor;
  }

  setHUD(el) {
    this.hud.innerHTML = '';
    if (el) this.hud.appendChild(el);
    this.cursor.resetDom();
  }

  /**
   * Create a button with the standard feedback structure.
   * @param {object} o { className, html, sfx:[hover, click], onClick, label, magnet, scale, tag }
   */
  button(o = {}) {
    const el = document.createElement(o.tag || 'button');
    el.className = `btn interactive ${o.className || ''}`;
    if (o.tag && o.tag !== 'button') el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.innerHTML = `<span class="btn__shadow"></span><span class="btn__body">${o.html || ''}<span class="btn__sheen"></span></span><span class="btn__frame"></span>`;
    if (o.noShadow) el.querySelector('.btn__shadow').remove();
    this.bindButton(el, o);
    return el;
  }

  /** Attach the feedback behaviour to an existing .btn element. */
  bindButton(el, o = {}) {
    const body = el.querySelector('.btn__body') || el;
    const [sHover, sClick] = o.sfx || ['hover_paper', 'click_paper'];
    const magnet = o.magnet ?? 5;
    const hoverScale = o.scale ?? 1.02;
    const rot = o.rotate ?? 0.6;
    let hovered = false;
    let rect = null;

    const enter = () => {
      if (el.classList.contains('is-disabled') && !o.allowDisabledHover) return;
      hovered = true;
      rect = el.getBoundingClientRect();
      this.cursor.domEnter(o.label || '');
      this.audio.play(sHover);
      gsap.killTweensOf(el);
      // 0–50ms: frame lights up
      gsap.to(el, { '--frame': 1, duration: 0.05, ease: 'none' });
      // 120–180ms: scale up, letter spacing opens, shadow deepens
      gsap.to(body, { scale: hoverScale, duration: 0.14, delay: 0.06, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(el, { '--ls': '0.05em', '--shadowY': 1.7, duration: 0.2, delay: 0.04, ease: 'power2.out' });
      // light sweep
      gsap.fromTo(el, { '--sheen': '-140%' }, { '--sheen': '360%', duration: 0.6, delay: 0.05, ease: 'power2.inOut' });
      if (o.onHover) o.onHover(true);
    };
    const move = (e) => {
      if (!hovered || !rect) return;
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      // 50–120ms: drift toward the pointer
      gsap.to(body, { x: dx * magnet, y: dy * magnet * 0.7, rotation: dx * rot, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
    };
    const leave = () => {
      if (!hovered) return;
      hovered = false;
      this.cursor.domLeave();
      gsap.to(el, { '--frame': 0, '--ls': '0em', '--shadowY': 1, duration: 0.25, ease: 'power2.out' });
      gsap.to(body, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.6)', overwrite: 'auto' });
      if (o.onHover) o.onHover(false);
    };
    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      gsap.to(body, { scale: 0.975, duration: 0.075, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(el, { '--shadowY': 0.4, duration: 0.075 });
    };
    const up = () => {
      gsap
        .timeline()
        .to(body, { scale: 1.025, duration: 0.09, ease: 'power2.out' })
        .to(body, { scale: hovered ? hoverScale : 1, duration: 0.5, ease: 'elastic.out(1.1, 0.42)' });
      gsap.to(el, { '--shadowY': hovered ? 1.7 : 1, duration: 0.3 });
    };
    const click = (e) => {
      e.stopPropagation();
      if (el.classList.contains('is-disabled')) {
        this.audio.play('deny');
        gsap.fromTo(body, { x: -4 }, { x: 0, duration: 0.4, ease: 'elastic.out(1.2, 0.3)' });
        if (o.onDisabled) o.onDisabled();
        return;
      }
      this.audio.play(sClick);
      if (o.onClick) o.onClick(e);
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('click', click);
    el.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        down(e);
        setTimeout(up, 80);
        click(e);
      }
    });
    el._leave = leave;
    return el;
  }

  // ──────────────────────────── Modals ────────────────────────────

  /** Push a modal ({ el, close() }) onto the stack. */
  pushModal(m) {
    this.stack.push(m);
    this.modal.appendChild(m.el);
    this._syncBlur();
  }

  popModal(m) {
    const i = this.stack.indexOf(m);
    if (i >= 0) this.stack.splice(i, 1);
    this._syncBlur();
  }

  get hasModal() {
    return this.stack.length > 0;
  }

  closeTop() {
    const m = this.stack[this.stack.length - 1];
    if (m && m.closable !== false) {
      m.close();
      return true;
    }
    return false;
  }

  _syncBlur() {
    const on = this.stack.length > 0;
    this.game.post.set('dofBoost', on ? 1 : 0);
    this.game.post.set('dim', on ? 0.55 : 0);
    this.game.input.enabled = !on;
    if (!on) this.cursor.resetDom();
  }

  // ──────────────────────────── Toasts ────────────────────────────

  toast(title, sub = '', { tone = 'ivory', duration = 2.8, sfx = 'hover_ticket' } = {}) {
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;
    el.innerHTML = `<div class="toast__tag t-cond">NOTICE · 通知</div><div class="toast__title">${title}</div>${sub ? `<div class="toast__sub t-cond">${sub}</div>` : ''}`;
    this.toastLayer.appendChild(el);
    const others = [...this.toastLayer.children].filter((c) => c !== el);
    others.forEach((c, i) => gsap.to(c, { y: `+=${el.offsetHeight + 10}`, duration: 0.35, ease: 'power3.out' }));
    this.audio.play(sfx);
    gsap.fromTo(el, { x: 60, rotation: 3, opacity: 0 }, { x: 0, rotation: -1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' });
    gsap.to(el, {
      x: 40,
      opacity: 0,
      duration: 0.35,
      delay: duration,
      ease: 'power2.in',
      onComplete: () => el.remove(),
    });
  }
}
