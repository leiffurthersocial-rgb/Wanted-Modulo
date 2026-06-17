import { useMemo } from 'react'
import type { CharacterDef, HairStyle } from '@/types'

interface Props {
  def: CharacterDef
}

/** Hair built per style so the four characters read differently at a glance. */
function Hair({ style, color, headY, headSize }: {
  style: HairStyle
  color: string
  headY: number
  headSize: number
}) {
  const s = headSize
  const top = headY + s * 0.42
  switch (style) {
    case 'buzz':
      return (
        <mesh castShadow position={[0, headY + s * 0.34, -s * 0.02]}>
          <boxGeometry args={[s * 1.02, s * 0.5, s * 1.02]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      )
    case 'short':
      return (
        <group>
          <mesh castShadow position={[0, top, 0]}>
            <boxGeometry args={[s * 1.06, s * 0.34, s * 1.06]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, headY + s * 0.1, -s * 0.48]}>
            <boxGeometry args={[s * 1.06, s * 0.7, s * 0.16]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </group>
      )
    case 'messy':
      return (
        <group>
          <mesh castShadow position={[0, top, 0]}>
            <boxGeometry args={[s * 1.08, s * 0.4, s * 1.08]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          <mesh castShadow position={[-s * 0.3, top + s * 0.22, s * 0.1]} rotation={[0.2, 0, 0.3]}>
            <boxGeometry args={[s * 0.3, s * 0.3, s * 0.3]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          <mesh castShadow position={[s * 0.28, top + s * 0.2, -s * 0.1]} rotation={[0.1, 0, -0.4]}>
            <boxGeometry args={[s * 0.26, s * 0.26, s * 0.26]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          <mesh castShadow position={[0, headY + s * 0.05, -s * 0.5]}>
            <boxGeometry args={[s * 1.08, s * 0.8, s * 0.16]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
        </group>
      )
    case 'ponytail':
    default:
      return (
        <group>
          <mesh castShadow position={[0, top, 0]}>
            <boxGeometry args={[s * 1.08, s * 0.36, s * 1.08]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* swept sides */}
          <mesh castShadow position={[0, headY + s * 0.08, -s * 0.5]}>
            <boxGeometry args={[s * 1.08, s * 0.74, s * 0.16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* ponytail */}
          <mesh castShadow position={[0, headY - s * 0.1, -s * 0.62]}>
            <boxGeometry args={[s * 0.34, s * 0.9, s * 0.34]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      )
  }
}

/**
 * Parametric voxel character built from boxes, driven entirely by the character
 * definition (skin/hair/eyes/outfit + build). Origin at the feet, facing +Z.
 */
export function VoxelCharacter({ def }: Props) {
  const w = def.width
  const h = def.height

  const dims = useMemo(() => {
    const shoeH = 0.14
    const legH = 0.5 * h
    const torsoH = 0.6 * h
    const headSize = 0.42
    const torsoBottom = shoeH + legH
    return {
      shoeH,
      legH,
      torsoH,
      headSize,
      torsoBottom,
      legY: shoeH + legH / 2,
      torsoY: torsoBottom + torsoH / 2,
      headY: torsoBottom + torsoH + 0.12 + headSize / 2,
      bodyW: 0.6 * w,
      legW: 0.24 * w,
      armW: 0.17 * w,
      legGap: 0.16 * w,
    }
  }, [w, h])

  const { shoeH, legH, torsoH, headSize, torsoBottom, legY, torsoY, headY, bodyW, legW, armW, legGap } = dims
  const armH = torsoH * 0.94
  const armX = bodyW / 2 + armW / 2 - 0.02

  return (
    <group>
      {/* Shoes */}
      <mesh castShadow position={[-legGap, shoeH / 2, 0.06]}>
        <boxGeometry args={[legW, shoeH, 0.42]} />
        <meshStandardMaterial color={def.shoes} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[legGap, shoeH / 2, 0.06]}>
        <boxGeometry args={[legW, shoeH, 0.42]} />
        <meshStandardMaterial color={def.shoes} roughness={0.7} />
      </mesh>

      {/* Legs */}
      <mesh castShadow position={[-legGap, legY, 0]}>
        <boxGeometry args={[legW, legH, 0.3]} />
        <meshStandardMaterial color={def.pants} />
      </mesh>
      <mesh castShadow position={[legGap, legY, 0]}>
        <boxGeometry args={[legW, legH, 0.3]} />
        <meshStandardMaterial color={def.pants} />
      </mesh>

      {/* Belt */}
      <mesh castShadow position={[0, torsoBottom + 0.04, 0]}>
        <boxGeometry args={[bodyW + 0.02, 0.1, 0.42]} />
        <meshStandardMaterial color="#1d1f26" roughness={0.8} />
      </mesh>

      {/* Torso */}
      <mesh castShadow position={[0, torsoY, 0]}>
        <boxGeometry args={[bodyW, torsoH, 0.4]} />
        <meshStandardMaterial color={def.shirt} roughness={0.7} />
      </mesh>

      {/* Arms (skin sleeves below the shirt) */}
      {[-1, 1].map((sgn) => (
        <group key={sgn}>
          <mesh castShadow position={[sgn * armX, torsoY + armH * 0.18, 0]}>
            <boxGeometry args={[armW, armH * 0.5, 0.32]} />
            <meshStandardMaterial color={def.shirt} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[sgn * armX, torsoY - armH * 0.22, 0]}>
            <boxGeometry args={[armW * 0.92, armH * 0.5, 0.3]} />
            <meshStandardMaterial color={def.skin} />
          </mesh>
          {/* Hand */}
          <mesh castShadow position={[sgn * armX, torsoY - armH * 0.5, 0]}>
            <boxGeometry args={[armW, 0.16, 0.32]} />
            <meshStandardMaterial color={def.skin} />
          </mesh>
        </group>
      ))}

      {/* Neck */}
      <mesh castShadow position={[0, torsoBottom + torsoH + 0.04, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.2]} />
        <meshStandardMaterial color={def.skin} />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, headY, 0]}>
        <boxGeometry args={[headSize, headSize, headSize]} />
        <meshStandardMaterial color={def.skin} />
      </mesh>

      {/* Hair */}
      <Hair style={def.hairStyle} color={def.hair} headY={headY} headSize={headSize} />

      {/* Eyes */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * headSize * 0.2, headY + headSize * 0.06, headSize * 0.5]}>
          <boxGeometry args={[0.08, 0.09, 0.04]} />
          <meshStandardMaterial color={def.eyes} />
        </mesh>
      ))}
      {/* Brows */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * headSize * 0.2, headY + headSize * 0.2, headSize * 0.5]}>
          <boxGeometry args={[0.11, 0.03, 0.04]} />
          <meshStandardMaterial color={def.hair} />
        </mesh>
      ))}
      {/* Mouth */}
      <mesh position={[0, headY - headSize * 0.2, headSize * 0.5]}>
        <boxGeometry args={[0.14, 0.03, 0.04]} />
        <meshStandardMaterial color="#9b5b4d" />
      </mesh>
    </group>
  )
}
