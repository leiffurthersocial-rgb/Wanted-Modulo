import { SCORE } from '@/config/constants'
import { sampleHeight } from '@/game/world/terrain'
import type { SimState } from '@/game/sim/state'
import { getDebug } from '@/state/useDebugStore'
import { spawnExplosion } from './particles'

/** Last serviced values of the debug one-shot action counters. */
const lastPing = { repair: 0, teleport: 0, shield: 0, nitro: 0, emp: 0 }

/**
 * Snapshots the current debug action counters as "already serviced" so that
 * persisted counters from a previous session don't fire on a fresh run. Called
 * by createSimState at the start of every run.
 */
export function resetDebugActionPings(): void {
  const d = getDebug()
  lastPing.repair = d.repairPing
  lastPing.teleport = d.teleportPing
  lastPing.shield = d.grantShieldPing
  lastPing.nitro = d.grantNitroPing
  lastPing.emp = d.empPing
}

/** Effect tuning. */
export const POWER = {
  pickupRadius: 3.6,
  nitroDuration: 3.6,
  nitroMult: 1.55,
  shieldDuration: 6,
  empRadius: 24,
  /** Cloak: invisible to police (lose all line-of-sight) for this long. */
  cloakDuration: 6.5,
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

  // --- Debug overrides ---
  const debug = getDebug()
  if (debug.enabled) {
    if (debug.infiniteNitro) state.power.boost = Math.max(state.power.boost, POWER.nitroDuration)

    // One-shot actions: fire when the counter advances (ignore reset-to-zero).
    if (debug.repairPing > lastPing.repair) {
      if (p.mode === 'vehicle') {
        const v = state.vehicles[p.vehicleIndex]
        v.health = v.def.durability
        v.wrecked = false
      }
    }
    if (debug.teleportPing > lastPing.teleport) {
      p.pos.set(0, 0, 0)
      if (p.mode === 'vehicle') {
        const v = state.vehicles[p.vehicleIndex]
        v.pos.set(0, 0, 0)
        v.y = 0
        v.vy = 0
        v.state.speed = 0
        v.state.slip = 0
      }
    }
    if (debug.grantShieldPing > lastPing.shield) applyEffect(state, 'shield')
    if (debug.grantNitroPing > lastPing.nitro) applyEffect(state, 'nitro')
    if (debug.empPing > lastPing.emp) applyEffect(state, 'emp')

    lastPing.repair = debug.repairPing
    lastPing.teleport = debug.teleportPing
    lastPing.shield = debug.grantShieldPing
    lastPing.nitro = debug.grantNitroPing
    lastPing.emp = debug.empPing
  }

  if (state.power.boost > 0) state.power.boost = Math.max(0, state.power.boost - dt)
  if (state.power.shield > 0) state.power.shield = Math.max(0, state.power.shield - dt)
  if (state.power.cloak > 0) state.power.cloak = Math.max(0, state.power.cloak - dt)
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

function applyEffect(state: SimState, type: 'nitro' | 'repair' | 'shield' | 'emp' | 'cloak'): void {
  const p = state.player
  switch (type) {
    case 'nitro':
      state.power.boost = POWER.nitroDuration
      break
    case 'shield':
      state.power.shield = POWER.shieldDuration
      break
    case 'cloak':
      state.power.cloak = POWER.cloakDuration
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
