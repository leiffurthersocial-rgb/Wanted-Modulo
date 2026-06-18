/**
 * Procedural terrain, rivers and bridges for an INFINITE, Smashy-Road-style
 * world. The land is FLAT (height 0) everywhere except where straight,
 * grid-aligned rivers carve channels below the water plane. Every function is a
 * pure, deterministic function of world coordinates, so the floor mesh, the
 * building streamer, props, collision and entity height-following all agree on
 * the shape of the world no matter how far the player travels.
 */

import { CITY_PITCH } from '@/config/constants'

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hash(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2654435761) | 0
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) | 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Deterministic 1-D hash (river-line presence/offset). */
function hash1(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 2654435761) | 0
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) | 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
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

/** 0..1 city density. High = dense downtown, low = plains/countryside. */
export function urbanization(x: number, z: number): number {
  return fbm(x * 0.0094, z * 0.0094, 1)
}

/* -------------------------------------------------------------------------- */
/*  Rivers — straight, grid-aligned bands with right-angle corners            */
/* -------------------------------------------------------------------------- */

export const WATER_Y = -1.7
const RIVER_DEPTH = 5
/** Spacing of the river lattice (world units). */
const RIVER_GRID = 150
/** Half-width of a river channel. */
const RIVER_HALFW = 7
/** Probability a lattice line carries a river. */
const RIVER_P = 0.24
/** Keep the spawn plaza dry. */
const SPAWN_CLEAR = CITY_PITCH * 1.5

function colActive(i: number): boolean {
  return hash1(i, 7) < RIVER_P
}
function colCenter(i: number): number {
  return i * RIVER_GRID + (hash1(i, 9) - 0.5) * RIVER_GRID * 0.34
}
function rowActive(j: number): boolean {
  return hash1(j, 17) < RIVER_P
}
function rowCenter(j: number): number {
  return j * RIVER_GRID + (hash1(j, 19) - 0.5) * RIVER_GRID * 0.34
}

/**
 * 0..1 "in a river" factor — 1 at the centerline, fading to 0 at the banks.
 * Rivers run dead-straight along the lattice in both axes; where a vertical and
 * horizontal river meet they simply cross, giving clean right-angle corners.
 */
export function riverFactor(x: number, z: number): number {
  if (Math.abs(x) < SPAWN_CLEAR && Math.abs(z) < SPAWN_CLEAR) return 0
  let f = 0
  const ci = Math.round(x / RIVER_GRID)
  for (let di = -1; di <= 1; di++) {
    const i = ci + di
    if (!colActive(i)) continue
    const d = Math.abs(x - colCenter(i))
    if (d < RIVER_HALFW) f = Math.max(f, 1 - d / RIVER_HALFW)
  }
  const cj = Math.round(z / RIVER_GRID)
  for (let dj = -1; dj <= 1; dj++) {
    const j = cj + dj
    if (!rowActive(j)) continue
    const d = Math.abs(z - rowCenter(j))
    if (d < RIVER_HALFW) f = Math.max(f, 1 - d / RIVER_HALFW)
  }
  return f
}

/** Terrain height: a flat world, carved only by rivers. */
export function sampleHeight(x: number, z: number): number {
  const r = riverFactor(x, z)
  return r > 0 ? -RIVER_DEPTH * smooth(r) : 0
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
/*  Bridges — sparse wooden crossings over the straight rivers                 */
/* -------------------------------------------------------------------------- */

export const BRIDGE_Y = 0.35
/** Spacing of candidate bridge slots along a river. */
const BRIDGE_SPACING = 165
/** Probability a candidate slot actually has a bridge (keeps them rare). */
const BRIDGE_P = 0.5
/** Half-length of a bridge deck along the river. */
const BRIDGE_HALF = 4.5
/** Extra deck reach onto each bank. */
const BRIDGE_APPROACH = 4

/** Internal: does a bridge span the vertical river at column i here? */
function bridgeOnColumn(x: number, z: number): boolean {
  const ci = Math.round(x / RIVER_GRID)
  for (let di = -1; di <= 1; di++) {
    const i = ci + di
    if (!colActive(i)) continue
    if (Math.abs(x - colCenter(i)) > RIVER_HALFW + BRIDGE_APPROACH) continue
    const k = Math.round(z / BRIDGE_SPACING)
    if (hash(i, k, 31) < BRIDGE_P && Math.abs(z - k * BRIDGE_SPACING) < BRIDGE_HALF) return true
  }
  return false
}

/** Internal: does a bridge span the horizontal river at row j here? */
function bridgeOnRow(x: number, z: number): boolean {
  const cj = Math.round(z / RIVER_GRID)
  for (let dj = -1; dj <= 1; dj++) {
    const j = cj + dj
    if (!rowActive(j)) continue
    if (Math.abs(z - rowCenter(j)) > RIVER_HALFW + BRIDGE_APPROACH) continue
    const k = Math.round(x / BRIDGE_SPACING)
    if (hash(j, k, 41) < BRIDGE_P && Math.abs(x - k * BRIDGE_SPACING) < BRIDGE_HALF) return true
  }
  return false
}

/** True where a sparse wooden bridge deck spans a river — the drivable surface
 *  here is the deck, so cars roll across instead of plunging into the water. */
export function isBridge(x: number, z: number): boolean {
  return bridgeOnColumn(x, z) || bridgeOnRow(x, z)
}

/** A vertical-river bridge's deck runs along X (you drive across in X). Used by
 *  the renderer to orient planks and rails. */
export function bridgeAlongX(x: number, z: number): boolean {
  return bridgeOnColumn(x, z)
}

/** The drivable surface height: the bridge deck where one spans a river,
 *  otherwise the (flat or river-carved) terrain. */
export function surfaceHeight(x: number, z: number): number {
  if (isBridge(x, z)) return BRIDGE_Y
  return sampleHeight(x, z)
}

/**
 * Nearest direction from a bank point toward open water within `reach`, as a
 * unit vector, or null if no water is close. Used to place jump ramps facing
 * the river. Checks the 4 axis directions (rivers are axis-aligned).
 */
export function waterDirection(x: number, z: number, reach: number): [number, number] | null {
  if (isWater(x, z)) return null
  if (isWater(x + reach, z)) return [1, 0]
  if (isWater(x - reach, z)) return [-1, 0]
  if (isWater(x, z + reach)) return [0, 1]
  if (isWater(x, z - reach)) return [0, -1]
  return null
}
