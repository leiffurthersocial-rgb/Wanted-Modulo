import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CITY, CITY_PITCH } from '@/config/constants'

const BUILDING_PALETTE = [
  '#3a4763',
  '#46506b',
  '#2f3a52',
  '#54607f',
  '#3d4a5f',
  '#5a6886',
]

interface BuildingData {
  x: number
  z: number
  w: number
  d: number
  h: number
  color: THREE.Color
}

/** Deterministic pseudo-random so the city is stable within a session. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Voxel city rendered with a single InstancedMesh for all buildings — one draw
 * call regardless of building count (the instanced-rendering perf technique
 * from the architecture). A flat ground plane provides the roads/lots.
 *
 * This is the prototype's static stand-in; full procedural districts with
 * streaming arrive in Phase 8.
 */
export function City() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const buildings = useMemo<BuildingData[]>(() => {
    const rand = mulberry32(1337)
    const n = CITY.blocks
    const half = (n - 1) / 2
    const out: BuildingData[] = []
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (i - half) * CITY_PITCH
        const z = (j - half) * CITY_PITCH
        // Keep the spawn area open.
        if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue
        // Occasional empty lot / park.
        if (rand() < 0.12) continue

        const footprint = CITY.blockSize * (0.7 + rand() * 0.28)
        const h = 4 + rand() * rand() * 34
        const color = new THREE.Color(
          BUILDING_PALETTE[(rand() * BUILDING_PALETTE.length) | 0],
        )
        out.push({ x, z, w: footprint, d: footprint, h, color })
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    buildings.forEach((b, i) => {
      pos.set(b.x, b.h / 2, b.z)
      scale.set(b.w, b.h, b.d)
      m.compose(pos, q, scale)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, b.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [buildings])

  const groundSize = CITY.blocks * CITY_PITCH + CITY_PITCH * 2

  return (
    <group>
      {/* Ground / roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color="#1b1f2a" roughness={0.95} />
      </mesh>

      {/* Buildings — one instanced draw call */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, buildings.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}
