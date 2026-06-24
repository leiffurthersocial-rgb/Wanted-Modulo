import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { leftNormal } from '@/game/world/track'
import { LANE_GAP, type RaceState } from './raceState'

const CAP = 260 // max segments rendered per lane

const DECK_COLOR = '#39414f'
const RAIL_P = '#ffd23f' // player edge rails (warm)
const RAIL_B = '#33b5ff' // bot edge rails (cool)
const DECK_H = 0.5
const RAIL_H = 0.9
const RAIL_W = 0.5

/**
 * Renders a track as voxel slabs (deck) + edge rails along the centreline, for
 * the player's lane and — in head-to-head Race — the bot's parallel lane. For
 * the endless track the slabs stream in a window around the player.
 */
export function Track({ race }: { race: RaceState }) {
  const pDeck = useRef<THREE.InstancedMesh>(null)
  const pRail = useRef<THREE.InstancedMesh>(null)
  const bDeck = useRef<THREE.InstancedMesh>(null)
  const bRail = useRef<THREE.InstancedMesh>(null)
  const lastWin = useRef({ lo: -1, hi: -1 })

  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }),
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
      const n = leftNormal(t.tan[idx])

      // Player lane
      p.set(mx, -DECK_H / 2, mz)
      s.set(t.half * 2 + 0.6, DECK_H, len + 0.4)
      m.compose(p, q, s)
      pDeck.current?.setMatrixAt(count, m)
      // two rails (one matrix per side stored across two passes below)
      placeRail(pRail.current, count * 2, mx, mz, n, t.half, yaw, len, scratch)
      placeRail(pRail.current, count * 2 + 1, mx, mz, n, -t.half, yaw, len, scratch)

      // Bot lane (race only)
      if (race.bot) {
        const bx = mx + n.x * LANE_GAP
        const bz = mz + n.z * LANE_GAP
        p.set(bx, -DECK_H / 2, bz)
        s.set(t.half * 2 + 0.6, DECK_H, len + 0.4)
        m.compose(p, q, s)
        bDeck.current?.setMatrixAt(count, m)
        placeRail(bRail.current, count * 2, bx, bz, n, t.half, yaw, len, scratch)
        placeRail(bRail.current, count * 2 + 1, bx, bz, n, -t.half, yaw, len, scratch)
      }
      count++
    }
    finish(pDeck.current, count)
    finish(pRail.current, count * 2)
    if (race.bot) {
      finish(bDeck.current, count)
      finish(bRail.current, count * 2)
    }
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
  e: THREE.Euler
  p: THREE.Vector3
  s: THREE.Vector3
}

function placeRail(
  mesh: THREE.InstancedMesh | null,
  slot: number,
  cx: number,
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
  p.set(cx + n.x * off, RAIL_H / 2 - 0.1, cz + n.z * off)
  s.set(1, 1, len + 0.4)
  m.compose(p, q, s)
  mesh.setMatrixAt(slot, m)
}

function finish(mesh: THREE.InstancedMesh | null, count: number) {
  if (!mesh) return
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
}
