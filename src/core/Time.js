/**
 * Global time controller.
 * - realDt:   unscaled delta (UI, camera shake, transitions)
 * - worldDt:  enemies / environment (affected by hit-stop and time rift)
 * - playerDt: the player (affected by hit-stop, less by time rift)
 */
export class Time {
  constructor() {
    this.elapsed = 0;
    this.realDt = 0;
    this.worldDt = 0;
    this.playerDt = 0;
    this.worldScale = 1;
    this.playerScale = 1;
    this.targetWorldScale = 1;
    this.targetPlayerScale = 1;
    this.hitStop = 0;
    this.paused = false;
    this.worldTime = 0;
  }

  /** Freeze gameplay for `ms` milliseconds (keeps the longest request). */
  requestHitStop(ms) {
    this.hitStop = Math.max(this.hitStop, ms / 1000);
  }

  setScales(world, player) {
    this.targetWorldScale = world;
    this.targetPlayerScale = player;
  }

  tick(dt) {
    this.realDt = dt;
    this.elapsed += dt;
    const k = 1 - Math.exp(-dt * 14);
    this.worldScale += (this.targetWorldScale - this.worldScale) * k;
    this.playerScale += (this.targetPlayerScale - this.playerScale) * k;

    if (this.paused) {
      this.worldDt = 0;
      this.playerDt = 0;
      return;
    }
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.worldDt = 0;
      this.playerDt = 0;
      return;
    }
    this.worldDt = dt * this.worldScale;
    this.playerDt = dt * this.playerScale;
    this.worldTime += this.worldDt;
  }

  reset() {
    this.worldScale = this.playerScale = 1;
    this.targetWorldScale = this.targetPlayerScale = 1;
    this.hitStop = 0;
    this.paused = false;
  }
}
