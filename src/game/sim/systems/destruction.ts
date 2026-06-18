import { DAMAGE, PROPS, SCORE, VEHICLE } from '@/config/constants'
import { PROP_TYPES } from '@/game/world/propCatalog'
import { sampleHeight } from '@/game/world/terrain'
import type { SimState, VehicleEntity } from '@/game/sim/state'
import { damageTier } from '@/game/sim/state'
import { getDebug } from '@/state/useDebugStore'
import { emitFire, emitSmoke, spawnDebris, spawnExplosion } from './particles'

/** True when the given vehicle is the one the player is currently driving. */
function isPlayerVehicle(state: SimState, v: VehicleEntity): boolean {
  return state.player.mode === 'vehicle' && state.vehicles[state.player.vehicleIndex] === v
}

/** Applies damage to a world/player vehicle, handling wreck + explosion. */
export function damageWorldVehicle(state: SimState, v: VehicleEntity, amount: number): void {
  if (v.wrecked || amount <= 0) return
  // SHIELD powerup (or the debug invincibility flag) makes the player's current
  // vehicle invulnerable.
  if (isPlayerVehicle(state, v)) {
    const debug = getDebug()
    if (state.power.shield > 0 || (debug.enabled && debug.invincible)) return
  }
  v.health -= amount
  if (v.health <= 0) {
    v.health = 0
    v.wrecked = true
    v.state.speed = 0
    spawnExplosion(state, v.pos.x, sampleHeight(v.pos.x, v.pos.z) + 0.6, v.pos.z)
  }
}

/** Moves the player out of a vehicle to its left side. */
export function ejectPlayer(state: SimState, v: VehicleEntity): void {
  const lx = Math.cos(v.state.heading)
  const lz = -Math.sin(v.state.heading)
  v.occupied = false
  state.player.pos.set(
    v.pos.x + lx * (v.def.size.width + 1),
    0,
    v.pos.z + lz * (v.def.size.width + 1),
  )
  state.player.mode = 'foot'
  state.player.vehicleIndex = -1
}

/** Player plows through destructible props (and launches off ramps). */
export function updatePropCollisions(state: SimState, _dt: number): void {
  const { player } = state
  if (player.mode !== 'vehicle') return
  const v = state.vehicles[player.vehicleIndex]
  if (v.wrecked) return
  const speed = Math.abs(v.state.speed)

  const carR = v.def.size.width * 0.6
  for (const prop of state.props) {
    const tdef = PROP_TYPES[prop.type]
    const r = tdef.radius + carR
    const dx = prop.x - player.pos.x
    const dz = prop.z - player.pos.z
    if (dx * dx + dz * dz > r * r) continue

    // Ramps fling the car upward (gravity floats it back down) — no destruction.
    if (tdef.launch) {
      const grounded = v.y <= sampleHeight(v.pos.x, v.pos.z) + 0.4
      if (grounded && speed > PROPS.smashSpeed) {
        const debug = getDebug()
        const jumpMult = debug.enabled ? debug.jumpMult : 1
        v.vy = VEHICLE.rampLaunch * jumpMult * (0.7 + Math.min(0.6, speed / v.def.topSpeed))
        v.state.speed = Math.min(v.def.topSpeed, v.state.speed * 1.06 + 1.5)
      }
      continue
    }

    if (!prop.alive || tdef.indestructible) continue
    if (speed < PROPS.smashSpeed) continue

    prop.alive = false
    state.hideQueue.push({ type: prop.type, index: prop.typeIndex })
    spawnDebris(state, prop.x, sampleHeight(prop.x, prop.z) + 0.4, prop.z, tdef.debrisColor, tdef.debrisCount)
    // Heavier vehicles barely slow; light ones lose more speed.
    v.state.speed *= 1 - Math.min(0.5, PROPS.smashDrag / (v.def.weight * 40))
    state.score.value += SCORE.propDestroyed
  }
}

/** Smoke/fire emission, fire damage drain, and tier-driven visuals. */
export function updateVehicleDamage(state: SimState, dt: number): void {
  for (const v of state.vehicles) {
    const tier = damageTier(v.health, v.def.durability)
    const baseY = sampleHeight(v.pos.x, v.pos.z)
    const topY = baseY + v.def.size.height * 0.7

    if (tier === 'smoking') {
      v.smokeTimer -= dt
      if (v.smokeTimer <= 0) {
        v.smokeTimer = 0.14
        emitSmoke(state, v.pos.x, topY, v.pos.z)
      }
    } else if (tier === 'onfire') {
      v.smokeTimer -= dt
      if (v.smokeTimer <= 0) {
        v.smokeTimer = 0.07
        emitFire(state, v.pos.x, baseY + 0.5, v.pos.z)
        emitSmoke(state, v.pos.x, topY, v.pos.z)
      }
      damageWorldVehicle(state, v, DAMAGE.fireDps * dt)
    } else if (tier === 'wreck') {
      v.smokeTimer -= dt
      if (v.smokeTimer <= 0) {
        v.smokeTimer = 0.3
        emitSmoke(state, v.pos.x, topY, v.pos.z)
      }
    }

    // Decay the impact squash.
    if (v.squash > 0) v.squash = Math.max(0, v.squash - dt * 0.9)
  }
}
