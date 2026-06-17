import type { VehicleDef } from '@/types'
import { clamp } from '@/core/math/angles'

/** Mutable per-vehicle dynamic state (heading in radians, speed in units/s). */
export interface VehicleState {
  heading: number
  speed: number
}

export interface DriveInput {
  throttle: number // -1..1 (forward/back)
  steer: number // -1..1 (right/left)
}

const REVERSE_FRACTION = 0.4 // max reverse speed as fraction of top speed
const DRAG = 0.9 // passive deceleration coefficient
const BRAKE = 2.2 // active deceleration when reversing throttle vs motion

/**
 * Arcade car model. Pure function: advances heading & speed for `dt`.
 *
 * Steering authority scales with speed (you can't turn while parked) and
 * reverses when going backwards, giving each category a distinct feel through
 * its `accel`, `topSpeed`, `handling`, and `weight` stats.
 *
 * Returns the world-space delta to apply to the vehicle position.
 */
export function stepVehicle(
  state: VehicleState,
  input: DriveInput,
  def: VehicleDef,
  dt: number,
  speedMult = 1,
): { dx: number; dz: number } {
  const topSpeed = def.topSpeed * speedMult
  const maxReverse = topSpeed * REVERSE_FRACTION

  // Heavier vehicles accelerate slower.
  const effectiveAccel = (def.accel * speedMult) / Math.max(0.5, def.weight)

  if (input.throttle !== 0) {
    // Braking is stronger when throttle opposes current motion.
    const opposing = Math.sign(input.throttle) !== Math.sign(state.speed) && state.speed !== 0
    const power = opposing ? effectiveAccel * BRAKE : effectiveAccel
    state.speed += input.throttle * power * dt
  } else {
    // Coast down toward zero.
    state.speed -= state.speed * DRAG * dt
    if (Math.abs(state.speed) < 0.05) state.speed = 0
  }

  state.speed = clamp(state.speed, -maxReverse, topSpeed)

  // Steering authority ramps up with speed, capped near low speed.
  const speedFactor = clamp(state.speed / (topSpeed * 0.45), -1, 1)
  state.heading += input.steer * def.handling * speedFactor * dt

  // Forward vector for rotation.y = heading is (sin h, 0, cos h).
  const dx = Math.sin(state.heading) * state.speed * dt
  const dz = Math.cos(state.heading) * state.speed * dt
  return { dx, dz }
}
