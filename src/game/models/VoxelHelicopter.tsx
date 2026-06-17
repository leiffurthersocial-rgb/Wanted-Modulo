import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Registry } from '@/game/sim/registry'

interface Props {
  /** Pool slot — registers the rotor for spin animation. */
  slot: number
}

/** Voxel police helicopter: body, tail boom, skids, spotlight, spinning rotor. */
export function VoxelHelicopter({ slot }: Props) {
  const rotorRef = useRef<THREE.Group>(null)

  useEffect(() => {
    Registry.heliRotors[slot] = rotorRef.current
    return () => {
      Registry.heliRotors[slot] = null
    }
  }, [slot])

  return (
    <group>
      {/* Cabin */}
      <mesh castShadow position={[0, 0, 0.3]}>
        <boxGeometry args={[1.6, 1.5, 2.6]} />
        <meshStandardMaterial color="#1c2533" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Nose glass */}
      <mesh position={[0, -0.1, 1.6]}>
        <boxGeometry args={[1.4, 1.0, 0.6]} />
        <meshStandardMaterial color="#0d1b2a" metalness={0.2} roughness={0.2} />
      </mesh>
      {/* Tail boom */}
      <mesh castShadow position={[0, 0.2, -2.4]}>
        <boxGeometry args={[0.5, 0.5, 2.6]} />
        <meshStandardMaterial color="#27313f" />
      </mesh>
      {/* Tail fin + rotor */}
      <mesh position={[0.25, 0.5, -3.5]}>
        <boxGeometry args={[0.12, 1.0, 0.5]} />
        <meshStandardMaterial color="#1c2533" />
      </mesh>
      {/* Skids */}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, -1.0, 0.2]}>
          <boxGeometry args={[0.12, 0.12, 2.4]} />
          <meshStandardMaterial color="#10151d" />
        </mesh>
      ))}
      {/* Spotlight */}
      <mesh position={[0, -0.7, 1.4]}>
        <boxGeometry args={[0.4, 0.3, 0.3]} />
        <meshStandardMaterial color="#fff6cc" emissive="#fff2b0" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* Beacon */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#ff2b2b" emissive="#ff0000" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      {/* Main rotor (spun by the pool) */}
      <group ref={rotorRef} position={[0, 1.0, 0.2]}>
        <mesh>
          <boxGeometry args={[7.2, 0.08, 0.4]} />
          <meshStandardMaterial color="#0c0f14" />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[7.2, 0.08, 0.4]} />
          <meshStandardMaterial color="#0c0f14" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 8]} />
          <meshStandardMaterial color="#1c2533" />
        </mesh>
      </group>
    </group>
  )
}
