import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { POLICE_CLASSES, type PoliceClassId } from '@/game/vehicles/policeCatalog'
import { Registry } from '@/game/sim/registry'
import { VoxelVehicle } from './VoxelVehicle'

interface Props {
  classId: PoliceClassId
  /** Pool slot index — used to register lightbar materials for flashing. */
  slot: number
}

/**
 * Police vehicle: a class-coloured voxel body (reusing VoxelVehicle) plus an
 * accent stripe and a flashing lightbar. The lightbar materials register into
 * the render Registry so the PolicePool can animate them in one place.
 */
export function VoxelPoliceCar({ classId, slot }: Props) {
  const cls = POLICE_CLASSES[classId]
  const def = useMemo(() => ({ ...cls.def, color: cls.body }), [cls])
  const { length: L, width: W, height: H } = cls.def.size

  const leftRef = useRef<THREE.MeshStandardMaterial>(null)
  const rightRef = useRef<THREE.MeshStandardMaterial>(null)

  useEffect(() => {
    Registry.policeLightL[slot] = leftRef.current
    Registry.policeLightR[slot] = rightRef.current
    return () => {
      Registry.policeLightL[slot] = null
      Registry.policeLightR[slot] = null
    }
  }, [slot, classId])

  return (
    <group>
      <VoxelVehicle def={def} />

      {/* Accent stripe along the body sides */}
      <mesh position={[0, H * 0.5, 0]}>
        <boxGeometry args={[W + 0.04, 0.26, L * 0.66]} />
        <meshStandardMaterial color={cls.accent} roughness={0.5} />
      </mesh>

      {cls.lightbar ? (
        /* Twin-bulb police lightbar */
        <group position={[0, H + 0.12, L * 0.05]}>
          <mesh position={[-0.26, 0, 0]}>
            <boxGeometry args={[0.42, 0.2, 0.5]} />
            <meshStandardMaterial
              ref={leftRef}
              color="#ff2b2b"
              emissive="#ff0000"
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.26, 0, 0]}>
            <boxGeometry args={[0.42, 0.2, 0.5]} />
            <meshStandardMaterial
              ref={rightRef}
              color="#2b6bff"
              emissive="#0030ff"
              emissiveIntensity={0.2}
              toneMapped={false}
            />
          </mesh>
        </group>
      ) : (
        /* Military: armored roof + a single amber beacon */
        <group position={[0, H + 0.1, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[W * 0.7, 0.34, L * 0.5]} />
            <meshStandardMaterial color={cls.accent} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.32, 0.24, 0.32]} />
            <meshStandardMaterial
              ref={leftRef}
              color="#ffb020"
              emissive="#ff8c00"
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}
