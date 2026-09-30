/**
 * Owns the active scene. Scenes are created lazily from a registry of
 * loaders (dynamic imports keep each mini game in its own chunk).
 */
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.key = null;
    this.registry = {
      lobby: () => import('../scenes/lobby/LobbyScene.js').then((m) => m.LobbyScene),
      archive: () => import('../scenes/archive/ArchiveScene.js').then((m) => m.ArchiveScene),
      campus: () => import('../scenes/campus/CampusGame.js').then((m) => m.CampusGame),
      forest: () => import('../scenes/forest/ForestGame.js').then((m) => m.ForestGame),
    };
  }

  /** Build (but do not enter) a scene. */
  async load(key, params = {}, onProgress) {
    const Cls = await this.registry[key]();
    const scene = new Cls(this.game, params);
    await scene.init(onProgress || (() => {}));
    // Pre-compile shaders so the first frame doesn't hitch
    try {
      if (this.game.renderer.compileAsync) await this.game.renderer.compileAsync(scene.scene, scene.camera);
    } catch {
      /* ignore */
    }
    return scene;
  }

  /** Swap to an already-loaded scene. */
  activate(scene, key) {
    const old = this.current;
    if (old) {
      old.exit();
      old.dispose();
    }
    this.current = scene;
    this.key = key;
    this.game.time.reset();
    this.game.post.setProfile(scene.postProfile, true);
    scene.onResize(window.innerWidth, window.innerHeight);
    scene.enter();
    this.game.applySettings('shadowQuality');
  }

  update(time) {
    if (this.current) this.current.update(time);
  }
}
