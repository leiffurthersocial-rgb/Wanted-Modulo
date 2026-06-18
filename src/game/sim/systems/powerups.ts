import { SCORE } from '@/config/constants'
import { sampleHeight } from '@/game/world/terrain'
import type { SimState } from '@/game/sim/state'
import { spawnExplosion } from './particles'

/** Effect tuning. */
export const POWER = {
  pickupRadius: 3.6,
  nitroDuration: 3.6,
  nitroMult: 1.55,
  shieldDuration: 6,
  empRadius: 24,
  bannerTime: 2.4,
} as const

/**
 * Powerup pickups: collect-on-touch, then apply a clearly distinct effect —
 * NITRO (speed boost), REPAIR (instant fix), SHIELD (temporary invulnerability)
 * or EMP (wipe nearby police). Active timers decay here; their effects are read
 * by the driving, capture and damage systems.
 */
export function updatePowerups(state: SimState, dt: number): void {
  const p = state.player
  if (state.power.boost > 0) state.power.boost = Math.max(0, state.power.boost - dt)
  if (state.power.shield > 0) state.power.shield = Math.max(0, state.power.shield - dt)
  if (state.power.banner > 0) state.power.banner = Math.max(0, state.power.banner - dt)

  const r2 = POWER.pickupRadius * POWER.pickupRadius
  for (const item of state.powerups) {
    if (!item.alive) continue
    const dx = item.x - p.pos.x
    const dz = item.z - p.pos.z
    if (dx * dx + dz * dz > r2) continue
    item.alive = false
    state.pickups++
    state.power.lastKind = item.type
    state.power.banner = POWER.bannerTime
    applyEffect(state, item.type)
  }
}

function applyEffect(state: SimState, type: 'nitro' | 'repair' | 'shield' | 'emp'): void {
  const p = state.player
  switch (type) {
    case 'nitro':
      state.power.boost = POWER.nitroDuration
      break
    case 'shield':
      state.power.shield = POWER.shieldDuration
      break
    case 'repair':
      if (p.mode === 'vehicle') {
        const v = state.vehicles[p.vehicleIndex]
        v.health = v.def.durability
        v.wrecked = false
      }
      break
    case 'emp': {
      const r2 = POWER.empRadius * POWER.empRadius
      for (const u of state.police) {
        if (!u.active) continue
        const dx = u.pos.x - p.pos.x
        const dz = u.pos.z - p.pos.z
        if (dx * dx + dz * dz > r2) continue
        u.active = false
        spawnExplosion(state, u.pos.x, sampleHeight(u.pos.x, u.pos.z) + 0.6, u.pos.z)
        state.score.cops++
        state.score.value += SCORE.copDestroyed
      }
      state.explosions++
      break
    }
  }
}
