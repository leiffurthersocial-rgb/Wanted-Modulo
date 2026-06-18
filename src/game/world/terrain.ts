/**
 * Procedural terrain, rivers and urbanization fields for an INFINITE world.
 * Every function here is a pure, deterministic function of world coordinates —
 * no bounds, no precomputed arrays — so the ground mesh, building streamer,
 * props, collision and entity height-following all agree on the shape of the
 * world no matter how far the player travels.
 */

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
