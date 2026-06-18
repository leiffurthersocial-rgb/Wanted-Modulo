import type { VehicleDef } from '@/types'
import { clamp } from '@/core/math/angles'

/** Mutable per-vehicle dynamic state. */
export interface VehicleState {
  heading: number
  /** Forward speed along the heading (units/s). */
  speed: number
  /** Lateral slide velocity (units/s) — the drift component. */
  slip: number
}

export interface DriveInput {
  throttle: number // -1..1 (forward/back)
  steer: number // -1..1 (right/left)
  /** Handbrake: breaks rear grip for big, controllable slides. */
  handbrake?: boolean
}

const REVERSE_FRACTION = 0.4 // max reverse speed as fraction of top speed
const DRAG = 0.9 // passive deceleration coefficient
const BRAKE = 2.2 // active deceleration when reversing throttle vs motion

/**
 * Arcade car model with lateral grip + drifting. Pure function: advances
 * heading, forward speed and lateral slip for `dt`.
 *
 * Steering authority scales with speed (you can't turn while parked). Cornering
 * hard — or pulling the handbrake — overwhelms the tyres' lateral grip, so the
 * car slides outward (slip) and rotates faster, giving a satisfying drift that
 * recovers as grip catches the slide. Heavier cars resist sliding more.
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
  if (state.slip === undefined) state.slip = 0
  const topSpeed = def.topSpeed * speedMult
  const maxReverse = topSpeed * REVERSE_FRACTION
  const effectiveAccel = (def.accel * speedMult) / Math.max(0.5, def.weight)

  if (input.throttle !== 0) {
    const opposing = Math.sign(input.throttle) !== Math.sign(state.speed) && state.speed !== 0
    const power = opposing ? effectiveAccel * BRAKE : effectiveAccel
    state.speed += input.throttle * power * dt
  } else {
    state.speed -= state.speed * DRAG * dt
    if (Math.abs(state.speed) < 0.05) state.speed = 0
  }
  state.speed = clamp(state.speed, -maxReverse, topSpeed)

  // Steering authority ramps up with speed; handbrake sharpens rotation.
  const speedFactor = clamp(state.speed / (topSpeed * 0.45), -1, 1)
  const handbrake = !!input.handbrake
  const steerAuthority = def.handling * (handbrake ? 1.7 : 1)
  state.heading += input.steer * steerAuthority * speedFactor * dt

  // Lateral grip: cornering builds slip, tyres claw it back. The handbrake
  // breaks grip for big, controllable, smoothly-recovering drifts. Heavier
  // cars resist sliding a little more.
  const grip = handbrake ? 2.2 : 6.5 + Math.min(2, def.weight)
  const induce = state.speed * input.steer * (handbrake ? 1.0 : 0.22)
  state.slip += induce * dt * 3.2
  state.slip -= state.slip * grip * dt
  const maxSlip = topSpeed * (handbrake ? 0.8 : 0.4)
  state.slip = clamp(state.slip, -maxSlip, maxSlip)

  // Drifting scrubs a little forward speed, like real tyres.
  state.speed -= Math.abs(state.slip) * 0.05 * dt

  // Forward = (sin h, cos h); right (lateral) = (cos h, -sin h).
  const fx = Math.sin(state.heading)
  const fz = Math.cos(state.heading)
  const dx = (fx * state.speed + fz * state.slip) * dt
  const dz = (fz * state.speed - fx * state.slip) * dt
  return { dx, dz }
}
