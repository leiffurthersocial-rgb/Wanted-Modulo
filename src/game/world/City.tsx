import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CITY } from '@/config/constants'
import { ALL_COLORS, getCity } from './cityModel'
import { getLightsTexture, getRoadTexture } from './textures'
import { Registry } from '@/game/sim/registry'

/**
 * Districted voxel city. All buildings render in a single InstancedMesh (one
 * draw call) with per-instance district colours and an emissive window texture
 * whose intensity the day/night controller animates. Parks are grass quads.
 */
export function City() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const city = useMemo(() => getCity(), [])
  const colors = useMemo(() => ALL_COLORS.map((c) => new THREE.Color(c)), [])
  const lights = useMemo(() => getLightsTexture(), [])
  const road = useMemo(() => getRoadTexture(city.groundSize / city.pitch), [city])

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
    Registry.cityMaterial = matRef.current
    return () => {
      Registry.cityMaterial = null
    }
  }, [city, colors])

  return (
    <group>
      {/* Ground / roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[city.groundSize, city.groundSize]} />
        <meshStandardMaterial map={road} roughness={0.95} />
      </mesh>

      {/* Parks */}
      {city.parks.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.02, p.z]} receiveShadow>
          <planeGeometry args={[CITY.blockSize * 1.05, CITY.blockSize * 1.05]} />
          <meshStandardMaterial color="#2f6b35" roughness={1} />
        </mesh>
      ))}

      {/* Buildings — one instanced draw call */}
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
    </group>
  )
}
