import { MINES } from '@/config/constants'
import { sampleHeight } from '@/game/world/terrain'
import type { Mine, SimState } from '@/game/sim/state'
import { getDebug } from '@/state/useDebugStore'
import { damageWorldVehicle } from './destruction'
import { spawnExplosion } from './particles'

function inactiveMine(state: SimState): Mine | null {
  for (const m of state.mines) if (!m.active) return m
  return null
}

/** Detonates a bomb: fireball + a falloff blast to the player's car. */
function detonate(state: SimState, m: Mine): void {
  m.active = false
  const gy = sampleHeight(m.pos.x, m.pos.z)
  spawnExplosion(state, m.pos.x, gy + 0.6, m.pos.z)
  state.shake = Math.min(1, state.shake + 0.6)
  if (state.player.mode === 'vehicle') {
    const pv = state.vehicles[state.player.vehicleIndex]
    const d = Math.hypot(pv.pos.x - m.pos.x, pv.pos.z - m.pos.z)
    if (d < MINES.blastRadius) {
      const falloff = 1 - d / MINES.blastRadius
      damageWorldVehicle(state, pv, MINES.damage * falloff)
      pv.squash = Math.max(pv.squash, 0.22)
    }
  }
}

/**
 * Police ground bombs (survive mode only). While actively pursuing, a unit
 * behind the player periodically drops a bomb on the road; it arms after a
 * short delay, blinks, then detonates when the player drives over it (or after
 * its fuse runs out), damaging the car.
 */
export function updateMines(state: SimState, dt: number, level: number): void {
  const p = state.player

  // --- Drop new bombs while pursued (throttled, heat-gated) ---
  const debug = getDebug()
  const suppressed = debug.enabled && debug.noPolice
  state.mineTimer -= dt
  if (
    !suppressed &&
    level >= MINES.minHeat &&
    state.heat.spotted &&
    p.mode === 'vehicle' &&
    state.mineTimer <= 0
  ) {
    state.mineTimer = MINES.dropInterval
    // Find a pursuing unit that's behind/near the player to drop from.
    let dropper = null as (typeof state.police)[number] | null
    for (const u of state.police) {
      if (!u.active) continue
      const d = u.pos.distanceTo(p.pos)
      if (d < 26 && d > 4) {
        dropper = u
        break
      }
    }
    const m = inactiveMine(state)
    if (dropper && m) {
      m.active = true
      m.pos.set(dropper.pos.x, 0, dropper.pos.z)
      m.arm = MINES.armTime
      m.life = MINES.life
      m.blink = 0
    }
  }

  // --- Update live bombs ---
  for (const m of state.mines) {
    if (!m.active) continue
    m.blink += dt
    if (m.arm > 0) {
      m.arm = Math.max(0, m.arm - dt)
      continue
    }
    m.life -= dt
    if (m.life <= 0) {
      detonate(state, m)
      continue
    }
    if (p.mode === 'vehicle') {
      const d = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
      if (d < MINES.triggerRadius) detonate(state, m)
    }
  }
}
