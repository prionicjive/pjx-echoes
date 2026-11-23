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
│   ├── Config.ts                   # Barrel re-export: assembles domain configs + entity type constants
│   ├── CameraConfig.ts             # Camera lerp and dead-zone settings
│   ├── DebugConfig.ts              # Debug flags (mutated at runtime by DebugOverlay)
│   ├── FiltersConfig.ts            # Bloom and CRT post-processing filter params
│   ├── MaskConfig.ts               # Player-view mask fill settings
│   ├── MovementConfig.ts           # Movement forces, impulse, gesture/swipe params
│   ├── PhysicsConfig.ts            # Planck.js collision bitmasks, body damping/restitution
│   ├── SpritesheetConfig.ts        # Asset paths and texture name constants
│   ├── EntitiesConfig.ts           # Per-entity presets (sprite, body, light, particle)
│   ├── LightsConfig.ts             # Per-light-type config (radius, alpha, colors, flicker)
│   ├── LidarConfig.ts              # LIDAR pulse config (expansion, rays, glow, cooldown)
│   ├── ParticleEffectsConfig.ts    # Per-effect config with variance system
│   └── ProcGenLevelsConfig.ts      # Level gen presets ("Standard", "Simple")
├── core/
│   ├── Game.ts                     # PIXI app init, asset loading, resize, ticker
│   ├── World.ts                    # Orchestrator: physics step, level lifecycle, game loop
│   ├── CameraManager.ts            # Dead-zone + lerp camera tracking
│   ├── CollisionDispatcher.ts      # Contact callback routing across all entity pair types
│   ├── DebugOverlay.ts             # Debug key bindings and on-screen text
│   ├── LightRenderPipeline.ts      # Two-pass offscreen light rendering with additive blending
│   └── MaskingSystem.ts            # Player-view polygon mask application
├── entities/                       # BaseEntity + Player, Sentry, Exit, Gate, Switch, Torch, Anti
├── level/                          # Level, LevelSkeleton, LevelContext, ExitGroup
├── lidar/                          # LidarManager, LidarPulse, EdgeGlowSegment
├── light/                          # Light (Dynamic/Static), LightManager
├── particles/                      # ParticleEffect (pool-based), ParticleEffectManager
├── physics/                        # PhysicsManager (deferred body destruction)
├── input/                          # InputManager (mouse, touch, keyboard), GestureRecognizer (swipe)
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

**Game loop** (`World.update`): debug input (`DebugOverlay`) → player input → deferred physics cleanup → `world.step()` → entity updates → particles → LIDAR → camera (`CameraManager`) → light rendering (`LightRenderPipeline`) → player view mask (`MaskingSystem`) → LIDAR render → post-processing → debug text.

**Level lifecycle:** `ProcGenLevelsConfig` preset → `RandomGenerator` (seeded) → map gen (Drunkard's Walk or Cellular Automata) → edge merging → `LevelSkeleton` (blueprint) → `Level` (creates all entities). On exit contact, `pendingReset` flag defers full teardown + rebuild to after `world.step()`.

**Lighting:** Each light raycasts against merged edge segments to build a visibility polygon. `DynamicLight` (player/sentry) rebuilds every frame; `StaticLight` computes once and uses a dirty flag to skip redundant redraws. All lights render via `LightRenderPipeline` to an offscreen `RenderTexture` with additive blending. GSAP tweens drive flicker/color oscillation — tweened directly on the `Light` instance properties (`radius`, `alpha`, `tint`) via a `tweenables` proxy object (see GSAP note below).

**LIDAR:** Spacebar fires a pulse from the player. Rays are cast once at construction; an expanding arc activates `EdgeGlowSegments` as the wavefront reaches them. Glows persist independently of the pulse.

## Non-obvious Patterns

- **Config barrel pattern:** `Config.ts` is a re-export barrel that assembles domain-specific configs (`CameraConfig`, `PhysicsConfig`, etc.) into the familiar `Config.X` shape. All existing code imports `{ Config }` unchanged. Individual domain files (`MovementConfig`, `DebugConfig`, etc.) can be imported directly by subsystems that only need one domain.
- **Config-driven entity creation:** `EntitiesConfig.ts` maps each `EntityType` to a full preset (sprite, body shape/fixture/collision mask, light type, particle effect). `BaseEntity` exposes `buildSprite()`, `centerOf()`, and `buildBody()` static helpers that consume these presets. Adding a new entity type means adding a config entry and a class extending `BaseEntity`.
- **Deferred physics destruction:** Planck.js forbids destroying bodies during `step()` or contact callbacks. `PhysicsManager` queues bodies and destroys them at the start of the next frame. Level reset is also deferred via `pendingReset`.
- **Coordinate system:** Physics in meters (1 unit = 1m). Rendering multiplies by `Config.PixelsPerMeter` (16). All entity sizes/positions are in meters; only sprite placement uses pixels. Planck bodies are centered at their midpoint; PIXI sprites origin at top-left. Entity position sync subtracts the entity's radius/half-width before converting to pixels (e.g., `(body.x - radius) * PPM`).
- **Singleton managers:** `LightManager.instance` and `ParticleEffectManager.instance` are global registries. Entities register/unregister in their constructor/destroy methods.
- **Particle pool cap:** `ParticleEffectManager.playEffect()` returns `ParticleEffect | null`. It returns `null` (with a console warning) when the pool for a given effect type is at `MAX_POOL_SIZE`. Callers must handle the null case.
- **Container hierarchy matters:** `World.setUpContainersInOrder()` defines render order. `lightsContainer` position is offset to counteract camera movement (viewport-aligned). `entityContainerGroup` wraps pre/main/post entity layers for unified player-view masking.
- **Seeded RNG:** `RandomGenerator` wraps `seedrandom`. All procedural generation (map, entity placement, exits, gates, switches) flows through it for reproducibility.
- **Gentle vs instant destroy:** `gentlyDestroy()` fades lights/particles before cleanup; `destroy()` is immediate. Both defer physics body removal.
- **GSAP + PixiPlugin conflict:** Never tween a `Light` instance directly with GSAP. PixiPlugin intercepts `alpha` and `tint` on PIXI display objects. All light tweens must target the `tweenables` proxy object on the `Light` instance (`light.tweenables.alpha`, `light.tweenables.tint`, `light.tweenables.radius`), which `Light.update()` copies back each frame.

## Refactoring Decisions

### World.ts Decomposition

`World.ts` was reduced from ~900 to ~230 lines by extracting 5 focused subsystems:

- **Why decompose?** World had too many concerns: camera tracking, collision dispatch, debug UI, light rendering, and masking. Each had distinct state and update logic. Testing, understanding, and modifying any one concern required reading through unrelated code.
- **Why these 5?** Each subsystem has a single responsibility and clear interface. `CameraManager` owns camera state; `LightRenderPipeline` owns rendering to texture; `DebugOverlay` owns debug input and display. World orchestrates them in the game loop.
- **Trade-off:** Slightly more verbose at the call site (instead of `this.updateCamera()`, now `this.cameraManager.updateCamera()`), but clarity wins. Each subsystem can be tested, understood, and reused independently.

### Config Barrel Pattern

Rather than splitting `Config` into per-subsystem imports (requiring 12+ call sites to update), we use a barrel that assembles domain configs into one object:

- **Why a barrel?** `Config.Camera`, `Config.Physics`, `Config.Movement` reads naturally. No import breakage — all existing code unchanged.
- **Why not full domain split?** Entity type constants (Player, Sentry, Wall, etc.) and `PixelsPerMeter` are used by 12+ files each. Splitting them gains no SRP benefit and adds coupling surface. Keeping them in the barrel respects the "minimal coupling" principle.
- **DebugConfig has no `as const`:** Intentional. `DebugOverlay` mutates debug flags at runtime (e.g., `Config.Debug.showDebugText = !Config.Debug.showDebugText`). The barrel pattern ensures both the imported and the exported reference are the same object.

### Entity Construction Helpers

`BaseEntity.buildSprite()`, `centerOf()`, and `buildBody()` static methods eliminate ~25 lines of boilerplate per entity class:

- **Before:** Each entity constructor manually created sprite, calculated center, built physics body — same code repeated 7 times.
- **After:** One line per step: `const sprite = Player.buildSprite(preset, spawnPoint)`.
- **Trade-off:** Introduces an extra layer, but boilerplate elimination is worth it. The helpers are domain-specific and unlikely to be reused elsewhere.

### Lighting Optimizations

Profiling-driven work, not speculative. Measured impact:

- **Raycasting: 0.1–0.2ms per frame** (< 1.2% of 60fps budget)
  - Removed O(N log N) sort (rays already in angular order)
  - Removed redundant `Math.sqrt(r_dx² + r_dy²)` (ray magnitude is always 1 from cos/sin)
  - Reuse single ray object instead of 360 per-frame allocations
- **Spatial indexing deferred.** Adding a grid or quadtree would add ~500 lines of code and test burden for < 1% frame savings. If raycasting grows above ~2ms on larger levels, revisit. Current profiling doesn't justify the complexity.

### Bundle Size Optimization

Split single 846 KB shared chunk into separate vendor bundles:

- **Why?** Vite auto-shares code between two entry points (index.html and particles.html). Both import PIXI, Planck, and GSAP, so they landed in one "ParticleEffectManager" chunk that bundled the whole vendor stack.
- **Result:** Game code changes no longer invalidate the entire vendor bundle in cache. Vendors (PIXI, Planck, GSAP) are now 763 KB, 214 KB, 70 KB respectively — one-time downloads. Game code chunk shrank from 305 KB to 79 KB.
- **Trade-off:** Slightly more HTTP requests (4 instead of 2), but each is cached independently. For Netlify or any modern CDN, this is a net win on repeat visits.

### Code Quality: Conservative Fixes

Removed only verified dead code and fixed clear bugs:

- `shootRaysFromPoint()` — zero callers (LidarPulse rolls its own ray loop)
- `MapUtils.renderMap()` — zero callers (grep-verified)
- `PhysicsManager.ts` naming — obvious typo fix
- `CameraManager` level guards — missing null-check added

Did not refactor working code or add speculative features.

### Deferred Work

**Spatial indexing for raycasting:** Profiled at scale (47 lights, 100+ wall segments) and ruled out. The AABB pre-filter in `DynamicLight.update()` already culls ~90% of segments — avg 10 segments/light survive (max 29), yielding ~117k ray×segment tests/frame at ~1.10ms. A spatial grid would halve tests to ~58k for ~0.5ms savings, which does not justify the complexity. The bottleneck is **light count**, not segment density. Revisit only if dynamic light count grows significantly above ~50 or raycast time exceeds 3ms. If optimization is needed, reducing `numRays` for small-radius lights (e.g., sentries at radius 4 don't need 360 rays) is the higher-value lever. The debug overlay (`` ` `` key) reports `Lights`, `Avg segs/light`, `Max segs/light`, and `Ray×Seg tests/frame` for ongoing monitoring.

**CI/CD pipeline:** Not set up. Would add safety (prevents regressions) and enforce code quality gates. Worth adding after the project stabilizes.

**Test suite:** No tests configured. Worth reconsidering if:
- More developers contribute
- Refactoring becomes frequent
- Bugs from regressions increase
