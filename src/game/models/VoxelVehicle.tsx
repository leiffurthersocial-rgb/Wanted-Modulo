import type { VehicleDef } from '@/types'

interface Props {
  def: VehicleDef
}

/** Slightly darken a hex colour for trims/underbody (no deps, deterministic). */
function shade(hex: string, f: number): string {
  const c = hex.replace('#', '')
  const n = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16)
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)))
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)))
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Parametric voxel vehicle built from boxes, driven by the catalog definition.
 * Detailed for a clean, "production" toy-car read: two-tone body, glass cabin
 * with side windows, bumpers, wheel arches and lights. Oriented length along
 * +Z so rotation.y = heading aligns the body with travel direction.
 */
export function VoxelVehicle({ def }: Props) {
  const { length: L, width: W, height: H } = def.size
  const wheelR = 0.34
  const bodyH = H - wheelR
  const bodyY = wheelR + bodyH / 2

  const sporty = def.category === 'sports' || def.category === 'muscle'
  const cabinH = bodyH * (sporty ? 0.55 : 0.8)
  const cabinL = L * (sporty ? 0.42 : 0.5)
  const cabinY = wheelR + bodyH + cabinH / 2 - 0.04

  const wheelX = W / 2 - 0.04
  const wheelZ = L / 2 - wheelR - 0.18

  const glass = '#22425e'
  const trim = shade(def.color, 0.72)
  const roof = shade(def.color, 0.86)
  const tyre = '#15171c'
  const rim = '#cfd6e0'

  return (
    <group>
      {/* Underbody / chassis */}
      <mesh castShadow position={[0, wheelR + 0.04, 0]}>
        <boxGeometry args={[W * 1.02, 0.22, L * 0.98]} />
        <meshStandardMaterial color={trim} roughness={0.7} />
      </mesh>

      {/* Main body */}
      <mesh castShadow position={[0, bodyY + 0.04, 0]}>
        <boxGeometry args={[W, bodyH * 0.92, L]} />
        <meshStandardMaterial color={def.color} metalness={0.15} roughness={0.42} />
      </mesh>

      {/* Beltline trim */}
      <mesh position={[0, wheelR + bodyH * 0.9, 0]}>
        <boxGeometry args={[W * 1.012, 0.1, L * 0.97]} />
        <meshStandardMaterial color={trim} roughness={0.6} />
      </mesh>

      {/* Cabin glass */}
      <mesh castShadow position={[0, cabinY, -L * 0.04]}>
        <boxGeometry args={[W * 0.9, cabinH, cabinL]} />
        <meshStandardMaterial color={glass} metalness={0.3} roughness={0.18} />
      </mesh>
      {/* Roof cap (body colour) */}
      <mesh castShadow position={[0, cabinY + cabinH / 2 + 0.02, -L * 0.04]}>
        <boxGeometry args={[W * 0.92, 0.1, cabinL * 0.96]} />
        <meshStandardMaterial color={roof} roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Pillars / side window frame */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * W * 0.455, cabinY, -L * 0.04]}>
          <boxGeometry args={[0.05, cabinH, cabinL]} />
          <meshStandardMaterial color={roof} roughness={0.5} />
        </mesh>
      ))}

      {/* Bumpers */}
      {[1, -1].map((sgn) => (
        <mesh key={sgn} position={[0, wheelR + 0.26, sgn * (L / 2 - 0.08)]}>
          <boxGeometry args={[W * 0.96, 0.3, 0.22]} />
          <meshStandardMaterial color={trim} roughness={0.6} />
        </mesh>
      ))}

      {/* Headlights (front = +Z) */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * W * 0.3, bodyY + 0.05, L / 2 + 0.02]}>
          <boxGeometry args={[0.26, 0.18, 0.05]} />
          <meshStandardMaterial color="#fff6cc" emissive="#fff1b0" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Tail lights (rear = -Z) */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * W * 0.3, bodyY + 0.05, -L / 2 - 0.02]}>
          <boxGeometry args={[0.26, 0.18, 0.05]} />
          <meshStandardMaterial color="#ff3b3b" emissive="#ff1a1a" emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* Wheels + arches */}
      {[
        [-wheelX, wheelR, wheelZ],
        [wheelX, wheelR, wheelZ],
        [-wheelX, wheelR, -wheelZ],
        [wheelX, wheelR, -wheelZ],
      ].map(([x, y, z], i) => (
        <group key={i}>
          {/* arch */}
          <mesh position={[x * 0.9, y + 0.12, z]}>
            <boxGeometry args={[0.12, wheelR * 1.5, wheelR * 2.4]} />
            <meshStandardMaterial color={tyre} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelR, wheelR, 0.26, 14]} />
            <meshStandardMaterial color={tyre} roughness={0.85} />
          </mesh>
          {/* hubcap */}
          <mesh position={[x + Math.sign(x) * 0.13, y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelR * 0.5, wheelR * 0.5, 0.04, 12]} />
            <meshStandardMaterial color={rim} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
