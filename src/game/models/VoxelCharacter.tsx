import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CharacterDef, HairStyle } from '@/types'
import { Registry } from '@/game/sim/registry'

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
    case 'side':
      // Short hair with a swept side part.
      return (
        <group>
          <mesh castShadow position={[0, top, 0]}>
            <boxGeometry args={[s * 1.06, s * 0.36, s * 1.06]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[-s * 0.36, top + s * 0.04, s * 0.2]}>
            <boxGeometry args={[s * 0.4, s * 0.3, s * 0.7]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, headY + s * 0.1, -s * 0.48]}>
            <boxGeometry args={[s * 1.06, s * 0.7, s * 0.16]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </group>
      )
    case 'bob':
      // Clean chin-length bob — a normal, tidy cut.
      return (
        <group>
          <mesh castShadow position={[0, top, 0]}>
            <boxGeometry args={[s * 1.1, s * 0.4, s * 1.1]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
          {/* sides framing the face, stopping around the jaw */}
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} castShadow position={[sgn * s * 0.56, headY + s * 0.04, -s * 0.04]}>
              <boxGeometry args={[s * 0.16, s * 0.78, s * 1.04]} />
              <meshStandardMaterial color={color} roughness={0.82} />
            </mesh>
          ))}
          {/* back */}
          <mesh castShadow position={[0, headY + s * 0.02, -s * 0.54]}>
            <boxGeometry args={[s * 1.1, s * 0.92, s * 0.2]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
        </group>
      )
    case 'long':
      // Full hair falling past the shoulders.
      return (
        <group>
          <mesh castShadow position={[0, top, 0]}>
            <boxGeometry args={[s * 1.1, s * 0.4, s * 1.1]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
          {/* sides */}
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} castShadow position={[sgn * s * 0.56, headY - s * 0.2, -s * 0.06]}>
              <boxGeometry args={[s * 0.18, s * 1.2, s * 1.0]} />
              <meshStandardMaterial color={color} roughness={0.82} />
            </mesh>
          ))}
          {/* back fall */}
          <mesh castShadow position={[0, headY - s * 0.35, -s * 0.56]}>
            <boxGeometry args={[s * 1.1, s * 1.5, s * 0.2]} />
            <meshStandardMaterial color={color} roughness={0.82} />
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
  const shoulderY = torsoY + armH * 0.43

  // Limb pivots for the walk cycle.
  const lLeg = useRef<THREE.Group>(null)
  const rLeg = useRef<THREE.Group>(null)
  const lArm = useRef<THREE.Group>(null)
  const rArm = useRef<THREE.Group>(null)
  const phase = useRef(0)

  useFrame((_, dt) => {
    const onFoot = Registry.playerOnFoot
    const spd = onFoot ? Registry.playerSpeed : 0
    const moving = spd > 0.5
    phase.current += spd * dt * 1.15
    const amp = Math.min(0.95, spd * 0.13)
    const swing = Math.sin(phase.current * 2) * amp
    const decay = 1 - Math.min(1, dt * 8)
    const set = (g: THREE.Group | null, target: number) => {
      if (g) g.rotation.x = moving ? target : g.rotation.x * decay
    }
    set(lLeg.current, swing)
    set(rLeg.current, -swing)
    set(lArm.current, -swing * 0.85)
    set(rArm.current, swing * 0.85)
  })

  return (
    <group>
      {/* Legs (+ shoes) — pivot at the hip for the walk cycle */}
      {([[-legGap, lLeg], [legGap, rLeg]] as const).map(([gx, ref], i) => (
        <group key={i} ref={ref} position={[gx, torsoBottom, 0]}>
          <mesh castShadow position={[0, legY - torsoBottom, 0]}>
            <boxGeometry args={[legW, legH, 0.3]} />
            <meshStandardMaterial color={def.pants} />
          </mesh>
          <mesh castShadow position={[0, shoeH / 2 - torsoBottom, 0.06]}>
            <boxGeometry args={[legW, shoeH, 0.42]} />
            <meshStandardMaterial color={def.shoes} roughness={0.7} />
          </mesh>
        </group>
      ))}

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

      {/* Arms (skin sleeves below the shirt) — pivot at the shoulder */}
      {([[-1, lArm], [1, rArm]] as const).map(([sgn, ref], i) => (
        <group key={i} ref={ref} position={[sgn * armX, shoulderY, 0]}>
          <mesh castShadow position={[0, torsoY + armH * 0.18 - shoulderY, 0]}>
            <boxGeometry args={[armW, armH * 0.5, 0.32]} />
            <meshStandardMaterial color={def.shirt} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, torsoY - armH * 0.22 - shoulderY, 0]}>
            <boxGeometry args={[armW * 0.92, armH * 0.5, 0.3]} />
            <meshStandardMaterial color={def.skin} />
          </mesh>
          {/* Hand */}
          <mesh castShadow position={[0, torsoY - armH * 0.5 - shoulderY, 0]}>
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

      {/* Beard (jaw + chin) */}
      {def.beard && (
        <group>
          <mesh castShadow position={[0, headY - headSize * 0.34, headSize * 0.36]}>
            <boxGeometry args={[headSize * 0.92, headSize * 0.42, headSize * 0.34]} />
            <meshStandardMaterial color={def.hair} roughness={0.95} />
          </mesh>
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} castShadow position={[sgn * headSize * 0.42, headY - headSize * 0.12, headSize * 0.18]}>
              <boxGeometry args={[headSize * 0.16, headSize * 0.5, headSize * 0.5]} />
              <meshStandardMaterial color={def.hair} roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}

      {/* Glasses (frames + bridge) */}
      {def.glasses && (
        <group>
          {[-1, 1].map((sgn) => (
            <mesh key={sgn} position={[sgn * headSize * 0.2, headY + headSize * 0.06, headSize * 0.52]}>
              <boxGeometry args={[0.16, 0.16, 0.04]} />
              <meshStandardMaterial color="#15171c" roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, headY + headSize * 0.06, headSize * 0.52]}>
            <boxGeometry args={[0.12, 0.04, 0.03]} />
            <meshStandardMaterial color="#15171c" roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  )
}
