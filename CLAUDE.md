# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

2D exploration game built with TypeScript, PIXI.js v8, and Planck.js. Player navigates procedurally generated cave mazes using dynamic raycasted lighting, physics-based movement, and collectible-driven progression. Live at https://pjx-echoes.netlify.app/

## Tech Stack

**Runtime:** pixi.js ^8.9.1, planck ^1.3.0, gsap ^3.12.7, pixi-filters ^6.1.2, seedrandom ^3.0.5
**Dev:** TypeScript ~5.7.2, Vite ^6.3.1

## Commands

```
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc && vite build
npm run preview  # Preview production build
```

No test runner is configured.

## File Structure

```
src/
├── main.ts                         # Entry point → Game.init()
├── config/
│   ├── Config.ts                   # Master config (physics, collision masks, movement, debug flags)
│   ├── EntitiesConfig.ts           # Per-entity presets (sprite, body, light, particle)
│   ├── LightsConfig.ts             # Per-light-type config (radius, alpha, colors, flicker)
│   ├── LidarConfig.ts              # LIDAR pulse config (expansion, rays, glow, cooldown)
│   ├── ParticleEffectsConfig.ts    # Per-effect config with variance system
│   └── ProcGenLevelsConfig.ts      # Level gen presets ("Standard", "Simple")
├── core/
│   ├── Game.ts                     # PIXI app init, asset loading, resize, ticker
│   └── World.ts                    # Physics, level lifecycle, camera, lighting, LIDAR, masking
├── entities/                       # BaseEntity + Player, Sentry, Exit, Gate, Switch, Torch, Anti
├── level/                          # Level, LevelSkeleton, LevelContext, ExitGroup
├── lidar/                          # LidarManager, LidarPulse, EdgeGlowSegment
├── light/                          # Light (Dynamic/Static), LightManager
├── particles/                      # ParticleEffect (pool-based), ParticleEffectManager
├── physics/                        # PhysicsManager (deferred body destruction)
├── input/                          # InputManager (mouse, touch, keyboard, swipe gestures)
├── utils/                          # MapUtils, LevelUtils, LightUtils, CollisionUtils,
│                                   #   PhysicsUtils, SpriteUtils, EntityUtils, GraphicsUtils,
│                                   #   ColorUtils, MathUtils, RandomGenerator
└── particleEffectPreviewer/        # Standalone particle preview tool (separate Vite entry)
public/
├── assets/                         # fonts/, spritesheets/, textures/
└── particles.html                  # Entry for particle previewer
vite.config.ts                      # Multi-entry: index.html + particles.html
```

## Architecture

**Game loop** (`World.update`): debug input → player input → deferred physics cleanup → `world.step()` → entity updates → particles → camera → light rendering → player view mask → LIDAR render → post-processing → debug text.

**Level lifecycle:** `ProcGenLevelsConfig` preset → `RandomGenerator` (seeded) → map gen (Drunkard's Walk or Cellular Automata) → edge merging → `LevelSkeleton` (blueprint) → `Level` (creates all entities). On exit contact, `pendingReset` flag defers full teardown + rebuild to after `world.step()`.

**Lighting:** Each light raycasts against merged edge segments to build a visibility polygon. `DynamicLight` (player/sentry) rebuilds every frame; `StaticLight` computes once. All lights render to an offscreen `RenderTexture` with additive blending. GSAP tweens drive flicker/color oscillation.

**LIDAR:** Spacebar fires a pulse from the player. Rays are cast once at construction; an expanding arc activates `EdgeGlowSegments` as the wavefront reaches them. Glows persist independently of the pulse.

## Non-obvious Patterns

- **Config-driven entity creation:** `EntitiesConfig.ts` maps each `EntityType` to a full preset (sprite, body shape/fixture/collision mask, light type, particle effect). Adding a new entity type means adding a config entry and a class extending `BaseEntity`.
- **Deferred physics destruction:** Planck.js forbids destroying bodies during `step()` or contact callbacks. `PhysicsManager` queues bodies and destroys them at the start of the next frame. Level reset is also deferred via `pendingReset`.
- **Coordinate system:** Physics in meters (1 unit = 1m). Rendering multiplies by `Config.PixelsPerMeter` (16). All entity sizes/positions are in meters; only sprite placement uses pixels.
- **Singleton managers:** `LightManager.instance` and `ParticleEffectManager.instance` are global registries. Entities register/unregister in their constructor/destroy methods.
- **Container hierarchy matters:** `World.setUpContainersInOrder()` defines render order. `lightsContainer` position is offset to counteract camera movement (viewport-aligned). `entityContainerGroup` wraps pre/main/post entity layers for unified player-view masking.
- **Seeded RNG:** `RandomGenerator` wraps `seedrandom`. All procedural generation (map, entity placement, exits, gates, switches) flows through it for reproducibility.
- **Gentle vs instant destroy:** `gentlyDestroy()` fades lights/particles before cleanup; `destroy()` is immediate. Both defer physics body removal.
