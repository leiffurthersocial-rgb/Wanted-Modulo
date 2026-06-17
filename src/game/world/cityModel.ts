import { CITY, CITY_PITCH } from '@/config/constants'

export const BUILDING_PALETTE = [
  '#3a4763',
  '#46506b',
  '#2f3a52',
  '#54607f',
  '#3d4a5f',
  '#5a6886',
]

export interface Building {
  x: number
  z: number
  /** Footprint width (X) and depth (Z). */
  w: number
  d: number
  h: number
  colorIndex: number
}

export interface CityModel {
  buildings: Building[]
  /** Occupied block cells, keyed `i * cols + j`, for line-of-sight checks. */
  occupied: Set<number>
  cols: number
  half: number
  pitch: number
  /** Half-extent of the ground plane / world bounds. */
  worldHalf: number
  groundSize: number
}

/** Deterministic PRNG so the world is stable for a given seed. */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let cached: CityModel | null = null

/**
 * Generates (and caches) the voxel city layout. The same model feeds the
 * renderer (City.tsx), collision, and AI line-of-sight, guaranteeing they all
 * agree on where the buildings are.
 */
export function getCity(seed = 1337): CityModel {
  if (cached) return cached

  const rand = mulberry32(seed)
  const n = CITY.blocks
  const half = (n - 1) / 2
  const buildings: Building[] = []
  const occupied = new Set<number>()

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i - half) * CITY_PITCH
      const z = (j - half) * CITY_PITCH
      // Keep the spawn area (3x3 central cells) open.
      if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue
      if (rand() < 0.12) continue // empty lot / park

      const footprint = CITY.blockSize * (0.7 + rand() * 0.28)
      const h = 4 + rand() * rand() * 34
      buildings.push({
        x,
        z,
        w: footprint,
        d: footprint,
        h,
        colorIndex: (rand() * BUILDING_PALETTE.length) | 0,
      })
      occupied.add(i * n + j)
    }
  }

  const worldHalf = (n * CITY_PITCH) / 2 + CITY_PITCH
  cached = {
    buildings,
    occupied,
    cols: n,
    half,
    pitch: CITY_PITCH,
    worldHalf,
    groundSize: n * CITY_PITCH + CITY_PITCH * 2,
  }
  return cached
}

/** World position -> block cell index component. */
export function worldToCell(v: number, half: number, pitch: number): number {
  return Math.round(v / pitch + half)
}
