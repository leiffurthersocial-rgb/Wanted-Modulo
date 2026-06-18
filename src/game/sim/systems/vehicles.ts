import { buildingCollision } from '@/game/sim/los'
import { isWater } from '@/game/world/terrain'
import type { SimState } from '@/game/sim/state'

/** Beyond this distance an idle civilian car is eligible to be recycled. */
const FAR = 240
/** Recycled cars are parked in a ring around the player at this radius. */
const PARK_RADIUS = 130
/** Keep at most one recycle per N steps so it's cheap and unobtrusive. */
const COOLDOWN = 0.4

let timer = 0

/**
 * Because the world is infinite, the fixed pool of stealable cars is recycled
 * toward the player: a parked, undamaged car that has fallen far behind is
 * teleported to a fresh roadside spot near the player. The player is therefore
 * never stranded, no matter how far they drive. Skips the car currently driven.
 */
export function recycleVehicles(state: SimState): void {
  timer -= 1 / 60
  if (timer > 0) return
  timer = COOLDOWN

  const p = state.player.pos
  for (let i = 0; i < state.vehicles.length; i++) {
    if (i === state.player.vehicleIndex) continue
    const v = state.vehicles[i]
    if (v.occupied || v.wrecked) continue
    if (v.pos.distanceTo(p) < FAR) continue

    for (let k = 0; k < 8; k++) {
      const a = state.rand() * Math.PI * 2
      const x = p.x + Math.cos(a) * PARK_RADIUS
      const z = p.z + Math.sin(a) * PARK_RADIUS
      if (isWater(x, z) || buildingCollision(x, z, 3).hit) continue
      v.pos.set(x, 0, z)
      v.state.heading = state.rand() * Math.PI * 2
      v.state.speed = 0
      v.state.slip = 0
      v.health = v.def.durability
      break
    }
    return // one per tick
  }
}
