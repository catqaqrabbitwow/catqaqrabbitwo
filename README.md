# Chrono Archive · 時光檔案館

A Three.js mini-game platform. The lobby is a 2.5D "time traveller's private archive room", with a retro editorial collage UI inspired by the design language of 1920s–30s print. From there you open the **Mini Game Archive** and play two small games:

| # | Title | Direction | Content |
|---|-------|-----------|---------|
| 01 | **校園異聞 · Campus Anomaly** | 2D hand-painted characters in a layered 3D school at sunset, with a fixed cinematic camera | Corridor / classroom / library, 8 NPCs, dialogue, the quest 「消失的學生」, shadow combat, Time Rift |
| 02 | **黑森林試煉 · Trial of the Black Forest** | 2.5D dark fairy-tale: paper puppets in a 3D forest, high follow camera | Forest entrance → altar → clearing → stream → rune gate → slime nest, the quest 「月光種子」, elite boss |

All art, UI textures, character sprites, sound effects and music are **generated at runtime** (Canvas 2D painting, GLSL, Web Audio synthesis). The project contains no external images, audio or models, and no assets taken from any commercial game.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview
```

Target: 1920×1080 at 60 FPS on a mid-range desktop GPU. The UI scales proportionally to other resolutions. Chrome or Edge is recommended.

Developer URL parameters:

- `?scene=campus` / `?scene=forest` / `?scene=archive`: skip the title and go straight to a scene
- `?qa=0.5`: lower the internal render resolution (for headless screenshot QA)

## Controls

**Lobby / Archive**: mouse. Click objects in the room (letters, gramophone, radio, clock, TV, clue board, filing cabinet, the archivist). ESC opens Settings or goes back.

**Campus Anomaly**

| Key | Action |
|---|---|
| A / D | Move left / right |
| W / S | Move toward / away from the camera (in some areas) |
| E | Interact / talk |
| Left click / J | Three-hit combo |
| Shift | Dodge (with invincibility frames and afterimages) |
| Space | Time Rift: the world slows to 25% and you stay at 70% for 2 s; 8 s cooldown (usable in combat) |
| ESC | Pause menu |

**Trial of the Black Forest**

| Key | Action |
|---|---|
| WASD | Move |
| Left click | Three-hit combo (aimed at the cursor) |
| Right click | Heavy attack (charged) |
| Shift | Roll |
| Space | Dark Burst (area knockback; 10 s cooldown) |
| E | Interact |
| ESC | Pause menu |

## Architecture

```
src/
  core/        GameManager · SceneManager · InputManager · AudioManager · UIManager
               TransitionManager · AssetManager · SaveManager · DialogueManager
               QuestManager · CombatManager · PostFX · Cursor · Time
  core/audio/  sfx.js (procedural sound effects) · music.js (step sequencer + original tracks)
  fx/          shaders (DOF / grading) · RainGlass · Dust (particles / god rays)
               Particles (pooled) · SlashTrail · Shockwave · Batcher (geometry merging)
  art/         painter (procedural painting tools) · illustrations · uiTextures
               rig/PaperRig (2D paper-puppet skeleton: atlas, rim-light mask, dissolve, glitch)
               characters/humanoid (anime characters) · characters/chibi (forest paper puppets)
  actors/      Humanoid (procedural walk / breathing / blink / hair and skirt springs)
               ChibiActor (squash and stretch, bounce, roll)
  scenes/      lobby/ · archive/ · campus/ · forest/
  ui/          Panel · Settings · Pause · Confirm · Title · icons · emblem
  styles/      design system (paper, tickets, stamps, button feedback) + per-scene HUDs
```

### Rendering

- `EffectComposer`: a custom **depth-aware bokeh DOF** (it renders its own depth texture, so alpha-tested 2D characters blur correctly), then UnrealBloom, Afterimage (Time Rift), OutputPass (ACES), a custom **grade pass** (split toning, lift, vignette, film grain, chromatic aberration, letterbox, desaturation, rift distortion), and SMAA.
- Each scene has its own post-processing profile, and parameters ease smoothly when you switch between them.
- 2D characters are made of several transparent planes with real world coordinates. They cast shadows through `customDepthMaterial` and sort correctly against the scene. The rim-light mask is baked into a separate texture with canvas compositing, so it is not affected by mipmaps.
- Performance: InstancedMesh (books, grass), geometry merging by material, LOD (forest trees), object pools (particles, slashes, shockwaves, damage numbers), tight shadow frusta that follow the camera, and a Resolution Scale setting.

### UI feedback

Every button uses the same feedback timing:

- **0–50 ms**: the thin frame lights up
- **50–120 ms**: the button drifts toward the cursor
- **120–180 ms**: it scales up, letter spacing opens, the shadow deepens and a light sweep passes over it
- **Press**: it squashes to 0.975, then springs back with elastic easing
- **Sound**: each button type has its own hover and click sound pair (paper, ticket, mechanism, stamp and so on)

The cursor has default, hover, talk, enter, aim and pick states.

## Save data

Settings, quest progress, the collection and statistics are stored in `localStorage` (the key is `chrono-archive-save-v1`). In a private window or when storage is blocked, the game still runs normally; progress just isn't kept.
