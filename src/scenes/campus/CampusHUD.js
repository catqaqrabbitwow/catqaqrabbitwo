import gsap from 'gsap';

/** Minimal, cinematic HUD for 《校園異聞》 in the platform's design language. */
export class CampusHUD {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.className = 'chud';
    el.innerHTML = `
      <div class="chud-area">
        <div class="chud-area__row"><span class="chud-area__time t-mono">16:30</span><span class="chud-area__sun"></span><span class="chud-area__file t-cond">FILE 01 · 校園異聞</span></div>
        <div class="chud-area__zh"></div>
        <div class="chud-area__en t-cond"></div>
      </div>
      <div class="chud-quest"></div>
      <div class="chud-prompt"><span class="keycap">E</span><span class="chud-prompt__verb"></span><span class="chud-prompt__name"></span></div>
      <div class="chud-combat">
        <div class="chud-hp">
          <div class="chud-hp__top"><span class="t-cond">AKARI · 早瀨灯</span><span class="chud-hp__num t-mono">100</span></div>
          <div class="chud-hp__bar"><i class="chud-hp__lag"></i><i class="chud-hp__fill"></i></div>
        </div>
        <div class="chud-rift">
          <svg viewBox="0 0 64 64" class="chud-rift__dial">
            <circle cx="32" cy="32" r="27" class="chud-rift__bg"/>
            <circle cx="32" cy="32" r="27" class="chud-rift__arc" pathLength="100"/>
            <g class="chud-rift__ticks">${Array.from({ length: 12 }, (_, i) => `<line x1="32" y1="8" x2="32" y2="${i % 3 ? 11 : 13}" transform="rotate(${i * 30} 32 32)"/>`).join('')}</g>
            <line x1="32" y1="32" x2="32" y2="15" class="chud-rift__hand"/>
          </svg>
          <div class="chud-rift__txt"><span class="keycap">SPACE</span><span class="t-zh">時間裂痕</span><span class="t-cond chud-rift__state">READY</span></div>
        </div>
      </div>
      <div class="chud-help t-cond"><span class="keycap">ESC</span>MENU · 選單</div>
      <div class="chud-alert"><div class="chud-alert__line"></div><div class="chud-alert__en t-title">Anomaly Detected</div><div class="chud-alert__zh">異 常 出 現</div><div class="chud-alert__line"></div></div>
    `;
    this.el = el;
    this.q = (s) => el.querySelector(s);
    game.quests.mountTracker(this.q('.chud-quest'));
    game.combat.mount(el);
    this.promptOn = false;
    this.hpShown = 100;
  }

  setArea(zh, en) {
    const a = this.q('.chud-area');
    this.q('.chud-area__zh').textContent = zh;
    this.q('.chud-area__en').textContent = en;
    gsap.fromTo(a, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' });
  }

  setTime(h, m) {
    this.q('.chud-area__time').textContent = `${h}:${String(m).padStart(2, '0')}`;
  }

  prompt(verb, name) {
    const p = this.q('.chud-prompt');
    if (!verb) {
      if (this.promptOn) {
        this.promptOn = false;
        gsap.to(p, { opacity: 0, y: 8, duration: 0.2 });
      }
      return;
    }
    this.q('.chud-prompt__verb').textContent = verb;
    this.q('.chud-prompt__name').textContent = name || '';
    if (!this.promptOn) {
      this.promptOn = true;
      gsap.fromTo(p, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)' });
    }
  }

  showCombat(on) {
    const c = this.q('.chud-combat');
    gsap.to(c, { opacity: on ? 1 : 0, y: on ? 0 : 20, duration: 0.5, ease: 'power3.out' });
    if (on) {
      const al = this.q('.chud-alert');
      gsap.timeline()
        .set(al, { display: 'flex' })
        .fromTo(al, { opacity: 0, scaleX: 1.3 }, { opacity: 1, scaleX: 1, duration: 0.35, ease: 'expo.out' })
        .fromTo(al.querySelectorAll('.chud-alert__line'), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out' }, 0)
        .to(al, { opacity: 0, duration: 0.4, delay: 1.3 })
        .set(al, { display: 'none' });
    }
  }

  update(player, dt) {
    const hp = player.hp / player.maxHp;
    this.hpShown += (player.hp - this.hpShown) * Math.min(1, dt * 3);
    this.q('.chud-hp__fill').style.transform = `scaleX(${hp})`;
    this.q('.chud-hp__lag').style.transform = `scaleX(${this.hpShown / player.maxHp})`;
    this.q('.chud-hp__num').textContent = Math.ceil(player.hp);
    const rift = this.q('.chud-rift');
    const arc = this.q('.chud-rift__arc');
    let k;
    let state;
    if (player.riftT > 0) {
      k = player.riftT / 2;
      state = 'ACTIVE';
    } else if (player.riftCd > 0) {
      k = 1 - player.riftCd / player.riftMax;
      state = `${player.riftCd.toFixed(1)}s`;
    } else {
      k = 1;
      state = 'READY';
    }
    arc.style.strokeDashoffset = `${100 - k * 100}`;
    this.q('.chud-rift__hand').setAttribute('transform', `rotate(${k * 360} 32 32)`);
    this.q('.chud-rift__state').textContent = state;
    rift.classList.toggle('is-ready', state === 'READY');
    rift.classList.toggle('is-active', state === 'ACTIVE');
  }
}
