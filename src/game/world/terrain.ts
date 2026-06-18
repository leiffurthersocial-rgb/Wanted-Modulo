/**
 * Procedural terrain, rivers and urbanization fields for an INFINITE world.
 * Every function here is a pure, deterministic function of world coordinates —
 * no bounds, no precomputed arrays — so the ground mesh, building streamer,
 * props, collision and entity height-following all agree on the shape of the
 * world no matter how far the player travels.
 */

import { CITY_PITCH } from '@/config/constants'

function hash(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2654435761) | 0
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) | 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function vnoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const a = hash(ix, iz, seed)
  const b = hash(ix + 1, iz, seed)
  const c = hash(ix, iz + 1, seed)
  const d = hash(ix + 1, iz + 1, seed)
  const u = smooth(fx)
  const v = smooth(fz)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

function fbm(x: number, z: number, seed: number): number {
  return vnoise(x, z, seed) * 0.6 + vnoise(x * 2, z * 2, seed + 7) * 0.3 + vnoise(x * 4, z * 4, seed + 13) * 0.1
}

/** Surface height of the river water plane (world units). */
export const WATER_Y = -1.7
/** Maximum carve depth of a river channel below the plains. */
const RIVER_DEPTH = 5.4
/** Half-width of a river in noise-field units (controls how wide channels are). */
const RIVER_HALF = 0.052

/**
 * 0..1 "in a river" factor. 1 at the centerline, fading to 0 at the banks.
 * Rivers are ridges of a low-frequency field, so they meander naturally and
 * branch — a logical, organic water network rather than a grid of canals.
 */
export function riverFactor(x: number, z: number): number {
  const n = fbm(x * 0.0052 + 11, z * 0.0052 - 7, 31)
  const d = Math.abs(n - 0.5)
  if (d > RIVER_HALF) return 0
  return smooth(1 - d / RIVER_HALF)
}

/** 0..1 city density. High = dense downtown, low = plains/countryside. */
export function urbanization(x: number, z: number): number {
  return fbm(x * 0.0094, z * 0.0094, 1)
}

/**
 * Terrain height in world units. Plains sit near 0 so streets read flat; gentle
 * hills rise in the low-urban countryside; rivers carve channels below the
 * water plane. Everything is continuous so vehicles and the camera glide.
 */
export function sampleHeight(x: number, z: number): number {
  const u = urbanization(x, z)
  const e = fbm(x * 0.0072 + 50, z * 0.0072 + 50, 2)
  const hills = e * e * 22 * (1 - 0.7 * u)
  const river = riverFactor(x, z)
  return hills * (1 - river) - river * RIVER_DEPTH
}

/** True where the terrain dips below the water plane (a navigable river). */
export function isWater(x: number, z: number): boolean {
  return sampleHeight(x, z) < WATER_Y
}

/** Depth of water at a point (0 on land). Used for swim/drown logic. */
export function waterDepth(x: number, z: number): number {
  const h = sampleHeight(x, z)
  return h < WATER_Y ? WATER_Y - h : 0
}

/* -------------------------------------------------------------------------- */
/*  Roads & bridges                                                            */
/* -------------------------------------------------------------------------- */

/** Half-width (world units) of a drivable road corridor / bridge deck. */
const ROAD_HALF = 5
/** Bridge deck height — sits just above the plains so approaches are seamless. */
export const BRIDGE_Y = 0.3

/** Only every Nth road carries a bridge, so crossings stay rare and special. */
const BRIDGE_EVERY = 4

/** Index of the nearest road centerline running along Z (vertical road). */
function roadIndexX(x: number): number {
  return Math.round(x / CITY_PITCH - 0.5)
}

/** Index of the nearest road centerline running along X (horizontal road). */
function roadIndexZ(z: number): number {
  return Math.round(z / CITY_PITCH - 0.5)
}

function distRoadX(x: number): number {
  return Math.abs(x - (roadIndexX(x) + 0.5) * CITY_PITCH)
}

function distRoadZ(z: number): number {
  return Math.abs(z - (roadIndexZ(z) + 0.5) * CITY_PITCH)
}

/**
 * True where a *major* road corridor crosses a river — i.e. where a drivable
 * bridge deck spans the water. Only every Nth road is a major (bridged) road,
 * so rivers stay meaningful obstacles and bridges read as landmarks.
 * Deterministic, so renderer, collision and height query all agree.
 */
export function isBridge(x: number, z: number): boolean {
  if (riverFactor(x, z) <= 0.06) return false
  const onMajorX = distRoadX(x) < ROAD_HALF && ((roadIndexX(x) % BRIDGE_EVERY) + BRIDGE_EVERY) % BRIDGE_EVERY === 0
  const onMajorZ = distRoadZ(z) < ROAD_HALF && ((roadIndexZ(z) % BRIDGE_EVERY) + BRIDGE_EVERY) % BRIDGE_EVERY === 0
  return onMajorX || onMajorZ
}

/** True when the bridge here runs along Z (a vertical road) — its railings sit
 *  on the X edges. Used by the bridge renderer to place side posts only. */
export function bridgeRunsAlongZ(x: number, z: number): boolean {
  return distRoadX(x) <= distRoadZ(z)
}

/**
 * The drivable surface height at a point: the bridge deck where one spans a
 * river, otherwise the terrain. Vehicles, the player and the camera follow
 * this so cars roll straight across bridges instead of plunging into the river.
 */
export function surfaceHeight(x: number, z: number): number {
  if (isBridge(x, z)) return BRIDGE_Y
  return sampleHeight(x, z)
}
