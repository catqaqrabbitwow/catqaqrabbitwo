import gsap from 'gsap';
import { emblemSVG, decoRule } from './emblem.js';

/**
 * Opening curtain. Hides first-load work behind a "developing" emblem,
 * then waits for a click (needed anyway to start Web Audio).
 */
export class TitleScreen {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'title interactive';
    this.el.innerHTML = `
      <div class="title__half title__half--top paper--dark"></div>
      <div class="title__half title__half--bot paper--dark"></div>
      <div class="title__center">
        <div class="title__edition t-cond">EST. MCMXXIX &nbsp;·&nbsp; PRIVATE COLLECTION &nbsp;·&nbsp; VOL. VII</div>
        <div class="title__emblem">${emblemSVG({ size: 240 })}</div>
        <h1 class="title__name t-title">Chrono Archive</h1>
        <div class="title__zh">時 光 檔 案 館</div>
        ${decoRule(22)}
        <div class="title__sub t-italic">a private room for travellers between the hours</div>
        <div class="title__prompt">
          <div class="title__status t-cond"><span class="title__spin"></span><span class="title__status-text">DEVELOPING THE ARCHIVE · 檔案顯影中</span></div>
          <div class="title__enter"><span class="t-cond">CLICK ANYWHERE TO ENTER</span><span class="t-zh">點擊任意處進入</span></div>
        </div>
      </div>
      <div class="title__corner title__corner--tl t-cond">No. 0001</div>
      <div class="title__corner title__corner--tr t-cond">A MINI GAME PLATFORM</div>
      <div class="title__corner title__corner--bl t-cond">© ORIGINAL WORK · ALL ART GENERATED</div>
      <div class="title__corner title__corner--br t-cond">BEST AT 1920 × 1080</div>
    `;
    this.progress = 0;
  }

  show() {
    document.getElementById('overlay').appendChild(this.el);
    gsap.fromTo(this.el.querySelector('.title__center'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' });
    gsap.to(this.el.querySelector('.emblem__rays'), { rotation: 360, svgOrigin: '120 120', duration: 90, ease: 'none', repeat: -1 });
    gsap.to(this.el.querySelector('.emblem__hands'), { rotation: 360, svgOrigin: '120 120', duration: 12, ease: 'none', repeat: -1 });
  }

  setProgress(p) {
    this.progress = p;
  }

  ready(onEnter) {
    this.el.classList.add('is-ready');
    const enter = this.el.querySelector('.title__enter');
    gsap.fromTo(enter, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.45, ease: 'power2.out' });
    this.game.cursor.set('hover', '<b>進入</b>ENTER');
    const go = () => {
      this.el.removeEventListener('pointerdown', go);
      this.game.cursor.set('default');
      onEnter();
      this.game.audio.play('transition_hit');
      const tl = gsap.timeline({ onComplete: () => this.el.remove() });
      tl.to(this.el.querySelector('.title__center'), { opacity: 0, scale: 1.04, duration: 0.5, ease: 'power2.in' })
        .to(this.el.querySelectorAll('.title__corner'), { opacity: 0, duration: 0.3 }, 0)
        .to(this.el.querySelector('.title__half--top'), { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 0.25)
        .to(this.el.querySelector('.title__half--bot'), { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, 0.25);
    };
    this.el.addEventListener('pointerdown', go);
  }
}
