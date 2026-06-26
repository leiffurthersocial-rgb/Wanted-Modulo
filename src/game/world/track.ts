/**
 * Track geometry for Race + Endless modes.
 *
 * A track is a centreline polyline (baked from control points via Catmull-Rom,
 * or generated procedurally for the endless mode) plus a half-width and an
 * elevation profile. Cars drive freely in the world; we project their position
 * onto the centreline to measure progress (arc length), lateral offset (how
 * close to falling off the edge) and ground height (so tracks roll up and down).
 *
 * Ramps are sparse kickers placed along the centreline: hit one with speed and
 * the car launches into the air and lands further down the track.
 */

export interface Vec2 {
  x: number
  z: number
}

/** A launch ramp: rises from arc length `s0` to a lip at `s0 + len`. */
export interface BakedRamp {
  /** Arc length where the ramp begins. */
  s0: number
  /** Run length of the ramp along the centreline. */
  len: number
  /** Vertical rise from base to lip. */
  height: number
}

/** A hole in the deck (arc range with no track) — clear it or fall. */
export interface BakedGap {
  s0: number
  s1: number
}

/** A static obstacle (barrier) sitting on the deck — clip it and you crash. */
export interface BakedObstacle {
  x: number
  z: number
  y: number
  r: number
}

export interface BakedTrack {
  id: string
  name: string
  pts: Vec2[]
  /** Unit tangent at each point. */
  tan: Vec2[]
  /** Ground elevation (world Y) at each point. */
  y: number[]
  /** Cumulative arc length at each point. */
  cum: number[]
  /** Total centreline length (one lap). */
  length: number
  closed: boolean
  half: number
  /** Scenery theme id used by the race Scenery decorator. */
  theme: string
  /** Launch ramps along the centreline. */
  ramps: BakedRamp[]
  /** Holes in the deck (typically just past a ramp lip). */
  gaps: BakedGap[]
  /** Static barriers on the deck to dodge. */
  obstacles: BakedObstacle[]
}

export interface TrackDef {
  id: string
  name: string
  blurb: string
  control: Vec2[]
  /** Per-control-point elevation (world Y). Defaults to flat when omitted. */
  elev?: number[]
  /** Ramps as a fraction of the lap (0..1) + their rise. `gap` adds a hole just
   *  past the lip (world units) that must be jumped. */
  ramps?: { at: number; height: number; len?: number; gap?: number }[]
  /** Barriers: lap fraction `at` + signed lateral offset (−1..1 of half-width). */
  obstacles?: { at: number; lateral: number; r?: number }[]
  /** Scenery theme that lines the circuit (palms, pines, neon, …). */
  theme?: string
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

function bake(def: TrackDef, closed: boolean): BakedTrack {
  const control = def.control
  const elev = def.elev ?? control.map(() => 0)
  const n = control.length
  const raw: Vec2[] = []
  const rawY: number[] = []
  const SUB = 14 // subdivisions per control segment
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const i0 = (i - 1 + n) % n
    const i1 = i % n
    const i2 = (i + 1) % n
    const i3 = (i + 2) % n
    for (let s = 0; s < SUB; s++) {
      const t = s / SUB
      raw.push({
        x: catmull(control[i0].x, control[i1].x, control[i2].x, control[i3].x, t),
        z: catmull(control[i0].z, control[i1].z, control[i2].z, control[i3].z, t),
      })
      rawY.push(catmull(elev[i0], elev[i1], elev[i2], elev[i3], t))
    }
  }
  if (!closed) {
    raw.push(control[n - 1])
    rawY.push(elev[n - 1])
  }
  const baked = finalize(def.id, def.name, raw, rawY, closed, def.half)
  baked.theme = def.theme ?? 'none'
  // Bake ramps from lap-fraction positions once the length is known.
  if (def.ramps) {
    for (const r of def.ramps) {
      const len = r.len ?? 12
      const s0 = r.at * baked.length
      baked.ramps.push({ s0, len, height: r.height })
      // A gap just past the lip turns the ramp into a true skill jump.
      if (r.gap && r.gap > 0) {
        const lipS = s0 + len + 0.6
        baked.gaps.push({ s0: lipS, s1: lipS + r.gap })
      }
    }
  }
  // Bake obstacles: position along the lap + a lateral offset across the deck.
  if (def.obstacles) {
    for (const o of def.obstacles) {
      const sp = sampleAt(baked, o.at * baked.length)
      const n = leftNormal(sp.tan)
      const off = o.lateral * (baked.half - 1)
      baked.obstacles.push({
        x: sp.pos.x + n.x * off,
        z: sp.pos.z + n.z * off,
        y: sp.y,
        r: o.r ?? 1.4,
      })
    }
  }
  return baked
}

function finalize(
  id: string,
  name: string,
  pts: Vec2[],
  y: number[],
  closed: boolean,
  half: number,
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
  return { id, name, pts, tan, y, cum, length, closed, half, theme: 'none', ramps: [], gaps: [], obstacles: [] }
}

/* -------------------------------------------------------------------------- */
/*  Sampling + projection                                                      */
/* -------------------------------------------------------------------------- */

/** Centreline point, tangent + ground elevation at arc length `s`. */
export function sampleAt(t: BakedTrack, s: number): { pos: Vec2; tan: Vec2; y: number } {
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
  const ya = t.y[i] ?? 0
  const yb = t.y[(i + 1) % t.y.length] ?? ya
  return {
    pos: { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f },
    tan: t.tan[i],
    y: ya + (yb - ya) * f,
  }
}

/** Ground elevation (world Y) of the centreline at arc length `s`. */
export function elevAt(t: BakedTrack, s: number): number {
  return sampleAt(t, s).y
}

/**
 * The launch ramp covering arc length `s`, plus how far up its run we are
 * (0 at the base, 1 at the lip). Returns null when not on a ramp.
 */
export function rampAt(t: BakedTrack, s: number): { ramp: BakedRamp; frac: number } | null {
  let d = s
  if (t.closed) d = ((d % t.length) + t.length) % t.length
  for (const ramp of t.ramps) {
    if (d >= ramp.s0 && d <= ramp.s0 + ramp.len) {
      return { ramp, frac: (d - ramp.s0) / ramp.len }
    }
  }
  return null
}

/** True when arc length `s` falls inside a hole in the deck. */
export function inGap(t: BakedTrack, s: number): boolean {
  if (t.gaps.length === 0) return false
  let d = s
  if (t.closed) d = ((d % t.length) + t.length) % t.length
  for (const g of t.gaps) if (d >= g.s0 && d <= g.s1) return true
  return false
}

/** Ground height including any ramp rise at arc length `s`. */
export function groundAt(t: BakedTrack, s: number): number {
  const base = elevAt(t, s)
  const r = rampAt(t, s)
  return base + (r ? r.ramp.height * r.frac : 0)
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
    id: 'harbor-cruise',
    theme: 'flag',
    name: 'Harbor Cruise',
    blurb: 'Wide, gentle and forgiving — rolling bends and one easy crest jump. The perfect first lap.',
    half: 7.2,
    control: [
      { x: 0, z: 130 }, { x: 85, z: 118 }, { x: 130, z: 45 }, { x: 115, z: -45 },
      { x: 45, z: -120 }, { x: -45, z: -122 }, { x: -120, z: -48 }, { x: -120, z: 45 },
      { x: -65, z: 110 },
    ],
    elev: [0, 3, 5, 3, 1, 2, 4, 3, 1],
    ramps: [{ at: 0.5, height: 2.6, len: 15 }],
    obstacles: [
      { at: 0.22, lateral: -0.4 },
      { at: 0.55, lateral: 0.4 },
      { at: 0.82, lateral: -0.4 },
    ],
  },
  {
    id: 'sunset-oval',
    theme: 'palm',
    name: 'Sunset Oval',
    blurb: 'Fast, flowing sweepers with twin gap jumps and chicanes — a lively warm-up.',
    half: 5.6,
    control: [
      { x: 0, z: 120 }, { x: 95, z: 105 }, { x: 140, z: 0 }, { x: 95, z: -105 },
      { x: 0, z: -130 }, { x: -95, z: -105 }, { x: -140, z: 0 }, { x: -95, z: 105 },
    ],
    elev: [0, 5, 9, 5, 1, 5, 9, 5],
    ramps: [
      { at: 0.25, height: 3.4, len: 13, gap: 6 },
      { at: 0.75, height: 3.6, len: 13, gap: 6 },
    ],
    obstacles: [
      { at: 0.1, lateral: 0.5 },
      { at: 0.45, lateral: -0.5 },
      { at: 0.55, lateral: 0.5 },
      { at: 0.9, lateral: -0.5 },
    ],
  },
  {
    id: 'switchback',
    theme: 'pine',
    name: 'Switchback Ridge',
    blurb: 'Tight esses up a climbing ridge — a barrier slalom and three crest jumps.',
    half: 4.8,
    control: [
      { x: 0, z: 150 }, { x: 85, z: 135 }, { x: 50, z: 70 }, { x: 120, z: 35 },
      { x: 100, z: -50 }, { x: 18, z: -68 }, { x: 50, z: -150 }, { x: -50, z: -145 },
      { x: -92, z: -60 }, { x: -42, z: -18 }, { x: -100, z: 50 }, { x: -75, z: 135 },
    ],
    elev: [0, 3, 7, 11, 7, 3, 0, 3, 8, 12, 7, 2],
    ramps: [
      { at: 0.28, height: 3.2, len: 11, gap: 6 },
      { at: 0.5, height: 3.4, len: 11, gap: 6 },
      { at: 0.78, height: 3.4, len: 11, gap: 6 },
    ],
    obstacles: [
      { at: 0.1, lateral: 0.55 },
      { at: 0.14, lateral: -0.5 },
      { at: 0.38, lateral: 0.5 },
      { at: 0.6, lateral: -0.5 },
      { at: 0.64, lateral: 0.5 },
      { at: 0.9, lateral: -0.55 },
      { at: 0.94, lateral: 0.5 },
    ],
  },
  {
    id: 'grand-loop',
    theme: 'flag',
    name: 'Grand Loop',
    blurb: 'Long, high-speed track — rolling hills, three big gap jumps and staggered chicanes.',
    half: 5.8,
    control: [
      { x: 0, z: 200 }, { x: 135, z: 170 }, { x: 200, z: 50 }, { x: 160, z: -95 },
      { x: 70, z: -145 }, { x: 100, z: -220 }, { x: -50, z: -200 }, { x: -150, z: -120 },
      { x: -120, z: 0 }, { x: -200, z: 85 }, { x: -120, z: 185 },
    ],
    elev: [0, 7, 11, 6, 2, 0, 5, 11, 15, 8, 3],
    ramps: [
      { at: 0.18, height: 4.0, len: 14, gap: 8 },
      { at: 0.45, height: 4.2, len: 14, gap: 9 },
      { at: 0.7, height: 4.4, len: 15, gap: 9 },
    ],
    obstacles: [
      { at: 0.3, lateral: -0.55 },
      { at: 0.34, lateral: 0.55 },
      { at: 0.55, lateral: -0.5 },
      { at: 0.82, lateral: 0.55 },
      { at: 0.86, lateral: -0.5 },
      { at: 0.92, lateral: 0.45 },
    ],
  },
  {
    id: 'canyon-rush',
    theme: 'canyon',
    name: 'Canyon Rush',
    blurb: 'Plunging dips and steep climbs — three ramp gaps soaring over the ravine.',
    half: 5.0,
    control: [
      { x: 0, z: 160 }, { x: 110, z: 150 }, { x: 175, z: 70 }, { x: 150, z: -40 },
      { x: 200, z: -130 }, { x: 90, z: -190 }, { x: -40, z: -160 }, { x: -30, z: -60 },
      { x: -130, z: -30 }, { x: -180, z: 80 }, { x: -90, z: 165 },
    ],
    elev: [2, 9, 15, 3, 0, 11, 17, 5, 0, 10, 4],
    ramps: [
      { at: 0.2, height: 4.4, len: 13, gap: 8 },
      { at: 0.5, height: 4.8, len: 14, gap: 9 },
      { at: 0.8, height: 4.2, len: 13, gap: 8 },
    ],
    obstacles: [
      { at: 0.1, lateral: 0.5 },
      { at: 0.32, lateral: -0.5 },
      { at: 0.36, lateral: 0.5 },
      { at: 0.6, lateral: -0.5 },
      { at: 0.64, lateral: 0.5 },
      { at: 0.92, lateral: -0.5 },
    ],
  },
  {
    id: 'skyline-figure8',
    theme: 'neon',
    name: 'Skyline Weave',
    blurb: 'A weaving neon circuit that climbs through four ramp jumps and a tight slalom.',
    half: 5.0,
    control: [
      { x: 0, z: 170 }, { x: 90, z: 150 }, { x: 60, z: 60 }, { x: 150, z: 20 },
      { x: 170, z: -80 }, { x: 60, z: -120 }, { x: 80, z: -200 }, { x: -70, z: -185 },
      { x: -90, z: -90 }, { x: -30, z: -40 }, { x: -150, z: 0 }, { x: -160, z: 110 },
    ],
    elev: [0, 6, 12, 7, 3, 10, 15, 8, 2, 6, 13, 5],
    ramps: [
      { at: 0.18, height: 3.8, len: 13, gap: 7 },
      { at: 0.42, height: 4.2, len: 14, gap: 8 },
      { at: 0.62, height: 4.0, len: 13, gap: 7 },
      { at: 0.85, height: 3.8, len: 12, gap: 7 },
    ],
    obstacles: [
      { at: 0.08, lateral: -0.5 },
      { at: 0.28, lateral: 0.5 },
      { at: 0.32, lateral: -0.5 },
      { at: 0.5, lateral: 0.5 },
      { at: 0.72, lateral: -0.5 },
      { at: 0.93, lateral: 0.5 },
    ],
  },
  {
    id: 'riptide-coast',
    theme: 'palm',
    name: 'Riptide Coast',
    blurb: 'Sweeping coastal esses with staggered chicanes and four gap jumps along the cliffs.',
    half: 5.2,
    control: [
      { x: 0, z: 185 }, { x: 100, z: 175 }, { x: 150, z: 110 }, { x: 110, z: 40 },
      { x: 165, z: -25 }, { x: 140, z: -110 }, { x: 40, z: -150 }, { x: 70, z: -215 },
      { x: -55, z: -200 }, { x: -120, z: -130 }, { x: -85, z: -55 }, { x: -160, z: 10 },
      { x: -150, z: 110 }, { x: -70, z: 160 },
    ],
    elev: [0, 6, 10, 5, 9, 13, 6, 2, 7, 12, 7, 3, 9, 4],
    ramps: [
      { at: 0.22, height: 4.0, len: 13, gap: 8 },
      { at: 0.45, height: 4.2, len: 14, gap: 8 },
      { at: 0.66, height: 4.0, len: 13, gap: 7 },
      { at: 0.86, height: 3.8, len: 12, gap: 7 },
    ],
    obstacles: [
      { at: 0.1, lateral: 0.55 },
      { at: 0.32, lateral: -0.5 },
      { at: 0.36, lateral: 0.5 },
      { at: 0.55, lateral: -0.5 },
      { at: 0.74, lateral: 0.5 },
      { at: 0.78, lateral: -0.5 },
      { at: 0.95, lateral: 0.5 },
    ],
  },
  {
    id: 'the-gauntlet',
    theme: 'hazard',
    name: 'The Gauntlet',
    blurb: 'Brutal: narrow, steep, blind crests, a relentless barrier slalom and four gap jumps.',
    half: 4.4,
    control: [
      { x: 0, z: 150 }, { x: 70, z: 145 }, { x: 95, z: 95 }, { x: 55, z: 60 },
      { x: 105, z: 25 }, { x: 150, z: -30 }, { x: 95, z: -70 }, { x: 130, z: -130 },
      { x: 35, z: -150 }, { x: 55, z: -205 }, { x: -45, z: -195 }, { x: -25, z: -120 },
      { x: -95, z: -95 }, { x: -45, z: -45 }, { x: -120, z: -10 }, { x: -150, z: 70 },
      { x: -70, z: 95 }, { x: -95, z: 150 },
    ],
    elev: [0, 4, 10, 14, 9, 2, 8, 15, 10, 0, 6, 13, 7, 14, 9, 2, 7, 3],
    ramps: [
      { at: 0.18, height: 4.6, len: 12, gap: 8 },
      { at: 0.4, height: 4.8, len: 12, gap: 8 },
      { at: 0.62, height: 5.0, len: 13, gap: 9 },
      { at: 0.84, height: 4.6, len: 11, gap: 8 },
    ],
    obstacles: [
      { at: 0.08, lateral: 0.6 },
      { at: 0.12, lateral: -0.6 },
      { at: 0.28, lateral: 0.6 },
      { at: 0.32, lateral: -0.55 },
      { at: 0.5, lateral: 0.6 },
      { at: 0.54, lateral: -0.6 },
      { at: 0.72, lateral: 0.55 },
      { at: 0.76, lateral: -0.6 },
      { at: 0.92, lateral: 0.55 },
      { at: 0.96, lateral: -0.55 },
    ],
  },
  {
    id: 'impossible',
    theme: 'crystal',
    name: 'Vertigo',
    blurb: 'Brutal but beatable — long gap jumps, a barrier slalom and big elevation.',
    half: 4.2,
    control: [
      { x: 0, z: 160 }, { x: 75, z: 150 }, { x: 125, z: 110 }, { x: 150, z: 45 },
      { x: 150, z: -35 }, { x: 120, z: -105 }, { x: 60, z: -145 }, { x: 95, z: -200 },
      { x: 0, z: -215 }, { x: -80, z: -180 }, { x: -55, z: -100 }, { x: -120, z: -80 },
      { x: -160, z: -10 }, { x: -160, z: 80 }, { x: -95, z: 140 }, { x: -25, z: 135 },
    ],
    elev: [0, 5, 10, 15, 9, 3, 7, 13, 6, 0, 7, 12, 7, 2, 10, 4],
    // Ramps sit on the straighter runs (with clear landings) so the gaps are
    // jumpable if you carry speed — no barriers crowding the approaches.
    ramps: [
      { at: 0.22, height: 4.4, len: 13, gap: 6 },
      { at: 0.47, height: 4.8, len: 13, gap: 7 },
      { at: 0.78, height: 4.6, len: 12, gap: 6 },
    ],
    obstacles: [
      { at: 0.08, lateral: 0.55 },
      { at: 0.12, lateral: -0.55 },
      { at: 0.34, lateral: 0.55 },
      { at: 0.38, lateral: -0.55 },
      { at: 0.6, lateral: 0.55 },
      { at: 0.64, lateral: -0.55 },
      { at: 0.9, lateral: 0.55 },
      { at: 0.95, lateral: -0.55 },
    ],
  },
  {
    id: 'oblivion',
    theme: 'crystal',
    name: 'Oblivion',
    blurb: 'The hardest of all — a razor ribbon of blind crests, yawning gaps and a vicious slalom. Almost no one finishes clean.',
    half: 4.0,
    control: [
      { x: 0, z: 150 }, { x: 70, z: 148 }, { x: 110, z: 110 }, { x: 105, z: 55 },
      { x: 145, z: 12 }, { x: 122, z: -60 }, { x: 152, z: -120 }, { x: 60, z: -150 },
      { x: 85, z: -212 }, { x: -28, z: -202 }, { x: -18, z: -120 }, { x: -92, z: -110 },
      { x: -132, z: -42 }, { x: -96, z: 12 }, { x: -152, z: 72 }, { x: -78, z: 132 },
    ],
    elev: [0, 6, 13, 7, 15, 6, 2, 10, 17, 8, 2, 11, 16, 6, 13, 4],
    ramps: [
      { at: 0.18, height: 4.6, len: 12, gap: 7 },
      { at: 0.4, height: 5.0, len: 12, gap: 8 },
      { at: 0.6, height: 4.8, len: 12, gap: 7 },
      { at: 0.82, height: 4.6, len: 11, gap: 7 },
    ],
    obstacles: [
      { at: 0.07, lateral: 0.6 },
      { at: 0.1, lateral: -0.6 },
      { at: 0.28, lateral: 0.6 },
      { at: 0.31, lateral: -0.55 },
      { at: 0.48, lateral: 0.6 },
      { at: 0.51, lateral: -0.6 },
      { at: 0.68, lateral: 0.55 },
      { at: 0.71, lateral: -0.6 },
      { at: 0.9, lateral: 0.55 },
      { at: 0.93, lateral: -0.55 },
    ],
  },
]

const BAKED = new Map<string, BakedTrack>()

export function getTrack(id: string): BakedTrack {
  const cached = BAKED.get(id)
  if (cached) return cached
  const def = TRACK_DEFS.find((d) => d.id === id) ?? TRACK_DEFS[0]
  const baked = bake(def, true)
  BAKED.set(id, baked)
  return baked
}
