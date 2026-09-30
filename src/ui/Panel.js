import gsap from 'gsap';

const CLOSE_SVG = `<svg viewBox="0 0 20 20" class="ico-shift"><path d="M4 4 16 16M16 4 4 16" stroke="currentColor" stroke-width="1.2"/></svg>`;

/**
 * Base modal "document". Slides in like a sheet of paper placed on the desk,
 * with the 3D world behind it dimmed and thrown out of focus (UIManager).
 */
export class Panel {
  constructor(game, { className = '', formNo = '07', title = 'Document', titleZh = '文件', subtitle = '', width = 92, paper = 'paper--cream', closable = true } = {}) {
    this.game = game;
    this.ui = game.ui;
    this.closable = closable;
    this.isOpen = false;
    this.el = document.createElement('div');
    this.el.className = `modal-wrap ${className}`;
    this.el.innerHTML = `
      <div class="modal-backdrop interactive"></div>
      <div class="panel paper ${paper}" style="width:${width}rem">
        <div class="panel__edge"></div>
        <header class="panel__head">
          <div class="panel__meta t-cond"><span>FORM No.${formNo}</span><span class="panel__dots"></span><span>CHRONO ARCHIVE · 時光檔案館</span></div>
          <div class="panel__titles">
            <h2 class="panel__title t-title">${title}</h2>
            <div class="panel__title-zh">${titleZh}</div>
          </div>
          ${subtitle ? `<div class="panel__sub t-italic">${subtitle}</div>` : ''}
          <div class="rule--double"></div>
        </header>
        <div class="panel__content"></div>
        <footer class="panel__foot t-cond"></footer>
      </div>`;
    this.panel = this.el.querySelector('.panel');
    this.content = this.el.querySelector('.panel__content');
    this.foot = this.el.querySelector('.panel__foot');
    if (closable) {
      const close = this.ui.button({
        className: 'panel__close',
        html: `<span class="panel__close-in">${CLOSE_SVG}<span class="t-cond ls">CLOSE</span><span class="t-zh">關閉</span></span>`,
        sfx: ['hover_tick', 'cancel'],
        noShadow: true,
        magnet: 3,
        onClick: () => this.close(),
      });
      this.panel.appendChild(close);
      this.el.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
    }
  }

  open() {
    if (this.isOpen) return this;
    this.isOpen = true;
    this.ui.pushModal(this);
    this.game.audio.play('open');
    const bd = this.el.querySelector('.modal-backdrop');
    gsap.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo(
      this.panel,
      { y: 90, rotation: -4, scale: 0.96, opacity: 0 },
      { y: 0, rotation: -0.6, scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' },
    );
    const items = this.panel.querySelectorAll('.stagger');
    if (items.length) gsap.fromTo(items, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.035, delay: 0.12, ease: 'power3.out' });
    if (this.onOpen) this.onOpen();
    return this;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.game.audio.play('close');
    const bd = this.el.querySelector('.modal-backdrop');
    gsap.to(bd, { opacity: 0, duration: 0.3 });
    gsap.to(this.panel, {
      y: 60,
      rotation: 2.5,
      opacity: 0,
      duration: 0.32,
      ease: 'power3.in',
      onComplete: () => {
        this.el.remove();
      },
    });
    this.ui.popModal(this);
    if (this.onClose) this.onClose();
  }
}
