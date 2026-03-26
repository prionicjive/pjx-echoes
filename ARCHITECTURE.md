# pjx-echoes — Full Architecture & Implementation Reference

> This document is a comprehensive technical specification of **pjx-echoes**, a 2D exploration game built with TypeScript, PIXI.js, and Planck.js. It is written with enough detail — including config values, algorithm parameters, interface shapes, collision bitmasks, and data flow — to allow an AI agent to reconstitute the entire codebase from scratch.

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Entry Point & Game Loop](#4-entry-point--game-loop)
5. [Configuration System](#5-configuration-system)
6. [Procedural Map Generation](#6-procedural-map-generation)
7. [Level System](#7-level-system)
8. [Entity System](#8-entity-system)
9. [Physics System](#9-physics-system)
10. [Lighting System](#10-lighting-system)
11. [Particle System](#11-particle-system)
12. [Input System](#12-input-system)
13. [Rendering & Camera](#13-rendering--camera)
14. [Player Movement](#14-player-movement)
15. [Utility Classes](#15-utility-classes)
16. [Type Definitions](#16-type-definitions)

---

## 1. Game Overview

**pjx-echoes** is an exploration game rooted in navigating the unknown and unseen. The player controls a glowing entity (a circle) moving through procedurally generated cave-like mazes. The world is dark — visibility comes only from dynamic light sources that cast raycasted light with occlusion against the cave walls.

### Core Gameplay Loop

1. A procedurally generated cave level is created (seeded for reproducibility).
2. The player spawns in a random open space.
3. Multiple **exits** are placed, each surrounded by a ring of **gates** (barriers).
4. Each exit has a corresponding **switch** placed elsewhere in the level.
5. The player navigates the cave, collecting **torches** (grow light radius), avoiding **anti** pickups (shrink light radius), and absorbing **sentries** (bouncing enemies that increase particle trail).
6. Pressing a **switch** destroys its associated gates, unlocking the corresponding exit.
7. Reaching an **exit** completes the level and generates a new one.

### Key Features

- Procedural map generation using Drunkard's Walk (modified with Cellular Automata smoothing) or pure Cellular Automata
- Seeded generation for the map, entity placement, exits, gates, and switches
- Player impulse/force movement via Planck.js 2D physics (zero gravity)
- New level generation upon reaching an exit tile
- Soft-follow camera with dead zone when the world exceeds the viewport
- Dynamic lighting with raycasted light occlusion supporting multiple simultaneous lights
- Edge calculation for light raycasting and level collision (merged horizontal/vertical edge segments)
- Dynamic viewport scaling maintaining pixels-per-meter without stretching
- Custom particle effects for trails, radiance, impacts, and more
- Post-processing effects (CRT scanlines/noise and Bloom)
- Swipe/flick gesture movement on touch devices
- Debug mode for toggling lights, world geometry, collision markers, and debug text

---

## 2. Tech Stack & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `pixi.js` | `^8.9.1` | Fast 2D WebGL rendering engine |
| `planck` | `^1.3.0` | 2D physics engine (Box2D port) |
| `gsap` | `^3.12.7` | Animation/tweening (light flicker, color oscillation, fade-outs) |
| `pixi-filters` | `^6.1.2` | Post-processing filters (CRT, Bloom) |
| `@pixi/tilemap` | `^5.0.1` | Tilemap rendering support |
| `seedrandom` | `^3.0.5` | Seeded pseudo-random number generation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `~5.7.2` | TypeScript compiler |
| `vite` | `^6.3.1` | Dev server and build tool |
| `@assetpack/core` | `^1.4.0` | Asset pipeline |
| `@types/seedrandom` | `^3.0.8` | Type definitions for seedrandom |

### Build & Run

```json
{ "type": "module", "scripts": { "dev": "vite", "build": "tsc && vite build", "preview": "vite preview" } }
```

---

## 3. Project Structure

```
pjx-echoes/
├── public/assets/
│   ├── fonts/          (Jersey10.ttf, UbuntuMono.ttf)
│   ├── spritesheets/   (sprites.json + sprite images)
│   └── textures/
├── src/
│   ├── main.ts                      # Entry point
│   ├── style.css                    # Global styles
│   ├── config/
│   │   ├── Config.ts                # Master config
│   │   ├── EntitiesConfig.ts        # Per-entity presets
│   │   ├── LightsConfig.ts          # Per-light-type config
│   │   ├── ParticleEffectsConfig.ts # Per-effect config
│   │   └── ProcGenLevelsConfig.ts   # Level generation presets
│   ├── core/
│   │   ├── Game.ts                  # PIXI app init, asset loading, resize, main loop
│   │   ├── World.ts                 # Game world: containers, physics, level lifecycle, camera, lighting
│   │   └── types.ts                 # RenderableGeometry interface
│   ├── entities/
│   │   ├── types.ts                 # EntityType union type
│   │   ├── BaseEntity.ts            # Abstract base with destroy/gentlyDestroy
│   │   ├── Player.ts               ├── Sentry.ts
│   │   ├── Exit.ts                 ├── Gate.ts
│   │   ├── Switch.ts               ├── Torch.ts
│   │   └── Anti.ts
│   ├── level/
│   │   ├── types.ts                 # ProcGenLevelType
│   │   ├── Level.ts                 # Creates all entities, manages updates/destruction
│   │   ├── LevelContext.ts          # Interface: getEdgesList(), getPhysicsWorld()
│   │   ├── LevelSkeleton.ts         # Interface: dimensions, positions for all entities
│   │   └── ExitGroup.ts             # Interface: exit + gates + switch grouping
│   ├── light/
│   │   ├── types.ts                 # LightType union
│   │   ├── Light.ts                 # Light base, DynamicLight, StaticLight
│   │   └── LightManager.ts          # Singleton light registry with fade-out queue
│   ├── particles/
│   │   ├── types.ts                 # ParticleEffectType union
│   │   ├── ParticleEffect.ts        # Pool-based emitter with variance system
│   │   └── ParticleEffectManager.ts # Singleton with object pooling
│   ├── physics/
│   │   └── PhysicManager.ts         # Deferred body destruction wrapper
│   ├── input/
│   │   └── InputManager.ts          # Mouse, touch, keyboard + swipe detection
│   └── utils/
│       ├── types.ts                 # Point, Segment
│       ├── MapUtils.ts              # Procedural map generation algorithms
│       ├── LevelUtils.ts            # Level skeleton creation, entity placement
│       ├── LightUtils.ts            # Light polygon building, batch rendering
│       ├── CollisionUtils.ts        # Raycasting primitives
│       ├── PhysicsUtils.ts          # Body creation, chain grouping, force vectors
│       ├── SpriteUtils.ts           # Sprite factory
│       ├── EntityUtils.ts           # ID generation, light/effect sync helpers
│       ├── GraphicsUtils.ts         # Radial gradient texture generation
│       ├── ColorUtils.ts            # HSL manipulation, distinct color palette
│       ├── MathUtils.ts             # Random floats, angle spread, deg/rad conversion
│       └── RandomGenerator.ts       # Seeded RNG wrapper around seedrandom
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Entry Point & Game Loop

### Bootstrap (`main.ts`)

```typescript
import './style.css';
import { Game } from './core/Game.ts';
const game = new Game();
game.init();
```

### `Game` Class

**`init()` sequence:**
1. Create `PIXI.Application` with `{ width: window.innerWidth, height: window.innerHeight, backgroundColor: 0x000000 }`
2. Append `app.canvas` to `document.body`
3. Register GSAP PixiPlugin (for color tweening via `pixi: { tint: ... }`)
4. Load spritesheet at `/assets/spritesheets/sprites.json`
5. Load font bundle: `Jersey10`, `UbuntuMono`
6. Attach `window.resize` listener → `world.onResize(width, height)`
7. Create `World` instance
8. Start game loop via `app.ticker.add(this.update)`

**`update()`**: Passes `deltaMS / 1000` (seconds) to `world.update(deltaTime)`

### `World` Class

**Constructor sequence:**
1. Create `InputManager` bound to PIXI canvas
2. Initialize all PIXI containers
3. Store viewport dimensions
4. Initialize lightmap textures/graphical elements
5. Initialize post-processing filters (CRT, Bloom)
6. Initialize debug text
7. Call `setUpWorld()`

**`setUpWorld()`:**
1. Add containers to stage in hierarchy
2. Add lightmap sprite to lights container
3. Create `planck.World` with zero gravity `(0, 0)`
4. Register `begin-contact` listener
5. Create `PhysicsManager`
6. Call `LevelUtils.createProcGenLevel(...)` → `Level`
7. Get player reference, instantly center camera

**`update(deltaTime)` frame order:**
1. `handleDebugInput()` — toggle debug flags
2. `updateFromInput(deltaTime)` — process input → player movement
3. `physicsManager.update()` — deferred destructions
4. `world.step(deltaTime)` — Planck physics step
5. `level.update(deltaTime)` — update all entities
6. `ParticleEffectManager.instance.update(deltaTime)`
7. `updateCamera(deltaTime)` — soft-follow camera
8. `updateAndRenderLights()` — update lights, render lightmap
9. `updatePostProcessing(deltaTime)` — animate CRT noise
10. `updateDebugText()` — FPS, position, seed

**`reset()`:** `tearDownWorld()` → `setUpWorld()` (full level regeneration)

---

## 5. Configuration System

### 5.1 Master Config (`Config.ts`)

```typescript
export const Config = {
    PixelsPerMeter: 16,
    Camera: { lerpFactor: 1.5, DeadZone: { width: 64, height: 64 } },
    Physics: {
        Collision: {
            categoryPlayer: 0x0001, categoryEdge: 0x0002, categoryGate: 0x0004,
            categorySwitch: 0x0008, categoryExit: 0x0010, categoryAnti: 0x0020,
            categoryTorch: 0x0040, categorySentry: 0x0080
        },
        Player: { linearDamping: 0.35 },
        Edge: { restitution: 0.15 },
        Gate: { restitution: 0.15 }
    },
    Player: {
        type: "PLAYER", color: 0x32ddff, radius: 0.48,
        lightRadiusIncrement: 2, lightRadiusDecrement: 2,
        maxLightRadius: 20, minLightRadius: 2, lightChangeDuration: 0.75,
        particleTrailMaxAgeIncrement: 0.42, particleTrailMaxAgeCap: 7.5
    },
    Sentry: { type: "SENTRY", color: 0xBB32FF, radius: 0.25, maxSpeed: 5.00 },
    Wall:   { type: "WALL",   width: 1, height: 1, color: 0x111111 },
    Gate:   { type: "GATE",   width: 1, height: 1, color: 0x0000FF },
    Switch: { type: "SWITCH", width: 1, height: 1, color: 0x0000FF },
    Torch:  { type: "TORCH",  width: 1, height: 1, color: 0xdfb503 },
    Anti:   { type: "ANTI",   width: 1, height: 1, color: 0xff0888 },
    Exit:   { type: "EXIT",   width: 1, height: 1, color: 0x2ddf03 },
    Edges:  { type: "EDGES",  color: 0x039BDF, thickness: 3 },
    Spritesheet: {
        path: '/assets/spritesheets/sprites.json',
        Textures: {
            player: 'player.png', sentry: 'sentry.png', wall: 'wall.png',
            gate: 'gate.png', switch: 'switch.png', torch: 'torch.png',
            exit: 'exit.png', anti: 'anti.png', block: 'block.png',
            Particles: {
                ring: 'particles/ring.png', ringSoft: 'particles/ring_soft.png',
                circle: 'particles/circle.png', circleSoft: 'particles/circle_soft.png'
            }
        }
    },
    Movement: {
        Gesture: {
            swipeReleaseWindowInMs: 120, minSwipeDistance: 100,
            swipeSpeedPixelsPerSecondThreshold: 750,
            swipeSpeedScaleExponent: 0.95, maxSpeedScaleExponent: 1.1,
            maxSpeedMetersPerSecond: 10.00
        },
        towardsPoint: true, towardsPointMode: "FORCE",
        maxSpeed: 7.00, impulseFactor: 1.00,
        forceFactorPerSecond: 300.00, instantlyChangeDirection: true
    },
    Debug: {
        showDebugText: false, createVisibleEdges: true, createVisibleWalls: true,
        showLevelGeometry: true, showCollisionMarkers: false, showLights: true
    }
};
```

### 5.2 Procedural Generation Presets (`ProcGenLevelsConfig.ts`)

```typescript
interface ProcGenLevelOptions {
    Dimensions: { width: number; height: number };
    minDistanceBetweenPlayerSpawnAndExit: number;
    minDistanceBetweenSwitchAndExit: number;
    minDistanceBetweenExits: number;
    radiusAroundExitForGates: number;
    numExits: number;
    torchChance: number;  antiChance: number;  sentryChance: number;
    seed?: string | number;
    MapGeneration: { type: 'CellularAutomata' | 'DrunkardsWalkWithSmoothing'; Options: ... };
}
```

**Standard:** 96×96, 3 exits, DrunkardsWalkWithSmoothing (percentOpen 0.55, 18 walkers, lifetime 70, 2 smoothing), minPlayerExitDist 48, minSwitchExitDist 32, minExitsDist 36, gateRadius 3, torch 0.00087, anti 0.00065, sentry 0.0052.

**Simple:** 42×42, 2 exits, CellularAutomata (wallChance 0.45, 4 smoothing), minPlayerExitDist 21, minSwitchExitDist 12, minExitsDist 10, gateRadius 2, torch 0.00087, anti 0.00065, sentry 0.0095.

### 5.3 Entity Presets (`EntitiesConfig.ts`)

Each entity type maps to `{ sprite, body?, light?, particleEffect? }`.

**Collision mask relationships:**

| Entity | Category | Collides With |
|--------|----------|---------------|
| Player | `0x0001` | Edge, Sentry, Exit, Anti, Torch, Gate, Switch |
| Sentry | `0x0080` | Edge, Player, Sentry, Gate |
| Exit/Anti/Torch/Switch | sensors | Player only |
| Gate | `0x0004` | Player, Sentry (solid) |
| Edge | `0x0002` | Player, Sentry |

**Body types:** Player=dynamic circle r0.48 damping0.35 restitution0. Sentry=dynamic circle r0.25 restitution1. Exit/Anti/Torch/Switch=static box 1×1 sensor. Gate=static box 1×1 solid restitution0.15. Wall=no body (edges handle collision).

### 5.4 Lights Config (`LightsConfig.ts`)

All lights: 360 rays, flickerAlphaDuration 0.5, flickerAlphaDurationVariance 2.5.

| Type | baseRadius | radiusVar | baseAlpha | alphaVar | startColor | endColor |
|------|-----------|----------|-----------|---------|-----------|---------|
| PlayerLight | 7 | 1 | 0.5 | 0.4 | `0x55aaff` | `0x77edff` |
| SentryLight | 4 | 2 | 0.5 | 0.4 | `0xBB32FF` | `0x6e00a5` |
| ExitLight | 10 | 5 | 0.5 | 0.4 | `0x2ddf03` | `0x27ffc3` |
| TorchLight | 10 | 2.5 | 0.5 | 0.4 | `0xdfb503` | `0xab3347` |
| AntiLight | 5 | 2 | 0.7 | 0.3 | `0xff0022` | `0xff2244` |
| SwitchLight | 5 | 1 | 0.5 | 0.4 | `0x4556ff` | `0x0000ab` |

### 5.5 Particle Effects Config (`ParticleEffectsConfig.ts`)

Seven effect types with variance system (`{ min, max, absolute? }` — multiplicative by default).

| Effect | Texture | Rate | Max | Duration | Spread |
|--------|---------|------|-----|----------|--------|
| PlayerTrail | ringSoft | 30/s | 250 | ∞ | 0° |
| SentryTrail | circleSoft | 10/s | 100 | ∞ | 0° |
| TorchRadiance | ringSoft | 1/s | 10 | ∞ | 0° |
| SwitchEffect | circleSoft | 20/s | 50 | ∞ | 360° |
| Explosion | circleSoft | 20/s | 100 | 2s | 360° |
| BlueFlame | circleSoft | 20/s | 100 | ∞ | 45° rotating 75°/s |
| EdgeImpact | circle | 1/s | 5 | ∞ | 0° |

---

## 6. Procedural Map Generation

### 6.1 Overview

Produces a 2D grid (`number[][]`, 1=wall 0=open) + list of open spaces as `"x,y"` strings. Fully seeded via `RandomGenerator` wrapping `seedrandom`.

### 6.2 `RandomGenerator`

```typescript
class RandomGenerator {
    constructor(seed?: string | number)  // auto-generates if omitted
    random(): number       // [0, 1)
    nextInt(max): number   // [0, max)
    int(min, max): number  // [min, max] inclusive
    choice<T>(arr): T
    chance(prob): boolean
    shuffle<T>(arr): T[]
}
```

### 6.3 Cellular Automata

1. **Random fill**: Interior tiles have `wallChance` probability of being wall. Borders always wall.
2. **Smoothing** (×`smoothingSteps`): Count 8 neighbors (OOB=wall). >4→wall, <4→open, =4→unchanged.
3. **Ensure connectivity**: Flood fill from center. Unreachable open tiles → wall.

### 6.4 Drunkard's Walk with Smoothing

1. **All tiles start as walls.**
2. **Walk**: `maxWalkers` walkers at random positions. Each carves current tile, moves randomly (N/S/E/W). After `walkerLifetime` steps, respawn at random wall. Continue until `openCount >= totalTiles * percentOpen`.
3. **Smooth**: CA smoothing (≥5 neighbors→wall, else→open) × `smoothingSteps`.
4. **Connect caves**: Flood fill to find all regions. Sort by size. For each smaller region, find closest tile pair to main region (Manhattan), dig tunnel (width 2) via Bresenham stepping.
5. **Ensure connectivity**: Flood fill, wall off unreachable spaces.

### 6.5 Edge Merging

`MapUtils.createMergedEdgesFromTilemap(map, tileSize=1)` → `Segment[]`

**Horizontal**: Scan each row. Edge starts where wall/open boundary exists (wall with open above, or vice versa). Extends until boundary breaks. Produces `Segment { a: Vec2, b: Vec2 }`.

**Vertical**: Same but scanning columns, checking left neighbor.

Combined array used for both physics (chain bodies) and light raycasting.

---

## 7. Level System

### 7.1 Key Interfaces

**`LevelSkeleton`** — blueprint before entities are created:
```typescript
interface LevelSkeleton {
    dimensions: { width: number; height: number };
    playerSpawnPosition: Point;
    wallPositions: Point[];
    exitGroups: ExitGroup[];
    torchPositions: Point[];
    antiPositions: Point[];
    sentryPositions: Point[];
}
```

**`ExitGroup`** — groups an exit with its gates and switch:
```typescript
interface ExitGroup {
    id: number;
    exitPosition: Point;
    gatesPositions: Point[];
    switchPosition: Point;
    color: number;  // hex, from distinct color palette
}
```

**`LevelContext`** — interface passed to entities for shared state access:
```typescript
interface LevelContext {
    getEdgesList(): Segment[];
    getPhysicsWorld(): planck.World;
}
```

### 7.2 Level Skeleton Creation (`LevelUtils.createLevelSkeletonFromProcGenMap`)

Given a generated map, open spaces, level options, and RNG:

1. **Wall positions**: Every `1` cell → `Point`.
2. **Player spawn**: Splice random point from open spaces.
3. **Exit groups** (for each of `numExits`):
   - **Exit placement**: Random open space with min distance from player (`minDistanceBetweenPlayerSpawnAndExit`) and other exits (`minDistanceBetweenExits`). Up to 10 attempts; falls back to any open space.
   - **Gated area**: Perimeter ring of gates at `radiusAroundExitForGates` distance. Only tiles where `|x|==radius` or `|y|==radius` become gates. Interior tiles removed from available spaces.
   - **Switch placement**: Random open space with min distance from exit (`minDistanceBetweenSwitchAndExit`) NOT inside any gated area. Up to 20 attempts; falls back to non-gated space; last resort any space.
   - **Color**: Each group gets a distinct color from `ColorUtils.getDistinctColors()` (16 hand-picked). Falls back to random if exhausted.
4. **Torch positions**: `ceil(openSpaces.length * torchChance)` random spliced positions.
5. **Anti positions**: Same with `antiChance`.
6. **Sentry positions**: Same with `sentryChance`.

### 7.3 Level Construction Flow (`LevelUtils.createProcGenLevel`)

1. Read level options from `ProcGenLevelsConfig[procGenLevelType]`
2. Create `RandomGenerator` with optional seed
3. Generate map using configured algorithm
4. Extract merged edges from tilemap
5. Create `LevelSkeleton`
6. Construct `Level` instance

### 7.4 `Level` Class

**Constructor creates entities in order:**
1. Store edges, physics world, physics manager, seed, renderer, containers, dimensions
2. Create level edge chain body (single Planck body with all edge segments as chain fixtures) + optional edge debug graphics
3. Create wall tilemap (batch-rendered to a single `RenderTexture`)
4. Create exit groups: for each `ExitGroup` → `Exit`, `Gate[]`, `Switch`
5. Create torches, anti entities, sentries
6. Create player (last, renders on top)

**`LevelContainers`** passed to Level:
```typescript
interface LevelContainers {
    bgContainer: PIXI.Container;
    levelGeometryContainer: PIXI.Container;
    preEntitiesContainer: PIXI.Container;
    entitiesContainer: PIXI.Container;
}
```

**Key methods:**
- `update(deltaTime)` — calls `update()` on all entities
- `onSwitchPressed(groupId)` — gently destroys switch, instantly destroys all gates in group
- `gentlyDestroyEntity(entity)` — fade-out lights/particles, then remove from arrays
- `destroyEntity(entity)` — immediate removal from arrays
- `destroy()` — destroys all entities including player

### 7.5 Wall Tilemap Rendering (Batch Optimization)

1. Calculate bounds of all wall positions
2. Create temporary `PIXI.Container` with all wall sprites
3. Create `RenderTexture` at total pixel dimensions
4. Render temporary container to `RenderTexture` using `renderer.render()`
5. Create single `PIXI.Sprite` from the `RenderTexture`, position in world
6. Add to `levelGeometryContainer`

This avoids maintaining thousands of individual sprites each frame.

---

## 8. Entity System

### 8.1 `BaseEntity` (Abstract)

```typescript
abstract class BaseEntity {
    id: string;              // "{type}-{timestamp}-{random}"
    type: EntityType;
    sprite: PIXI.Sprite;
    body?: planck.Body;
    light?: Light;
    particleEffect?: ParticleEffect;
    containers: EntityContainers;

    abstract update(deltaTime: number): void;
}
```

**`EntityContainers`**:
```typescript
interface EntityContainers {
    containerForEntity: PIXI.Container;
    containerForParticleEffects?: PIXI.Container;
}
```

**`EntityUserData`** — stored on Planck body via `setUserData()`:
```typescript
interface EntityUserData {
    type: EntityType;
    entity?: BaseEntity;
    body?: planck.Body;
    groupId?: number;
}
```

**Constructor:**
1. Generate unique ID via `EntityUtils.generateRandomId(type)`
2. Add sprite to `containerForEntity`
3. If body: store, set `UserData` with self-reference
4. If light: store, register with `LightManager.instance`
5. If particleEffect: store, add container to `containerForParticleEffects`, register with `ParticleEffectManager.instance`

**`destroy(physicsManager)`** — immediate:
1. Remove sprite from container
2. `physicsManager.destroyBody()` (deferred)
3. Remove light from `LightManager` immediately
4. Remove particle effect from `ParticleEffectManager` immediately

**`gentlyDestroy(physicsManager)`** — graceful:
1. Remove sprite immediately
2. `physicsManager.destroyBody()` (deferred)
3. Gently remove light (fade-out tween → removal)
4. Gently remove particle effect (stop emission → let particles die → cleanup)

### 8.2 Entity Types

`EntityType = 'Player' | 'Sentry' | 'Wall' | 'Gate' | 'Switch' | 'Exit' | 'Torch' | 'Anti'`

#### Player

- **Body**: dynamic circle r=0.48, linearDamping 0.35, restitution 0
- **Light**: `DynamicLight` — raycasts every frame, 360 rays, base radius 7m
- **Particle**: `PlayerTrail` — ringSoft, 30/s, maxAge 0.5s
- **`handleInput(input, context, deltaTime)`**: Processes pointer/touch/swipe → forces (see §14)
- **`update(deltaTime)`**: Sync sprite to body, sync light to body, sync effect to sprite center
- **`onPickup(type)`**:
  - `TORCH`: increase light radius by 2 (max 20), tween 0.75s
  - `ANTI`: decrease light radius by 2 (min 2), tween 0.75s
  - `SENTRY`: increase particle trail maxAge by 0.42 (cap 7.5)

#### Sentry

- **Body**: dynamic circle r=0.25, restitution 1 (perfect elasticity), no damping
- **Particle**: `SentryTrail` — circleSoft, 10/s, maxAge 2s
- **Initial velocity**: `PhysicsUtils.randomUnitVector(0.17) * maxSpeed(5.0)` — avoids axis-aligned directions (min 10° from axes)
- **`update()`**: Anti-axis-lock: if velocity on either axis < 0.01, apply random kick ±1. Sync sprite/light/effect to body.

#### Exit

- **Body**: static box 1×1, sensor. UserData includes `groupId`.
- **Light**: `StaticLight`, 360 rays, base radius 10m
- No special update.

#### Gate

- **Body**: static box 1×1, solid, restitution 0.15. UserData includes `groupId`.
- **Sprite tint**: set to exit group's distinct color
- No light or particle effect. No special update.

#### Switch

- **Body**: static box 1×1, sensor. UserData includes `groupId`.
- **Light**: `StaticLight` — colors derived from group color (`darken(color, 0.2)` → base color)
- **Particle**: `SwitchEffect` — 360° spread, colors from group color (base → `lighten(color, 0.2)`)

#### Torch

- **Body**: static box 1×1, sensor
- **Light**: `StaticLight`, base radius 10m, warm amber (`0xdfb503` → `0xab3347`)
- **Particle**: `TorchRadiance` — 1/s, maxAge 3s, scales 0.25→3.0

#### Anti

- **Body**: static box 1×1, sensor
- **Light**: `StaticLight`, base radius 5m, red (`0xff0022` → `0xff2244`), faster oscillation

---

## 9. Physics System

### 9.1 Planck.js World

- **Gravity**: `Vec2(0, 0)` — zero-gravity top-down
- **Coordinate system**: 1 unit = 1 meter. Sprites at `pos * PixelsPerMeter` (16 px/m)
- **World recreated** on each level reset

### 9.2 `PhysicsManager`

```typescript
class PhysicsManager {
    private bodiesToDestroy: planck.Body[] = [];
    destroyBody(body): void     // queues for destruction
    update(): void              // processes pending destructions
    destroy(): void             // destroys ALL bodies in world
}
```

Planck.js forbids destroying bodies during `step()` or collision callbacks. All destruction is deferred.

### 9.3 Body Creation (`PhysicsUtils`)

```typescript
interface CreateBodyOptions {
    type?: 'static' | 'dynamic';
    position?: planck.Vec2;
    angle?: number;
    linearDamping?: number;
    fixture: planck.FixtureOpt;  // density, restitution, friction, isSensor, filterCategoryBits, filterMaskBits
    shape: { type: 'box' | 'circle'; width?: number; height?: number; radius?: number; };
}
```

Boxes use half-extents: `new planck.Box(width/2, height/2)`.

### 9.4 Edge/Chain Bodies

`PhysicsUtils.createChainsBodyFromEdges(world, { edges, edgeFixture })`

1. `groupEdgesIntoChains(edges)`: Groups `Segment[]` into continuous chains by matching endpoints (epsilon 1e-6). Extends chains from either end.
2. For each chain: detect closed (first ≈ last), create `planck.Chain(vertices, isClosed)`.
3. All chains on a single body.

Edge fixture: `{ restitution: 0.15, friction: 0, filterCategoryBits: categoryEdge, filterMaskBits: categoryPlayer | categorySentry }`

### 9.5 Collision Handling (`World.onBeginContact`)

| Collision | Behavior |
|-----------|----------|
| Player + Exit | Increment `numLevelsCompleted`, `reset()` |
| Player + Edge | (Debug) EdgeImpact particle at contact points |
| Sentry + Edge | (Debug) EdgeImpact particle at contact points |
| Player + Sentry | `player.onPickup("SENTRY")`, gently destroy sentry, disable contact |
| Player + Torch | `player.onPickup("TORCH")`, gently destroy torch |
| Player + Anti | `player.onPickup("ANTI")`, gently destroy anti |
| Player + Switch | `level.onSwitchPressed(groupId)` |
| Sentry + Sentry | Natural physics bounce (no special handling) |

Contact type detection uses `EntityUserData.type` from both bodies. The handler calls `contact.setEnabled(false)` for sensor-like interactions (sentry pickup) to prevent physics response.

---

## 10. Lighting System

### 10.1 Architecture

Raycasted visibility polygons rendered to a lightmap texture, composited with additive blending.

**Classes:** `Light` (abstract), `DynamicLight`, `StaticLight`, `LightManager` (singleton), `LightUtils`, `CollisionUtils`.

### 10.2 `Light` Base Class

```typescript
abstract class Light {
    isFadingOut: boolean;
    sprite: PIXI.Sprite;       // radial gradient, tinted
    mask: PIXI.Graphics;       // visibility polygon
    pos: Point;                // meters
    id: string;
    collisionData: Segment[];  // edges for raycasting
    lightPoints: { point: Point; angle: number }[];
    options: LightOptions;
    radius: number;
    alpha: number;
    tint: number;
    tweenables: { radius, tint, alpha };  // GSAP targets
}
```

**Sprite setup:**
- Texture: programmatic radial gradient (white center → transparent edge, 256×256 canvas via `GraphicsUtils.getRadialGradientTexture()`)
- Anchor: `(0.5, 0.5)`
- Size updated each frame: `radius * 2 * PixelsPerMeter`
- Masked by `PIXI.Graphics` polygon drawn from raycast results

**`update(pos)`**: Applies tweened radius/alpha/tint to sprite properties.

**`render()`**: Draws visibility polygon on `mask` graphics relative to light center.

### 10.3 `DynamicLight`

Used by Player and Sentry. Recomputes light polygon every frame.

**`update(pos)`:**
1. `super.update(pos)` — apply tweened values
2. Calculate AABB bounds for the light
3. Filter `collisionData` to nearby edges via `CollisionUtils.isSegmentInBounds()`
4. Rebuild polygon: `LightUtils.buildLightPolygon(pos, nearbyEdges, numRays, radius)`

**GSAP tweens:**
- `flickerAlpha()`: Continuously tweens alpha between `baseAlpha` and `baseAlpha + random * alphaVariance`. Randomized duration (`flickerAlphaDuration + random * flickerAlphaDurationVariance`). Self-recurses on complete.
- `oscillateColor()`: `gsap.fromTo()` between `startColor` and `endColor` via GSAP Pixi plugin (`pixi: { tint }`). Yoyo infinite with randomized duration/delay. Random starting progress so lights don't sync.

**`increaseBaseRadius(newRadius, maxRadius, duration)`**: Clamps, GSAP tweens `tweenables.radius`.

**`decreaseBaseRadius(newRadius, minRadius, duration)`**: Clamps, GSAP tweens `tweenables.radius`.

### 10.4 `StaticLight`

Used by Exit, Torch, Anti, Switch. Computes polygon once in constructor.

- `update()` only applies tweened alpha/tint (no rebuild)
- `recomputeLightPoints()` for manual recomputation
- Same flicker/oscillation tweens as DynamicLight

### 10.5 Raycasting

**`CollisionUtils.shootRaysFromPoint(point, numRays=360)`:**
- `numRays` rays evenly around 360°
- Each: `{ start: Point, direction: { x: cos(angle), y: sin(angle) } }`

**`CollisionUtils.getRaySegmentIntersection(ray, segment, maxDistance)`:**
- Parametric intersection: `t` = ray distance, `u` = segment position [0,1]
- Hit if `t > 0 && 0 ≤ u ≤ 1 && t * magnitude ≤ maxDistance`
- Returns `{ point, distance }` or `null`

**`CollisionUtils.findClosestIntersection(ray, segments, maxDistance)`:**
- Tests all segments, returns closest hit
- If no hit: returns point at `maxDistance` along ray (light extends to full radius)

**`LightUtils.buildLightPolygon(point, segments, numRays, lightRadius)`:**
1. Shoot rays → find closest intersection per ray (capped at `lightRadius`)
2. Store hits with angle from origin
3. Sort by angle → continuous polygon

### 10.6 `LightManager` (Singleton)

```typescript
class LightManager {
    lights: Map<string, Light>;
    pendingRemove: Set<string>;

    addLight(light): void
    removeLight(light): void           // immediate
    gentlyRemoveLight(light): void     // fade alpha→0 over 1s, then queue
    removeAllLights(): void
    update(): void                     // light.update(null) on non-fading
    processPendingRemovals(): void     // destroy queued lights
    getAllLights(): Light[]
}
```

### 10.7 Lightmap Pipeline (per frame)

1. `LightManager.update()` — update positions/properties
2. Calculate `cameraOffset` and `screenBounds`
3. Clear `tempLightmapContainer`
4. `LightUtils.renderLightsBatch()`:
   - Per light: check on-screen, position in screen space, `light.render()`, add to temp container
5. Render `transparentBgRect` to `lightmapTexture` (clear: true)
6. Render `tempLightmapContainer` to `lightmapTexture` (clear: false)
7. `lightmapSprite` (in `lightsContainer`) displays texture with `blendMode: 'add'`
8. `lightsContainer` position counteracts `worldContainer` transform (viewport-aligned)
9. `processPendingRemovals()`

---

## 11. Particle System

### 11.1 `ParticleEffect`

Pool-based emitter managing fixed pool of `Sprite` objects.

```typescript
class ParticleEffect {
    container: Container;
    template: ParticleOptions;
    duration?: number;              // undefined = infinite
    emitPerSecond: number;
    emitAngle: number;              // degrees
    spreadAmount: number;           // degrees
    emitRotationSpeed: number;      // degrees/sec
    emitRotateClockwise: boolean;
    maxParticles: number;
}
```

**Pool:** Pre-allocated `maxParticles` `Particle` objects with `PIXI.Sprite` each (start hidden).

**Each Particle:**
```typescript
interface Particle {
    sprite: Sprite; alive: boolean; age: number; maxAge: number;
    startDirection/endDirection: { x, y };
    startSpeed/endSpeed: number;
    startScaleX/Y, endScaleX/Y: number;
    startAlpha/endAlpha: number;
    startTint/endTint: Color;
    width, height: number;
}
```

**Emission (`_emitOne()`):**
1. Find dead particle in pool
2. Apply variance to all properties from template
3. Calculate direction from `emitAngle ± spreadAmount/2`
4. Position at emitter's current position
5. Set initial visuals

**Update (`update(dt)`):**
1. Check finite duration expiration
2. Accumulate time, emit at rate
3. Rotate `emitAngle` by `emitRotationSpeed * dt`
4. Per active particle:
   - `t = age / maxAge`; if `t ≥ 1`: kill, hide
   - Lerp speed, direction, position, alpha, scale, tint

**Lifecycle:** `play()` → `pause()` → `stop()` | `stopEmission()` → `onEmpty(cb)`

### 11.2 Variance System

```typescript
interface Variance { min?: number; max?: number; absolute?: boolean; }
```

- Default (multiplicative): `base * random(min, max)`
- Absolute: `random(min, max)`
- Color variance: applied per-channel (R, G, B) independently

### 11.3 `ParticleEffectManager` (Singleton)

```typescript
class ParticleEffectManager {
    effectPools: Map<ParticleEffectType, ParticleEffect[]>;
    activeEffects: Set<ParticleEffect>;

    addEffect(effect): void
    removeEffect(effect): void           // immediate
    gentlyRemoveEffect(effect): void     // stop emission, let die
    removeAllEffects(): void
    playEffect(container, type, position, duration?): ParticleEffect
    update(deltaTime): void
}
```

**Object pooling (`playEffect()`):**
1. Check pool for inactive effect of given type
2. If none: create from `ParticleEffectsConfig`
3. Reset position, add to container, register `onEmpty` → return to pool
4. Play

---

## 12. Input System

### 12.1 `InputManager`

Manages mouse, touch, and keyboard input. Instantiated with a reference to the PIXI canvas element.

**Event listeners:**
- Canvas: `mousedown`, `mouseup`, `mousemove`, `touchstart`, `touchend`, `touchmove`
- Window: `keydown`, `keyup`

### 12.2 State Interfaces

```typescript
interface PointerState {
    screen: Point;         // screen pixel coordinates
    world: Point;          // reserved for screen-to-world transform
    isDown: boolean;
    justReleased: boolean; // true for one frame after release
}

interface TouchState {
    active: boolean;
    startTime: number;
    startPos: { x, y };
    lastPos: { x, y };
    history: { x, y, time }[];     // sliding window of recent positions
    lastSwipeTime: number;
    lastSwipeSpeedPixelsPerSecond: number;
    lastSwipeDirection: { x, y };  // normalized
}

interface KeyState {
    isDown: boolean;
    justPressed: boolean;
    justReleased: boolean;
}

interface KeysState {
    keys: Map<string, KeyState>;
}
```

### 12.3 Swipe Gesture Detection

Detected during `touchmove`:

1. Maintain sliding window of touch positions (filtered to last `swipeReleaseWindowInMs` = 120ms)
2. Calculate velocity: `distance / dt` in pixels/second
3. If `distance > minSwipeDistance` (100px) AND `speed > swipeSpeedPixelsPerSecondThreshold` (750 px/s):
   - Record swipe time, speed, normalized direction
4. On `touchend`: if recent swipe within `swipeReleaseWindowInMs`, Player processes as flick

### 12.4 Frame Update

`InputManager.update()` resets transient flags each frame:
- `pointer.justReleased = false`
- All keys: `justPressed = false`, `justReleased = false`

### 12.5 Debug Keyboard Bindings

Handled in `World.handleDebugInput()`:
- **Backtick (`` ` ``)**: Toggle debug text overlay
- **1**: Toggle lights visibility
- **2**: Toggle level geometry visibility
- **3**: Toggle collision markers

---

## 13. Rendering & Camera

### 13.1 Container Hierarchy

```
app.stage
├── worldContainer                    [filters: bloomFilter, crtFilter]
│   ├── bgContainer                   (torch particle effects)
│   ├── levelGeometryContainer        (walls + edges — togglable)
│   ├── lightsContainer               (lightmap sprite — togglable, counteracts camera)
│   ├── preEntitiesContainer          (trails, switch effects, collision markers)
│   ├── entitiesContainer             (all entity sprites)
│   ├── postEntitiesContainer         (reserved)
│   └── fgContainer                   (reserved)
└── uiContainer                       (debug text — no post-processing)
```

**Scratch (not in hierarchy):**
- `tempLightmapContainer` — render-to-texture for lightmap passes

**Render textures:**
- `lightmapTexture` — screen-sized `RenderTexture`
- `lightmapSprite` — displays `lightmapTexture`, `blendMode: 'add'`
- `transparentBgRect` — transparent black `Graphics` rect for clearing lightmap

### 13.2 Post-Processing

Applied to `worldContainer` only:

**CRT Filter:**
```typescript
new CRTFilter({
    curvature: 0, lineWidth: 0.1, lineContrast: 0.1,
    vignetting: 0, noise: 0.2, noiseSize: 1
})
```
`seed` randomized each frame for animated noise.

**Bloom Filter:**
```typescript
new BloomFilter({ kernelSize: 5, quality: 4, resolution: 1, strength: 8 })
```

### 13.3 Camera System

Camera works by translating `worldContainer` position. Player tracked with soft-follow and dead zone.

**Per-axis logic:**
- If level smaller than viewport → center level on that axis
- Otherwise:
  1. Calculate player offset from screen center
  2. If outside dead zone (`±DeadZone.width/2` or `±DeadZone.height/2`):
     - `move = distance past dead zone boundary`
     - `worldContainer.position -= move * lerpFactor * deltaTime`
  3. Clamp to `[0, -(levelSize - viewportSize)]`

**Dead zone**: 64×64 pixels centered on screen.

**`instantlyCenterCamera()`**: Direct position set at level start (no lerp).

**`counteractWorldTransform()`**: Sets `lightsContainer.position = -worldContainer.position` so lightmap is viewport-aligned.

### 13.4 Resize Handling

1. `Game.handleResize()` → resize PIXI renderer
2. `World.onResize(width, height)`:
   - Update viewport dimensions
   - Destroy/recreate `lightmapTexture` at new size
   - Update `lightmapSprite` dimensions
   - Resize `transparentBgRect`
   - Instantly recenter camera

### 13.5 Dynamic Scaling

Fixed `PixelsPerMeter` (16). No stretching. Larger screens see more of the level. All entity sizes and physics are in meters; rendering multiplies by `PixelsPerMeter`.

---

## 14. Player Movement

### 14.1 Input Priority

`Player.handleInput()` processes in order:

1. **Touch hold**: If `touchState.active`, apply continuous force toward touch position
2. **Swipe/flick**: If touch just ended AND recent swipe detected, apply velocity impulse
3. **Mouse/pointer**: If `pointer.isDown`, apply force toward pointer; if `justReleased` near player, stop movement

### 14.2 Force-Based Movement (Default)

When pointer/touch held:

1. Convert screen position to level-relative (subtract `worldContainer` offset)
2. Calculate screen distance player→pointer
3. If distance > threshold (`PixelsPerMeter / 2` = 8px):
   - **`applyForceTowards(target, deltaTime)`**:
     - Convert target to meters
     - Normalized force vector from player to target
     - Scale by `forceFactorPerSecond * deltaTime` (300 × dt)
     - If `instantlyChangeDirection`: set velocity direction to match force direction (preserving current speed, capped at `maxSpeed` = 7 m/s)
     - Apply force at center of mass via `body.applyForce()`
4. If distance ≤ threshold: `body.setLinearVelocity(0, 0)`

### 14.3 Swipe/Flick Movement

On touch release with detected swipe:

1. Velocity = swipe direction × speed (pixels/sec)
2. Convert to meters/sec (÷ `PixelsPerMeter`)
3. Speed magnitude in m/s
4. Non-linear scaling:
   ```
   nonlinearScale = speed^swipeSpeedScaleExponent / maxSpeed^maxSpeedScaleExponent
                  = speed^0.95 / 10^1.1
   ```
5. Scale velocity: `v = normalize(v) * nonlinearScale`
6. Set `body.setLinearVelocity()` directly

This non-linear curve makes slow swipes feel proportional while capping fast swipes below a maximum. The `linearDamping` (0.35) on the player body gradually slows the player after a flick.

### 14.4 Stop-on-Tap

If the pointer is released near the player (distance < threshold), the player's velocity is immediately set to zero. This allows precise stopping.

---

## 15. Utility Classes

### 15.1 `SpriteUtils`

```typescript
class SpriteUtils {
    static createSprite(options: {
        texture: PIXI.Texture; x, y, width, height: number;
        anchor?: Point; color?: number; blendMode?: PIXI.BLEND_MODES; mask?: PIXI.Graphics;
    }): PIXI.Sprite
}
```

Creates a positioned, sized, optionally tinted/masked sprite.

### 15.2 `EntityUtils`

```typescript
class EntityUtils {
    static generateRandomId(prefix: string): string     // "{prefix}-{Date.now()}-{Math.random()}"
    static syncLightToBody(entity: BaseEntity): void    // light.pos = body.pos
    static syncEffectToSprite(entity: BaseEntity): void // effect.pos = sprite center
}
```

### 15.3 `GraphicsUtils`

```typescript
class GraphicsUtils {
    static gradientLightTexture: PIXI.Texture;  // cached singleton
    static getRadialGradientTexture(): PIXI.Texture
}
```

Creates a 256×256 canvas with radial gradient (white center `rgba(255,255,255,0.6)` → transparent edge `rgba(255,255,255,0)`). Cached for reuse across all lights.

### 15.4 `ColorUtils`

Comprehensive HSL color manipulation:

```typescript
class ColorUtils {
    static hexToRgb(hex): { r, g, b }
    static rgbToHex(r, g, b): number
    static lighten(hex, percent): number         // increase lightness
    static darken(hex, percent): number          // decrease lightness
    static adjustSaturation(hex, percent): number
    static getComplementary(hex): number         // 180° on wheel
    static getAnalogous(hex, spread?): [number, number, number]
    static getTriadic(hex): [number, number, number]
    static getRandomColor(minBrightness?, maxBrightness?): number
    static getRandomPixiColor(minBrightness?): PIXI.Color
    static toPixiColor(hex): PIXI.Color
    static createGradient(start, end, steps): number[]
    static adjustBrightness(hex, factor): number
    static getDistinctColors(): number[]         // 16 hand-picked high-contrast colors
}
```

**Distinct colors palette** (used for exit group color-coding):
```
0xFF5252 (Red), 0x7C4DFF (Deep Purple), 0x448AFF (Blue), 0x00B8D4 (Cyan),
0x00BFA5 (Teal), 0x64DD17 (Light Green), 0xFFD600 (Yellow), 0xFF6D00 (Orange),
0xE91E63 (Pink), 0x9C27B0 (Purple), 0x3D5AFE (Indigo), 0x00B8D4 (Light Blue),
0x1DE9B6 (Teal 200), 0x76FF03 (Lime), 0xFFC400 (Amber), 0xFF3D00 (Deep Orange)
```

### 15.5 `PhysicsUtils`

```typescript
class PhysicsUtils {
    static createBody(world, options: CreateBodyOptions): planck.Body
    static createLevelEdgesBody(world, { edges, edgeFixture }): planck.Body
    static createChainsBodyFromEdges(world, { edges, edgeFixture }): planck.Body
    static groupEdgesIntoChains(edges: Segment[]): planck.Vec2[][]
    static pointsEqual(a: Vec2, b: Vec2): boolean       // epsilon 1e-6
    static calculateForceVector(start, end, factor): Vec2
    static normalizeVector(vec): Vec2
    static randomUnitVector(minAngleFromAxis?: number): Vec2  // default 0.17 rad (~10°)
}
```

`randomUnitVector`: Generates random direction vectors that avoid being too close to horizontal/vertical axes (re-rolls until angle from nearest axis > `minAngleFromAxis`). Used for sentry initial velocities.

### 15.6 `CollisionUtils`

```typescript
class CollisionUtils {
    static shootRaysFromPoint(point, numRays?): { start: Point, direction: Point }[]
    static getRaySegmentIntersection(ray, segment, maxDistance?): { point, distance } | null
    static findClosestIntersection(ray, segments, maxDistance): { point, distance } | null
    static isSegmentInBounds(segment, bounds): boolean
}
```

### 15.7 `LightUtils`

```typescript
class LightUtils {
    static buildLightPolygon(point, segments, numRays, lightRadius): { point, angle }[]
    static renderLightsBatch(lights, cameraOffset, screenBounds, container, preUpdate?): void
    static renderLight(light, cameraOffset, screenBounds, container): void
    static isLightOnScreen(light, left, top, right, bottom): boolean
}
```

### 15.8 `MapUtils`

```typescript
class MapUtils {
    static generateFromCellularAutomata(w, h, wallChance, smoothSteps, rng): MapData
    static generateFromDrunkardsWalk(w, h, percentOpen, maxWalkers, rng): MapData
    static generateFromDrunkardsWalkWithSmoothing(w, h, percentOpen, maxWalkers, lifetime, smoothSteps, rng): MapData
    static ensureConnectivity(map, w, h): MapData
    static connectCavesWithTunnels(map, w, h, tunnelWidth?): void
    static renderMap(map): void                              // ASCII debug
    static createMergedHorizontalEdgesFromTilemap(map, tileSize?): Segment[]
    static createMergedVerticalEdgesFromTilemap(map, tileSize?): Segment[]
    static createMergedEdgesFromTilemap(map, tileSize?): Segment[]
}
```

### 15.9 `LevelUtils`

```typescript
class LevelUtils {
    static createProcGenLevel(renderer, world, physicsManager, containers, procGenLevelType): Level
    static createLevelSkeletonFromProcGenMap(map, openSpaces, levelOptions, rng): LevelSkeleton
    static spliceRandomValidPoint(validSpaces, rng): Point | null
    static getRandomValidPointWithMinDistance(validSpaces, startPoint, minDistance, rng): Point | null
}
```

### 15.10 `RandomGenerator`

Wraps `seedrandom` for deterministic PRNG. See §6.2 for full API.

---

## 16. Type Definitions

### Core Types

```typescript
// utils/types.ts
type Point = { x: number; y: number };
type Segment = { a: planck.Vec2; b: planck.Vec2 };

// core/types.ts
interface RenderableGeometry {
    body: planck.Body;
    graphics: PIXI.Graphics;
}
```

### Union Types

```typescript
// entities/types.ts
type EntityType = 'Player' | 'Sentry' | 'Wall' | 'Gate' | 'Switch' | 'Exit' | 'Torch' | 'Anti';

// light/types.ts
type LightType = 'PlayerLight' | 'SentryLight' | 'ExitLight' | 'TorchLight' | 'AntiLight' | 'SwitchLight';

// particles/types.ts
type ParticleEffectType = 'SentryTrail' | 'PlayerTrail' | 'Explosion' | 'TorchRadiance' | 'BlueFlame' | 'SwitchEffect' | 'EdgeImpact';

// level/types.ts
type ProcGenLevelType = 'Standard' | 'Simple';
```

### Key Interfaces Summary

| Interface | Location | Purpose |
|-----------|----------|---------|
| `LevelSkeleton` | `level/LevelSkeleton.ts` | Blueprint: dimensions, spawn, walls, exits, entities |
| `ExitGroup` | `level/ExitGroup.ts` | Groups exit + gates + switch + color |
| `LevelContext` | `level/LevelContext.ts` | Access to physics world and edges |
| `LevelContainers` | `level/Level.ts` | PIXI containers for level rendering |
| `EntityContainers` | `entities/BaseEntity.ts` | PIXI containers for entity + effects |
| `EntityUserData` | `entities/BaseEntity.ts` | Data stored on Planck bodies |
| `CreateBodyOptions` | `utils/PhysicsUtils.ts` | Options for creating Planck bodies |
| `LightOptions` | `config/LightsConfig.ts` | Configuration for a light instance |
| `ParticleEffectOptions` | `config/ParticleEffectsConfig.ts` | Configuration for a particle effect |
| `ParticleOptions` | `config/ParticleEffectsConfig.ts` | Per-particle properties with variance |
| `ProcGenLevelOptions` | `config/ProcGenLevelsConfig.ts` | Level generation parameters |
| `PointerState` | `input/InputManager.ts` | Mouse/pointer state |
| `TouchState` | `input/InputManager.ts` | Touch + swipe gesture state |
| `KeyState` / `KeysState` | `input/InputManager.ts` | Keyboard state |
| `Variance` | `particles/ParticleEffect.ts` | Min/max/absolute variance for particle properties |
| `Point` | `utils/types.ts` | 2D coordinate |
| `Segment` | `utils/types.ts` | Line segment (two Vec2 endpoints) |

---

*Generated from source code analysis. Game URL: https://pjx-echoes.netlify.app/*
