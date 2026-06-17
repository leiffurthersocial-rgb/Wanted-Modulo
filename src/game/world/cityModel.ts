import { CITY, CITY_PITCH } from '@/config/constants'

export type District = 'downtown' | 'midtown' | 'residential' | 'industrial'

export const DISTRICT_PALETTE: Record<District, string[]> = {
  downtown: ['#2b3a5c', '#34406b', '#3a4f7a', '#2f3e63', '#3d5688'],
  midtown: ['#3a4763', '#46506b', '#54607f', '#4a5570', '#3d4a5f'],
  residential: ['#6b5a4a', '#7a6450', '#5f5347', '#806a52', '#8a7a5a'],
  industrial: ['#3a4048', '#454b4f', '#2f343a', '#52504a', '#5a4a3a'],
}

/** Flat list of every palette colour, with an offset per district for indexing. */
export const ALL_COLORS: string[] = [
  ...DISTRICT_PALETTE.downtown,
  ...DISTRICT_PALETTE.midtown,
  ...DISTRICT_PALETTE.residential,
  ...DISTRICT_PALETTE.industrial,
]
const DISTRICT_OFFSET: Record<District, number> = {
  downtown: 0,
  midtown: 5,
  residential: 10,
  industrial: 15,
}

export interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
  colorIndex: number
  district: District
}

export interface CityModel {
  buildings: Building[]
  occupied: Set<number>
  /** Cells left as green parks (rendered as grass + extra trees). */
  parks: { x: number; z: number }[]
  cols: number
  half: number
  pitch: number
  worldHalf: number
  groundSize: number
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

function districtAt(i: number, j: number, half: number): District {
  // Chebyshev distance from centre, normalised 0..1.
  const d = Math.max(Math.abs(i - half), Math.abs(j - half)) / half
  if (d < 0.3) return 'downtown'
  if (d < 0.6) return 'midtown'
  if (d < 0.8) return 'residential'
  return 'industrial'
}

let cached: CityModel | null = null

/**
 * Generates the districted voxel city. Building height, footprint and colour
 * vary by district (downtown towers -> industrial sheds), and some cells become
 * parks. The same model feeds renderer, collision and AI line-of-sight.
 */
export function getCity(seed = 1337): CityModel {
  if (cached) return cached

  const rand = mulberry32(seed)
  const n = CITY.blocks
  const half = (n - 1) / 2
  const buildings: Building[] = []
  const occupied = new Set<number>()
  const parks: { x: number; z: number }[] = []

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i - half) * CITY_PITCH
      const z = (j - half) * CITY_PITCH
      if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue // spawn area

      const district = districtAt(i, j, half)
      const parkChance = district === 'residential' ? 0.2 : district === 'industrial' ? 0.14 : 0.08
      if (rand() < parkChance) {
        parks.push({ x, z })
        continue
      }

      let footprint: number
      let h: number
      switch (district) {
        case 'downtown':
          footprint = CITY.blockSize * (0.74 + rand() * 0.2)
          h = 18 + rand() * rand() * 40
          break
        case 'midtown':
          footprint = CITY.blockSize * (0.7 + rand() * 0.26)
          h = 8 + rand() * rand() * 24
          break
        case 'residential':
          footprint = CITY.blockSize * (0.5 + rand() * 0.22)
          h = 4 + rand() * 6
          break
        default: // industrial
          footprint = CITY.blockSize * (0.84 + rand() * 0.14)
          h = 5 + rand() * 11
      }

      const palette = DISTRICT_PALETTE[district]
      const colorIndex = DISTRICT_OFFSET[district] + ((rand() * palette.length) | 0)
      buildings.push({ x, z, w: footprint, d: footprint, h, colorIndex, district })
      occupied.add(i * n + j)
    }
  }

  const worldHalf = (n * CITY_PITCH) / 2 + CITY_PITCH
  cached = {
    buildings,
    occupied,
    parks,
    cols: n,
    half,
    pitch: CITY_PITCH,
    worldHalf,
    groundSize: n * CITY_PITCH + CITY_PITCH * 2,
  }
  return cached
}

export function worldToCell(v: number, half: number, pitch: number): number {
  return Math.round(v / pitch + half)
}
