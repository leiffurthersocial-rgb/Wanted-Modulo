# WANTED: MODULO — Game Design Document

**Version:** 1.0 (Phase 1)
**Document owner:** Creative Director
**Status:** Draft for approval

---

## 1. Vision Statement

> **You are wanted. Drive, crash, hide, and survive — because the city will never stop hunting you.**

*WANTED: MODULO* is a browser-based, voxel-styled **survival pursuit** game. There is exactly one goal: **stay free as long as possible**. There are no missions, no story, no weapons, and no objectives beyond evasion. Every run is a self-contained burst of escalating tension that ends in capture — the meta-game is *lasting longer than last time*.

The emotional target is the **"just one more run"** compulsion loop of *Crossy Road* and *Smashy Road 2*, fused with the **escalating-dread pursuit** of a *Need for Speed* most-wanted chase. Runs are short (typically 1–8 minutes), readable at a glance, and skill-expressive enough that improvement is always visible.

### Design Pillars

1. **Survival is the only verb.** Every system feeds the single fantasy of *not getting caught*. If a feature doesn't increase tension or extend/threaten a run, it doesn't ship.
2. **Escalation you can feel.** The world gets measurably, audibly, visibly more dangerous every minute. The player always knows the pressure is rising.
3. **Readable chaos.** Voxel destruction and a packed city create spectacle, but the player can always parse threats, escape routes, and their own heat at a glance.
4. **Skill, not grind.** Better players survive longer *today*, not after 40 hours of unlocks. Progression is cosmetic and motivational, never a power gate.
5. **Performance is a feature.** 60 FPS is a design constraint, not an afterthought. Spectacle is budgeted.

---

## 2. The Core Loop

```
                ┌─────────────────────────────────────────────┐
                │                                             │
                ▼                                             │
   ┌────────────────────┐   spotted    ┌──────────────────┐  │
   │  FREE ROAM (Heat 0)│ ───────────► │   PURSUIT (1–10)  │  │
   │  explore, prep      │              │  evade, escape    │  │
   └────────────────────┘ ◄─────────── └──────────────────┘  │
            ▲    lose them (search fails)        │ caught     │
            │                                    ▼            │
            │                            ┌──────────────┐     │
            └─── heat decays ◄────────── │  SEARCH MODE │     │
                                         └──────────────┘     │
                                                 │ caught     │
                                                 ▼            │
                                         ┌──────────────┐     │
                                         │  GAME OVER    │─────┘
                                         │  → score, run │  "one more run"
                                         └──────────────┘
```

**Moment-to-moment loop (seconds):** read threats → choose route → execute driving/maneuver → react to escalation.

**Run loop (minutes):** survive heat tiers → accumulate score → get caught → see results.

**Meta loop (sessions):** beat personal best → unlock cosmetics/vehicles → try new characters/strategies → return for "one more run".

---

## 3. The Heat System (Central Mechanic)

Heat is a 0–10 escalation meter. It rises with **time survived under pursuit**, **aggression** (destruction, near-misses, cop takedowns), and **visibility**; it falls only when the player **breaks line of sight and survives a search**. Heat *never* falls during active pursuit.

Each level adds new threat archetypes *on top of* previous ones — escalation is additive, not a swap.

| Heat | Name | New Forces Introduced | Player Experience |
|:----:|------|------------------------|-------------------|
| 0 | **Clear** | None | Free roam. Calm music. Prep & explore. |
| 1 | **Wanted** | Local patrol cars (slow, reactive) | First sirens. Easy to shake. |
| 2 | **Hunted** | Multiple cruisers + basic roadblocks | Coordination begins; routes matter. |
| 3 | **Pursued** | Aggressive interceptors + spike strips | Ramming & PIT attempts; tire hazards. |
| 4 | **Tracked** | Police helicopter (spotter) + heavy units | Eye in the sky — line-of-sight breaks get harder. |
| 5 | **Surrounded** | SWAT vans + coordinated pincer tactics | Flanking, blocking, area denial. |
| 6 | **Marked** | Military police + armored vehicles | High-durability rammers; your car won't survive long. |
| 7 | **Besieged** | Full military ground response | Saturation; the city fills with hostiles. |
| 8 | **Hellfire** | Attack helicopters (area threats) | Ranged danger zones; constant motion required. |
| 9 | **Lockdown** | City-wide checkpoints, all forces max | Every district is hot; safe pockets vanish. |
| 10 | **MODULO** | Impossible state — overwhelming force | The run *will* end. How long can you dance? |

> **Why "MODULO"?** Heat 10 is the wrap-around point: the world's pressure exceeds what any player can sustain. The name nods to the inevitability — the counter overflows, and survival becomes a high-score art form rather than a win condition.

### Heat Tuning Philosophy
- **Time-to-first-heat** should be near-instant once spotted; the fantasy is being *wanted*, not sneaking.
- **Climb rate** accelerates: early levels take ~45–60s each, late levels arrive in bursts as aggression spikes.
- **Decay** is deliberately slow and requires *active* hiding, so escape always feels earned.
- Heat is the **master difficulty dial** — AI count, speed, aggression, and spawn density are all functions of heat.

---

## 4. Characters

Four selectable, **cosmetic-only** characters. No stat differences — selection is identity/expression. Each has a unique voxel model and on-foot + in-vehicle silhouette.

| Character | Build | Hair | Eyes | Identity Notes |
|-----------|-------|------|------|----------------|
| **Robin** | Standard | Blonde | Brown | Bright, agile-reading silhouette |
| **Leif** | Standard | Brown (textured) | Blue | Everyman lead |
| **Jovan** | Tall | Brown | Brown | Tallest model; distinct height |
| **Leo** | Muscular | Brown | Brown | Broadest model; heavy presence |

- Character select screen with 3D preview turntable.
- Outfits/cosmetics unlock via progression (Section 9) — still no gameplay effect.

---

## 5. The World

A **large procedural voxel city**, generated from a seeded layout so each run feels fresh but every district reads consistently. Big enough that escape is *possible but never easy*; dense enough to support line-of-sight breaks.

### Districts
| District | Role in the Chase |
|----------|-------------------|
| **Downtown** | Tight grid, tall buildings, alleys → best for losing line of sight; risky speed. |
| **Industrial Zone** | Wide lots, containers, ramps → high-speed evasion & destruction playground. |
| **Residential Suburbs** | Curved low-density streets → fast cornering, fewer hiding spots. |
| **Highway System** | Ring + arterial roads → top-speed escapes, but helicopters love it. |
| **Parks** | Open green space + paths → shortcuts, but exposed to air units. |
| **Parking Lots / Garages** | Multi-level cover → premier hiding & vehicle-swap spots. |
| **Gas Stations** | Explosive set-pieces → risk/reward destruction. |
| **Construction Sites** | Ramps, barriers, debris → stunts and roadblock-breaking. |

### World Atmosphere
- **Day/night cycle** that progresses over a run — neon lights ignite at night.
- **Weather**: clear, fog, rain (toggleable). Rain affects mood and handling feel; fog affects visibility (both ways — you *and* the cops).
- **Dynamic shadows** and stylized "modern voxel" lighting.
- The city should feel **alive**: ambient traffic, pedestrians (despawn safely), birds/drones, flickering signs.

---

## 6. Vehicles

Player starts **on foot**. Press `E` near a vehicle to steal/enter; `E` again to exit. Any vehicle in the world is stealable.

### Categories & Feel
Each vehicle is defined by five stats: **Acceleration, Top Speed, Weight, Durability, Handling**. The design mandate is that categories feel *noticeably* different.

| Category | Accel | Top Speed | Weight | Durability | Handling | Role |
|----------|:----:|:---------:|:------:|:----------:|:--------:|------|
| **Compact** | ●●○ | ●○○ | ●○○ | ●○○ | ●●● | Nimble city escapes |
| **Sedan** | ●●○ | ●●○ | ●●○ | ●●○ | ●●○ | Reliable all-rounder |
| **SUV** | ●○○ | ●●○ | ●●● | ●●● | ●○○ | Survivability & ramming |
| **Sports Car** | ●●● | ●●● | ●○○ | ●○○ | ●●● | Highway king, fragile |
| **Van** | ●○○ | ●○○ | ●●● | ●●○ | ●○○ | Roadblock-buster, slow |
| **Pickup Truck** | ●●○ | ●●○ | ●●○ | ●●○ | ●●○ | Rugged, off-road capable |
| **Muscle Car** | ●●● | ●●○ | ●●○ | ●●○ | ●●○ | Aggressive ram + speed |

### Vehicle Strategy
- **Switching vehicles is a core escape tool**: a fresh, undamaged vehicle resets your durability and can confuse search mode.
- **Durability** governs the damage→smoke→fire→explosion path. A dying car forces a swap — a built-in tension generator.
- Weight matters in collisions: heavy vehicles bulldoze props and light cop cars but corner poorly.

---

## 7. Destruction System

A primary selling point. Voxel, *Teardown-inspired* but **performance-budgeted**.

### Destructible World Props
Street lights · fences · small trees · mailboxes · benches · traffic signs · road barriers. These shatter into voxel debris, can be plowed through (with speed/weight cost), and feed the spectacle.

### Vehicle Damage Model
A staged, readable damage system applied to both player and police vehicles:

```
HEALTHY → DENTED → SMOKING → ON FIRE → EXPLOSION (wreck)
```

- **Dents**: voxel deformation on impact.
- **Smoke**: particle plume signals "this car is dying — find a new one."
- **Fire**: accelerating damage, screen/audio cue.
- **Explosion**: pooled particle + light flash + area knock; leaves a wreck obstacle.

### Performance Mandate
- Debris uses **instanced rendering** + **object pooling**; pieces fade/despawn on a budget.
- Destruction detail scales with graphics quality setting (Section 10).
- Hard caps on simultaneous debris/particles to protect frame rate.

---

## 8. AI & Pursuit Design

Police AI must feel **intelligent**, never a dumb heat-seeking blob. Behaviors are layered and unlock with heat.

### Core AI Behaviors
| Behavior | Description |
|----------|-------------|
| **Prediction** | Steer toward where the player *will be*, not where they are. |
| **Interception** | Units split to cut off escape vectors at intersections. |
| **Roadblocks** | Strategic placement ahead of the player on likely routes. |
| **Flanking** | Multi-unit pincer coordination; surround rather than chase. |
| **Search Mode** | On losing the player, converge on **last known position**, then sweep outward in a shrinking-confidence radius. |
| **Escalation** | Tactics get smarter and more aggressive as heat rises. |

### AI Architecture (design intent — detail in Phase 6)
- A lightweight **behavior/state machine** per unit (Patrol → Chase → Intercept → Search → Regroup).
- A **squad coordinator** that assigns roles (chaser / flanker / blocker) so units don't clump.
- **Tiered update rates**: nearby units think every frame; distant units think less often (efficient AI updates).
- Air units (helicopters) act as **spotters** that refresh the player's "last known position," making line-of-sight breaks the key counter-play.

---

## 9. Escape & Tension

Pursuit must always feel *escapable* — losing the cops is the skill ceiling.

### Escape Methods
- **Break line of sight** (the master mechanic).
- Duck into **alleys**, **dense downtown**, **parking garages**.
- **Switch vehicles** to reset search and durability.
- **Highway exits** and sudden direction changes to beat prediction.

### The Search → Decay Flow
1. Player breaks line of sight → pursuit enters **Search Mode**.
2. Police converge on last known position and sweep.
3. If the player stays hidden for a tension window → search fails.
4. Heat **slowly decays** one tier at a time.
5. Re-spotted at any point → instant return to full pursuit.

This creates the signature loop of **panic → hide → hold your breath → relief → exhale → re-engage**.

---

## 10. Scoring, Progression & Settings

### Survival Scoring
Final score rewards skillful, aggressive survival — not passive cowering:

```
Score = (TimeSurvived × HeatMultiplier)
      + (NearMisses × Bonus)
      + (CopsDestroyed × Bonus)
      + (DistanceTraveled × Factor)
      + PeakHeatBonus
```

- **Heat multiplier** scales score gain with current heat — surviving at Heat 8 is worth far more than idling at Heat 1.
- **Near-misses** and **takedowns** reward playing on the edge.
- Architecture is **leaderboard-ready** (local first; backend-pluggable later).

### Progression (cosmetic only, no paywalls/grind)
Unlocks earned through survival milestones (peak heat, total time, score thresholds):
- New vehicles (more category variety to *steal/spawn*, not stat advantages).
- Character cosmetics / outfits.
- New visual effects (trail FX, neon palettes).

### Settings Menu
- **Graphics**: Low / Medium / High / Ultra
- **Shadows**: On / Off
- **Post-processing**: On / Off
- **Weather**: On / Off
- **Controls**: rebindable keys
- **Mobile controls**: On / Off
- **Audio**: Music volume, Effects volume
- **Accessibility**: Camera-shake toggle

---

## 11. Audio Direction

- **Dynamic chase music** with intensity layers that crossfade by heat level (calm → tense → frantic → apocalyptic).
- **Audio cues** for: helicopter arrival, roadblock spawn, heat increase, successful escape.
- Stylized, punchy SFX for collisions, explosions, sirens, tire screech.
- All audio respects the music/effects volume split and can be muted.

---

## 12. UX & Screens

Premium, snappy menus. Required screens:
- **Main Menu** · **Character Select** · **Settings** · **Statistics** · **Pause** · **Game Over**
- **Leaderboard-ready** architecture.

**Game Over screen shows:** time survived · highest heat reached · vehicles used · distance traveled · final score — plus a single dominant **"Run Again"** button to feed the loop.

### In-game HUD
- Heat meter (the hero UI element) · score · speed · current vehicle durability · minimap with threat indicators · escape/search status.

---

## 13. Technical & Performance Targets

| Concern | Target / Approach |
|---------|-------------------|
| Frame rate | **60 FPS** on modern desktop browsers |
| Platforms | Desktop-first, **mobile compatible**, Vercel-deployed |
| Rendering | **Instanced rendering** for city/props/debris; **LOD** for distant geometry |
| Memory | **Object pooling** for vehicles, debris, particles, AI units |
| AI | **Tiered update frequency** by distance/relevance |
| World | Chunked procedural city; stream/cull off-screen districts |
| Quality scaling | Graphics presets gate shadows, post-FX, particle/debris caps, draw distance |

Stack: **React + TypeScript + Three.js + React Three Fiber + Zustand + Vite**, clean modular architecture (no spaghetti, no massive files, no hardcoded systems).

---

## 14. Scope & Phase Roadmap

The studio builds in 10 reviewed phases. Each ends with decisions explained, files listed, and a pause for approval.

| Phase | Deliverable |
|:----:|-------------|
| **1** | ✅ **Game Design Document** *(this document)* |
| 2 | Technical architecture |
| 3 | Folder structure & project scaffold |
| 4 | Core gameplay prototype (on-foot + driving + camera) |
| 5 | Vehicle system (categories, stats, feel) |
| 6 | Pursuit AI (heat, behaviors, squad coordination) |
| 7 | Destruction system (props + vehicle damage) |
| 8 | Procedural city (districts, generation, streaming) |
| 9 | UI/UX (all screens, HUD, audio integration) |
| 10 | Polish & optimization (LOD, pooling, quality presets, 60 FPS pass) |

### Out of Scope (explicitly)
Missions · story mode · racing events · weapon systems · complex objectives · microtransactions · paywalls · pay-to-win progression.

---

## 15. Definition of Success

*WANTED: MODULO* succeeds if a new player, within 30 seconds, understands "don't get caught," feels the pressure climb, dies, and **immediately wants to go again** — and if that same player, an hour later, is measurably better and chasing a higher peak-heat survival time, all at a locked 60 FPS in their browser.

---

*End of Phase 1 — Game Design Document. Awaiting approval to proceed to Phase 2 (Technical Architecture).*
