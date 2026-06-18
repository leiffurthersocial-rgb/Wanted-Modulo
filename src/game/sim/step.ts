import { SCORE } from '@/config/constants'
import { ensurePropWindow, getProps } from '@/game/world/propModel'
import { ensurePowerupWindow, getPowerups } from '@/game/world/powerupModel'
import type { SimState } from './state'
import { updatePlayer, type StepInput } from './systems/player'
import {
  updatePropCollisions,
  updateVehicleDamage,
} from './systems/destruction'
import { recycleVehicles, updateVehicleVertical } from './systems/vehicles'
import { updatePowerups } from './systems/powerups'
import { updateParticles } from './systems/particles'
import { heatLevel, updateHeat } from './systems/heat'
import {
  manageFleet,
  updateCapture,
  updateHelis,
  updatePolice,
  updateSpotting,
} from './systems/pursuit'

/**
 * Advances the entire simulation by `dt`, running systems in a fixed,
 * deterministic order. Pure with respect to rendering — it only mutates
 * `SimState`; the Simulation component handles camera + committing transforms.
 */
export function stepSim(state: SimState, input: StepInput, dt: number): void {
  // 0. Stream the infinite world's destructible props + powerups.
  if (ensurePropWindow(state.player.pos.x, state.player.pos.z)) {
    state.props = getProps().props.map((p) => ({ ...p, alive: true }))
  }
  if (ensurePowerupWindow(state.player.pos.x, state.player.pos.z)) {
    state.powerups = getPowerups().items
  }

  // 1. Player movement + world collisions.
  updatePlayer(state, input, dt)
  updatePropCollisions(state, dt)
  updateVehicleVertical(state, dt)
  recycleVehicles(state)
  updatePowerups(state, dt)

  // Decay transient camera/rumble shake.
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3.5)

  // 2. Perception -> heat escalation.
  updateSpotting(state, dt)
  updateHeat(state, dt)
  const level = heatLevel(state)

  // 3. Pursuit: spawn/despawn, AI, air support, capture.
  manageFleet(state, dt, level)
  updatePolice(state, dt, level)
  updateHelis(state, dt)
  updateCapture(state, dt)

  // 4. Destruction + particle integration.
  updateVehicleDamage(state, dt)
  updateParticles(state, dt)

  // 5. Scoring + accumulators.
  state.acc.time += dt
  const dist = state.playerSpeed * dt
  state.acc.distance += dist
  if (state.playerSpeed > state.acc.topSpeed) state.acc.topSpeed = state.playerSpeed
  state.score.value += dt * SCORE.perSecond * (1 + level * 0.5) + dist * SCORE.perDistanceUnit
  state.flashPhase += dt
}
