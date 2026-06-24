/**
 * Track geometry for Race + Endless modes.
 *
 * A track is a centreline polyline (baked from control points via Catmull-Rom,
 * or generated procedurally for the endless mode) plus a half-width. Cars drive
 * freely in the world; we project their position onto the centreline to measure
 * progress (arc length) and lateral offset (how close to falling off the edge).
 */

export interface Vec2 {
  x: number
  z: number
}

export interface BakedTrack {
  id: string
  name: string
  pts: Vec2[]
  /** Unit tangent at each point. */
  tan: Vec2[]
  /** Cumulative arc length at each point. */
  cum: number[]
  /** Total centreline length (one lap, for closed tracks). */
  length: number
  closed: boolean
  half: number
  endless: boolean
  /** Lazily extend an endless track so it covers world index `to`. */
  extend?: (to: number) => void
}

export interface TrackDef {
  id: string
  name: string
  blurb: string
  control: Vec2[]
  laps: number
  half: number
}

/* -------------------------------------------------------------------------- */
/*  Baking                                                                     */
/* -------------------------------------------------------------------------- */

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

function bake(id: string, name: string, control: Vec2[], closed: boolean, half: number): BakedTrack {
  const n = control.length
  const raw: Vec2[] = []
  const SUB = 14 // subdivisions per control segment
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = control[(i - 1 + n) % n]
    const p1 = control[i % n]
    const p2 = control[(i + 1) % n]
    const p3 = control[(i + 2) % n]
    for (let s = 0; s < SUB; s++) {
      const t = s / SUB
      raw.push({ x: catmull(p0.x, p1.x, p2.x, p3.x, t), z: catmull(p0.z, p1.z, p2.z, p3.z, t) })
    }
  }
  if (!closed) raw.push(control[n - 1])
  return finalize(id, name, raw, closed, half, false)
}

function finalize(
  id: string,
  name: string,
  pts: Vec2[],
  closed: boolean,
  half: number,
  endless: boolean,
): BakedTrack {
  const tan: Vec2[] = []
  const cum: number[] = [0]
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    let dx = b.x - a.x
    let dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    dx /= len
    dz /= len
    tan.push({ x: dx, z: dz })
    if (i > 0) cum.push(cum[i - 1] + Math.hypot(a.x - pts[i - 1].x, a.z - pts[i - 1].z))
  }
  const length = closed
    ? cum[cum.length - 1] + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z)
    : cum[cum.length - 1]
  return { id, name, pts, tan, cum, length, closed, half, endless }
}

/* -------------------------------------------------------------------------- */
/*  Sampling + projection                                                      */
/* -------------------------------------------------------------------------- */

/** Centreline point + tangent at arc length `s` (wraps for closed tracks). */
export function sampleAt(t: BakedTrack, s: number): { pos: Vec2; tan: Vec2 } {
  let d = s
  if (t.closed) d = ((d % t.length) + t.length) % t.length
  d = Math.max(0, Math.min(t.length - 0.001, d))
  // Linear scan from a guessed index (cum is monotonic).
  let i = 0
  while (i < t.cum.length - 1 && t.cum[i + 1] <= d) i++
  const a = t.pts[i]
  const b = t.pts[(i + 1) % t.pts.length]
  const segLen = (t.cum[i + 1] ?? t.length) - t.cum[i] || 1
  const f = Math.max(0, Math.min(1, (d - t.cum[i]) / segLen))
  return {
    pos: { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f },
    tan: t.tan[i],
  }
}

/** Left-hand normal (rotate tangent +90°). */
export function leftNormal(tan: Vec2): Vec2 {
  return { x: -tan.z, z: tan.x }
}

/**
 * Project a world point onto the centreline near `hintIndex`. Returns the arc
 * length, signed lateral offset (left +), and the nearest point index.
 */
export function project(
  t: BakedTrack,
  x: number,
  z: number,
  hintIndex: number,
): { s: number; lateral: number; index: number; tan: Vec2 } {
  const W = 40
  let best = Infinity
  let bestI = hintIndex
  let bestF = 0
  for (let k = -W; k <= W; k++) {
    let i = hintIndex + k
    if (t.closed) i = ((i % t.pts.length) + t.pts.length) % t.pts.length
    else if (i < 0 || i >= t.pts.length - 1) continue
    const a = t.pts[i]
    const b = t.pts[(i + 1) % t.pts.length]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const segLen2 = dx * dx + dz * dz || 1
    let f = ((x - a.x) * dx + (z - a.z) * dz) / segLen2
    f = Math.max(0, Math.min(1, f))
    const px = a.x + dx * f
    const pz = a.z + dz * f
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz)
    if (d2 < best) {
      best = d2
      bestI = i
      bestF = f
    }
  }
  const a = t.pts[bestI]
  const b = t.pts[(bestI + 1) % t.pts.length]
  const tanv = t.tan[bestI]
  // Signed lateral via cross product (tangent × offset).
  const ox = x - (a.x + (b.x - a.x) * bestF)
  const oz = z - (a.z + (b.z - a.z) * bestF)
  const lateral = tanv.x * oz - tanv.z * ox
  const segLen = (t.cum[bestI + 1] ?? t.length) - t.cum[bestI]
  const s = t.cum[bestI] + segLen * bestF
  return { s, lateral, index: bestI, tan: tanv }
}

/* -------------------------------------------------------------------------- */
/*  Pre-generated circuits                                                     */
/* -------------------------------------------------------------------------- */

export const TRACK_DEFS: TrackDef[] = [
  {
    id: 'sunset-oval',
    name: 'Sunset Oval',
    blurb: 'Fast, flowing — a friendly first circuit.',
    laps: 2,
    half: 6,
    control: [
      { x: 0, z: 70 }, { x: 55, z: 60 }, { x: 80, z: 0 }, { x: 55, z: -60 },
      { x: 0, z: -75 }, { x: -55, z: -60 }, { x: -80, z: 0 }, { x: -55, z: 60 },
    ],
  },
  {
    id: 'switchback',
    name: 'Switchback',
    blurb: 'Tight esses reward clean lines.',
    laps: 2,
    half: 5.5,
    control: [
      { x: 0, z: 90 }, { x: 50, z: 80 }, { x: 30, z: 40 }, { x: 70, z: 20 },
      { x: 60, z: -30 }, { x: 10, z: -40 }, { x: 30, z: -90 }, { x: -30, z: -85 },
      { x: -55, z: -35 }, { x: -25, z: -10 }, { x: -60, z: 30 }, { x: -45, z: 80 },
    ],
  },
  {
    id: 'grand-loop',
    name: 'Grand Loop',
    blurb: 'A long, sweeping high-speed track.',
    laps: 3,
    half: 6.5,
    control: [
      { x: 0, z: 120 }, { x: 80, z: 100 }, { x: 120, z: 30 }, { x: 95, z: -55 },
      { x: 40, z: -85 }, { x: 60, z: -130 }, { x: -30, z: -120 }, { x: -90, z: -70 },
      { x: -70, z: 0 }, { x: -120, z: 50 }, { x: -70, z: 110 },
    ],
  },
]

const BAKED = new Map<string, BakedTrack>()

export function getTrack(id: string): BakedTrack {
  const cached = BAKED.get(id)
  if (cached) return cached
  const def = TRACK_DEFS.find((d) => d.id === id) ?? TRACK_DEFS[0]
  const baked = bake(def.id, def.name, def.control, true, def.half)
  BAKED.set(id, baked)
  return baked
}

export function trackLaps(id: string): number {
  return (TRACK_DEFS.find((d) => d.id === id) ?? TRACK_DEFS[0]).laps
}

/* -------------------------------------------------------------------------- */
/*  Endless procedural track                                                   */
/* -------------------------------------------------------------------------- */

/** Deterministic value-noise-ish curvature so the endless ribbon is repeatable. */
function curveAt(i: number): number {
  const a = Math.sin(i * 0.13) * 0.6
  const b = Math.sin(i * 0.031 + 2.1) * 0.9
  const c = Math.sin(i * 0.007 + 5.3) * 1.2
  return (a + b + c) / 2.7 // ~[-1,1]
}

const ENDLESS_STEP = 6 // world units per generated point
const ENDLESS_HALF = 5.5

/** Builds the (lazily extending) endless track starting straight ahead. */
export function makeEndless(): BakedTrack {
  const pts: Vec2[] = []
  const tan: Vec2[] = []
  const cum: number[] = []
  let heading = 0
  let x = 0
  let z = 0
  let total = 0
  const track: BakedTrack = {
    id: 'endless',
    name: 'Endless',
    pts,
    tan,
    cum,
    length: 0,
    closed: false,
    half: ENDLESS_HALF,
    endless: true,
    extend: (to: number) => {
      while (pts.length <= to + 60) {
        const i = pts.length
        // Straight launch ramp, then increasingly curvy with distance.
        const intensity = Math.min(0.16, 0.02 + i * 0.00002)
        if (i > 6) heading += curveAt(i) * intensity
        const nx = x + Math.sin(heading) * ENDLESS_STEP
        const nz = z + Math.cos(heading) * ENDLESS_STEP
        if (pts.length > 0) total += Math.hypot(nx - x, nz - z)
        x = nx
        z = nz
        pts.push({ x, z })
        tan.push({ x: Math.sin(heading), z: Math.cos(heading) })
        cum.push(total === 0 ? 0 : total)
        track.length = total
      }
    },
  }
  // Seed the first point + an initial run.
  pts.push({ x: 0, z: 0 })
  tan.push({ x: 0, z: 1 })
  cum.push(0)
  track.extend!(200)
  return track
}
