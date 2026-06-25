import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { leftNormal, sampleAt, type BakedRamp, type BakedTrack } from '@/game/world/track'
import { LANE_GAP, type RaceState } from './raceState'

const CAP = 260 // max deck segments rendered per lane
const RAMP_CAP = 32 // max ramp wedges rendered (both lanes)
const OBST_CAP = 48 // max barriers rendered

const DECK_COLOR = '#39414f'
const RAIL_P = '#ffd23f' // player edge curbs (warm)
const RAIL_B = '#33b5ff' // bot edge curbs (cool)
const RAMP_COLOR = '#ff8c42'
const OBST_COLOR = '#e23b3b'
const OBST_H = 1.8
const DECK_H = 0.5
const RAIL_H = 0.4 // low curbs, not walls — you can drive off the edge
const RAIL_W = 0.5

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const X_AXIS = new THREE.Vector3(1, 0, 0)

/**
 * Renders a track as voxel slabs (deck) + low edge curbs along the centreline,
 * following the track's rolling elevation, plus launch-ramp wedges. In
 * head-to-head Race the bot's parallel lane is drawn too. For the endless track
 * the slabs stream in a window around the player.
 *
 * The curbs are cosmetic only — there are no invisible walls, so running wide
 * sends the car off the edge.
 */
export function Track({ race }: { race: RaceState }) {
  const pDeck = useRef<THREE.InstancedMesh>(null)
  const pRail = useRef<THREE.InstancedMesh>(null)
  const bDeck = useRef<THREE.InstancedMesh>(null)
  const bRail = useRef<THREE.InstancedMesh>(null)
  const ramps = useRef<THREE.InstancedMesh>(null)
  const obst = useRef<THREE.InstancedMesh>(null)
  const lastWin = useRef({ lo: -1, hi: -1 })

  const scratch = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    [],
  )

  const fill = (lo: number, hi: number) => {
    const t = race.track
    const { m, q, e, p, s } = scratch
    let count = 0
    for (let i = lo; i <= hi; i++) {
      const idx = t.closed ? ((i % t.pts.length) + t.pts.length) % t.pts.length : i
      if (idx < 0 || idx >= t.pts.length) continue
      const a = t.pts[idx]
      const b = t.pts[(idx + 1) % t.pts.length]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const len = Math.hypot(dx, dz)
      if (len < 0.001 || count >= CAP) continue
      const yaw = Math.atan2(dx, dz)
      e.set(0, yaw, 0)
      q.setFromEuler(e)
      const mx = (a.x + b.x) / 2
      const mz = (a.z + b.z) / 2
      const ya = t.y[idx] ?? 0
      const yb = t.y[(idx + 1) % t.y.length] ?? ya
      const my = (ya + yb) / 2
      const n = leftNormal(t.tan[idx])

      // Player lane deck + curbs
      p.set(mx, my - DECK_H / 2, mz)
      s.set(t.half * 2 + 0.6, DECK_H, len + 0.4)
      m.compose(p, q, s)
      pDeck.current?.setMatrixAt(count, m)
      placeRail(pRail.current, count * 2, mx, my, mz, n, t.half, yaw, len, scratch)
      placeRail(pRail.current, count * 2 + 1, mx, my, mz, n, -t.half, yaw, len, scratch)

      // Bot lane (race only)
      if (race.bot) {
        const bx = mx + n.x * LANE_GAP
        const bz = mz + n.z * LANE_GAP
        p.set(bx, my - DECK_H / 2, bz)
        s.set(t.half * 2 + 0.6, DECK_H, len + 0.4)
        m.compose(p, q, s)
        bDeck.current?.setMatrixAt(count, m)
        placeRail(bRail.current, count * 2, bx, my, bz, n, t.half, yaw, len, scratch)
        placeRail(bRail.current, count * 2 + 1, bx, my, bz, n, -t.half, yaw, len, scratch)
      }
      count++
    }
    finish(pDeck.current, count)
    finish(pRail.current, count * 2)
    if (race.bot) {
      finish(bDeck.current, count)
      finish(bRail.current, count * 2)
    }

    // --- Ramp wedges (player lane + bot lane), gated to the visible window ---
    const arcLo = t.closed ? -Infinity : t.cum[clampIdx(t, lo)] ?? 0
    const arcHi = t.closed ? Infinity : t.cum[clampIdx(t, hi)] ?? t.length
    let r = 0
    for (const ramp of t.ramps) {
      if (ramp.s0 + ramp.len < arcLo || ramp.s0 > arcHi) continue
      if (r >= RAMP_CAP - 1) break
      placeRamp(ramps.current, r++, t, ramp, 0, scratch)
      if (race.bot && r < RAMP_CAP) placeRamp(ramps.current, r++, t, ramp, LANE_GAP, scratch)
    }
    finish(ramps.current, r)

    // --- Barriers (static, world-positioned) ---
    let o = 0
    for (const ob of t.obstacles) {
      if (o >= OBST_CAP) break
      e.set(0, 0, 0)
      q.setFromEuler(e)
      p.set(ob.x, ob.y + OBST_H / 2, ob.z)
      s.set(ob.r * 2, OBST_H, ob.r * 2)
      m.compose(p, q, s)
      obst.current?.setMatrixAt(o++, m)
    }
    finish(obst.current, o)
  }

  useFrame(() => {
    const t = race.track
    let lo: number
    let hi: number
    if (t.closed) {
      lo = 0
      hi = t.pts.length - 1
    } else {
      lo = Math.max(0, race.player.index - 30)
      hi = race.player.index + 110
    }
    if (lo === lastWin.current.lo && hi === lastWin.current.hi) return
    // For endless, only rebuild after the window shifts a chunk (perf).
    if (!t.closed && Math.abs(lo - lastWin.current.lo) < 6 && lastWin.current.lo >= 0) return
    lastWin.current = { lo, hi }
    fill(lo, hi)
  })

  return (
    <>
      <instancedMesh ref={pDeck} args={[undefined, undefined, CAP]} receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={DECK_COLOR} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={pRail} args={[undefined, undefined, CAP * 2]} castShadow frustumCulled={false}>
        <boxGeometry args={[RAIL_W, RAIL_H, 1]} />
        <meshStandardMaterial color={RAIL_P} roughness={0.5} emissive={RAIL_P} emissiveIntensity={0.25} />
      </instancedMesh>
      <instancedMesh ref={ramps} args={[undefined, undefined, RAMP_CAP]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={RAMP_COLOR} roughness={0.6} emissive={RAMP_COLOR} emissiveIntensity={0.2} />
      </instancedMesh>
      <instancedMesh ref={obst} args={[undefined, undefined, OBST_CAP]} castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={OBST_COLOR} roughness={0.5} emissive={OBST_COLOR} emissiveIntensity={0.25} />
      </instancedMesh>
      {race.bot && (
        <>
          <instancedMesh ref={bDeck} args={[undefined, undefined, CAP]} receiveShadow frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={DECK_COLOR} roughness={0.85} />
          </instancedMesh>
          <instancedMesh ref={bRail} args={[undefined, undefined, CAP * 2]} castShadow frustumCulled={false}>
            <boxGeometry args={[RAIL_W, RAIL_H, 1]} />
            <meshStandardMaterial color={RAIL_B} roughness={0.5} emissive={RAIL_B} emissiveIntensity={0.25} />
          </instancedMesh>
        </>
      )}
    </>
  )
}

type Scratch = {
  m: THREE.Matrix4
  q: THREE.Quaternion
  q2: THREE.Quaternion
  e: THREE.Euler
  p: THREE.Vector3
  s: THREE.Vector3
}

function clampIdx(t: BakedTrack, i: number): number {
  return Math.max(0, Math.min(t.cum.length - 1, i))
}

function placeRail(
  mesh: THREE.InstancedMesh | null,
  slot: number,
  cx: number,
  cy: number,
  cz: number,
  n: { x: number; z: number },
  off: number,
  yaw: number,
  len: number,
  sc: Scratch,
) {
  if (!mesh) return
  const { m, q, e, p, s } = sc
  e.set(0, yaw, 0)
  q.setFromEuler(e)
  p.set(cx + n.x * off, cy + RAIL_H / 2 - 0.05, cz + n.z * off)
  s.set(1, 1, len + 0.4)
  m.compose(p, q, s)
  mesh.setMatrixAt(slot, m)
}

function placeRamp(
  mesh: THREE.InstancedMesh | null,
  slot: number,
  t: BakedTrack,
  ramp: BakedRamp,
  laneOff: number,
  sc: Scratch,
) {
  if (!mesh) return
  const { m, q, q2, p, s } = sc
  const a = sampleAt(t, ramp.s0)
  const b = sampleAt(t, ramp.s0 + ramp.len)
  const n = leftNormal(a.tan)
  const ax = a.pos.x + n.x * laneOff
  const az = a.pos.z + n.z * laneOff
  const bx = b.pos.x + n.x * laneOff
  const bz = b.pos.z + n.z * laneOff
  const horiz = Math.hypot(bx - ax, bz - az) || 1
  const yaw = Math.atan2(bx - ax, bz - az)
  const pitch = Math.atan2(ramp.height, horiz)
  const len3 = Math.hypot(horiz, ramp.height)
  // Yaw about world Y, then tilt up about local X so the lip end rises.
  q.setFromAxisAngle(Y_AXIS, yaw)
  q2.setFromAxisAngle(X_AXIS, -pitch)
  q.multiply(q2)
  p.set((ax + bx) / 2, a.y + ramp.height / 2, (az + bz) / 2)
  s.set(t.half * 2 * 0.92, 0.7, len3)
  m.compose(p, q, s)
  mesh.setMatrixAt(slot, m)
}

function finish(mesh: THREE.InstancedMesh | null, count: number) {
  if (!mesh) return
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
}
