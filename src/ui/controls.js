import gsap from 'gsap';

/** Row label: Chinese title + condensed English. */
export const rowLabel = (zh, en) => `<div class="set-row__label"><span class="t-zh">${zh}</span><span class="t-cond">${en}</span></div>`;

/**
 * Brass-knob slider on a thin printed rule.
 */
export function slider(game, { zh, en, value, min = 0, max = 1, step = 0.01, format = (v) => Math.round(v * 100), onChange }) {
  const row = document.createElement('div');
  row.className = 'set-row stagger';
  row.innerHTML = `${rowLabel(zh, en)}
    <div class="slider interactive">
      <div class="slider__track"><div class="slider__fill"></div>${'<i></i>'.repeat(11)}</div>
      <div class="slider__knob"><span></span></div>
    </div>
    <div class="set-row__value t-mono"></div>`;
  const sl = row.querySelector('.slider');
  const fill = row.querySelector('.slider__fill');
  const knob = row.querySelector('.slider__knob');
  const val = row.querySelector('.set-row__value');
  let v = value;
  let lastTick = null;
  const render = () => {
    const p = (v - min) / (max - min);
    fill.style.width = `${p * 100}%`;
    knob.style.left = `${p * 100}%`;
    val.textContent = format(v);
  };
  const setFromX = (x) => {
    const r = sl.getBoundingClientRect();
    let p = Math.min(1, Math.max(0, (x - r.left) / r.width));
    let nv = min + p * (max - min);
    nv = Math.round(nv / step) * step;
    nv = Math.min(max, Math.max(min, nv));
    if (nv !== v) {
      v = nv;
      render();
      const tick = Math.round(((v - min) / (max - min)) * 20);
      if (tick !== lastTick) {
        game.audio.play('slider');
        lastTick = tick;
      }
      onChange(v);
    }
  };
  sl.addEventListener('pointerdown', (e) => {
    sl.setPointerCapture(e.pointerId);
    sl.classList.add('is-drag');
    gsap.to(knob.firstElementChild, { scale: 0.8, duration: 0.08 });
    setFromX(e.clientX);
  });
  sl.addEventListener('pointermove', (e) => {
    if (sl.hasPointerCapture(e.pointerId)) setFromX(e.clientX);
  });
  sl.addEventListener('pointerup', (e) => {
    sl.releasePointerCapture(e.pointerId);
    sl.classList.remove('is-drag');
    gsap.to(knob.firstElementChild, { scale: 1, duration: 0.4, ease: 'elastic.out(1.2,0.4)' });
  });
  sl.addEventListener('pointerenter', () => {
    game.cursor.domEnter();
    game.audio.play('hover_metal');
  });
  sl.addEventListener('pointerleave', () => game.cursor.domLeave());
  render();
  return row;
}

/**
 * Stamp-style option group (ON / OFF, OFF / LOW / HIGH ...).
 */
export function stampOptions(game, { zh, en, options, value, onChange }) {
  const row = document.createElement('div');
  row.className = 'set-row stagger';
  row.innerHTML = `${rowLabel(zh, en)}<div class="stamps"></div><div class="set-row__value"></div>`;
  const wrap = row.querySelector('.stamps');
  let cur = value;
  const btns = options.map((opt) => {
    const b = game.ui.button({
      className: 'stamp-opt',
      html: `<span class="stamp-opt__in t-cond ls">${opt.label}</span><span class="stamp-opt__ink t-cond">${opt.label}</span>`,
      sfx: ['hover_tick', 'click_stamp'],
      noShadow: true,
      magnet: 2,
      scale: 1.04,
      onClick: () => {
        if (cur === opt.value) return;
        cur = opt.value;
        sync(true);
        onChange(cur);
      },
    });
    b._opt = opt;
    wrap.appendChild(b);
    return b;
  });
  const sync = (anim) => {
    for (const b of btns) {
      const on = b._opt.value === cur;
      b.classList.toggle('is-on', on);
      const ink = b.querySelector('.stamp-opt__ink');
      if (on && anim) gsap.fromTo(ink, { scale: 1.6, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: -4, duration: 0.28, ease: 'back.out(2.2)' });
    }
  };
  sync(false);
  return row;
}

export const onOff = (game, zh, en, value, onChange) =>
  stampOptions(game, { zh, en, value, onChange, options: [{ label: 'ON', value: true }, { label: 'OFF', value: false }] });
