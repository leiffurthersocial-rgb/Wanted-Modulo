import * as THREE from 'three'
import type { VehicleDef } from '@/types'
import type { VehicleState } from '@/game/vehicles/vehiclePhysics'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import { getDebug } from '@/state/useDebugStore'
import {
  type BakedTrack,
  getTrack,
  groundAt,
  inGap,
  project,
  rampAt,
  sampleAt,
} from '@/game/world/track'

/** The race car. Sporty + grippy for clean racing. */
export const RACE_DEF: VehicleDef = {
  id: 'racer',
  name: 'Racer',
  category: 'sports',
  color: '#ff5252',
  topSpeed: 34,
  accel: 24,
  handling: 2.7,
  weight: 0.9,
  durability: 1000,
  size: { length: 4.0, width: 1.9, height: 1.15 },
}

const GRAVITY = 26
const FALL_DEATH_Y = -22
const COUNTDOWN = 3
const CAR_HALF = 1.0
/** Minimum speed needed to actually launch off a ramp lip. */
const LAUNCH_MIN = 8

export interface RaceCar {
  pos: THREE.Vector3
  state: VehicleState
  y: number
  vy: number
  /** Airborne off a ramp (ballistic until it lands back on the deck). */
  airborne: boolean
  /** Nearest-centreline index hint for projection. */
  index: number
  lastS: number
  traveled: number
  /** Fell off the edge — dropping into the void. */
  falling: boolean
}

export interface RaceState {
  track: BakedTrack
  totalDist: number
  player: RaceCar
  countdown: number
  elapsed: number
  recover: number
  finished: boolean
  won: boolean
  best: number
}

function makeCar(pos: { x: number; z: number }, heading: number, y: number): RaceCar {
  return {
    pos: new THREE.Vector3(pos.x, 0, pos.z),
    state: { heading, speed: 0, slip: 0 },
    y,
    vy: 0,
    airborne: false,
    index: 0,
    lastS: 0,
    traveled: 0,
    falling: false,
  }
}

export function createRaceState(trackId: string, best: number): RaceState {
  const track = getTrack(trackId)
  const start = sampleAt(track, 0)
  const heading = Math.atan2(start.tan.x, start.tan.z)
  const player = makeCar(start.pos, heading, start.y)

  // A solo time trial — a single flying lap against the clock.
  return {
    track,
    totalDist: track.length,
    player,
    countdown: COUNTDOWN,
    elapsed: 0,
    recover: 0,
    finished: false,
    won: false,
    best,
  }
}

export interface RaceInput {
  throttle: number // -1..1
  steer: number // left(+) .. right(-)
  handbrake: boolean
}

/** Signed forward progress between two arc lengths, handling closed-loop wrap. */
function progressDelta(track: BakedTrack, prev: number, next: number): number {
  let d = next - prev
  if (track.closed) {
    if (d < -track.length / 2) d += track.length
    else if (d > track.length / 2) d -= track.length
  }
  return d
}

export function stepRace(state: RaceState, input: RaceInput, dt: number): void {
  if (state.finished) return

  if (state.countdown > 0) {
    state.countdown = Math.max(0, state.countdown - dt)
    return
  }
  state.elapsed += dt

  const { track, player } = state

  // Debug overrides (apply to Race when the master switch is on).
  const dbg = getDebug()
  const dOn = dbg.enabled
  const gravity = GRAVITY * (dOn ? dbg.gravityMult : 1)
  const noFall = dOn && dbg.raceNoFall

  // --- Player ---
  if (player.falling) {
    // Dropping off the edge of the track into the void.
    player.vy -= gravity * dt
    player.y += player.vy * dt
    player.pos.x += Math.sin(player.state.heading) * player.state.speed * dt * 0.4
    player.pos.z += Math.cos(player.state.heading) * player.state.speed * dt * 0.4
    if (player.y < FALL_DEATH_Y) {
      // Get fished out and dropped back on the last good spot, losing time to a
      // short recovery (instead of an invisible wall).
      const sp = sampleAt(track, player.lastS)
      player.pos.set(sp.pos.x, 0, sp.pos.z)
      player.y = sp.y
      player.vy = 0
      player.state.heading = Math.atan2(sp.tan.x, sp.tan.z)
      player.state.speed = 0
      player.state.slip = 0
      player.falling = false
      player.airborne = false
      state.recover = 1.3
    }
  } else if (state.recover > 0) {
    state.recover = Math.max(0, state.recover - dt)
    player.state.speed = 0
    player.state.slip = 0
  } else {
    const prevS = player.lastS
    const speedMult = dOn ? dbg.speedMult : 1
    const { dx, dz } = stepVehicle(
      player.state,
      { throttle: input.throttle, steer: input.steer, handbrake: input.handbrake },
      RACE_DEF,
      dt,
      speedMult,
    )
    player.pos.x += dx
    player.pos.z += dz

    const proj = project(track, player.pos.x, player.pos.z, player.index)
    player.index = proj.index
    player.traveled += progressDelta(track, player.lastS, proj.s)
    player.lastS = proj.s

    const ground = groundAt(track, proj.s)

    if (player.airborne) {
      // Ballistic flight off a ramp; land when we meet the deck again.
      player.vy -= gravity * dt
      player.y += player.vy * dt
      if (player.y <= ground && player.vy <= 0) {
        const offEdge = Math.abs(proj.lateral) - track.half - CAR_HALF
        if ((offEdge > 0 || inGap(track, proj.s)) && !noFall) {
          // Overshot the landing — came down off the edge or short into a gap.
          player.airborne = false
          player.falling = true
        } else {
          player.y = ground
          player.vy = 0
          player.airborne = false
        }
      }
    } else {
      const offEdge = Math.abs(proj.lateral) - track.half - CAR_HALF
      if (offEdge > 0 && !noFall) {
        // Drove off the edge — fall (no invisible walls); respawn after dropping.
        player.falling = true
        player.vy = -1
      } else {
        // On the deck: follow the elevation, and launch when we crest a ramp.
        const prevR = rampAt(track, prevS)
        const nowR = rampAt(track, proj.s)
        const wentForward = progressDelta(track, prevS, proj.s) > 0.01
        if (
          prevR &&
          !nowR &&
          wentForward &&
          prevR.frac > 0.5 &&
          Math.abs(player.state.speed) > LAUNCH_MIN
        ) {
          player.airborne = true
          const slope = prevR.ramp.height / prevR.ramp.len
          player.vy = (Math.abs(player.state.speed) * slope + 1.5) * (dOn ? dbg.jumpMult : 1)
        } else if (inGap(track, proj.s) && !noFall) {
          // Reached a hole without enough air to clear it — drop in.
          player.falling = true
          player.vy = -1
        } else {
          player.y = ground
        }
      }

      // Barrier collisions: clipping one scrubs nearly all speed and knocks the
      // car aside — costly, but recoverable (the lap is still winnable).
      if (!player.falling) {
        for (const o of track.obstacles) {
          const dx = player.pos.x - o.x
          const dz = player.pos.z - o.z
          const rr = o.r + CAR_HALF
          const d2 = dx * dx + dz * dz
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 0.0001
            player.pos.x = o.x + (dx / d) * rr
            player.pos.z = o.z + (dz / d) * rr
            player.state.speed *= 0.22
            player.state.slip *= 0.3
          }
        }
      }
    }
  }

  // --- Finish (solo time trial) ---
  if (!state.finished && player.traveled >= state.totalDist) {
    state.finished = true
    state.won = true
  }
}
