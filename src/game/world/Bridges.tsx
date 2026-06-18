import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { isBridge, bridgeAlongX, BRIDGE_Y } from './terrain'
import { worldToCell } from './cityModel'
import { useGameStore } from '@/state/useGameStore'

const TILE = 2.4
const RADIUS = 150
const DECK_CAP = 1800
const POST_CAP = 1400

/**
 * Streaming WOODEN bridges: where a sparse crossing spans a river, a plank deck
 * with chunky side rails is laid so cars drive straight across. Deck/rail
 * instances refill whenever the player crosses a grid cell. Decks are cosmetic —
 * the drivable surface comes from terrain.surfaceHeight().
 */
export function Bridges() {
  const deckRef = useRef<THREE.InstancedMesh>(null)
  const postRef = useRef<THREE.InstancedMesh>(null)
  const lastCell = useRef({ i: NaN, j: NaN })
  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), pos: new THREE.Vector3(), scl: new THREE.Vector3(1, 1, 1) }),
    [],
  )

  const rebuild = (cx: number, cz: number) => {
    const deck = deckRef.current
    const post = postRef.current
    if (!deck || !post) return
    const { m, q, pos, scl } = scratch
    let d = 0
    let p = 0
    const startX = Math.floor((cx - RADIUS) / TILE) * TILE
    const startZ = Math.floor((cz - RADIUS) / TILE) * TILE
    for (let x = startX; x <= cx + RADIUS; x += TILE) {
      for (let z = startZ; z <= cz + RADIUS; z += TILE) {
        const dx = x - cx
        const dz = z - cz
        if (dx * dx + dz * dz > RADIUS * RADIUS) continue
        if (!isBridge(x, z)) continue
        if (d < DECK_CAP) {
          pos.set(x, BRIDGE_Y - 0.2, z)
          m.compose(pos, q, scl)
          deck.setMatrixAt(d++, m)
        }
        // Side rails run parallel to the driving direction (along the deck's
        // long axis), never across the entrance.
        const alongX = bridgeAlongX(x, z)
        const edge = alongX
          ? !isBridge(x, z + TILE) || !isBridge(x, z - TILE)
          : !isBridge(x + TILE, z) || !isBridge(x - TILE, z)
        if (edge && p < POST_CAP) {
          pos.set(x, BRIDGE_Y + 0.45, z)
          m.compose(pos, q, scl)
          post.setMatrixAt(p++, m)
        }
      }
    }
    deck.count = d
    post.count = p
    deck.instanceMatrix.needsUpdate = true
    post.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => {
    rebuild(0, 0)
    lastCell.current = { i: 0, j: 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(() => {
    const { px, pz } = useGameStore.getState().radar
    const ci = worldToCell(px)
    const cj = worldToCell(pz)
    if (ci !== lastCell.current.i || cj !== lastCell.current.j) {
      lastCell.current = { i: ci, j: cj }
      rebuild(px, pz)
    }
  })

  return (
    <group>
      <instancedMesh ref={deckRef} args={[undefined, undefined, DECK_CAP]} receiveShadow castShadow frustumCulled={false}>
        <boxGeometry args={[TILE + 0.05, 0.4, TILE + 0.05]} />
        <meshStandardMaterial color="#9c6b3f" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={postRef} args={[undefined, undefined, POST_CAP]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial color="#6f4a28" roughness={0.95} />
      </instancedMesh>
    </group>
  )
}
