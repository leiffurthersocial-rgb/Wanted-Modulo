import { CITY_PITCH } from '@/config/constants'
import { riverFactor, sampleHeight, urbanization } from './terrain'

export type District = 'downtown' | 'midtown' | 'residential' | 'industrial' | 'park'

// Modern, brightly-lit voxel palette — clean saturated blocks with a touch of
// variety per district so the skyline reads as a real, stylized toy city.
export const DISTRICT_PALETTE: Record<District, string[]> = {
  downtown: ['#6ea8ff', '#8ec3ff', '#5b93f0', '#a9d2ff', '#7e6cf0'],
  midtown: ['#ffc05a', '#ffd27a', '#f6a96a', '#ffe08a', '#f59e5a'],
  residential: ['#ff8fa3', '#8fe0b0', '#ffd680', '#9ec9ff', '#e79bd0'],
  industrial: ['#b6bcc8', '#a4abba', '#c6ccd6', '#949bac', '#d2d8e2'],
  park: ['#79d07a', '#8bd98a', '#6fc06f'],
}

export const ALL_COLORS: string[] = [
  ...DISTRICT_PALETTE.downtown,
  ...DISTRICT_PALETTE.midtown,
  ...DISTRICT_PALETTE.residential,
  ...DISTRICT_PALETTE.industrial,
  ...DISTRICT_PALETTE.park,
]
const DISTRICT_OFFSET: Record<District, number> = {
  downtown: 0,
  midtown: 5,
  residential: 10,
  industrial: 15,
  park: 20,
}

export interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
  /** Terrain height the building sits on. */
  baseY: number
  colorIndex: number
  district: District
}

export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WORLD_SEED = 1337

/** Deterministic per-cell pseudo-random in [0,1). Stable for any grid cell. */
function cellRand(i: number, j: number, salt: number): number {
  let h = (i * 374761393 + j * 668265263 + (salt + WORLD_SEED) * 2654435761) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function classify(u: number): District {
  if (u > 0.64) return 'downtown'
  if (u > 0.5) return 'midtown'
  if (u > 0.38) return 'residential'
  return 'industrial'
}

/** How likely an eligible cell actually holds a building — keeps the city airy
 *  and modern rather than a dense wall of boxes (design pillar: breathing room). */
const DISTRICT_FILL: Record<District, number> = {
  downtown: 0.74,
  midtown: 0.58,
  residential: 0.46,
  industrial: 0.6,
  park: 0,
}

/**
 * The heart of the infinite world: returns the building occupying grid cell
 * (i, j), or null if that cell is open ground / road / water / park. Pure and
 * deterministic — no global arrays — so the renderer, collision, AI and props
 * all derive the identical city wherever the player roams.
 */
export function buildingAtCell(i: number, j: number): Building | null {
  // Keep the spawn plaza clear.
  if (Math.abs(i) <= 1 && Math.abs(j) <= 1) return null

  const x = i * CITY_PITCH
  const z = j * CITY_PITCH

  // No buildings in/near rivers — banks stay open for bridges & beaches.
  if (riverFactor(x, z) > 0.18) return null

  const u = urbanization(x, z)
  if (u < 0.34) return null // open countryside

  const district = classify(u)
  // Thin the grid so streets and plazas breathe.
  if (cellRand(i, j, 1) > DISTRICT_FILL[district]) return null

  let footprint: number
  let h: number
  const r = cellRand(i, j, 2)
  if (district === 'downtown') {
    footprint = CITY_PITCH * (0.44 + r * 0.16)
    h = 16 + (u - 0.64) * 95 + r * r * 26
  } else if (district === 'midtown') {
    footprint = CITY_PITCH * (0.42 + r * 0.16)
    h = 9 + r * r * 20
  } else if (district === 'residential') {
    footprint = CITY_PITCH * (0.32 + r * 0.14)
    h = 4 + r * 6
  } else {
    footprint = CITY_PITCH * (0.5 + r * 0.12)
    h = 5 + r * 9
  }

  const palette = DISTRICT_PALETTE[district]
  const colorIndex = DISTRICT_OFFSET[district] + ((cellRand(i, j, 3) * palette.length) | 0)
  return { x, z, w: footprint, d: footprint, h, baseY: sampleHeight(x, z), colorIndex, district }
}

/** World coordinate -> nearest grid cell index. */
export function worldToCell(v: number): number {
  return Math.round(v / CITY_PITCH)
}

/**
 * Collects every building within `radius` world units of a center point. Used
 * by the streaming renderer and by one-shot scatters (vehicles). Cheap enough
 * to call when the player crosses a chunk boundary.
 */
export function streamBuildings(cx: number, cz: number, radius: number): Building[] {
  const out: Building[] = []
  const cells = Math.ceil(radius / CITY_PITCH) + 1
  const ci = worldToCell(cx)
  const cj = worldToCell(cz)
  const r2 = radius * radius
  for (let di = -cells; di <= cells; di++) {
    for (let dj = -cells; dj <= cells; dj++) {
      const b = buildingAtCell(ci + di, cj + dj)
      if (!b) continue
      const ddx = b.x - cx
      const ddz = b.z - cz
      if (ddx * ddx + ddz * ddz <= r2) out.push(b)
    }
  }
  return out
}
