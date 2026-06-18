import { mulberry32 } from './cityModel'
import { isWater } from './terrain'

export type LandmarkType = 'tower' | 'obelisk' | 'dome'

export interface Landmark {
  type: LandmarkType
  x: number
  z: number
  rot: number
  /** Solid core radius for collision. */
  radius: number
}

/** Coarse lattice the landmarks sit on. */
const LM_GRID = 300
/** Probability a lattice cell hosts a landmark. */
const LM_P = 0.42
const SPAWN_CLEAR = 80

const CORE: Record<LandmarkType, number> = { tower: 3.4, obelisk: 2.8, dome: 11 }
const TYPES: LandmarkType[] = ['tower', 'obelisk', 'dome']

/** Deterministic landmark for lattice cell (i,j), or null. */
function landmarkAtCell(i: number, j: number): Landmark | null {
  const rand = mulberry32(((i * 73856093) ^ (j * 19349663) ^ 0x9e37) | 0)
  if (rand() > LM_P) return null
  // Jitter within the cell so they don't form an obvious grid.
  const x = i * LM_GRID + (rand() - 0.5) * LM_GRID * 0.6
  const z = j * LM_GRID + (rand() - 0.5) * LM_GRID * 0.6
  if (Math.abs(x) < SPAWN_CLEAR && Math.abs(z) < SPAWN_CLEAR) return null
  if (isWater(x, z)) return null
  const type = TYPES[(rand() * TYPES.length) | 0]
  return { type, x, z, rot: rand() * Math.PI * 2, radius: CORE[type] }
}

/** Lattice cell the player occupies (for re-stream throttling). */
export function landmarkCell(x: number, z: number): { i: number; j: number } {
  return { i: Math.round(x / LM_GRID), j: Math.round(z / LM_GRID) }
}

/** All landmarks within `radius` of a center point. */
export function streamLandmarks(cx: number, cz: number, radius: number): Landmark[] {
  const out: Landmark[] = []
  const cells = Math.ceil(radius / LM_GRID) + 1
  const ci = Math.round(cx / LM_GRID)
  const cj = Math.round(cz / LM_GRID)
  const r2 = radius * radius
  for (let di = -cells; di <= cells; di++) {
    for (let dj = -cells; dj <= cells; dj++) {
      const lm = landmarkAtCell(ci + di, cj + dj)
      if (!lm) continue
      const dx = lm.x - cx
      const dz = lm.z - cz
      if (dx * dx + dz * dz <= r2) out.push(lm)
    }
  }
  return out
}

export interface LMCollision {
  hit: boolean
  nx: number
  nz: number
  depth: number
}

/** Circle-vs-landmark-core collision near (x,z). */
export function landmarkCollision(x: number, z: number, radius: number): LMCollision {
  const ci = Math.round(x / LM_GRID)
  const cj = Math.round(z / LM_GRID)
  let best: LMCollision = { hit: false, nx: 0, nz: 0, depth: 0 }
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const lm = landmarkAtCell(ci + di, cj + dj)
      if (!lm) continue
      const dx = x - lm.x
      const dz = z - lm.z
      const sum = radius + lm.radius
      const d2 = dx * dx + dz * dz
      if (d2 >= sum * sum) continue
      const d = Math.sqrt(d2) || 0.0001
      const depth = sum - d
      if (depth > best.depth) best = { hit: true, nx: dx / d, nz: dz / d, depth }
    }
  }
  return best
}
