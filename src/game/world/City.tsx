import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BUILDING_PALETTE, getCity } from './cityModel'

/**
 * Voxel city rendered as a single InstancedMesh for all buildings — one draw
 * call regardless of building count (the instanced-rendering perf technique).
 * Geometry comes from the shared city model so it matches collision/LOS.
 */
export function City() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const city = useMemo(() => getCity(), [])
  const colors = useMemo(
    () => BUILDING_PALETTE.map((c) => new THREE.Color(c)),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    city.buildings.forEach((b, i) => {
      pos.set(b.x, b.h / 2, b.z)
      scale.set(b.w, b.h, b.d)
      m.compose(pos, q, scale)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, colors[b.colorIndex])
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [city, colors])

  return (
    <group>
      {/* Ground / roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[city.groundSize, city.groundSize]} />
        <meshStandardMaterial color="#1b1f2a" roughness={0.95} />
      </mesh>

      {/* Buildings — one instanced draw call */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, city.buildings.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}
