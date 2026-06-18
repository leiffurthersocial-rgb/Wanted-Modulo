import type { VehicleDef } from '@/types'

interface Props {
  def: VehicleDef
}

/**
 * Parametric voxel vehicle built from boxes, driven by the catalog definition
 * (dimensions + color). Oriented with its length along +Z so rotation.y =
 * heading aligns the body with travel direction.
 */
export function VoxelVehicle({ def }: Props) {
  const { length: L, width: W, height: H } = def.size
  const wheelR = 0.36
  const bodyH = H - wheelR
  const bodyY = wheelR + bodyH / 2

  // Cabin sits on the rear-middle of the body; sports cars get a lower cabin.
  const cabinH = bodyH * (def.category === 'sports' ? 0.6 : 0.85)
  const cabinL = L * 0.5
  const cabinY = wheelR + bodyH + cabinH / 2 - 0.02

  const wheelX = W / 2 - 0.05
  const wheelZ = L / 2 - wheelR - 0.15

  const glass = '#1b2433'

  return (
    <group>
      {/* Main body */}
      <mesh castShadow position={[0, bodyY, 0]}>
        <boxGeometry args={[W, bodyH, L]} />
        <meshStandardMaterial color={def.color} metalness={0.0} roughness={0.6} flatShading />
      </mesh>

      {/* Cabin / roof */}
      <mesh castShadow position={[0, cabinY, -L * 0.05]}>
        <boxGeometry args={[W * 0.86, cabinH, cabinL]} />
        <meshStandardMaterial color={glass} metalness={0.1} roughness={0.3} />
      </mesh>

      {/* Headlights (front = +Z) */}
      <mesh position={[-W * 0.3, bodyY, L / 2 + 0.01]}>
        <boxGeometry args={[0.22, 0.16, 0.04]} />
        <meshStandardMaterial color="#fff6cc" emissive="#fff6cc" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[W * 0.3, bodyY, L / 2 + 0.01]}>
        <boxGeometry args={[0.22, 0.16, 0.04]} />
        <meshStandardMaterial color="#fff6cc" emissive="#fff6cc" emissiveIntensity={0.6} />
      </mesh>

      {/* Tail lights (rear = -Z) */}
      <mesh position={[-W * 0.3, bodyY, -L / 2 - 0.01]}>
        <boxGeometry args={[0.22, 0.16, 0.04]} />
        <meshStandardMaterial color="#ff3b3b" emissive="#ff1a1a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[W * 0.3, bodyY, -L / 2 - 0.01]}>
        <boxGeometry args={[0.22, 0.16, 0.04]} />
        <meshStandardMaterial color="#ff3b3b" emissive="#ff1a1a" emissiveIntensity={0.5} />
      </mesh>

      {/* Wheels */}
      {[
        [-wheelX, wheelR, wheelZ],
        [wheelX, wheelR, wheelZ],
        [-wheelX, wheelR, -wheelZ],
        [wheelX, wheelR, -wheelZ],
      ].map(([x, y, z], i) => (
        <mesh key={i} castShadow position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[wheelR, wheelR, 0.24, 12]} />
          <meshStandardMaterial color="#15171c" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}
