import * as THREE from 'three'
import type { BotDifficulty, GameMode, VehicleDef } from '@/types'
import type { VehicleState } from '@/game/vehicles/vehiclePhysics'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import {
  type BakedTrack,
  getTrack,
  leftNormal,
  makeEndless,
  project,
  sampleAt,
  trackLaps,
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
export const LANE_GAP = 18
const GRAVITY = 26
const FALL_DEATH_Y = -20
const COUNTDOWN = 3
const CAR_HALF = 1.0

/** Bot base cruising speed by difficulty (it slows for corners on top of this). */
const BOT_SPEED: Record<BotDifficulty, number> = { easy: 21, medium: 26.5, hard: 30.5 }

export interface RaceCar {
  pos: THREE.Vector3
  state: VehicleState
  y: number
  vy: number
  /** Nearest-centreline index hint for projection. */
  index: number
  lastS: number
  traveled: number
  falling: boolean
}

export interface RaceState {
  mode: GameMode
  endless: boolean
  difficulty: BotDifficulty
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

function makeCar(pos: { x: number; z: number }, heading: number): RaceCar {
  return {
    pos: new THREE.Vector3(pos.x, 0, pos.z),
    state: { heading, speed: 0, slip: 0 },
    y: 0,
    vy: 0,
    index: 0,
    lastS: 0,
    traveled: 0,
    falling: false,
  }
}

export function createRaceState(
  mode: GameMode,
  trackId: string,
  difficulty: BotDifficulty,
  best: number,
): RaceState {
  const endless = mode === 'endless'
  const track = endless ? makeEndless() : getTrack(trackId)
  const start = sampleAt(track, 0)
  const heading = Math.atan2(start.tan.x, start.tan.z)
  const player = makeCar(start.pos, heading)

  let bot: RaceCar | null = null
  if (!endless) {
    const n = leftNormal(start.tan)
    bot = makeCar({ x: start.pos.x + n.x * LANE_GAP, z: start.pos.z + n.z * LANE_GAP }, heading)
  }
  const totalLaps = endless ? 0 : trackLaps(trackId)

  return {
    mode,
    endless,
    difficulty,
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
    player.vy -= GRAVITY * dt
    player.y += player.vy * dt
    player.pos.x += Math.sin(player.state.heading) * player.state.speed * dt * 0.4
    player.pos.z += Math.cos(player.state.heading) * player.state.speed * dt * 0.4
    if (player.y < FALL_DEATH_Y) {
      state.finished = true
      state.fell = true
      state.won = false
    }
  } else if (state.recover > 0) {
    state.recover = Math.max(0, state.recover - dt)
    player.state.speed = 0
    player.state.slip = 0
  } else {
    const speedMult = state.endless ? 1 + Math.min(0.7, player.traveled / 2600) : 1
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

    const offEdge = Math.abs(proj.lateral) - track.half - CAR_HALF
    if (offEdge > 0) {
      if (state.endless) {
        player.falling = true
        player.vy = -2
      } else {
        // Race: respawn on the centreline with a short recovery (costs time).
        const sp = sampleAt(track, proj.s)
        player.pos.set(sp.pos.x, 0, sp.pos.z)
        player.state.heading = Math.atan2(sp.tan.x, sp.tan.z)
        player.state.speed = 0
        player.state.slip = 0
        state.recover = 1.1
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
    const v = BOT_SPEED[state.difficulty] * (1 - slow)
    bot.traveled += v * dt
    bot.state.speed = v
    const sp = sampleAt(track, bot.traveled)
    const n = leftNormal(sp.tan)
    bot.pos.set(sp.pos.x + n.x * LANE_GAP, 0, sp.pos.z + n.z * LANE_GAP)
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
