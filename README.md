# WANTED: MODULO

> A web-based, voxel-style police-chase survival game. You are hunted. The only goal is to **survive** — the longer you last, the more dangerous the world becomes.

A spiritual successor to *Smashy Road 2*, built to be deeper, more polished, and more replayable.

**Status:** ✅ Feature-complete (Phases 1–10). Survive the escalating chase across a districted voxel city with day/night, neon, weather, destruction, and a 0–10 pursuit heat system.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/ (deploys on Vercel as-is)
```

## Tech Stack

React · TypeScript · Three.js · React Three Fiber · Zustand · Vite — deployed on Vercel.

## Project Docs

| Doc | Description |
|-----|-------------|
| [Game Design Document](./docs/GAME_DESIGN_DOCUMENT.md) | Complete design vision, systems, and loop |
| Technical Architecture | _Phase 2 (pending)_ |

## Controls

| Action | Keys |
|--------|------|
| Move | `WASD` / Arrow Keys |
| Handbrake / Drift | `Space` / `Shift` |
| Enter / Exit Vehicle | `E` |
| Pause | `P` / `ESC` |

On foot you can wade and **swim across rivers** and climb back out on the far
bank. In a vehicle, hit a **ramp** at speed to catch air, and yank the
**handbrake** to drift around corners.

## Race & Endless

Eight hand-built circuits — from the friendly **Sunset Oval** through Switchback
Ridge, Grand Loop, Canyon Rush, Skyline Weave and Riptide Coast, up to the brutal
**Gauntlet** and the brutal-but-beatable **Vertigo** — that **roll up and down**
over hills, plunge through dips, and string **launch ramps** over real **gaps** in
the deck: clear the jump or fall in. **Barriers** force a slalom on top of that.
Race is a **solo, single-lap time trial**: just the clock and your **best lap**.
There are no invisible walls, so run wide and you'll fall clean off the edge; clip
a barrier and you'll lose nearly all your speed. Each circuit is lined with its own
**themed scenery** — palms on the coast, pines on the ridge, neon pylons on the
skyline, glowing crystals on Vertigo — so every track feels distinct. **Endless**
shares the rolling terrain and ramps, ramping up speed and curviness the further you
survive.

In **Survive**, the police never spawn in front of you — they close in from behind
and to the sides — and they arrive **fast**, escalating through a 14-level heat
curve (≈20s to your first star; fleeing fast and causing mayhem cranks it, truly
hiding cools it). Threats stack from dark-liveried patrol cars up through
interceptors, heavy units, SWAT vans, armored **military** trucks and — at the
highest heat — **APCs** and near-unkillable **tanks**, plus attack helicopters and
police **ground bombs** that arm, blink and detonate. Counter-play: **CLOAK** hides you from cops *and*
helicopters (they lose you completely), and the buffed **EMP** clears a wide pack
of cars and now knocks helicopters out of the sky.

## World

The map is **infinite** and streamed around the player: a logical, district-based
voxel city (downtown → midtown → residential → industrial) thinned out for a
modern, airy skyline, with rolling countryside, **meandering rivers**, sandy
banks, and stunt **ramps** scattered through the streets. Buildings, terrain,
props and water all generate deterministically from world coordinates, so the
world stays consistent however far you roam — and stealable cars recycle toward
you so you're never stranded.

## Development

This project is being built in 10 reviewed phases. See the GDD for the full plan.
