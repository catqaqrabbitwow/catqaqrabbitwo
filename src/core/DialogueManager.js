import gsap from 'gsap';

/**
 * Dialogue system.
 * A script is an array of lines:
 *   { who, whoEn, text, pitch?, event?, choices?: [{ text, next?, event? }] }
 * The active scene receives camera/focus hooks through `hooks`:
 *   hooks.onLine(line)  hooks.onEnd()
 */
export class DialogueManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.el = document.createElement('div');
    this.el.className = 'dlg';
    this.el.innerHTML = `
      <div class="dlg__shade"></div>
      <div class="dlg__box">
        <div class="dlg__name-row">
          <span class="dlg__rule"></span>
          <span class="dlg__name"></span>
          <span class="dlg__name-en t-cond"></span>
          <span class="dlg__rule dlg__rule--long"></span>
        </div>
        <div class="dlg__text"></div>
        <div class="dlg__choices"></div>
        <div class="dlg__next"><span class="t-cond">NEXT</span><i></i></div>
      </div>`;
    document.getElementById('ui').appendChild(this.el);
    this.nameEl = this.el.querySelector('.dlg__name');
    this.nameEnEl = this.el.querySelector('.dlg__name-en');
    this.textEl = this.el.querySelector('.dlg__text');
    this.choicesEl = this.el.querySelector('.dlg__choices');
    this.nextEl = this.el.querySelector('.dlg__next');
    this.lines = [];
    this.index = 0;
    this.typing = false;
    this.chars = [];
    this.charT = 0;
    this.shown = 0;

    this.el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      if (e.target.closest('.dlg__choice')) return;
      this.advance();
    });
    game.input.on('key', (code) => {
      if (!this.active || game.ui.hasModal) return;
      if (['KeyE', 'Space', 'Enter', 'KeyJ'].includes(code)) this.advance();
    });
  }

  /** Returns a promise resolved when the dialogue ends. */
  start(lines, hooks = {}) {
    if (this.active) this.forceClose();
    this.lines = lines;
    this.hooks = hooks;
    this.index = 0;
    this.active = true;
    this.el.classList.add('is-on');
    this.game.cursor.set('default');
    gsap.fromTo(this.el.querySelector('.dlg__box'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    gsap.to(this.el.querySelector('.dlg__shade'), { opacity: 1, duration: 0.5 });
    this.game.audio.play('open');
    this._show();
    return new Promise((res) => (this._resolve = res));
  }

  _show() {
    const line = this.lines[this.index];
    if (!line) return this.end();
    if (line.event && this.hooks.onEvent) this.hooks.onEvent(line.event, line);
    this.nameEl.textContent = line.who || '';
    this.nameEnEl.textContent = line.whoEn || '';
    this.el.classList.toggle('is-narration', !line.who);
    this.textEl.innerHTML = '';
    this.choicesEl.innerHTML = '';
    this.nextEl.classList.remove('is-on');
    // pre-split into spans for a soft per-glyph fade
    this.chars = [...(line.text || '')].map((ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.className = 'dlg__ch';
      this.textEl.appendChild(s);
      return s;
    });
    this.shown = 0;
    this.charT = 0;
    this.typing = true;
    this.pitch = line.pitch || 620;
    if (this.hooks.onLine) this.hooks.onLine(line, this.index);
    gsap.fromTo(this.el.querySelector('.dlg__name-row'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3 });
  }

  _finishTyping() {
    this.typing = false;
    for (const s of this.chars) s.classList.add('is-on');
    this.shown = this.chars.length;
    const line = this.lines[this.index];
    if (line && line.choices) {
      line.choices.forEach((c, i) => {
        const b = this.game.ui.button({
          className: 'dlg__choice',
          html: `<span class="dlg__choice-in"><span class="t-mono">0${i + 1}</span>${c.text}</span>`,
          sfx: ['hover_tick', 'click_paper'],
          noShadow: true,
          onClick: () => {
            if (c.event && this.hooks.onEvent) this.hooks.onEvent(c.event, c);
            if (c.lines) {
              this.lines.splice(this.index + 1, 0, ...c.lines);
            }
            this.index++;
            this._show();
          },
        });
        this.choicesEl.appendChild(b);
        gsap.fromTo(b, { opacity: 0, x: 16 }, { opacity: 1, x: 0, delay: i * 0.06, duration: 0.3 });
      });
    } else this.nextEl.classList.add('is-on');
  }

  advance() {
    if (!this.active) return;
    if (this.typing) {
      this._finishTyping();
      return;
    }
    const line = this.lines[this.index];
    if (line && line.choices) return;
    this.game.audio.play('hover_tick');
    this.index++;
    if (this.index >= this.lines.length) this.end();
    else this._show();
  }

  update(dt) {
    if (!this.active || !this.typing) return;
    this.charT += dt;
    const speed = 0.028;
    while (this.charT > speed && this.shown < this.chars.length) {
      this.charT -= speed;
      const s = this.chars[this.shown++];
      s.classList.add('is-on');
      if (this.shown % 2 === 0 && s.textContent.trim()) this.game.audio.play('dialogue_blip', { pitch: this.pitch });
    }
    if (this.shown >= this.chars.length) this._finishTyping();
  }

  end() {
    if (!this.active) return;
    this.active = false;
    this.endedAt = performance.now();
    this.game.audio.play('close');
    gsap.to(this.el.querySelector('.dlg__box'), { opacity: 0, y: 14, duration: 0.3, ease: 'power2.in', onComplete: () => this.el.classList.remove('is-on') });
    gsap.to(this.el.querySelector('.dlg__shade'), { opacity: 0, duration: 0.4 });
    if (this.hooks && this.hooks.onEnd) this.hooks.onEnd();
    const r = this._resolve;
    this._resolve = null;
    if (r) r();
  }

  forceClose() {
    if (!this.active) return;
    this.active = false;
    this.el.classList.remove('is-on');
    gsap.set(this.el.querySelector('.dlg__shade'), { opacity: 0 });
    if (this.hooks && this.hooks.onEnd) this.hooks.onEnd();
    const r = this._resolve;
    this._resolve = null;
    if (r) r();
  }
}
