import { HEAT } from '@/config/constants'
import { clamp } from '@/core/math/angles'
import type { SimState } from '@/game/sim/state'
import { tierFor } from '@/game/sim/heatTable'
import { getDebug } from '@/state/useDebugStore'

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

  // Debug: pin heat to a fixed level instead of escalating/decaying.
  const debug = getDebug()
  if (debug.enabled && debug.freezeHeat) {
    heat.floor = debug.forceHeat
    heat.progress = clamp(debug.forceHeat, 0, 10)
    return
  }

  heat.floor = Math.min(10, state.acc.time / HEAT.floorTimePerLevel)

  const tier = tierFor(Math.floor(heat.progress))
  if (heat.spotted) {
    // Being seen raises heat; fleeing fast (loud, conspicuous) raises it faster.
    const speedRise = HEAT.spottedSpeedRise * state.playerSpeed
    heat.progress += (HEAT.spottedRise + speedRise) * (0.7 + tier.aggression) * dt
  } else if (heat.timeSinceSpotted > HEAT.lostGrace) {
    heat.progress -= HEAT.hiddenDecay * dt
  }

  heat.progress = clamp(Math.max(heat.progress, heat.floor), 0, 10)
}

/** Integer heat level used for tier lookups and the HUD. */
export function heatLevel(state: SimState): number {
  return Math.floor(state.heat.progress)
}
