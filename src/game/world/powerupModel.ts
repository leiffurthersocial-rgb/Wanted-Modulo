import { CITY_PITCH } from '@/config/constants'
import { buildingAtCell, mulberry32, worldToCell } from './cityModel'
import { isWater } from './terrain'

export type PowerupType = 'nitro' | 'repair' | 'shield' | 'emp'
export const POWERUP_TYPES: PowerupType[] = ['nitro', 'repair', 'shield', 'emp']

export interface Powerup {
  type: PowerupType
  x: number
  z: number
  /** Cleared to false when collected (renderer hides it). */
  alive: boolean
}

export interface PowerupModel {
  items: Powerup[]
}

/** Radius of the streaming powerup window around the player. */
export const POWERUP_WINDOW = 150
const SPACING = 48
const DENSITY = 0.14
const RECENTER = CITY_PITCH

let current: PowerupModel = { items: [] }
let centerX = Infinity
let centerZ = Infinity
let version = 0

export function powerupVersion(): number {
  return version
}
export function getPowerups(): PowerupModel {
  return current
}

function insideBuilding(x: number, z: number): boolean {
  const ci = worldToCell(x)
  const cj = worldToCell(z)
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const b = buildingAtCell(ci + di, cj + dj)
      if (!b) continue
      if (Math.abs(x - b.x) <= b.w / 2 + 1 && Math.abs(z - b.z) <= b.d / 2 + 1) return true
    }
  }
  return false
}

/**
 * Regenerates the powerup window around the player when they've moved a cell.
 * Deterministic per world position so layout is stable. Returns true on regen.
 */
export function ensurePowerupWindow(px: number, pz: number): boolean {
  if (Math.abs(px - centerX) < RECENTER && Math.abs(pz - centerZ) < RECENTER) return false
  centerX = px
  centerZ = pz

  const items: Powerup[] = []
  const r2 = POWERUP_WINDOW * POWERUP_WINDOW
  const startX = Math.floor((px - POWERUP_WINDOW) / SPACING) * SPACING
  const startZ = Math.floor((pz - POWERUP_WINDOW) / SPACING) * SPACING
  for (let x = startX; x <= px + POWERUP_WINDOW; x += SPACING) {
    for (let z = startZ; z <= pz + POWERUP_WINDOW; z += SPACING) {
      const dx = x - px
      const dz = z - pz
      if (dx * dx + dz * dz > r2) continue
      if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue
      const rand = mulberry32(((x * 40503671) ^ (z * 73856093)) | 0)
      if (rand() > DENSITY) continue
      const jx = x + (rand() - 0.5) * SPACING * 0.5
      const jz = z + (rand() - 0.5) * SPACING * 0.5
      if (isWater(jx, jz) || insideBuilding(jx, jz)) continue
      const type = POWERUP_TYPES[(rand() * POWERUP_TYPES.length) | 0]
      items.push({ type, x: jx, z: jz, alive: true })
    }
  }

  current = { items }
  version++
  return true
}
