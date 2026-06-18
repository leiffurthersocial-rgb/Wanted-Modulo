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
| Pause | `ESC` |

On foot you can wade and **swim across rivers** and climb back out on the far
bank. In a vehicle, hit a **ramp** at speed to catch air, and yank the
**handbrake** to drift around corners.

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
