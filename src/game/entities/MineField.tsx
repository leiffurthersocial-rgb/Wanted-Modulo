import { MINES } from '@/config/constants'
import { Registry } from '@/game/sim/registry'

/**
 * Pooled police ground bombs (survive mode). Each is a squat voxel charge with a
 * warning light; the sim drives position, visibility and the blink via the
 * render Registry.
 */
export function MineField() {
  return (
    <>
      {Array.from({ length: MINES.max }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(el) => {
            Registry.mines[i] = el
          }}
        >
          {/* Casing */}
          <mesh castShadow position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.7, 0.85, 0.36, 8]} />
            <meshStandardMaterial color="#1c2230" roughness={0.7} />
          </mesh>
          {/* Hazard band */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.72, 0.72, 0.12, 8]} />
            <meshStandardMaterial color="#f2c200" roughness={0.5} />
          </mesh>
          {/* Warning light (blink driven by the sim) */}
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial
              color="#ff3b30"
              emissive="#ff2a20"
              emissiveIntensity={1}
              ref={(el) => {
                Registry.mineLights[i] = el
              }}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}
