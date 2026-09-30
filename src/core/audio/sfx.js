/**
 * Procedural sound effects. Every recipe receives (a, opts) where `a` is the
 * AudioManager (ctx, noise buffers, sfx bus, reverb send) and returns nothing.
 * All sounds are synthesised — no external audio files.
 */

const rand = (a, b) => a + Math.random() * (b - a);

function env(g, t, a, peak, d, sustain = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}

function noise(a, t, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.3, attack = 0.002, sweepTo = null, out = null, pan = 0 } = {}) {
  const ctx = a.ctx;
  const src = ctx.createBufferSource();
  src.buffer = a.noiseBuffer;
  src.playbackRate.value = rand(0.9, 1.1);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, attack, gain, dur);
  let node = g;
  if (pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    node = p;
  }
  src.connect(f).connect(g);
  node.connect(out || a.sfxBus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
  return g;
}

function tone(a, t, dur, { type = 'sine', freq = 440, to = null, gain = 0.2, attack = 0.003, out = null, detune = 0, reverb = 0 } = {}) {
  const ctx = a.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  o.detune.value = detune;
  const g = ctx.createGain();
  env(g, t, attack, gain, dur);
  o.connect(g).connect(out || a.sfxBus);
  if (reverb > 0) {
    const s = ctx.createGain();
    s.gain.value = reverb;
    g.connect(s).connect(a.reverbSend);
  }
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return g;
}

/** FM bell / chime. */
function bell(a, t, freq, dur, gain = 0.12, ratio = 3.5, index = 2.5, reverb = 0.5) {
  const ctx = a.ctx;
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const mg = ctx.createGain();
  car.frequency.value = freq;
  mod.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t);
  mg.gain.exponentialRampToValueAtTime(1, t + dur);
  mod.connect(mg).connect(car.frequency);
  const g = ctx.createGain();
  env(g, t, 0.002, gain, dur);
  car.connect(g).connect(a.sfxBus);
  const s = ctx.createGain();
  s.gain.value = reverb;
  g.connect(s).connect(a.reverbSend);
  car.start(t);
  mod.start(t);
  car.stop(t + dur + 0.1);
  mod.stop(t + dur + 0.1);
}

function click(a, t, freq = 3000, gain = 0.15, dur = 0.012) {
  noise(a, t, dur, { type: 'bandpass', freq, q: 4, gain, attack: 0.0005 });
}

export const SFX = {
  // ───────────────────────────── UI ─────────────────────────────
  hover_paper(a) {
    const t = a.now();
    noise(a, t, 0.09, { type: 'bandpass', freq: rand(2800, 3600), sweepTo: rand(5000, 6500), q: 0.8, gain: 0.05, attack: 0.02 });
  },
  hover_tick(a) {
    const t = a.now();
    click(a, t, rand(4200, 5200), 0.06, 0.008);
  },
  hover_ticket(a) {
    const t = a.now();
    noise(a, t, 0.12, { type: 'bandpass', freq: 2200, sweepTo: 5200, q: 1.2, gain: 0.05, attack: 0.03 });
    tone(a, t + 0.01, 0.18, { freq: 1760, gain: 0.012, type: 'sine', reverb: 0.4 });
  },
  hover_metal(a) {
    const t = a.now();
    click(a, t, 6200, 0.05, 0.006);
    tone(a, t, 0.12, { freq: 2637, gain: 0.01, type: 'triangle' });
  },
  click_paper(a) {
    const t = a.now();
    noise(a, t, 0.05, { type: 'highpass', freq: 1800, gain: 0.18, attack: 0.001 });
    noise(a, t + 0.012, 0.14, { type: 'bandpass', freq: 900, sweepTo: 2600, q: 0.7, gain: 0.08 });
  },
  click_ticket(a) {
    const t = a.now();
    // paper snap + low bass hit
    noise(a, t, 0.04, { type: 'highpass', freq: 2500, gain: 0.22, attack: 0.0008 });
    tone(a, t, 0.35, { freq: 110, to: 42, gain: 0.35, type: 'sine' });
    tone(a, t, 0.08, { freq: 220, to: 90, gain: 0.08, type: 'triangle' });
    bell(a, t + 0.02, 1318.5, 0.9, 0.035, 2.01, 1.2, 0.6);
  },
  click_mech(a) {
    const t = a.now();
    click(a, t, 2600, 0.2, 0.01);
    click(a, t + 0.055, 3400, 0.14, 0.008);
    tone(a, t, 0.25, { freq: 1567, gain: 0.02, type: 'triangle', reverb: 0.2 });
  },
  click_folder(a) {
    const t = a.now();
    noise(a, t, 0.07, { type: 'lowpass', freq: 1400, gain: 0.25, attack: 0.001 });
    tone(a, t, 0.12, { freq: 160, to: 80, gain: 0.15 });
    noise(a, t + 0.03, 0.18, { type: 'bandpass', freq: 1800, sweepTo: 800, q: 0.9, gain: 0.05 });
  },
  click_photo(a) {
    const t = a.now();
    // camera shutter
    click(a, t, 1800, 0.25, 0.015);
    noise(a, t + 0.03, 0.06, { type: 'bandpass', freq: 3500, q: 2, gain: 0.1 });
    click(a, t + 0.09, 2400, 0.16, 0.012);
  },
  click_stamp(a) {
    const t = a.now();
    tone(a, t, 0.18, { freq: 140, to: 55, gain: 0.3 });
    noise(a, t, 0.05, { type: 'lowpass', freq: 900, gain: 0.3, attack: 0.001 });
  },
  open(a) {
    const t = a.now();
    noise(a, t, 0.28, { type: 'bandpass', freq: 700, sweepTo: 3800, q: 0.6, gain: 0.09, attack: 0.04 });
    tone(a, t + 0.05, 0.4, { freq: 523, gain: 0.02, reverb: 0.5 });
    tone(a, t + 0.12, 0.5, { freq: 784, gain: 0.018, reverb: 0.5 });
  },
  close(a) {
    const t = a.now();
    noise(a, t, 0.22, { type: 'bandpass', freq: 3200, sweepTo: 600, q: 0.6, gain: 0.08, attack: 0.02 });
    tone(a, t + 0.08, 0.14, { freq: 150, to: 70, gain: 0.1 });
  },
  confirm(a) {
    const t = a.now();
    tone(a, t, 0.4, { freq: 98, to: 45, gain: 0.35 });
    bell(a, t, 1046.5, 1.1, 0.05, 2, 1.5, 0.7);
    bell(a, t + 0.07, 1568, 1.0, 0.035, 2, 1.2, 0.7);
  },
  cancel(a) {
    const t = a.now();
    tone(a, t, 0.12, { freq: 660, to: 330, gain: 0.05, type: 'triangle' });
    click(a, t, 1800, 0.1);
  },
  deny(a) {
    const t = a.now();
    tone(a, t, 0.1, { freq: 180, gain: 0.12, type: 'square' });
    tone(a, t + 0.12, 0.14, { freq: 140, gain: 0.1, type: 'square' });
  },
  toggle(a) {
    const t = a.now();
    click(a, t, 3000, 0.16, 0.01);
    tone(a, t, 0.06, { freq: 900, gain: 0.03, type: 'triangle' });
  },
  slider(a) {
    click(a, a.now(), rand(5000, 6500), 0.03, 0.004);
  },
  page(a) {
    const t = a.now();
    noise(a, t, 0.35, { type: 'bandpass', freq: 1200, sweepTo: 4200, q: 0.5, gain: 0.08, attack: 0.08 });
  },
  typewriter(a) {
    const t = a.now();
    click(a, t, rand(1500, 2600), 0.08, 0.01);
    tone(a, t, 0.03, { freq: rand(180, 240), gain: 0.04, type: 'square' });
  },
  whoosh_big(a) {
    const t = a.now();
    noise(a, t, 0.9, { type: 'bandpass', freq: 200, sweepTo: 2400, q: 0.7, gain: 0.16, attack: 0.5 });
    tone(a, t, 1.2, { freq: 55, to: 38, gain: 0.25, attack: 0.3 });
  },
  transition_hit(a) {
    const t = a.now();
    tone(a, t, 0.9, { freq: 70, to: 30, gain: 0.45 });
    noise(a, t, 0.5, { type: 'lowpass', freq: 600, sweepTo: 80, gain: 0.2 });
    bell(a, t + 0.01, 523.25, 2.2, 0.05, 1.41, 3, 1);
  },
  develop(a) {
    const t = a.now();
    noise(a, t, 1.6, { type: 'bandpass', freq: 500, sweepTo: 1500, q: 2, gain: 0.03, attack: 0.6 });
  },
  thunder(a) {
    const t = a.now();
    noise(a, t, 2.8, { type: 'lowpass', freq: 380, sweepTo: 60, gain: 0.35, attack: 0.08, out: a.ambBus });
    noise(a, t + 0.25, 1.8, { type: 'lowpass', freq: 200, sweepTo: 50, gain: 0.25, attack: 0.2, out: a.ambBus });
  },
  tick(a) {
    click(a, a.now(), 3200, 0.03, 0.006);
  },
  phone_ring(a) {
    const t = a.now();
    for (let i = 0; i < 6; i++) {
      tone(a, t + i * 0.05, 0.045, { freq: 1300, gain: 0.03, type: 'square' });
      tone(a, t + i * 0.05, 0.045, { freq: 1700, gain: 0.02, type: 'square' });
    }
  },
  record_scratch(a) {
    const t = a.now();
    noise(a, t, 0.25, { type: 'bandpass', freq: 3000, sweepTo: 900, q: 3, gain: 0.08 });
  },
  radio_tune(a) {
    const t = a.now();
    noise(a, t, 0.6, { type: 'bandpass', freq: 1200, sweepTo: 3000, q: 6, gain: 0.05 });
    tone(a, t, 0.6, { freq: 700, to: 1400, gain: 0.02, type: 'sine' });
  },
  unlock(a) {
    const t = a.now();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(a, t + i * 0.08, f, 1.2, 0.04, 2, 1, 0.8));
  },

  // ─────────────────────────── Gameplay ──────────────────────────
  step_wood(a, o = {}) {
    const t = a.now();
    const g = o.gain ?? 1;
    noise(a, t, 0.07, { type: 'bandpass', freq: rand(180, 260), q: 1.5, gain: 0.25 * g, attack: 0.002 });
    click(a, t, rand(1100, 1500), 0.05 * g, 0.01);
  },
  step_tile(a, o = {}) {
    const t = a.now();
    const g = o.gain ?? 1;
    click(a, t, rand(2200, 3200), 0.12 * g, 0.012);
    tone(a, t, 0.05, { freq: rand(900, 1200), gain: 0.012 * g, type: 'triangle', reverb: 0.4 });
    noise(a, t, 0.04, { type: 'bandpass', freq: 400, q: 1, gain: 0.08 * g });
  },
  step_grass(a, o = {}) {
    const t = a.now();
    const g = o.gain ?? 1;
    noise(a, t, 0.1, { type: 'bandpass', freq: rand(2500, 4200), q: 0.9, gain: 0.07 * g, attack: 0.01 });
    noise(a, t, 0.06, { type: 'lowpass', freq: 300, gain: 0.08 * g });
  },
  door_slide(a) {
    const t = a.now();
    noise(a, t, 0.55, { type: 'lowpass', freq: 500, sweepTo: 900, gain: 0.2, attack: 0.05 });
    click(a, t + 0.52, 1200, 0.25, 0.02);
    tone(a, t + 0.52, 0.2, { freq: 120, to: 70, gain: 0.15 });
  },
  dialogue_blip(a, o = {}) {
    const t = a.now();
    tone(a, t, 0.04, { freq: (o.pitch || 620) * rand(0.94, 1.06), gain: 0.025, type: 'triangle' });
  },
  interact(a) {
    const t = a.now();
    bell(a, t, 1318.5, 0.5, 0.03, 2, 0.8, 0.5);
  },
  pickup(a) {
    const t = a.now();
    [880, 1108.7, 1318.5, 1760].forEach((f, i) => bell(a, t + i * 0.06, f, 0.8, 0.035, 2, 0.8, 0.7));
  },
  clue(a) {
    const t = a.now();
    bell(a, t, 659.25, 1.6, 0.05, 1.41, 2, 1);
    bell(a, t + 0.18, 987.77, 1.6, 0.04, 1.41, 2, 1);
    tone(a, t, 1.4, { freq: 82, gain: 0.12, attack: 0.1 });
  },
  quest_complete(a) {
    const t = a.now();
    tone(a, t, 1.6, { freq: 65.4, to: 60, gain: 0.3, attack: 0.01 });
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => bell(a, t + i * 0.09, f, 2.2, 0.05, 2, 1.2, 1));
  },
  anomaly(a) {
    const t = a.now();
    tone(a, t, 2.5, { freq: 55, to: 41, gain: 0.3, attack: 0.4, type: 'sawtooth' });
    noise(a, t, 2.2, { type: 'bandpass', freq: 3000, sweepTo: 200, q: 4, gain: 0.08, attack: 0.3 });
    for (let i = 0; i < 8; i++) tone(a, t + 0.2 + i * 0.13, 0.05, { freq: rand(200, 2400), gain: 0.03, type: 'square' });
  },
  swing(a, o = {}) {
    const t = a.now();
    const p = o.pitch || 1;
    noise(a, t, 0.16, { type: 'bandpass', freq: 600 * p, sweepTo: 4200 * p, q: 1.2, gain: 0.14, attack: 0.03 });
  },
  swing_heavy(a) {
    const t = a.now();
    noise(a, t, 0.32, { type: 'bandpass', freq: 250, sweepTo: 2600, q: 1, gain: 0.22, attack: 0.1 });
    tone(a, t, 0.3, { freq: 90, to: 50, gain: 0.12, attack: 0.08 });
  },
  hit(a, o = {}) {
    const t = a.now();
    const s = o.strength || 1;
    tone(a, t, 0.18 * s, { freq: 160 * rand(0.9, 1.1), to: 45, gain: 0.35 * Math.min(1.4, s) });
    noise(a, t, 0.09 * s, { type: 'bandpass', freq: rand(1500, 2500), q: 0.8, gain: 0.25 });
    noise(a, t, 0.05, { type: 'highpass', freq: 4000, gain: 0.12 });
    if (s > 1.2) noise(a, t + 0.01, 0.4, { type: 'lowpass', freq: 500, sweepTo: 80, gain: 0.3 });
  },
  hit_glitch(a) {
    const t = a.now();
    for (let i = 0; i < 4; i++) tone(a, t + i * 0.018, 0.02, { freq: rand(300, 3000), gain: 0.05, type: 'square' });
    tone(a, t, 0.2, { freq: 120, to: 50, gain: 0.25 });
  },
  hit_slime(a) {
    const t = a.now();
    tone(a, t, 0.18, { freq: rand(280, 360), to: 90, gain: 0.2, type: 'sine' });
    noise(a, t, 0.12, { type: 'lowpass', freq: 900, gain: 0.2 });
    tone(a, t + 0.03, 0.1, { freq: 500, to: 900, gain: 0.05, type: 'sine' });
  },
  slime_hop(a) {
    const t = a.now();
    tone(a, t, 0.12, { freq: rand(180, 240), to: rand(380, 460), gain: 0.06, type: 'sine' });
  },
  slime_charge(a) {
    const t = a.now();
    tone(a, t, 0.4, { freq: 120, to: 300, gain: 0.08, type: 'triangle', attack: 0.2 });
  },
  enemy_die(a) {
    const t = a.now();
    noise(a, t, 0.6, { type: 'bandpass', freq: 2400, sweepTo: 200, q: 1, gain: 0.15 });
    tone(a, t, 0.5, { freq: 300, to: 60, gain: 0.15, type: 'triangle' });
    bell(a, t + 0.1, 1567, 0.6, 0.02, 3.1, 2, 0.8);
  },
  shadow_spawn(a) {
    const t = a.now();
    noise(a, t, 1.2, { type: 'bandpass', freq: 200, sweepTo: 1600, q: 3, gain: 0.08, attack: 0.6 });
    tone(a, t, 1.2, { freq: 40, to: 70, gain: 0.2, attack: 0.5, type: 'sawtooth' });
  },
  enemy_windup(a) {
    const t = a.now();
    tone(a, t, 0.35, { freq: 400, to: 1200, gain: 0.04, type: 'sawtooth', attack: 0.2 });
  },
  player_hurt(a) {
    const t = a.now();
    tone(a, t, 0.25, { freq: 220, to: 80, gain: 0.25, type: 'triangle' });
    noise(a, t, 0.2, { type: 'lowpass', freq: 1200, gain: 0.2 });
  },
  dodge(a) {
    const t = a.now();
    noise(a, t, 0.22, { type: 'bandpass', freq: 3000, sweepTo: 700, q: 1.4, gain: 0.12, attack: 0.02 });
  },
  roll(a) {
    const t = a.now();
    noise(a, t, 0.3, { type: 'bandpass', freq: 1500, sweepTo: 400, q: 0.8, gain: 0.12, attack: 0.03 });
    noise(a, t + 0.05, 0.25, { type: 'lowpass', freq: 400, gain: 0.1 });
  },
  rift_on(a) {
    const t = a.now();
    noise(a, t, 0.6, { type: 'bandpass', freq: 5000, sweepTo: 300, q: 1.5, gain: 0.16, attack: 0.4 });
    tone(a, t, 2.0, { freq: 110, to: 55, gain: 0.25, attack: 0.05 });
    bell(a, t, 220, 2.5, 0.08, 1.5, 6, 1.2);
  },
  rift_off(a) {
    const t = a.now();
    noise(a, t, 0.4, { type: 'bandpass', freq: 300, sweepTo: 4000, q: 1.5, gain: 0.1, attack: 0.3 });
  },
  dark_burst(a) {
    const t = a.now();
    noise(a, t, 0.5, { type: 'bandpass', freq: 120, sweepTo: 6000, q: 0.6, gain: 0.12, attack: 0.45 });
    tone(a, t + 0.45, 0.9, { freq: 70, to: 28, gain: 0.5 });
    noise(a, t + 0.45, 0.8, { type: 'lowpass', freq: 1500, sweepTo: 60, gain: 0.35 });
  },
  heal(a) {
    const t = a.now();
    [659.25, 830.6, 987.77].forEach((f, i) => bell(a, t + i * 0.05, f, 1, 0.03, 2, 0.6, 0.8));
  },
  gate_open(a) {
    const t = a.now();
    noise(a, t, 1.5, { type: 'lowpass', freq: 200, sweepTo: 800, gain: 0.3, attack: 0.3 });
    bell(a, t + 0.4, 392, 2.4, 0.06, 1.41, 3, 1.2);
    bell(a, t + 0.6, 587.3, 2.4, 0.05, 1.41, 3, 1.2);
  },
  flame(a) {
    noise(a, a.now(), 0.3, { type: 'lowpass', freq: 800, gain: 0.05, attack: 0.1 });
  },
};
