import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ALL_COLORS, streamBuildings, worldToCell } from './cityModel'
import { getLightsTexture } from './textures'
import { useGameStore } from '@/state/useGameStore'
import { Registry } from '@/game/sim/registry'

/** How far buildings stream in around the player (a bit inside the fog). */
const RENDER_RADIUS = 230
/** Max simultaneously-visible buildings (instanced capacity). */
const RENDER_CAP = 1200

/**
 * Streaming buildings for the INFINITE world: a single InstancedMesh whose
 * instances are refilled from `streamBuildings` whenever the player crosses a
 * grid cell. One draw call, per-instance district colour, emissive window glow
 * animated by day/night. The Ground component draws terrain + water.
 */
export function City() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const colors = useMemo(() => ALL_COLORS.map((c) => new THREE.Color(c)), [])
  const lights = useMemo(() => getLightsTexture(), [])
  const lastCell = useRef({ i: NaN, j: NaN })

  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), pos: new THREE.Vector3(), scale: new THREE.Vector3() }),
    [],
  )

  const rebuild = (cx: number, cz: number) => {
    const mesh = meshRef.current
    if (!mesh) return
    const buildings = streamBuildings(cx, cz, RENDER_RADIUS)
    const n = Math.min(buildings.length, RENDER_CAP)
    const { m, q, pos, scale } = scratch
    for (let i = 0; i < n; i++) {
      const b = buildings[i]
      pos.set(b.x, b.baseY + b.h / 2 - 1, b.z)
      scale.set(b.w, b.h, b.d)
      m.compose(pos, q, scale)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, colors[b.colorIndex])
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  useLayoutEffect(() => {
    rebuild(0, 0)
    lastCell.current = { i: 0, j: 0 }
    Registry.cityMaterial = matRef.current
    return () => {
      Registry.cityMaterial = null
    }
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
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, RENDER_CAP]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        roughness={0.7}
        metalness={0.05}
        emissive="#ffcaa0"
        emissiveMap={lights}
        emissiveIntensity={0}
      />
    </instancedMesh>
  )
}
