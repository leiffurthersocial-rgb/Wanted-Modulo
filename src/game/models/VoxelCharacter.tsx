import type { CharacterDef } from '@/types'

interface Props {
  def: CharacterDef
}

/**
 * Parametric voxel character built from boxes. Cosmetic attributes (hair/eye
 * colors, build) come from the character definition so all four characters
 * share one data-driven model.
 *
 * Origin is at the feet (y = 0), facing +Z.
 */
export function VoxelCharacter({ def }: Props) {
  const w = def.width
  const h = def.height

  // Vertical layout (scaled by height).
  const legH = 0.5 * h
  const bodyH = 0.62 * h
  const headSize = 0.42
  const legY = legH / 2
  const bodyY = legH + bodyH / 2
  const headY = legH + bodyH + headSize / 2

  const bodyW = 0.62 * w
  const legW = 0.26 * w

  return (
    <group>
      {/* Legs */}
      <mesh castShadow position={[-legW * 0.6, legY, 0]}>
        <boxGeometry args={[legW, legH, 0.3]} />
        <meshStandardMaterial color={def.pants} />
      </mesh>
      <mesh castShadow position={[legW * 0.6, legY, 0]}>
        <boxGeometry args={[legW, legH, 0.3]} />
        <meshStandardMaterial color={def.pants} />
      </mesh>

      {/* Torso */}
      <mesh castShadow position={[0, bodyY, 0]}>
        <boxGeometry args={[bodyW, bodyH, 0.4]} />
        <meshStandardMaterial color={def.shirt} />
      </mesh>

      {/* Arms */}
      <mesh castShadow position={[-bodyW / 2 - 0.1, bodyY + 0.02, 0]}>
        <boxGeometry args={[0.18, bodyH * 0.92, 0.32]} />
        <meshStandardMaterial color={def.shirt} />
      </mesh>
      <mesh castShadow position={[bodyW / 2 + 0.1, bodyY + 0.02, 0]}>
        <boxGeometry args={[0.18, bodyH * 0.92, 0.32]} />
        <meshStandardMaterial color={def.shirt} />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, headY, 0]}>
        <boxGeometry args={[headSize, headSize, headSize]} />
        <meshStandardMaterial color={def.skin} />
      </mesh>

      {/* Hair cap */}
      <mesh castShadow position={[0, headY + headSize * 0.42, 0]}>
        <boxGeometry args={[headSize * 1.04, headSize * 0.3, headSize * 1.04]} />
        <meshStandardMaterial color={def.hair} />
      </mesh>
      {/* Hair back */}
      <mesh castShadow position={[0, headY + headSize * 0.05, -headSize * 0.46]}>
        <boxGeometry args={[headSize * 1.04, headSize * 0.8, headSize * 0.12]} />
        <meshStandardMaterial color={def.hair} />
      </mesh>

      {/* Eyes (face +Z) */}
      <mesh position={[-headSize * 0.2, headY + headSize * 0.05, headSize * 0.5]}>
        <boxGeometry args={[0.08, 0.08, 0.04]} />
        <meshStandardMaterial color={def.eyes} />
      </mesh>
      <mesh position={[headSize * 0.2, headY + headSize * 0.05, headSize * 0.5]}>
        <boxGeometry args={[0.08, 0.08, 0.04]} />
        <meshStandardMaterial color={def.eyes} />
      </mesh>
    </group>
  )
}
