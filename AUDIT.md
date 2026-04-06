# Technical Debt Audit

*Generated 2025-04-05 against commit `95375ec` on branch `claude-code-changes`*

Codebase: 51 TypeScript files, ~6,400 lines of application code.

---

## Top 5 Areas of Technical Debt

### 1. World.ts -- God Object (1,011 lines, 30+ methods)

**Severity: Critical**

`World.ts` is the single largest source of technical debt. It is a textbook God Object that owns and orchestrates every subsystem: physics stepping, collision dispatch, camera, lighting pipeline (two-pass render-to-texture), LIDAR, player-view masking, post-processing filters, debug UI, input routing, container hierarchy, level lifecycle, and window resize handling. Every new feature added to the game touches this file.

**Specific problems:**

- **`onBeginContact()` (lines 353-486, 133 lines):** A monolithic collision dispatcher using an if/else chain across 8+ collision pair types. The Player-Edge and Sentry-Edge handlers (lines 366-428) are nearly identical -- 60+ lines of duplicated manifold extraction and particle spawning logic. Each branch directly calls into `this.player!`, `this.level!`, and `ParticleEffectManager.instance`, tightly coupling collision response to specific entity types and singletons.

- **`updateCamera()` (lines 651-723, 69 lines):** Camera dead-zone + lerp logic is duplicated across the X and Y axes -- the same pattern written twice with only axis names changed. This method also directly reads `Config.Camera` and `Config.PixelsPerMeter`, couples to `this.level!.getWidth()`, and mutates `this.worldContainer.x/y`.

- **Lighting pipeline (lines 803-945, ~140 lines):** `updateAndRenderLights()`, `renderPlayerViewModeLights()`, `renderNormalLights()`, `drawScreenSpaceMask()`, and `renderMaskedLights()` implement a complex two-pass render-to-texture pipeline with additive blending. This is a self-contained rendering subsystem embedded inside the orchestrator. `renderMaskedLights()` uses `any[]` for its light parameter (line 929), discarding type safety.

- **Player-view masking (lines 729-797, ~70 lines):** Polygon caching, world-space mask drawing, cache invalidation, and mask lifecycle management. The cache uses `Date.now()` for invalidation (line 771), which provides millisecond granularity -- effectively never caching within a single frame, since the update loop runs at ~16ms intervals.

- **Debug system (lines 580-623):** Debug key handling is coupled to the main update loop rather than being an optional overlay.

**Decomposition targets:** CameraManager (~110 lines), LightRenderPipeline (~140 lines), CollisionDispatcher (~130 lines), MaskingSystem (~70 lines), DebugOverlay (~50 lines). Post-refactoring World.ts would be ~500 lines with clear single-responsibility orchestration.

---

### 2. Light.ts -- Mixed Concerns and Duplicated Animation Logic (448 lines)

**Severity: High**

`Light.ts` contains the abstract `Light` base class plus both `DynamicLight` and `StaticLight` in a single file. The core issue is that animation logic (GSAP tweens for flicker, color oscillation, radius changes) is duplicated across both subclasses rather than being composed.

**Specific problems:**

- **Tweenable mirror pattern (lines 116-120, 147-150):** Light maintains a `tweenables` object (`{radius, tint, alpha}`) as a tween target, then copies values back to the main properties in `update()`. This creates dual state where properties and their tween mirrors can diverge.

- **Duplicated animation methods:** `flickerAlpha()` appears in both `DynamicLight` (lines 276-288) and `StaticLight` (lines 415-448) with nearly identical implementations. Same for `oscillateColor()`. These should be extracted to a shared `LightAnimationController` or mixin.

- **`baseRadius` property confusion (line 12 TODO, lines 95-96, 133, 137):** `baseRadius` is stored both in options and directly on the instance. `increaseBaseRadius()` / `decreaseBaseRadius()` (lines 132-139) accept a `duration` parameter but don't use it (the tween call is absent). Dead code with unclear intent.

- **StaticLight stale polygon:** `StaticLight` computes its visibility polygon once in the constructor (line 339). If world geometry changes, `recomputeLightPoints()` (lines 385-408) must be called manually. There is no invalidation mechanism -- the caller must know to trigger recomputation.

- **`render()` called unconditionally (lines 161-181):** The mask polygon is redrawn every frame even when `lightPoints` hasn't changed. A dirty flag would eliminate redundant redraws for static lights and for dynamic lights that haven't moved.

- **No spatial indexing for raycasting:** `DynamicLight.update()` (line 239) filters segments by bounding box in O(M) per light per frame, then `buildLightPolygon()` tests each ray against all nearby segments: O(numRays * M) per dynamic light per frame. With 360 rays and ~100 segments, that's ~36,000 ray-segment intersection tests per dynamic light per frame. A spatial index (grid or quadtree) would reduce this significantly.

---

### 3. Level Generation Pipeline -- LevelUtils.ts (442 lines) and MapUtils.ts (542 lines)

**Severity: High**

The level generation pipeline is functionally sound (config -> seeded RNG -> map gen -> skeleton -> entities), but the implementation has accumulated significant complexity in two oversized utility files.

**LevelUtils.ts specific problems:**

- **`createLevelSkeletonFromProcGenMap()` (lines 78-404, 326 lines):** A single function containing 200+ lines of nested closures for exit group placement. Helper functions like `removePoint()`, `isTooClose()`, `isInGatedArea()`, and `setupGatedAreaAroundExit()` are all defined inside this function, sharing mutable closure state over the `openSpaces` array.

- **Order-dependent mutation:** Entity placement mutates a shared `openSpaces` array via `splice()`. Player spawn is placed first, then exits (which also place gates), then switches, torches, anti entities, and sentries. Each placement constrains the next. The ordering is implicit and reordering would silently break level generation.

- **Silent constraint degradation:** Exit placement attempts 10 random positions before falling back to any open space (lines 231, 251-255). Switch placement tries 20 positions then falls back (lines 282, 304-321). When fallbacks trigger, distance constraints are silently violated. No warning is emitted.

- **Magic numbers:** Placement retry counts (10, 20), cellular automata neighbor thresholds (4 in MapUtils line 90, 5 in line 280 -- different values with no explanation), walker lifetime -- all hard-coded rather than parameterized through config.

**MapUtils.ts specific problems:**

- **Edge merging (lines 453-541):** Complex `shouldStart`/`shouldEnd` logic for merging consecutive wall edges into segments. The boolean conditions (lines 467-469, 509-511) are dense and error-prone with no comments explaining the edge cases.

- **Cave connectivity (line 295):** Uses nested loops with Manhattan distance to find closest cave pairs: O(N^2) where N is the number of open tiles. Only runs once per level gen, but could be expensive on large maps.

---

### 4. Entity Construction -- Boilerplate and Missed Factory Pattern (962 lines across 7 entity files)

**Severity: Medium-High**

Every entity class follows an identical constructor pattern: create sprite, calculate center position, create physics body, create light, create particle effect, call `super()`, set user data, sync effect position, play effect. This pattern is repeated across Player (344 lines), Sentry (113), Switch (100), Torch (82), Exit (70), Anti (68), and Gate (63).

**Specific problems:**

- **Constructor boilerplate duplication:** Compare any two entity constructors -- they're structurally identical. `EntitiesConfig.ts` already defines complete presets (sprite, body, light, particle) per entity type, but entity classes don't use a factory; they manually destructure and apply these presets.

- **Position calculation inconsistency:** Player uses `x + Config.Player.radius` (Player.ts:43), while Torch uses `x + Config.Torch.width / 2` (Torch.ts:34), Anti uses `x + Config.Anti.width / 2` (Anti.ts:33). These are semantically equivalent for centering, but the inconsistent patterns make it easy to introduce off-by-half-unit bugs.

- **`destroy()` vs `gentlyDestroy()` duplication (BaseEntity.ts:76-122):** 46 lines with nearly identical logic. The only difference is whether `LightManager.removeLight()` or `gentlyRemoveLight()` is called, and whether `ParticleEffectManager.returnToPool()` or `gentlyReturnToPool()` is used. A single method with a `mode` parameter would eliminate the duplication.

- **Light creation inconsistency:** Sentry checks `if (EntitiesConfig.Sentry.light)` (Sentry.ts:48) before creating its light, Player directly creates `DynamicLight` (Player.ts:56), Torch directly creates `StaticLight` (Torch.ts:47). The config already specifies whether a light exists, but each entity interprets it differently.

- **An `EntityFactory` using `EntitiesConfig`** could reduce each entity class to just its unique behavior (Player movement/input, Sentry AI, Switch gate-triggering), with all construction handled centrally.

---

### 5. Particle System -- Dual Bookkeeping and Unbounded Pool Growth (569 lines)

**Severity: Medium**

The particle system has a clean public API but internal complexity that creates subtle state management issues.

**ParticleEffectManager specific problems:**

- **Dual tracking (ParticleEffectManager.ts:22-84):** Effects exist simultaneously in both `activeEffects: Set<ParticleEffect>` and `effectPools: Map<ParticleEffectType, ParticleEffect[]>`. Adding to `activeEffects` happens in `playEffect()` (line 126), removal happens in `returnToPool()` (line 94), but the pool array always contains the effect. Reconciling "active" vs "pooled" state requires checking both structures.

- **Unbounded pool growth:** `getFromPool()` (lines 70-84) creates a new `ParticleEffect` whenever no idle instance is found: `pool.push(effect)`. There's no maximum pool size, no warning on growth, and pooled effects are never destroyed. Under sustained load (e.g., many simultaneous collision effects), the pool grows without bound, each instance holding 100+ sprite children.

- **Fragile callback lifecycle (line 129-131):** The `onEmpty` callback is set inside `playEffect()`. If `playEffect()` is called on the same effect instance before the previous play cycle completes, the callback is silently overwritten. This could cause effects to never return to the pool.

**ParticleEffect specific problems:**

- **Mixed emission and lifecycle (ParticleEffect.ts:86-300):** The class handles both emission logic (emit angle, spread, rotation, accumulator) and particle pool management (get/recycle/ready particles). These are distinct responsibilities that could be separated into `ParticleEmitter` and `ParticlePool`.

- **Per-frame Color allocation:** `lerpColor()` creates a new `PIXI.Color` object per active particle per frame (around line 268). With 250 active particles, that's 250 Color allocations per frame, generating GC pressure.

- **`readyParticle()` (lines 321-371, 51 lines):** Sets 14+ properties on a particle object. Called only from `_emitOne()`. Not reusable for mid-life resets or batch initialization.

- **Variance system complexity:** The `ParticleOptions` interface (lines 17-63) has 18+ base properties, each with an optional `Variance` object, creating 40+ lines of interface definition. `applyVariance()` (lines 373-385) uses a conditional `absolute` flag that silently changes semantics between relative and absolute randomization.

---

## Additional Findings

### Config.ts -- Flat Namespace God Config (139 lines)

`Config.ts` mixes 8+ unrelated domains in a single flat object: camera settings, physics collision bitmasks, per-entity-type dimensions/colors/types, spritesheet paths, movement/gesture parameters, debug flags, and mask settings. While 139 lines is manageable, the coupling means every subsystem imports `Config` directly. Changes to collision categories sit next to debug flags and sprite texture paths. This makes it difficult to reason about which systems depend on which configuration.

### PhysicsManager -- Thin Wrapper, Typo in Filename (49 lines)

`PhysicManager.ts` (note: missing 's' in filename) is an extremely thin wrapper around `planck.World`. It exposes `createBody()` as a passthrough (line 11-13), has a TODO to add more methods (line 15), and provides deferred body destruction. The deferred destruction pattern is correct and necessary (Planck.js forbids body destruction during `step()`), but World.ts bypasses PhysicsManager in many places, directly accessing `this.world` for stepping, contact events, and body queries, undermining the abstraction.

### PIXI Filters -- Hard-Coded and Partially Unused

Bloom and CRT filters are instantiated with hard-coded values (World.ts:153-178) and applied once to `worldContainer`. Only the CRT filter's noise seed is updated per frame (line 957). The Bloom filter is never animated or modified after initialization. Three TODO comments in the filter code (lines 53, 159, 959) acknowledge this needs work. Filter parameters are not exposed through Config, making iteration on visual style require code changes.

### CollisionUtils -- O(rays * segments) Without Spatial Acceleration

`shootRaysFromPoint()` generates 360 rays, `findClosestIntersection()` tests each against all segments linearly. This O(360 * M) cost is acceptable for a small number of lights, but scales poorly. With 2 dynamic lights and 100 segments, that's ~72,000 intersection tests per frame. The bounding-box pre-filter in `DynamicLight.update()` helps but is still O(M) per light.

### InputManager -- Growing Beyond Single Responsibility (188 lines)

Handles mouse, touch, and keyboard input plus gesture detection (swipe velocity calculation, history buffer management). Touch gesture detection logic (swipe speed, direction, release window) is embedded in the same class that binds DOM events, mixing raw input capture with higher-level gesture recognition.

---

## File Size Summary

| File | Lines | Role |
|------|------:|------|
| World.ts | 1,011 | God Object orchestrator |
| MapUtils.ts | 542 | Map generation algorithms |
| Level.ts | 519 | Entity instantiation and management |
| Light.ts | 448 | Light base + Dynamic + Static classes |
| LevelUtils.ts | 442 | Level skeleton creation and placement |
| ParticleEffect.ts | 416 | Core particle emitter + pool |
| LidarPulse.ts | 365 | LIDAR pulse raycasting |
| Player.ts | 344 | Player entity (input, movement, pickups) |
| ParticleEffectsConfig.ts | 255 | 7 effect presets (repetitive config) |
| EntitiesConfig.ts | 202 | Entity construction presets |
| PhysicsUtils.ts | 188 | Body creation, chain grouping, vectors |
| InputManager.ts | 188 | Mouse/touch/keyboard + gesture detection |
| CollisionUtils.ts | 182 | Raycasting and intersection math |
| ParticleEffectManager.ts | 153 | Singleton effect pool manager |
| Config.ts | 139 | Master config (all domains) |
| Sentry.ts | 113 | Sentry entity (random movement) |
| LightUtils.ts | 108 | Light batch rendering utilities |
| LightsConfig.ts | 98 | 6 light type presets |
| LidarManager.ts | 97 | LIDAR pulse lifecycle manager |
| Game.ts | 99 | Clean entry point |
| EdgeGlowSegment.ts | 92 | LIDAR wall glow visual |
| **Total** | **~6,400** | |
