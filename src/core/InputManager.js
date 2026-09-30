/**
 * Keyboard + mouse state with per-frame edge detection.
 * Codes use KeyboardEvent.code ('KeyW', 'Space', 'ShiftLeft', ...).
 * Mouse buttons are exposed as 'Mouse0' (left), 'Mouse2' (right).
 */
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedSet = new Set();
    this.releasedSet = new Set();
    this.mouse = { x: 0, y: 0, nx: 0, ny: 0, px: 0.5, py: 0.5, moved: false };
    this.enabled = true;
    this.listeners = new Map();
    this.sensitivity = 1;

    window.addEventListener('keydown', (e) => {
      if (this._isTyping(e)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedSet.add(e.code);
      this.keys.add(e.code);
      this._emit('key', e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.releasedSet.add(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());

    window.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.px = e.clientX / window.innerWidth;
      this.mouse.py = e.clientY / window.innerHeight;
      this.mouse.nx = this.mouse.px * 2 - 1;
      this.mouse.ny = -(this.mouse.py * 2 - 1);
      this.mouse.moved = true;
    });
    // Mouse buttons are only captured from the WebGL canvas (UI buttons handle themselves).
    canvas.addEventListener('pointerdown', (e) => {
      const code = 'Mouse' + e.button;
      if (!this.keys.has(code)) this.pressedSet.add(code);
      this.keys.add(code);
      this._emit('mousedown', code, e);
    });
    window.addEventListener('pointerup', (e) => {
      const code = 'Mouse' + e.button;
      this.keys.delete(code);
      this.releasedSet.add(code);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type).delete(fn);
  }

  _emit(type, ...args) {
    const set = this.listeners.get(type);
    if (set) for (const fn of set) fn(...args);
  }

  down(...codes) {
    if (!this.enabled) return false;
    return codes.some((c) => this.keys.has(c));
  }

  pressed(...codes) {
    if (!this.enabled) return false;
    return codes.some((c) => this.pressedSet.has(c));
  }

  released(...codes) {
    return codes.some((c) => this.releasedSet.has(c));
  }

  /** Movement axis from WASD + arrows. */
  axis() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    return { x, y };
  }

  /** Called at the very end of every frame. */
  endFrame() {
    this.pressedSet.clear();
    this.releasedSet.clear();
    this.mouse.moved = false;
  }

  clear() {
    this.keys.clear();
    this.pressedSet.clear();
    this.releasedSet.clear();
  }
}
