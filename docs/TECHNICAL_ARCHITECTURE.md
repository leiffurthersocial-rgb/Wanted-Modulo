# WANTED: MODULO — Technical Architecture

**Version:** 1.0 (Phase 2)
**Status:** Approved direction for implementation

---

## 1. Goals & Constraints

| Constraint | Implication |
|------------|-------------|
| 60 FPS on desktop browsers | Simulation must avoid per-frame React re-renders; transforms updated via refs, not state. |
| Mobile compatible | Quality scaling + touch controls layered on the same input abstraction. |
| Vercel static deploy | Pure client-side SPA; no server runtime required. Vite static build. |
| Clean, scalable, modular | Strict layer boundaries: simulation ⟂ rendering ⟂ UI ⟂ state. |

---

## 2. High-Level Architecture

Four cleanly separated layers:

```
┌──────────────────────────────────────────────────────────────┐
│  UI LAYER (React DOM)                                          │
│  Menus, HUD, settings — reads game store, dispatches intents   │
└───────────────────────────────┬──────────────────────────────┘
                                 │ Zustand (flow + run stats)
┌───────────────────────────────┴──────────────────────────────┐
│  STATE LAYER (Zustand stores)                                  │
│  Game flow, settings, progression, run stats — REACTIVE        │
└───────────────────────────────┬──────────────────────────────┘
                                 │ getState() (non-reactive reads)
┌───────────────────────────────┴──────────────────────────────┐
│  SIMULATION LAYER (mutable, ref-based, runs in one tick)       │
│  Player controller, vehicle physics, AI, heat, spawns          │
│  Owns the authoritative game state in plain mutable objects    │
└───────────────────────────────┬──────────────────────────────┘
                                 │ writes transforms to refs
┌───────────────────────────────┴──────────────────────────────┐
│  RENDER LAYER (Three.js via React Three Fiber)                 │
│  Scene graph, instanced city, voxel models, camera, lighting   │
└──────────────────────────────────────────────────────────────┘
```

### Why this split?
- **React re-renders are expensive.** The simulation never triggers them. It mutates plain objects and writes directly to `THREE.Object3D` refs inside a single `useFrame`. React state is reserved for things that change at human cadence (menu open, heat tier changed, score tick).
- **The store is the contract between UI and game.** UI dispatches *intents* (`startRun`, `pause`, `selectCharacter`); the simulation reads flow via `getState()` without subscribing, so it never re-renders.
- **Rendering is declarative; simulation is imperative.** R3F builds the scene graph declaratively, but the hot loop is imperative and allocation-free.

---

## 3. The Game Loop

A single authoritative `useFrame` tick inside `<Simulation />` drives everything in deterministic order:

```
tick(delta):
  dt = min(delta, MAX_DT)            # clamp to survive tab-stalls
  if phase != 'playing': return      # pause = no simulation, scene still renders
  input = Input.snapshot()           # read intents + edges
  handleInteractEdge(input)          # E → enter/exit vehicle
  updateControlledEntity(dt, input)  # foot OR vehicle physics
  updateVehicles(dt)                 # (later) AI-driven vehicles
  updateAI(dt)                       # (Phase 6) heat, behaviors, spawns
  updateCamera(dt)                   # smoothed chase camera
  commitTransforms()                 # write to Object3D refs
  publishStats(dt)                   # throttled push to Zustand
  Input.lateUpdate()                 # clear per-frame edges
```

- **Fixed-ish stepping:** `dt` is clamped to `MAX_DT` (50 ms) so physics never explodes after a stall. A full fixed-timestep accumulator is a Phase-10 option if determinism demands it.
- **Throttled stat publishing:** time/distance/speed/score push to the store ~10×/sec, not every frame — keeps the HUD live without re-render storms.

---

## 4. State Layer (Zustand)

Stores are small, focused, and serializable where useful (settings & progression persist to `localStorage`).

| Store | Responsibility | Persisted |
|-------|----------------|:---------:|
| `useGameStore` | Phase machine (`menu → characterSelect → playing ⇄ paused → gameover`), selected character, live run stats (time, distance, speed, heat, score), intents. | no |
| `useSettingsStore` | Graphics preset, shadows, post-FX, weather, audio volumes, camera-shake, key bindings, mobile toggle. | ✅ |
| `useProgressionStore` | Unlocks, best score, total time, lifetime stats. | ✅ |

**Phase machine** is the backbone of the UI: a single `phase` enum decides which screen renders and whether the simulation ticks.

---

## 5. Simulation Layer

Plain TypeScript, framework-agnostic, unit-testable. No React, no Three objects in the logic (only math).

```
src/game/
  player/playerController.ts   # pure-ish update for on-foot + ride state
  vehicles/vehiclePhysics.ts   # arcade car model: throttle/steer/drag
  vehicles/vehicleCatalog.ts   # category stats (accel/topSpeed/weight/...)
  ai/                          # (Phase 6) behaviors, squad coordinator, heat
  systems/                     # (later) destruction, spawning, scoring
```

- **Entities are mutable structs** (`{ pos: Vector3, heading, speed, ... }`) held in a `useRef` owned by `<Simulation />`. `THREE.Vector3` is used purely as a math type (cheap, no scene attachment).
- **Vehicle physics** is a pure function `step(state, input, dt, def)` — trivially testable and reused later for AI cars.
- **Stat dimension stays cosmetic-safe:** only the *active* vehicle's stats affect physics; categories produce the "feels different" mandate.

---

## 6. Render Layer (R3F / Three.js)

```
<Canvas shadows>
  <Sky/> <fog/>            ← atmosphere (day/night & weather in later phases)
  <Lighting/>             ← hemisphere + shadow-casting sun
  <City/>                 ← INSTANCED buildings + roads (one draw call class)
  <Simulation/>           ← owns the tick; renders player + vehicle voxel models
</Canvas>
```

### Performance techniques (designed in from day one)
| Technique | Where |
|-----------|-------|
| **Instanced rendering** | City buildings & (later) debris/props via `InstancedMesh`. |
| **Ref-based transforms** | All moving entities; zero React re-render in the hot path. |
| **Object pooling** | (Phase 7+) particles, debris, police units, projectiles. |
| **LOD / culling** | (Phase 8+) distant district streaming + geometry LOD. |
| **Tiered AI updates** | (Phase 6) near units think every frame, far units less often. |
| **Quality presets** | Gate shadows, post-FX, particle caps, draw distance. |

Voxel models (`VoxelCharacter`, `VoxelVehicle`) are built parametrically from boxes so characters/vehicles are data-driven (color/scale), not hand-modeled assets.

---

## 7. Input Abstraction

A single `InputManager` singleton maps **physical keys → logical actions**, decoupling gameplay from hardware and enabling rebinding + touch later.

```
Actions: forward | backward | left | right | interact | pause
Bindings: action → [KeyboardEvent.code...]   (rebindable via settings)
API:
  isDown(action)         # held this frame
  consumePressed(action) # edge: true once per press (E, ESC)
  snapshot()             # cheap per-frame read used by the sim
  lateUpdate()           # clears edges at end of frame
```

Touch controls (Phase 9) feed the *same* action set, so gameplay code never branches on input source.

---

## 8. Folder Structure (Phase 3)

```
src/
  main.tsx                 # React entry
  App.tsx                  # phase router (which screen / canvas)
  index.css                # global + menu styling
  config/
    constants.ts           # tunables (speeds, sizes, camera)
    controls.ts            # default key bindings
  state/
    useGameStore.ts
    useSettingsStore.ts
    useProgressionStore.ts
  core/
    input/InputManager.ts
    math/angles.ts         # angle lerp / helpers
  game/
    Game.tsx               # <Canvas> scene root
    Simulation.tsx         # the authoritative tick
    camera/ (in Simulation for now)
    player/
      playerController.ts
    vehicles/
      vehicleCatalog.ts
      vehiclePhysics.ts
    world/
      City.tsx
      Lighting.tsx
    characters/
      characterCatalog.ts
    models/
      VoxelCharacter.tsx
      VoxelVehicle.tsx
  ui/
    screens/
      MainMenu.tsx
      CharacterSelect.tsx
      PauseMenu.tsx
      GameOver.tsx
    hud/HUD.tsx
  types/index.ts
```

Principles: small files, one responsibility each; logic (sim) separate from rendering (R3F) separate from presentation (DOM UI); data-driven catalogs (characters, vehicles) instead of hardcoded branches.

---

## 9. Deployment (Vercel)

- Pure static Vite build (`vite build` → `dist/`). No SSR, no server functions.
- `vercel.json` pins framework + SPA rewrite so the app loads from any path.
- Bundle split is automatic via Vite/Rollup; Three.js is the dominant chunk and is acceptable for a 3D game (lazy-loading the Canvas keeps the menu first paint fast — a Phase 10 optimization).

---

## 10. Phase 4 Scope (what the prototype proves)

The prototype must demonstrate the **core feel** and the architecture end-to-end:
- ✅ Phase machine + all menu screens wired (Main → Character Select → Play → Pause → Game Over).
- ✅ On-foot movement (WASD/arrows), character voxel models for all 4 characters.
- ✅ Enter/exit & steal vehicles (`E`), with at least a couple of drivable cars in the world.
- ✅ Arcade vehicle physics with category stats so cars feel different.
- ✅ Smoothed chase camera (stable on foot, behind-the-car when driving).
- ✅ Instanced voxel city to stand on/drive through.
- ✅ Live HUD (time, speed, heat placeholder), pause, and a Game Over with run stats.

Deferred to later phases by design: police AI & heat escalation (6), destruction (7), full procedural districts/streaming (8), audio + settings polish + touch (9), LOD/pooling/quality pass (10).

---

*End of Phase 2 — Technical Architecture.*
