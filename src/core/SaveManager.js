const KEY = 'chrono-archive-save-v1';

export const DEFAULT_SETTINGS = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  resolutionScale: 1,
  shadowQuality: 'high', // off | low | high
  postProcessing: true,
  bloom: true,
  depthOfField: true,
  motionEffect: true,
  fullscreen: false,
  fpsCounter: false,
  mouseSensitivity: 1,
  cameraShake: 1,
};

const DEFAULT_DATA = () => ({
  profile: {
    name: '旅人 TRAVELER',
    level: 12,
    exp: 340,
    id: 'No.' + String(Math.floor(1000 + Math.random() * 8999)) + '-1929',
  },
  settings: { ...DEFAULT_SETTINGS },
  collection: [],
  quests: {},
  letters: { read: [] },
  stats: {
    playSeconds: 0,
    sessions: 0,
    enemiesDefeated: 0,
    slimesDefeated: 0,
    shadowsDefeated: 0,
    questsCompleted: 0,
    deaths: 0,
    lastGame: null,
  },
});

/** localStorage wrapper that never throws (private windows, blocked storage). */
export class SaveManager {
  constructor() {
    this.data = DEFAULT_DATA();
    this.listeners = new Set();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const d = DEFAULT_DATA();
        this.data = {
          ...d,
          ...parsed,
          profile: { ...d.profile, ...parsed.profile },
          settings: { ...d.settings, ...parsed.settings },
          stats: { ...d.stats, ...parsed.stats },
          letters: { ...d.letters, ...parsed.letters },
        };
      }
    } catch {
      /* storage unavailable — keep defaults */
    }
    this.data.stats.sessions += 1;
    this._dirty = true;
  }

  get settings() {
    return this.data.settings;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  set(path, value) {
    const parts = path.split('.');
    let o = this.data;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
    this.save();
  }

  addExp(amount) {
    const p = this.data.profile;
    p.exp += amount;
    let leveled = false;
    while (p.exp >= this.expToNext()) {
      p.exp -= this.expToNext();
      p.level += 1;
      leveled = true;
    }
    this.save();
    return leveled;
  }

  expToNext() {
    return 400 + this.data.profile.level * 40;
  }

  addItem(item) {
    if (!this.data.collection.find((c) => c.id === item.id)) {
      this.data.collection.push({ ...item, date: Date.now() });
      this.save();
      return true;
    }
    return false;
  }

  hasItem(id) {
    return !!this.data.collection.find((c) => c.id === id);
  }

  stat(name, delta = 1) {
    this.data.stats[name] = (this.data.stats[name] || 0) + delta;
    this._dirty = true;
  }

  save() {
    this._dirty = false;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
    for (const fn of this.listeners) fn(this.data);
  }

  /** Called periodically to persist counters like play time. */
  tick(dt) {
    this.data.stats.playSeconds += dt;
    this._acc = (this._acc || 0) + dt;
    if (this._acc > 10) {
      this._acc = 0;
      this.save();
    }
  }

  resetAll() {
    const keepSettings = { ...this.data.settings };
    this.data = DEFAULT_DATA();
    this.data.settings = keepSettings;
    this.save();
  }
}
