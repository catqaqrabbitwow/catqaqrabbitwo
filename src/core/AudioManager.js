import { SFX } from './audio/sfx.js';
import { TRACKS, Sequencer } from './audio/music.js';

/**
 * Web Audio mixer:
 *   music ─┐
 *   sfx  ──┼─> rift lowpass ─> compressor ─> master ─> destination
 *   amb  ──┘        ▲
 *   reverb (convolver, generated impulse) ─┘
 */
export class AudioManager {
  constructor(save) {
    this.save = save;
    this.ctx = null;
    this.ready = false;
    this.current = null;
    this.currentName = null;
    this.ambience = [];
    this.ambienceName = null;
    this._lastPlay = new Map();
  }

  /** Must be called from a user gesture. */
  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.005;
    this.comp.release.value = 0.2;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 20000;
    this.lowpass.Q.value = 0.7;

    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.musicBus.connect(this.lowpass);
    this.sfxBus.connect(this.lowpass);
    this.ambBus.connect(this.lowpass);
    this.lowpass.connect(this.comp).connect(this.master).connect(ctx.destination);

    // generated reverb impulse
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.5;
    this.reverbSend.connect(this.reverb).connect(this.lowpass);

    // shared noise buffers
    const len = ctx.sampleRate * 3;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.brownBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const b = this.brownBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      b[i] = last * 3.5;
    }

    this.ready = true;
    this.applyVolumes();
    this._timer = setInterval(() => this._schedule(), 25);
    if (this._pendingMusic) this.playMusic(this._pendingMusic, 1.5);
    if (this._pendingAmb) this.setAmbience(this._pendingAmb);
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  now() {
    return this.ctx.currentTime + 0.005;
  }

  applyVolumes() {
    if (!this.ready) return;
    const s = this.save.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterVolume, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.musicVolume * 0.9, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.sfxVolume * 0.8, t, 0.05);
  }

  play(name, opts) {
    if (!this.ready) return;
    const fn = SFX[name];
    if (!fn) return;
    // throttle identical sounds within 30ms (e.g. several hits in the same frame)
    const t = performance.now();
    const last = this._lastPlay.get(name) || 0;
    if (t - last < 30 && !(opts && opts.force)) return;
    this._lastPlay.set(name, t);
    try {
      fn(this, opts || {});
    } catch (e) {
      console.warn('sfx error', name, e);
    }
  }

  playMusic(name, fade = 1.2) {
    if (!this.ready) {
      this._pendingMusic = name;
      return;
    }
    if (this.currentName === name) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.current) {
      const old = this.current;
      old.seq.running = false;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => old.gain.disconnect(), (fade + 3) * 1000);
    }
    this.currentName = name;
    if (!name || !TRACKS[name]) {
      this.current = null;
      return;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(1, t + fade);
    gain.connect(this.musicBus);
    const seq = new Sequencer(this, TRACKS[name], gain);
    seq.nextTime = t + 0.15;
    this.current = { seq, gain };
  }

  stopMusic(fade = 1) {
    this.playMusic(null, fade);
  }

  _schedule() {
    if (!this.ready) return;
    if (this.current) this.current.seq.schedule(this.ctx.currentTime + 0.25);
    for (const a of this.ambience) if (a.tick) a.tick(this.ctx.currentTime);
  }

  /** Muffle everything (time rift / pause). */
  setLowpass(freq, time = 0.25) {
    if (!this.ready) return;
    this.lowpass.frequency.setTargetAtTime(freq, this.ctx.currentTime, time / 3);
  }

  // ──────────────────────────── Ambience beds ────────────────────────────

  setAmbience(name) {
    if (!this.ready) {
      this._pendingAmb = name;
      return;
    }
    if (this.ambienceName === name) return;
    this.ambienceName = name;
    const t = this.ctx.currentTime;
    for (const a of this.ambience) {
      a.gain.gain.setTargetAtTime(0.0001, t, 0.5);
      a.running = false;
      setTimeout(() => {
        a.nodes.forEach((nd) => {
          try {
            nd.stop();
          } catch {
            /* already stopped */
          }
        });
        a.gain.disconnect();
      }, 3000);
    }
    this.ambience = [];
    const beds = {
      lobby: ['rain', 'vinyl', 'clock'],
      archive: ['rain_soft', 'vinyl'],
      campus: ['evening', 'wind_soft'],
      forest: ['forest_wind', 'crickets', 'stream'],
    }[name];
    if (beds) for (const b of beds) this.ambience.push(this._bed(b));
  }

  _loopNoise(buffer, filterType, freq, q, gainVal) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gainVal;
    src.connect(f).connect(g);
    src.start();
    return { src, f, g };
  }

  _bed(type) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    gain.connect(this.ambBus);
    const bed = { gain, nodes: [], running: true, next: ctx.currentTime + 0.5 };
    const add = (o) => {
      o.g.connect(gain);
      bed.nodes.push(o.src);
      return o;
    };

    switch (type) {
      case 'rain': {
        add(this._loopNoise(this.noiseBuffer, 'lowpass', 2400, 0.3, 0.05));
        add(this._loopNoise(this.brownBuffer, 'lowpass', 500, 0.5, 0.18));
        bed.tick = (now) => {
          while (bed.running && bed.next < now + 0.2) {
            // droplets on glass
            const t = bed.next;
            const o = ctx.createOscillator();
            o.frequency.setValueAtTime(2000 + Math.random() * 3000, t);
            o.frequency.exponentialRampToValueAtTime(800, t + 0.03);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.004 + Math.random() * 0.006, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
            o.connect(g).connect(gain);
            o.start(t);
            o.stop(t + 0.05);
            bed.next += 0.03 + Math.random() * 0.12;
          }
        };
        break;
      }
      case 'rain_soft':
        add(this._loopNoise(this.noiseBuffer, 'lowpass', 1500, 0.3, 0.03));
        add(this._loopNoise(this.brownBuffer, 'lowpass', 400, 0.5, 0.12));
        break;
      case 'vinyl': {
        add(this._loopNoise(this.noiseBuffer, 'bandpass', 3000, 0.4, 0.004));
        bed.tick = (now) => {
          while (bed.running && bed.next < now + 0.2) {
            const t = bed.next;
            const s = ctx.createBufferSource();
            s.buffer = this.noiseBuffer;
            const f = ctx.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.value = 2000;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.02 + Math.random() * 0.04, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004);
            s.connect(f).connect(g).connect(gain);
            s.start(t, Math.random() * 2);
            s.stop(t + 0.01);
            bed.next += Math.random() * 0.35;
          }
        };
        break;
      }
      case 'clock': {
        bed.tick = (now) => {
          while (bed.running && bed.next < now + 0.2) {
            const t = bed.next;
            const s = ctx.createBufferSource();
            s.buffer = this.noiseBuffer;
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = bed.flip ? 2600 : 3300;
            f.Q.value = 5;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.05, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
            s.connect(f).connect(g).connect(gain);
            s.start(t, Math.random());
            s.stop(t + 0.02);
            bed.flip = !bed.flip;
            bed.next += 1;
          }
        };
        break;
      }
      case 'evening': {
        // distant, soft school ambience: low murmur + occasional crow/brass-band note
        add(this._loopNoise(this.brownBuffer, 'bandpass', 350, 0.8, 0.06));
        bed.tick = (now) => {
          while (bed.running && bed.next < now + 0.2) {
            const t = bed.next;
            if (Math.random() < 0.5) {
              // crow
              for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
                const tt = t + i * 0.32;
                const o = ctx.createOscillator();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(640, tt);
                o.frequency.exponentialRampToValueAtTime(420, tt + 0.22);
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = 1200;
                bp.Q.value = 3;
                const g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, tt);
                g.gain.linearRampToValueAtTime(0.012, tt + 0.03);
                g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25);
                o.connect(bp).connect(g).connect(gain);
                const s = ctx.createGain();
                s.gain.value = 0.6;
                g.connect(s).connect(this.reverbSend);
                o.start(tt);
                o.stop(tt + 0.3);
              }
            } else {
              // far-away trumpet practice note
              const o = ctx.createOscillator();
              o.type = 'sawtooth';
              o.frequency.value = [523.25, 587.33, 659.25, 783.99][Math.floor(Math.random() * 4)];
              const lp = ctx.createBiquadFilter();
              lp.type = 'lowpass';
              lp.frequency.value = 900;
              const g = ctx.createGain();
              g.gain.setValueAtTime(0.0001, t);
              g.gain.linearRampToValueAtTime(0.006, t + 0.2);
              g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
              o.connect(lp).connect(g).connect(gain);
              const s = ctx.createGain();
              s.gain.value = 1;
              g.connect(s).connect(this.reverbSend);
              o.start(t);
              o.stop(t + 1.7);
            }
            bed.next += 5 + Math.random() * 8;
          }
        };
        break;
      }
      case 'wind_soft': {
        const o = add(this._loopNoise(this.brownBuffer, 'bandpass', 600, 0.5, 0.05));
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08;
        const lg = ctx.createGain();
        lg.gain.value = 250;
        lfo.connect(lg).connect(o.f.frequency);
        lfo.start();
        bed.nodes.push(lfo);
        break;
      }
      case 'forest_wind': {
        const o = add(this._loopNoise(this.brownBuffer, 'bandpass', 420, 0.6, 0.12));
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.06;
        const lg = ctx.createGain();
        lg.gain.value = 200;
        lfo.connect(lg).connect(o.f.frequency);
        lfo.start();
        bed.nodes.push(lfo);
        break;
      }
      case 'crickets': {
        bed.tick = (now) => {
          while (bed.running && bed.next < now + 0.2) {
            const t = bed.next;
            const f0 = 4200 + Math.random() * 800;
            const pan = ctx.createStereoPanner();
            pan.pan.value = Math.random() * 2 - 1;
            pan.connect(gain);
            for (let i = 0; i < 3; i++) {
              const tt = t + i * 0.05;
              const o = ctx.createOscillator();
              o.frequency.value = f0;
              const g = ctx.createGain();
              g.gain.setValueAtTime(0.0001, tt);
              g.gain.linearRampToValueAtTime(0.004, tt + 0.01);
              g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.035);
              o.connect(g).connect(pan);
              o.start(tt);
              o.stop(tt + 0.04);
            }
            bed.next += 0.4 + Math.random() * 1.2;
          }
        };
        break;
      }
      case 'stream':
        add(this._loopNoise(this.noiseBuffer, 'bandpass', 1400, 0.6, 0.012));
        add(this._loopNoise(this.noiseBuffer, 'bandpass', 600, 1.2, 0.01));
        break;
      default:
        break;
    }
    return bed;
  }
}
