import { CITY, CITY_PITCH } from '@/config/constants'
import { sampleHeight, urbanization } from './terrain'

export type District = 'downtown' | 'midtown' | 'residential' | 'industrial'

// Bright, stylized palette (Smashy/Crossy-style flat colour blocks).
export const DISTRICT_PALETTE: Record<District, string[]> = {
  downtown: ['#5a8fd6', '#6aa0e0', '#4f86cf', '#7ab0ea', '#5577c4'],
  midtown: ['#e0a85a', '#e6b96e', '#d99a6a', '#ecc878', '#d88f5a'],
  residential: ['#e07a8a', '#7ec99a', '#e6c26e', '#88b8e0', '#d98fb0'],
  industrial: ['#aab0bd', '#9aa0ad', '#b8bec8', '#8a90a0', '#c2c8d2'],
}

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
  /** Terrain height the building sits on. */
  baseY: number
  colorIndex: number
  district: District
}

export interface CityModel {
  buildings: Building[]
  occupied: Set<number>
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

let cached: CityModel | null = null

/**
 * Noise-driven districted city. Building presence, height and palette follow an
 * "urbanization" field: dense downtown cores fade out through midtown and
 * residential into open plains (no buildings). Each building sits on the terrain
 * height so the world has real verticality. Shared by renderer, collision & AI.
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
      if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue // spawn area

      const u = urbanization(x, z)
      if (u < 0.3) continue // plains — no building

      let district: District
      let footprint: number
      let h: number
      if (u > 0.62) {
        district = 'downtown'
        footprint = CITY.blockSize * (0.74 + rand() * 0.2)
        h = 16 + (u - 0.62) * 90 + rand() * rand() * 30
      } else if (u > 0.46) {
        district = 'midtown'
        footprint = CITY.blockSize * (0.7 + rand() * 0.24)
        h = 8 + rand() * rand() * 22
      } else {
        district = rand() < 0.5 ? 'residential' : 'industrial'
        footprint = CITY.blockSize * (district === 'industrial' ? 0.84 : 0.52 + rand() * 0.22)
        h = district === 'industrial' ? 5 + rand() * 10 : 4 + rand() * 6
      }

      const palette = DISTRICT_PALETTE[district]
      const colorIndex = DISTRICT_OFFSET[district] + ((rand() * palette.length) | 0)
      buildings.push({ x, z, w: footprint, d: footprint, h, baseY: sampleHeight(x, z), colorIndex, district })
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

export function worldToCell(v: number, half: number, pitch: number): number {
  return Math.round(v / pitch + half)
}
