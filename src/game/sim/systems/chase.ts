import * as THREE from 'three'
import type { VehicleDef } from '@/types'
import { angleDelta, clamp } from '@/core/math/angles'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import { buildingCollision } from '@/game/sim/los'
import { isWater, surfaceHeight } from '@/game/world/terrain'
import type { ChaseSim, SimState, SuspectEntity } from '@/game/sim/state'
import { spawnDebris } from './particles'

/* -------------------------------------------------------------------------- */
/*  Cop-chase mode (you are the police, hunting a fleeing AI suspect).         */
/*                                                                            */
/*  Design contract:                                                          */
/*   - The player's interceptor is ALWAYS faster than the suspect (the        */
/*     suspect's top speed is a fraction < 1 of the cop's), so closing the    */
/*     gap is always physically possible — the mode is always winnable.       */
/*   - You only "lose" a suspect if you let them sit beyond the escape        */
/*     distance for several seconds; staying close is always within your      */
/*     control, so failure is never imposed unfairly.                         */
/*   - Catching fills a bust meter through sustained proximity + ramming.     */
/*     Each catch ramps difficulty slightly (faster, jukier suspect) while    */
/*     the speed cap keeps it winnable. Endless, score = suspects caught.     */
/* -------------------------------------------------------------------------- */

/** The player's police interceptor — fast and effectively indestructible. */
export const COP_DEF: VehicleDef = {
  id: 'interceptor',
  name: 'Police Interceptor',
  category: 'sports',
  color: '#f2f4f8',
  topSpeed: 40,
  accel: 23,
  handling: 2.55,
  weight: 1.2,
  durability: 1_000_000,
  size: { length: 4.3, width: 1.95, height: 1.4 },
}

/** The suspect's getaway car (bright + sporty so it reads at a glance). */
export const SUSPECT_DEF: VehicleDef = {
  id: 'getaway',
  name: 'Getaway',
  category: 'sports',
  color: '#ff5fa2',
  topSpeed: 40, // matched to the cop; the per-frame speedMult keeps it slower
  accel: 21,
  handling: 2.7,
  weight: 0.85,
  durability: 1_000_000,
  size: { length: 4.0, width: 1.9, height: 1.2 },
}

const BUST_RADIUS = 8 // within this, the bust meter fills
const BUST_FILL = 0.34 // per second of sustained proximity (~3s to fill)
const BUST_DRAIN = 0.17 // per second when out of range
const RAM_BONUS = 0.16 // bust gained from a solid ram
const ESCAPE_DIST = 118 // beyond this the suspect is "getting away"
/** Seconds the suspect may stay beyond ESCAPE_DIST before they fully escape. */
export const ESCAPE_LIMIT = 11
const SPAWN_DIST = 64 // distance a fresh suspect appears from the cop

/** Suspect top-speed fraction of the cop's — always < 1 so the cop can close. */
function speedFactor(caught: number): number {
  return Math.min(0.965, 0.9 + caught * 0.012)
}
/** Juke magnitude (random heading swing) — grows a little each catch. */
function evadeAmount(caught: number): number {
  return Math.min(1.05, 0.5 + caught * 0.05)
}

/** Picks a spawn point at ~radius from (x,z) that isn't in water or a building. */
function safePointNear(x: number, z: number, radius: number, seedA: number): [number, number] {
  for (let k = 0; k < 12; k++) {
    const a = seedA + k * 1.9
    const px = x + Math.sin(a) * radius
    const pz = z + Math.cos(a) * radius
    if (!isWater(px, pz) && !buildingCollision(px, pz, 3).hit) return [px, pz]
  }
  return [x + radius, z]
}

/** Builds a fresh suspect fleeing near (px,pz). */
export function createSuspect(px: number, pz: number, caught: number): SuspectEntity {
  const [x, z] = safePointNear(px, pz, SPAWN_DIST, (caught + 1) * 2.3)
  const heading = Math.atan2(x - px, z - pz) // initially facing away from the cop
  return {
    def: SUSPECT_DEF,
    pos: new THREE.Vector3(x, surfaceHeight(x, z), z),
    state: { heading, speed: 0, slip: 0 },
    y: surfaceHeight(x, z),
    vy: 0,
    fleeHeading: heading,
    jukeTimer: 1.5,
    boost: 0,
    boostCooldown: 4,
  }
}

/** Initial chase state for a new pursuit run. */
export function createChase(px: number, pz: number): ChaseSim {
  return {
    suspect: createSuspect(px, pz, 0),
    caught: 0,
    bust: 0,
    escapeTimer: 0,
    escaped: false,
    banner: 0,
    bearing: 0,
    dist: SPAWN_DIST,
  }
}

/**
 * Advances the cop-chase: suspect flee AI, the bust meter, ramming, escapes and
 * catches. Mutates `state.chase` and `state.score`.
 */
export function updateChase(state: SimState, dt: number): void {
  const chase = state.chase
  if (!chase || chase.escaped) return
  const cop = state.player.pos
  const s = chase.suspect
  if (chase.banner > 0) chase.banner = Math.max(0, chase.banner - dt)

  const factor = speedFactor(chase.caught)

  // --- Suspect flee steering ---
  s.jukeTimer -= dt
  if (s.jukeTimer <= 0) {
    s.jukeTimer = 1.4 + state.rand() * 1.8
    s.fleeHeading = (state.rand() - 0.5) * 2 * evadeAmount(chase.caught)
  }
  // Direction directly away from the cop, plus the current juke offset.
  const away = Math.atan2(s.pos.x - cop.x, s.pos.z - cop.z)
  let target = away + s.fleeHeading

  // Avoid driving into water / buildings: probe a short distance ahead and, if
  // it's blocked, steer toward open ground.
  const probe = 10
  const ax = s.pos.x + Math.sin(target) * probe
  const az = s.pos.z + Math.cos(target) * probe
  if (isWater(ax, az) || buildingCollision(ax, az, 2.5).hit) {
    // Try swinging left/right until clear; fall back to straight-away.
    let best = away
    for (const off of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4]) {
      const h = away + off
      const tx = s.pos.x + Math.sin(h) * probe
      const tz = s.pos.z + Math.cos(h) * probe
      if (!isWater(tx, tz) && !buildingCollision(tx, tz, 2.5).hit) {
        best = h
        break
      }
    }
    target = best
  }

  // Panic second-wind: a cornered suspect briefly lunges to break away.
  if (s.boostCooldown > 0) s.boostCooldown -= dt
  if (s.boost > 0) s.boost -= dt
  const distNow = Math.hypot(cop.x - s.pos.x, cop.z - s.pos.z)
  if (distNow < 6 && chase.bust > 0.35 && s.boostCooldown <= 0) {
    s.boost = 1.1
    s.boostCooldown = 5
  }
  const suspectMult = factor + (s.boost > 0 ? 0.13 : 0)

  const err = angleDelta(s.state.heading, target)
  const steer = clamp(err * 2.4, -1, 1)
  const throttle = Math.abs(err) < 1.4 ? 1 : 0.55
  const { dx, dz } = stepVehicle(s.state, { throttle, steer }, s.def, dt, suspectMult)
  s.pos.x += dx
  s.pos.z += dz

  // Resolve hard collisions so the suspect doesn't bury itself in geometry.
  const sr = s.def.size.width * 0.6
  const c = buildingCollision(s.pos.x, s.pos.z, sr)
  if (c.hit) {
    s.pos.x += c.nx * c.depth
    s.pos.z += c.nz * c.depth
    s.state.speed *= 0.5
  }
  // Settle the suspect onto the drivable surface.
  s.y = surfaceHeight(s.pos.x, s.pos.z)

  // --- Distance, bearing, bust meter ---
  const dxp = s.pos.x - cop.x
  const dzp = s.pos.z - cop.z
  const dist = Math.hypot(dxp, dzp)
  chase.dist = dist
  chase.bearing = Math.atan2(dxp, dzp) - state.player.heading

  if (dist < BUST_RADIUS) {
    // Closer = faster fill, rewarding tight tailing.
    const closeness = 1 - dist / BUST_RADIUS
    chase.bust += BUST_FILL * (0.6 + closeness * 0.8) * dt
  } else {
    chase.bust -= BUST_DRAIN * dt
  }

  // --- Ram / PIT: physical contact slams the bust meter up ---
  const copR = state.vehicles[state.player.vehicleIndex].def.size.width * 0.6
  const sumR = sr + copR
  if (dist < sumR) {
    const push = sumR - dist || 0.01
    const inv = 1 / (dist || 0.01)
    s.pos.x += (dxp * inv) * push
    s.pos.z += (dzp * inv) * push
    const impact = Math.abs(s.state.speed) + state.playerSpeed
    chase.bust += RAM_BONUS * Math.min(1, impact / 30)
    s.state.speed *= 0.7
    state.shake = Math.max(state.shake, Math.min(1, impact / 40))
    spawnDebris(state, s.pos.x, s.y + 0.6, s.pos.z, '#ffd23f', 5)
  }

  chase.bust = clamp(chase.bust, 0, 1)

  // --- Escape tracking ---
  if (dist > ESCAPE_DIST) {
    chase.escapeTimer += dt
    if (chase.escapeTimer >= ESCAPE_LIMIT) {
      chase.escaped = true
      return
    }
  } else {
    chase.escapeTimer = Math.max(0, chase.escapeTimer - dt * 2.5)
  }

  // --- Catch! ---
  if (chase.bust >= 1) {
    chase.caught += 1
    chase.banner = 2.5
    state.score.value += 1000 + Math.max(0, 400 - chase.escapeTimer * 40)
    state.explosions += 1 // reuse the bust SFX cue (satisfying thump)
    chase.bust = 0
    chase.escapeTimer = 0
    chase.suspect = createSuspect(cop.x, cop.z, chase.caught)
  }
}
