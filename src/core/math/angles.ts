/** Angle/interpolation helpers used by the simulation. */

export const TAU = Math.PI * 2

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  a = ((a + Math.PI) % TAU + TAU) % TAU
  return a - Math.PI
}

/** Shortest signed difference from a to b. */
export function angleDelta(a: number, b: number): number {
  return wrapAngle(b - a)
}

/**
 * Frame-rate independent angular lerp toward a target.
 * `rate` is an approximate "per second" responsiveness.
 */
export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.exp(-rate * dt)
  return current + angleDelta(current, target) * t
}

/** Frame-rate independent scalar damp. */
export function damp(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.exp(-rate * dt)
  return current + (target - current) * t
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
