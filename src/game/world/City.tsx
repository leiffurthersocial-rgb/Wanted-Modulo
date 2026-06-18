import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ALL_COLORS, getCity } from './cityModel'
import { getLightsTexture } from './textures'
import { Registry } from '@/game/sim/registry'

/**
 * Buildings only, in a single InstancedMesh (one draw call) with per-instance
 * district colours and an emissive window texture animated by day/night. Each
 * building sits on its terrain base. The Ground component draws the terrain.
 */
export function City() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const city = useMemo(() => getCity(), [])
  const colors = useMemo(() => ALL_COLORS.map((c) => new THREE.Color(c)), [])
  const lights = useMemo(() => getLightsTexture(), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    city.buildings.forEach((b, i) => {
      // Sink 1 unit into the terrain to hide slope gaps.
      pos.set(b.x, b.baseY + b.h / 2 - 1, b.z)
      scale.set(b.w, b.h, b.d)
      m.compose(pos, q, scale)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, colors[b.colorIndex])
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    Registry.cityMaterial = matRef.current
    return () => {
      Registry.cityMaterial = null
    }
  }, [city, colors])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, city.buildings.length]}
      castShadow
      receiveShadow
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
