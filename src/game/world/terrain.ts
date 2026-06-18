/**
 * Procedural terrain + urbanization fields. Pure, deterministic functions used
 * by the ground mesh, city generation, props and entity height-following — so
 * everything agrees on the shape of the world.
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

/** 0..1 city density. High = dense downtown, low = plains/countryside. */
export function urbanization(x: number, z: number): number {
  return fbm(x * 0.011, z * 0.011, 1)
}

/** Terrain height in world units. Hills live in the low-urban plains; cities
 *  sit on flatter ground so the layout reads sensibly. */
export function sampleHeight(x: number, z: number): number {
  const u = urbanization(x, z)
  const e = fbm(x * 0.008 + 50, z * 0.008 + 50, 2)
  return e * e * 24 * (1 - 0.65 * u)
}
