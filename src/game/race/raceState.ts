import * as THREE from 'three'
import type { GameMode, VehicleDef } from '@/types'
import type { VehicleState } from '@/game/vehicles/vehiclePhysics'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import {
  type BakedTrack,
  getTrack,
  groundAt,
  leftNormal,
  makeEndless,
  project,
  rampAt,
  sampleAt,
} from '@/game/world/track'

/** The shared race car (both player and bot). Sporty + grippy for clean racing. */
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

const BOT_COLOR = '#33b5ff'
/** Lateral gap between the player's track and the bot's parallel track. */
export const LANE_GAP = 20
const GRAVITY = 26
const FALL_DEATH_Y = -22
const COUNTDOWN = 3
const CAR_HALF = 1.0
/** Minimum speed needed to actually launch off a ramp lip. */
const LAUNCH_MIN = 8

/** The bot drives flat-out (single, strong skill level — no difficulty tiers). */
const BOT_BASE_SPEED = 31

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
  mode: GameMode
  endless: boolean
  track: BakedTrack
  totalLaps: number
  totalDist: number
  player: RaceCar
  bot: RaceCar | null
  countdown: number
  elapsed: number
  recover: number
  finished: boolean
  won: boolean
  fell: boolean
  best: number
  rand: () => number
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

export function createRaceState(
  mode: GameMode,
  trackId: string,
  laps: number,
  best: number,
): RaceState {
  const endless = mode === 'endless'
  const track = endless ? makeEndless() : getTrack(trackId)
  const start = sampleAt(track, 0)
  const heading = Math.atan2(start.tan.x, start.tan.z)
  const player = makeCar(start.pos, heading, start.y)

  let bot: RaceCar | null = null
  if (!endless) {
    const n = leftNormal(start.tan)
    bot = makeCar(
      { x: start.pos.x + n.x * LANE_GAP, z: start.pos.z + n.z * LANE_GAP },
      heading,
      start.y,
    )
  }
  const totalLaps = endless ? 0 : Math.max(1, Math.min(3, Math.round(laps)))

  return {
    mode,
    endless,
    track,
    totalLaps,
    totalDist: track.length * totalLaps,
    player,
    bot,
    countdown: COUNTDOWN,
    elapsed: 0,
    recover: 0,
    finished: false,
    won: false,
    fell: false,
    best,
    rand: Math.random,
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

  // --- Player ---
  if (player.falling) {
    // Dropping off the edge of the track into the void.
    player.vy -= GRAVITY * dt
    player.y += player.vy * dt
    player.pos.x += Math.sin(player.state.heading) * player.state.speed * dt * 0.4
    player.pos.z += Math.cos(player.state.heading) * player.state.speed * dt * 0.4
    if (player.y < FALL_DEATH_Y) {
      if (state.endless) {
        // Endless: falling off ends the run.
        state.finished = true
        state.fell = true
        state.won = false
      } else {
        // Race: get fished out and dropped back on the last good spot, losing
        // time to a short recovery (instead of an invisible wall).
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
    }
  } else if (state.recover > 0) {
    state.recover = Math.max(0, state.recover - dt)
    player.state.speed = 0
    player.state.slip = 0
  } else {
    const prevS = player.lastS
    const speedMult = state.endless ? 1 + Math.min(1.1, player.traveled / 2000) : 1
    const throttle = state.endless ? 1 : input.throttle
    const { dx, dz } = stepVehicle(
      player.state,
      { throttle, steer: input.steer, handbrake: input.handbrake },
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

    // Keep the endless ribbon generated ahead of the car.
    if (track.endless && track.extend) track.extend(proj.index + 150)

    const ground = groundAt(track, proj.s)

    if (player.airborne) {
      // Ballistic flight off a ramp; land when we meet the deck again.
      player.vy -= GRAVITY * dt
      player.y += player.vy * dt
      if (player.y <= ground && player.vy <= 0) {
        const offEdge = Math.abs(proj.lateral) - track.half - CAR_HALF
        if (offEdge > 0) {
          // Overshot the landing and came down off the track — fall off.
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
      if (offEdge > 0) {
        // Drove off the edge — fall (no invisible walls). Endless dies; race
        // recovers once it has dropped far enough.
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
          player.vy = Math.abs(player.state.speed) * slope + 1.5
        } else {
          player.y = ground
        }
      }
    }
  }

  // --- Bot (race only) ---
  if (state.bot && !state.endless) {
    const bot = state.bot
    const here = sampleAt(track, bot.traveled)
    const ahead = sampleAt(track, bot.traveled + 9)
    // Corner curvature -> slow down a little.
    const cur = Math.abs(Math.atan2(ahead.tan.x, ahead.tan.z) - Math.atan2(here.tan.x, here.tan.z))
    const wrapped = Math.min(cur, Math.PI * 2 - cur)
    const slow = Math.min(0.45, wrapped * 1.6)
    // Gentle rubber-band so the race stays close: the bot pushes harder when the
    // player is ahead and eases when it has built a lead.
    const gap = player.traveled - bot.traveled
    const band = Math.max(-0.12, Math.min(0.18, gap * 0.01))
    const v = BOT_BASE_SPEED * (1 - slow) * (1 + band)
    bot.traveled += v * dt
    bot.state.speed = v
    const sp = sampleAt(track, bot.traveled)
    const n = leftNormal(sp.tan)
    bot.pos.set(sp.pos.x + n.x * LANE_GAP, 0, sp.pos.z + n.z * LANE_GAP)
    bot.y = groundAt(track, bot.traveled)
    bot.state.heading = Math.atan2(sp.tan.x, sp.tan.z)
  }

  // --- Finish (race) ---
  if (!state.endless && !state.finished) {
    const botTraveled = state.bot ? state.bot.traveled : 0
    if (player.traveled >= state.totalDist) {
      state.finished = true
      state.won = true
    } else if (botTraveled >= state.totalDist) {
      state.finished = true
      state.won = false
    }
  }
}

export { BOT_COLOR }
