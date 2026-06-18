import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { riverFactor, sampleHeight, urbanization, WATER_Y } from './terrain'
import { useGameStore } from '@/state/useGameStore'

const GRASS_A = new THREE.Color('#6cc04f')
const GRASS_B = new THREE.Color('#5bb045')
const ROAD_A = new THREE.Color('#525a6b')
const ROAD_B = new THREE.Color('#474e5d')
const SAND = new THREE.Color('#dcc98e')
const tmp = new THREE.Color()

/** Ground patch size — covers the visible range; recenters on the player. */
const SIZE = 576
const SEG = 144
/** Player travel before the ground resamples (snapped to a grid step). */
const STEP = SIZE / SEG // 4 units
/** Voxel floor tile size (aligned to the segment grid for crisp blocks). */
const TILE = STEP

function tileHash(tx: number, tz: number): number {
  let h = (tx * 374761393 + tz * 668265263) | 0
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) | 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Infinite ground: one displaced patch that follows the player and resamples
 * whenever they cross a tile, so the world extends forever. The floor is
 * coloured in discrete voxel TILES — two grass shades, two road shades, sandy
 * river banks — for a clean modern-voxel look that matches the buildings. A
 * translucent water plane fills the carved river channels.
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

      // Per-tile discrete colour (voxel floor).
      const tx = Math.floor(wx / TILE)
      const tz = Math.floor(wz / TILE)
      const ccx = (tx + 0.5) * TILE
      const ccz = (tz + 0.5) * TILE
      const rf = riverFactor(ccx, ccz)
      const h = tileHash(tx, tz)
      if (rf > 0.1) {
        tmp.copy(SAND)
      } else if (urbanization(ccx, ccz) > 0.42) {
        tmp.copy(h < 0.5 ? ROAD_A : ROAD_B)
      } else {
        tmp.copy(h < 0.5 ? GRASS_A : GRASS_B)
      }
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
          color="#3f95dd"
          transparent
          opacity={0.82}
          roughness={0.12}
          metalness={0.25}
        />
      </mesh>
    </group>
  )
}
