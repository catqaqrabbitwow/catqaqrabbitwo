/**
 * Procedural, original music. A small step sequencer schedules synthesized
 * instruments ahead of time on the AudioContext clock.
 */

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** 'C4' → midi */
export const n = (s) => {
  const m = s.match(/^([A-G][#b]?)(-?\d)$/);
  return NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
};
const ns = (str) => str.split(' ').filter(Boolean).map(n);

// ───────────────────────────── Instruments ─────────────────────────────

function envGain(ctx, t, a, peak, hold, rel) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * 0.6, t + a, hold * 0.5);
  g.gain.setTargetAtTime(0.0001, t + a + hold, rel / 4);
  return g;
}

export const INST = {
  piano(ctx, out, t, midi, dur, vel = 0.5, bus) {
    const f = mtof(midi);
    const master = ctx.createGain();
    master.gain.value = vel * 0.16;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, f * (4 + vel * 8)), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 300), t + dur + 0.5);
    master.connect(lp).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.35;
      lp.connect(s).connect(bus.reverb);
    }
    const partials = [1, 2, 3, 4.02, 5.03];
    const amps = [1, 0.42, 0.18, 0.1, 0.05];
    const decay = Math.min(3.5, 1.2 + 200 / f);
    partials.forEach((p, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * p;
      o.detune.value = (Math.random() - 0.5) * 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amps[i], t + 0.004);
      g.gain.setTargetAtTime(0.0001, t + 0.004, (decay / (1 + i * 0.8)) / 3);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.08);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 1.2);
    });
  },

  epiano(ctx, out, t, midi, dur, vel = 0.5, bus) {
    const f = mtof(midi);
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const mg = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 1.6 * vel, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.9);
    mod.connect(mg).connect(car.frequency);
    const g = envGain(ctx, t, 0.005, vel * 0.1, dur, 0.6);
    car.connect(g).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.3;
      g.connect(s).connect(bus.reverb);
    }
    car.start(t);
    mod.start(t);
    car.stop(t + dur + 1);
    mod.stop(t + dur + 1);
  },

  bass(ctx, out, t, midi, dur, vel = 0.6) {
    const f = mtof(midi);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.28, t + 0.01);
    g.gain.setTargetAtTime(vel * 0.1, t + 0.01, 0.18);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(out);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.4);
    o2.stop(t + dur + 0.4);
  },

  pad(ctx, out, t, midi, dur, vel = 0.4, bus, { cutoff = 1100, attack = 0.8, type = 'sawtooth' } = {}) {
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    lp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.05, t + attack);
    g.gain.setValueAtTime(vel * 0.05, t + Math.max(attack, dur - 0.1));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + attack * 0.8);
    lp.connect(g).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.6;
      g.connect(s).connect(bus.reverb);
    }
    [-7, 0, 7].forEach((d) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = d + (Math.random() - 0.5) * 3;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + attack + 0.2);
    });
  },

  strings(ctx, out, t, midi, dur, vel = 0.5, bus) {
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800 + vel * 1200;
    const g = ctx.createGain();
    const a = 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.045, t + a);
    g.gain.setValueAtTime(vel * 0.045, t + Math.max(a, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35);
    lp.connect(g).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.5;
      g.connect(s).connect(bus.reverb);
    }
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vg = ctx.createGain();
    vg.gain.value = f * 0.004;
    vib.connect(vg);
    [-5, 4].forEach((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      vg.connect(o.frequency);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.5);
    });
    vib.start(t);
    vib.stop(t + dur + 0.5);
  },

  woodwind(ctx, out, t, midi, dur, vel = 0.5, bus, { bright = 3 } = {}) {
    const f = mtof(midi);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.25);
    vib.connect(vg).connect(o.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = f * bright;
    lp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.09, t + 0.04);
    g.gain.setValueAtTime(vel * 0.08, t + Math.max(0.05, dur - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
    o.connect(lp).connect(g).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.35;
      g.connect(s).connect(bus.reverb);
    }
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.2);
    vib.stop(t + dur + 0.2);
  },

  pizz(ctx, out, t, midi, dur, vel = 0.5, bus) {
    const f = mtof(midi);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f * 6, t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.2, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.004, 0.07);
    o.connect(lp).connect(g).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.4;
      g.connect(s).connect(bus.reverb);
    }
    o.start(t);
    o.stop(t + 0.6);
  },

  celesta(ctx, out, t, midi, dur, vel = 0.5, bus) {
    const f = mtof(midi);
    [1, 4.0, 10.1].forEach((p, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * p;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel * [0.09, 0.025, 0.01][i], t + 0.003);
      g.gain.setTargetAtTime(0.0001, t + 0.003, [0.5, 0.12, 0.05][i]);
      o.connect(g).connect(out);
      if (bus && bus.reverb && i === 0) {
        const s = ctx.createGain();
        s.gain.value = 0.7;
        g.connect(s).connect(bus.reverb);
      }
      o.start(t);
      o.stop(t + 2.5);
    });
  },

  kalimba(ctx, out, t, midi, dur, vel = 0.5, bus) {
    const f = mtof(midi);
    [1, 5.4].forEach((p, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * p;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel * [0.12, 0.03][i], t + 0.002);
      g.gain.setTargetAtTime(0.0001, t + 0.002, [0.3, 0.04][i]);
      o.connect(g).connect(out);
      if (bus && bus.reverb && i === 0) {
        const s = ctx.createGain();
        s.gain.value = 0.5;
        g.connect(s).connect(bus.reverb);
      }
      o.start(t);
      o.stop(t + 1.8);
    });
  },

  kick(ctx, out, t, vel = 0.8) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  },

  tom(ctx, out, t, vel = 0.6, pitch = 1, bus) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(70 * pitch, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.3;
      g.connect(s).connect(bus.reverb);
    }
    o.start(t);
    o.stop(t + 0.5);
  },

  taiko(ctx, out, t, vel = 0.8, bus, noiseBuf) {
    INST.tom(ctx, out, t, vel * 1.3, 0.55, bus);
    if (noiseBuf) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel * 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      s.connect(f).connect(g).connect(out);
      s.start(t, Math.random());
      s.stop(t + 0.2);
    }
  },

  brush(ctx, out, t, vel = 0.4, noiseBuf, long = false) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 5000;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    const d = long ? 0.28 : 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.09, t + (long ? 0.08 : 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 1.5);
    s.stop(t + d + 0.05);
  },

  hat(ctx, out, t, vel = 0.3, noiseBuf) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random());
    s.stop(t + 0.06);
  },

  choir(ctx, out, t, midi, dur, vel = 0.4, bus) {
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.06, t + 0.6);
    g.gain.setValueAtTime(vel * 0.06, t + Math.max(0.6, dur - 0.1));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    g.connect(out);
    if (bus && bus.reverb) {
      const s = ctx.createGain();
      s.gain.value = 0.8;
      g.connect(s).connect(bus.reverb);
    }
    const src = ctx.createGain();
    [-6, 0, 6].forEach((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(src);
      o.start(t);
      o.stop(t + dur + 0.8);
    });
    [[650, 6], [1080, 8], [2650, 10]].forEach(([fr, q], i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fr;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = [1, 0.6, 0.25][i];
      src.connect(bp).connect(gg).connect(g);
    });
  },
};

// ───────────────────────────── Tracks ─────────────────────────────
// Each track: { bpm, stepsPerBeat, bars, beatsPerBar, swing, step(ctx, out, t, step, bar, bus, a) }

const chordSeq = (chords) => chords.map((c) => ({ bass: n(c[0]), notes: ns(c[1]) }));

const LOBBY_CHORDS = chordSeq([
  ['D2', 'F3 A3 C4 E4'], // Dm9
  ['G2', 'F3 B3 E4 A4'], // G13
  ['C2', 'E3 G3 B3 D4'], // Cmaj9
  ['A1', 'G3 C#4 F4 A4'], // A7b13
  ['D2', 'F3 A3 C4 E4'],
  ['Bb1', 'Ab3 D4 E4 G4'], // Bb13#11
  ['E2', 'D3 G3 Bb3 D4'], // Em7b5
  ['A1', 'G3 C#4 F4 Bb4'], // A7b9
]);
const LOBBY_WALK = [
  ['D2', 'F2', 'A2', 'C3'],
  ['G2', 'B2', 'D3', 'F2'],
  ['C2', 'E2', 'G2', 'B2'],
  ['A1', 'C#2', 'E2', 'G2'],
  ['D2', 'E2', 'F2', 'A2'],
  ['Bb1', 'D2', 'F2', 'Ab2'],
  ['E2', 'G2', 'Bb2', 'D3'],
  ['A1', 'E2', 'G2', 'C#2'],
].map((b) => b.map(n));
const LOBBY_MELODY = [
  // [bar, beat(0..4 in 8ths index 0..7), midi, len(beats)]
  [0, 2, 'A4', 1], [0, 4, 'C5', 1], [0, 6, 'E5', 2],
  [1, 3, 'D5', 1], [1, 5, 'B4', 2],
  [2, 0, 'G4', 1], [2, 2, 'B4', 1], [2, 4, 'D5', 3],
  [3, 3, 'C#5', 1], [3, 5, 'Bb4', 1], [3, 7, 'A4', 1],
  [4, 2, 'F5', 1], [4, 4, 'E5', 1], [4, 6, 'C5', 2],
  [5, 2, 'D5', 1], [5, 4, 'E5', 3],
  [6, 1, 'D5', 1], [6, 3, 'Bb4', 1], [6, 5, 'G4', 1],
  [7, 2, 'A4', 1], [7, 4, 'C#5', 1], [7, 6, 'E5', 2],
].map(([b, s, m, l]) => ({ b, s, m: n(m), l }));

const CAMPUS_CHORDS = chordSeq([
  ['G2', 'B3 D4 F#4 A4'], // Gmaj9
  ['A2', 'C#4 E4 F#4 A4'], // A6
  ['F#2', 'A3 C#4 E4 A4'], // F#m7
  ['B1', 'A3 D4 F#4 B4'], // Bm7
  ['E2', 'G3 B3 D4 F#4'], // Em9
  ['A2', 'D4 E4 G4 B4'], // A9sus
  ['D2', 'C#4 F#4 A4 E5'], // Dmaj9
  ['D2', 'D4 F#4 A4 B4'], // D6
]);
const CAMPUS_MELODY = [
  [0, 0, 'F#5', 3], [0, 6, 'E5', 1], [1, 0, 'E5', 2], [1, 4, 'C#5', 2],
  [2, 0, 'C#5', 3], [2, 6, 'B4', 1], [3, 0, 'D5', 4],
  [4, 0, 'B4', 2], [4, 4, 'D5', 1], [4, 6, 'F#5', 1], [5, 0, 'E5', 3], [5, 6, 'A4', 1],
  [6, 0, 'A5', 3], [6, 6, 'F#5', 1], [7, 0, 'E5', 4],
].map(([b, s, m, l]) => ({ b, s, m: n(m), l }));

const FOREST_BASS = ns('E2 E2 G2 A2 B2 A2 G2 D2 E2 E2 G2 A2 C3 B2 A2 F#2');
const FOREST_MELODY = [
  [0, 0, 'E4', 0.5], [0, 2, 'G4', 0.5], [0, 4, 'A4', 0.5], [0, 6, 'B4', 1],
  [1, 2, 'D5', 0.5], [1, 4, 'B4', 0.5], [1, 6, 'A4', 0.5],
  [2, 0, 'G4', 0.5], [2, 2, 'F#4', 0.5], [2, 4, 'E4', 1],
  [3, 0, 'D4', 0.5], [3, 2, 'E4', 0.5], [3, 3, 'F#4', 0.5], [3, 4, 'G4', 1.5],
  [4, 0, 'B4', 0.5], [4, 2, 'C5', 0.5], [4, 4, 'B4', 0.5], [4, 6, 'G4', 1],
  [5, 2, 'A4', 0.5], [5, 4, 'F#4', 0.5], [5, 6, 'D4', 0.5],
  [6, 0, 'E4', 0.5], [6, 2, 'G4', 0.5], [6, 4, 'B4', 0.5], [6, 5, 'C5', 0.5], [6, 6, 'D5', 1],
  [7, 0, 'B4', 1], [7, 4, 'E4', 2],
].map(([b, s, m, l]) => ({ b, s, m: n(m), l }));

export const TRACKS = {
  lobby: {
    bpm: 72,
    beatsPerBar: 4,
    stepsPerBeat: 2,
    bars: 8,
    swing: 0.16,
    step(ctx, out, t, s, bar, bus, a) {
      const c = LOBBY_CHORDS[bar];
      const spb = 60 / this.bpm;
      // comp: beat 1 and the "and" of 2, sometimes of 4
      if (s === 0) c.notes.forEach((m, i) => INST.epiano(ctx, out, t + i * 0.012, m, spb * 1.6, 0.45, bus));
      if (s === 3 && bar % 2 === 1) c.notes.forEach((m, i) => INST.epiano(ctx, out, t + i * 0.01, m, spb * 0.8, 0.3, bus));
      if (s === 7 && bar % 4 === 2) c.notes.slice(1).forEach((m) => INST.epiano(ctx, out, t, m + 12, spb * 0.5, 0.2, bus));
      // walking bass
      if (s % 2 === 0) INST.bass(ctx, out, t, LOBBY_WALK[bar][s / 2], spb * 0.9, s === 0 ? 0.75 : 0.55);
      // brushes
      if (s % 2 === 0) INST.brush(ctx, out, t, s === 2 || s === 6 ? 0.55 : 0.3, a.noiseBuffer, s === 2 || s === 6);
      if (s % 2 === 1) INST.brush(ctx, out, t, 0.18, a.noiseBuffer);
      // melody on celesta-piano (plays every other loop more sparsely)
      for (const m of LOBBY_MELODY) {
        if (m.b === bar && m.s === s && (a.loop % 2 === 0 || m.s % 4 === 0)) INST.piano(ctx, out, t, m.m, spb * m.l, 0.5, bus);
      }
    },
  },

  archive: {
    bpm: 66,
    beatsPerBar: 4,
    stepsPerBeat: 2,
    bars: 8,
    swing: 0.08,
    step(ctx, out, t, s, bar, bus, a) {
      const c = LOBBY_CHORDS[bar];
      const spb = 60 / this.bpm;
      if (s === 0) {
        INST.pad(ctx, out, t, c.bass + 12, spb * 4, 0.5, bus, { cutoff: 700, attack: 1.2 });
        c.notes.forEach((m) => INST.pad(ctx, out, t, m, spb * 4, 0.28, bus, { cutoff: 900, attack: 1.4, type: 'triangle' }));
      }
      const arp = [0, 1, 2, 3, 2, 1, 3, 2];
      if (s % 1 === 0) INST.celesta(ctx, out, t, c.notes[arp[s]] + 12, spb, s % 4 === 0 ? 0.55 : 0.35, bus);
      if (s === 0 || s === 4) INST.bass(ctx, out, t, c.bass, spb * 1.8, 0.35);
    },
  },

  campus: {
    bpm: 80,
    beatsPerBar: 4,
    stepsPerBeat: 2,
    bars: 8,
    swing: 0,
    step(ctx, out, t, s, bar, bus, a) {
      const c = CAMPUS_CHORDS[bar];
      const spb = 60 / this.bpm;
      const arp = [c.bass + 12, c.notes[0], c.notes[1], c.notes[2], c.notes[3], c.notes[2], c.notes[1], c.notes[0]];
      INST.piano(ctx, out, t, arp[s], spb * 1.2, s === 0 ? 0.5 : 0.32, bus);
      if (s === 0) {
        INST.piano(ctx, out, t, c.bass, spb * 3.5, 0.5, bus);
        c.notes.forEach((m) => INST.strings(ctx, out, t, m - 12, spb * 4, 0.35, bus));
      }
      if (a.loop % 2 === 1) {
        for (const m of CAMPUS_MELODY) if (m.b === bar && m.s === s) INST.strings(ctx, out, t, m.m, spb * m.l * 0.95, 0.55, bus);
      }
    },
  },

  campus_battle: {
    bpm: 132,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    bars: 4,
    swing: 0,
    step(ctx, out, t, s, bar, bus, a) {
      const spb = 60 / this.bpm;
      const roots = [n('D2'), n('D2'), n('Bb1'), n('C2')];
      const r = roots[bar];
      const ost = [0, 0, 12, 0, 3, 0, 10, 0, 0, 0, 12, 0, 7, 0, 5, 3];
      if (s % 2 === 0) INST.strings(ctx, out, t, r + 12 + ost[s], spb * 0.4, 0.7, bus);
      if (s === 0 || s === 10) INST.taiko(ctx, out, t, 0.9, bus, a.noiseBuffer);
      if (s === 6 || s === 14) INST.taiko(ctx, out, t, 0.6, bus, a.noiseBuffer);
      if (s % 2 === 1) INST.hat(ctx, out, t, 0.35, a.noiseBuffer);
      if (s === 0) {
        INST.pad(ctx, out, t, r + 24, spb * 4, 0.4, bus, { cutoff: 1500, attack: 0.3 });
        INST.pad(ctx, out, t, r + 27, spb * 4, 0.3, bus, { cutoff: 1500, attack: 0.3 });
        INST.bass(ctx, out, t, r, spb * 3.5, 0.8);
      }
      if (bar === 3 && s >= 12) INST.piano(ctx, out, t, r + 36 + (s - 12) * 2, spb * 0.3, 0.5, bus);
      if (s === 8 && bar % 2 === 1) [0, 1, 6].forEach((d) => INST.piano(ctx, out, t, r + 12 + d, spb, 0.6, bus));
    },
  },

  forest: {
    bpm: 104,
    beatsPerBar: 4,
    stepsPerBeat: 2,
    bars: 8,
    swing: 0.12,
    step(ctx, out, t, s, bar, bus, a) {
      const spb = 60 / this.bpm;
      const b = FOREST_BASS[(bar * 2 + (s >= 4 ? 1 : 0)) % FOREST_BASS.length];
      if (s % 4 === 0) INST.woodwind(ctx, out, t, b, spb * 0.4, 0.8, bus, { bright: 2.2 });
      if (s % 4 === 2) INST.pizz(ctx, out, t, b + 12, spb * 0.3, 0.5, bus);
      if (s % 2 === 1) INST.pizz(ctx, out, t, b + 19, spb * 0.2, 0.25, bus);
      if (s === 0 || s === 5) INST.tom(ctx, out, t, 0.45, s === 0 ? 1 : 1.3, bus);
      if (s % 2 === 1) INST.hat(ctx, out, t, 0.25, a.noiseBuffer);
      for (const m of FOREST_MELODY) {
        if (m.b === bar && m.s === s) {
          if (a.loop % 2 === 0) INST.kalimba(ctx, out, t, m.m + 12, spb * m.l, 0.5, bus);
          else INST.woodwind(ctx, out, t, m.m, spb * m.l * 0.9, 0.5, bus, { bright: 4 });
        }
      }
      if (s === 0 && bar % 4 === 0) INST.choir(ctx, out, t, n('E4'), spb * 8, 0.35, bus);
      if (s === 0 && bar % 4 === 2) INST.choir(ctx, out, t, n('C4'), spb * 8, 0.3, bus);
    },
  },

  forest_battle: {
    bpm: 144,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    bars: 4,
    swing: 0,
    step(ctx, out, t, s, bar, bus, a) {
      const spb = 60 / this.bpm;
      const roots = [n('E2'), n('E2'), n('C2'), n('D2')];
      const r = roots[bar];
      const kicks = [0, 3, 6, 8, 11, 14];
      if (kicks.includes(s)) INST.tom(ctx, out, t, 0.7, s === 0 || s === 8 ? 0.7 : 1.1, bus);
      if (s === 4 || s === 12) INST.taiko(ctx, out, t, 0.8, bus, a.noiseBuffer);
      if (s % 2 === 1) INST.hat(ctx, out, t, 0.3, a.noiseBuffer);
      const riff = [0, 0, 3, 0, 7, 0, 5, 3, 0, 0, 3, 0, 10, 7, 5, 3];
      if (s % 2 === 0) INST.woodwind(ctx, out, t, r + 12 + riff[s], spb * 0.35, 0.8, bus, { bright: 2.5 });
      if (s === 0) {
        INST.choir(ctx, out, t, r + 24, spb * 4, 0.45, bus);
        INST.choir(ctx, out, t, r + 31, spb * 4, 0.3, bus);
        INST.bass(ctx, out, t, r, spb * 3.5, 0.8);
      }
      if (s % 4 === 2) INST.kalimba(ctx, out, t, r + 36 + riff[s], spb * 0.4, 0.3, bus);
    },
  },
};

export class Sequencer {
  constructor(audio, track, out) {
    this.a = audio;
    this.track = track;
    this.out = out;
    this.step = 0;
    this.bar = 0;
    this.loop = 0;
    this.nextTime = audio.ctx.currentTime + 0.1;
    this.running = true;
  }

  schedule(horizon) {
    const tr = this.track;
    const stepDur = 60 / tr.bpm / tr.stepsPerBeat;
    const stepsPerBar = tr.beatsPerBar * tr.stepsPerBeat;
    while (this.running && this.nextTime < horizon) {
      let t = this.nextTime;
      if (tr.swing && this.step % 2 === 1) t += stepDur * tr.swing;
      try {
        tr.step(this.a.ctx, this.out, t, this.step, this.bar, { reverb: this.a.reverbSend }, this);
      } catch (e) {
        console.warn('music step error', e);
      }
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= stepsPerBar) {
        this.step = 0;
        this.bar++;
        if (this.bar >= tr.bars) {
          this.bar = 0;
          this.loop++;
        }
      }
    }
  }

  get noiseBuffer() {
    return this.a.noiseBuffer;
  }
}
