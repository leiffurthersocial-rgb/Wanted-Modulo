import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { riverFactor, sampleHeight, urbanization, WATER_Y } from './terrain'
import { useGameStore } from '@/state/useGameStore'

const GRASS = new THREE.Color('#5fb04e')
const ASPHALT = new THREE.Color('#3c4250')
const SAND = new THREE.Color('#d8c48c')
const tmp = new THREE.Color()

/** Ground patch size — covers the visible range; recenters on the player. */
const SIZE = 580
const SEG = 144
/** Player travel before the ground resamples (snapped to a grid step). */
const STEP = SIZE / SEG // ~4 units

/**
 * Infinite ground: one displaced, vertex-coloured patch that follows the player
 * and resamples terrain height + colour whenever they cross a grid step, so the
 * world extends forever. Colour blends grass (plains) → asphalt (city) → sand
 * (river banks). A translucent water plane fills the carved river channels.
 */
export function Ground() {
  const meshRef = useRef<THREE.Mesh>(null)
  const waterRef = useRef<THREE.Mesh>(null)
  const center = useRef({ x: NaN, z: NaN })

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    const colors = new Float32Array((geo.attributes.position as THREE.BufferAttribute).count * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [])

  const resample = (cx: number, cz: number) => {
    const geo = geometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const col = geo.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i)
      const ly = pos.getY(i)
      const wx = cx + lx
      const wz = cz - ly // after -90° X rotation, local +Y -> world -Z
      pos.setZ(i, sampleHeight(wx, wz))
      const u = urbanization(wx, wz)
      tmp.copy(GRASS).lerp(ASPHALT, THREE.MathUtils.clamp((u - 0.25) * 2.4, 0, 1))
      const rf = riverFactor(wx, wz)
      if (rf > 0.06) tmp.lerp(SAND, THREE.MathUtils.clamp((rf - 0.06) * 6, 0, 1))
      col.setXYZ(i, tmp.r, tmp.g, tmp.b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    geo.computeVertexNormals()
  }

  useFrame(() => {
    const { px, pz } = useGameStore.getState().radar
    const sx = Math.round(px / STEP) * STEP
    const sz = Math.round(pz / STEP) * STEP
    if (sx !== center.current.x || sz !== center.current.z) {
      center.current = { x: sx, z: sz }
      resample(sx, sz)
      if (meshRef.current) meshRef.current.position.set(sx, 0, sz)
    }
    if (waterRef.current) waterRef.current.position.set(px, WATER_Y, pz)
  })

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial
          color="#2f6fb0"
          transparent
          opacity={0.8}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}
