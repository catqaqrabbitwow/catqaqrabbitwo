/**
 * Game cursor: thin ring + centre dot. Modes:
 *  default | hover | talk | enter | aim | pick | hidden
 * DOM hover (buttons) takes priority over modes requested by the 3D scene.
 */
const ICONS = {
  talk: `<svg class="cursor__icon cursor__icon--talk" viewBox="0 0 18 18"><path d="M3 4.5h12v7H8.5L5.5 14v-2.5H3z" fill="none" stroke="#f2e6cc" stroke-width="1.1"/><circle cx="6.5" cy="8" r=".8" fill="#f2e6cc"/><circle cx="9" cy="8" r=".8" fill="#f2e6cc"/><circle cx="11.5" cy="8" r=".8" fill="#f2e6cc"/></svg>`,
  enter: `<svg class="cursor__icon cursor__icon--enter" viewBox="0 0 18 18"><path d="M5 3h8v12H5z" fill="none" stroke="#f2e6cc" stroke-width="1.1"/><path d="M2 9h7M7 6.5 9.5 9 7 11.5" fill="none" stroke="#dcc084" stroke-width="1.2"/></svg>`,
  pick: `<svg class="cursor__icon cursor__icon--pick" viewBox="0 0 18 18"><circle cx="8" cy="8" r="4.5" fill="none" stroke="#f2e6cc" stroke-width="1.1"/><path d="M11.3 11.3 15 15" stroke="#dcc084" stroke-width="1.4"/></svg>`,
};

export class Cursor {
  constructor(input) {
    this.input = input;
    this.el = document.createElement('div');
    this.el.className = 'cursor';
    this.el.innerHTML = `<div class="cursor__ring"></div><div class="cursor__dot"></div>${ICONS.talk}${ICONS.enter}${ICONS.pick}<div class="cursor__label"></div>`;
    document.body.appendChild(this.el);
    this.el.classList.add('is-hidden');
    window.addEventListener('pointermove', () => this.el.classList.remove('is-hidden'), { once: true });
    this.ring = this.el.querySelector('.cursor__ring');
    this.dot = this.el.querySelector('.cursor__dot');
    this.labelEl = this.el.querySelector('.cursor__label');
    this.rx = -100;
    this.ry = -100;
    this.domHover = 0;
    this.domLabel = '';
    this.sceneMode = 'default';
    this.sceneLabel = '';
    this.mode = '';
    this.label = '';

    window.addEventListener('pointerdown', () => this.el.classList.add('is-down'));
    window.addEventListener('pointerup', () => this.el.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => this.el.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => this.el.classList.remove('is-hidden'));
  }

  domEnter(label = '') {
    this.domHover++;
    this.domLabel = label;
  }

  domLeave() {
    this.domHover = Math.max(0, this.domHover - 1);
    if (!this.domHover) this.domLabel = '';
  }

  resetDom() {
    this.domHover = 0;
    this.domLabel = '';
  }

  set(mode = 'default', label = '') {
    this.sceneMode = mode;
    this.sceneLabel = label;
  }

  _apply(mode, label) {
    if (mode !== this.mode) {
      this.el.classList.remove(`is-${this.mode}`);
      if (mode !== 'default') this.el.classList.add(`is-${mode}`);
      this.mode = mode;
    }
    if (label !== this.label) {
      this.label = label;
      this.labelEl.innerHTML = label;
      this.el.classList.toggle('has-label', !!label);
    }
  }

  update(dt) {
    const m = this.input.mouse;
    const k = 1 - Math.exp(-dt * 28);
    this.rx += (m.x - this.rx) * k;
    this.ry += (m.y - this.ry) * k;
    this.dot.style.transform = `translate(${m.x}px, ${m.y}px)`;
    this.ring.style.left = `${this.rx}px`;
    this.ring.style.top = `${this.ry}px`;
    this.labelEl.style.left = `${m.x + 24}px`;
    this.labelEl.style.top = `${m.y + 10}px`;
    for (const ic of this.el.querySelectorAll('.cursor__icon')) {
      ic.style.left = `${this.rx - 9}px`;
      ic.style.top = `${this.ry - 9}px`;
    }
    if (this.domHover > 0) this._apply('hover', this.domLabel);
    else this._apply(this.sceneMode, this.sceneLabel);
  }
}
