import { buildingAtCell, worldToCell, type Building } from '@/game/world/cityModel'

/**
 * Spatial queries against the INFINITE city. Buildings are generated on demand
 * per grid cell (no global array), so line-of-sight and collision work the same
 * however far the player travels.
 */
function buildingAt(x: number, z: number): Building | null {
  return buildingAtCell(worldToCell(x), worldToCell(z))
}

function pointInBuilding(x: number, z: number): boolean {
  const b = buildingAt(x, z)
  if (!b) return false
  return Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2
}

/** True if a building blocks the straight line between two points. */
export function losBlocked(ax: number, az: number, bx: number, bz: number): boolean {
  const dx = bx - ax
  const dz = bz - az
  const dist = Math.hypot(dx, dz)
  const steps = Math.max(1, Math.floor(dist / 3))
  for (let s = 1; s < steps; s++) {
    const t = s / steps
    if (pointInBuilding(ax + dx * t, az + dz * t)) return true
  }
  return false
}

export interface CollisionResult {
  hit: boolean
  nx: number
  nz: number
  depth: number
}

const noHit: CollisionResult = { hit: false, nx: 0, nz: 0, depth: 0 }

/**
 * Circle-vs-building collision against the buildings in the point's cell and
 * its 8 neighbours. Returns the push-out normal and penetration depth so the
 * caller can separate the entity and kill inbound velocity.
 */
export function buildingCollision(x: number, z: number, radius: number): CollisionResult {
  const ci = worldToCell(x)
  const cj = worldToCell(z)
  let result = noHit
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const b = buildingAtCell(ci + di, cj + dj)
      if (!b) continue
      const hw = b.w / 2
      const hd = b.d / 2
      const closestX = Math.max(b.x - hw, Math.min(x, b.x + hw))
      const closestZ = Math.max(b.z - hd, Math.min(z, b.z + hd))
      const dx = x - closestX
      const dz = z - closestZ
      const d2 = dx * dx + dz * dz
      if (d2 >= radius * radius) continue
      const d = Math.sqrt(d2) || 0.0001
      const depth = radius - d
      if (depth > result.depth) {
        result = { hit: true, nx: dx / d, nz: dz / d, depth }
      }
    }
  }
  return result
}
