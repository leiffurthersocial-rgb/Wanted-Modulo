import { DAMAGE, PROPS, SCORE } from '@/config/constants'
import { PROP_TYPES } from '@/game/world/propCatalog'
import type { SimState, VehicleEntity } from '@/game/sim/state'
import { damageTier } from '@/game/sim/state'
import { emitFire, emitSmoke, spawnDebris, spawnExplosion } from './particles'

/** Applies damage to a world/player vehicle, handling wreck + explosion. */
export function damageWorldVehicle(state: SimState, v: VehicleEntity, amount: number): void {
  if (v.wrecked || amount <= 0) return
  v.health -= amount
  if (v.health <= 0) {
    v.health = 0
    v.wrecked = true
    v.state.speed = 0
    spawnExplosion(state, v.pos.x, v.pos.y + 0.6, v.pos.z)
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

/** Player plows through destructible props, spawning debris. */
export function updatePropCollisions(state: SimState, _dt: number): void {
  const { player } = state
  if (player.mode !== 'vehicle') return
  const v = state.vehicles[player.vehicleIndex]
  if (v.wrecked) return
  const speed = Math.abs(v.state.speed)
  if (speed < PROPS.smashSpeed) return

  const carR = v.def.size.width * 0.6
  for (const prop of state.props) {
    if (!prop.alive) continue
    const tdef = PROP_TYPES[prop.type]
    const r = tdef.radius + carR
    const dx = prop.x - player.pos.x
    const dz = prop.z - player.pos.z
    if (dx * dx + dz * dz > r * r) continue

    prop.alive = false
    state.hideQueue.push({ type: prop.type, index: prop.typeIndex })
    spawnDebris(state, prop.x, 0.4, prop.z, tdef.debrisColor, tdef.debrisCount)
    // Heavier vehicles barely slow; light ones lose more speed.
    v.state.speed *= 1 - Math.min(0.5, PROPS.smashDrag / (v.def.weight * 40))
    state.score.value += SCORE.propDestroyed
  }
}

/** Smoke/fire emission, fire damage drain, and tier-driven visuals. */
export function updateVehicleDamage(state: SimState, dt: number): void {
  for (const v of state.vehicles) {
    const tier = damageTier(v.health, v.def.durability)
    const topY = v.pos.y + v.def.size.height * 0.7

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
        emitFire(state, v.pos.x, v.pos.y + 0.5, v.pos.z)
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
