import { HEAT } from '@/config/constants'
import { clamp } from '@/core/math/angles'
import type { SimState } from '@/game/sim/state'
import { tierFor } from '@/game/sim/heatTable'

/**
 * Integrates the continuous heat value (GDD §3).
 *
 * - A rising "floor" derived from survival time guarantees escalation, so every
 *   run eventually ends.
 * - Being spotted pushes heat up faster (scaled by tier aggression).
 * - Successful hiding lets heat decay — but never below the floor.
 */
export function updateHeat(state: SimState, dt: number): void {
  const heat = state.heat
  heat.floor = Math.min(10, state.acc.time / HEAT.floorTimePerLevel)

  const tier = tierFor(Math.floor(heat.progress))
  if (heat.spotted) {
    heat.progress += HEAT.spottedRise * (0.7 + tier.aggression) * dt
  } else if (heat.timeSinceSpotted > HEAT.lostGrace) {
    heat.progress -= HEAT.hiddenDecay * dt
  }

  heat.progress = clamp(Math.max(heat.progress, heat.floor), 0, 10)
}

/** Integer heat level used for tier lookups and the HUD. */
export function heatLevel(state: SimState): number {
  return Math.floor(state.heat.progress)
}
