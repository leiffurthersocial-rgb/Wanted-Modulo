import { useMemo } from 'react'
import { leftNormal, sampleAt } from '@/game/world/track'
import { mulberry32 } from '@/game/world/cityModel'
import type { RaceState } from './raceState'

/**
 * Decorative roadside scenery that gives each race circuit its own look — palms
 * on the coast, pines on the ridge, neon pylons on the skyline, crystals on the
 * Impossible track, and so on. Purely cosmetic (no collisions): placed
 * deterministically just off both verges so every run of a track looks the same.
 */

type Kind = 'palm' | 'pine' | 'flag' | 'rock' | 'cactus' | 'neon' | 'hazard' | 'crystal'

/** Which decor kinds line each themed circuit. */
const THEMES: Record<string, Kind[]> = {
  palm: ['palm', 'palm', 'rock'],
  pine: ['pine', 'pine', 'rock'],
  flag: ['flag', 'pine', 'flag'],
  canyon: ['rock', 'cactus', 'rock'],
  neon: ['neon', 'neon', 'flag'],
  hazard: ['hazard', 'rock', 'hazard'],
  crystal: ['crystal', 'crystal', 'rock'],
}

interface Placed {
  x: number
  y: number
  z: number
  rot: number
  scale: number
  kind: Kind
  tint: number
}

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function Scenery({ race }: { race: RaceState }) {
  const items = useMemo<Placed[]>(() => {
    const t = race.track
    const kinds = THEMES[t.theme]
    if (!kinds) return []
    const rng = mulberry32(hashId(t.id))
    const out: Placed[] = []
    const STEP = 16
    for (let s = 0; s < t.length; s += STEP) {
      const sp = sampleAt(t, s)
      const n = leftNormal(sp.tan)
      for (const side of [-1, 1] as const) {
        if (rng() < 0.18) continue // leave gaps in the lining
        const off = (t.half + 1.6 + rng() * 3) * side
        out.push({
          x: sp.pos.x + n.x * off,
          y: sp.y,
          z: sp.pos.z + n.z * off,
          rot: rng() * Math.PI * 2,
          scale: 0.85 + rng() * 0.6,
          kind: kinds[(rng() * kinds.length) | 0],
          tint: rng(),
        })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race])

  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={[it.x, it.y, it.z]} rotation={[0, it.rot, 0]} scale={it.scale}>
          {/* Planter base so decor reads as grounded on the verge, not floating. */}
          <mesh position={[0, -1.4, 0]}>
            <boxGeometry args={[1.5, 3, 1.5]} />
            <meshStandardMaterial color="#2c2f3a" roughness={0.95} />
          </mesh>
          <Decor kind={it.kind} tint={it.tint} />
        </group>
      ))}
    </>
  )
}

function Decor({ kind, tint }: { kind: Kind; tint: number }) {
  switch (kind) {
    case 'palm':
      return <Palm tint={tint} />
    case 'pine':
      return <Pine tint={tint} />
    case 'flag':
      return <Flag tint={tint} />
    case 'rock':
      return <Rock tint={tint} />
    case 'cactus':
      return <Cactus />
    case 'neon':
      return <Neon tint={tint} />
    case 'hazard':
      return <Hazard />
    case 'crystal':
      return <Crystal tint={tint} />
  }
}

function Palm({ tint }: { tint: number }) {
  const frond = tint > 0.5 ? '#3fae54' : '#2f9d6a'
  return (
    <group>
      {/* Trunk: a couple of stacked, slightly leaning segments */}
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0.06]} castShadow>
        <boxGeometry args={[0.4, 2.8, 0.4]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 3.0, 0]} rotation={[0, 0, 0.16]} castShadow>
        <boxGeometry args={[0.36, 1.4, 0.36]} />
        <meshStandardMaterial color="#9a774a" roughness={0.9} />
      </mesh>
      {/* Fronds radiating from the crown */}
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2
        return (
          <mesh
            key={k}
            position={[0.3 + Math.cos(a) * 0.9, 3.7, Math.sin(a) * 0.9]}
            rotation={[0.5, a, 0.4]}
            castShadow
          >
            <boxGeometry args={[0.18, 0.14, 2.0]} />
            <meshStandardMaterial color={frond} roughness={0.7} />
          </mesh>
        )
      })}
      {/* Coconuts */}
      <mesh position={[0.3, 3.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#5a3f22" />
      </mesh>
    </group>
  )
}

function Pine({ tint }: { tint: number }) {
  const green = tint > 0.5 ? '#2f7d44' : '#27613a'
  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.4, 1.6, 0.4]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[0, 1.8 + k * 1.0, 0]} castShadow>
          <boxGeometry args={[2.0 - k * 0.55, 1.0, 2.0 - k * 0.55]} />
          <meshStandardMaterial color={green} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Flag({ tint }: { tint: number }) {
  const c = tint > 0.5 ? '#ff5252' : '#ffd23f'
  return (
    <group>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[0.18, 4.4, 0.18]} />
        <meshStandardMaterial color="#dfe6f0" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0.85, 3.7, 0]}>
        <boxGeometry args={[1.5, 0.9, 0.08]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2} roughness={0.6} />
      </mesh>
    </group>
  )
}

function Rock({ tint }: { tint: number }) {
  const c = tint > 0.5 ? '#6b6f78' : '#565b66'
  return (
    <group>
      <mesh position={[0, 0.6, 0]} rotation={[0.1, 0.4, 0.15]} castShadow>
        <boxGeometry args={[1.6, 1.2, 1.4]} />
        <meshStandardMaterial color={c} roughness={1} />
      </mesh>
      <mesh position={[0.6, 1.1, 0.3]} rotation={[0.3, 0.8, 0]} castShadow>
        <boxGeometry args={[0.9, 0.8, 0.8]} />
        <meshStandardMaterial color={c} roughness={1} />
      </mesh>
    </group>
  )
}

function Cactus() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.6, 3, 0.6]} />
        <meshStandardMaterial color="#3f8f4f" roughness={0.8} />
      </mesh>
      <mesh position={[0.6, 1.8, 0]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.5]} />
        <meshStandardMaterial color="#3f8f4f" roughness={0.8} />
      </mesh>
      <mesh position={[0.95, 2.3, 0]} castShadow>
        <boxGeometry args={[0.5, 1.0, 0.5]} />
        <meshStandardMaterial color="#3f8f4f" roughness={0.8} />
      </mesh>
      <mesh position={[-0.55, 2.2, 0]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.5]} />
        <meshStandardMaterial color="#3f8f4f" roughness={0.8} />
      </mesh>
    </group>
  )
}

function Neon({ tint }: { tint: number }) {
  const c = tint > 0.5 ? '#22e0ff' : '#ff3df0'
  return (
    <group>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[0.3, 5.2, 0.3]} />
        <meshStandardMaterial color="#11151c" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 4.0, 0]}>
        <boxGeometry args={[0.5, 2.2, 0.5]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 5.3, 0]}>
        <boxGeometry args={[1.2, 0.25, 1.2]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Hazard() {
  return (
    <group>
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[0.5, 2.6, 0.5]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.6} />
      </mesh>
      {[0.6, 1.3, 2.0].map((y, k) => (
        <mesh key={k} position={[0, y, 0]}>
          <boxGeometry args={[0.56, 0.4, 0.56]} />
          <meshStandardMaterial
            color={k % 2 ? '#ffd23f' : '#1a1d24'}
            emissive={k % 2 ? '#ffae00' : '#000000'}
            emissiveIntensity={k % 2 ? 0.4 : 0}
          />
        </mesh>
      ))}
    </group>
  )
}

function Crystal({ tint }: { tint: number }) {
  const c = tint > 0.5 ? '#9b6bff' : '#3fe0d0'
  return (
    <group>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0.5, 0.12]} castShadow>
        <boxGeometry args={[0.7, 3.2, 0.7]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} toneMapped={false} roughness={0.2} />
      </mesh>
      <mesh position={[0.7, 1.0, 0.3]} rotation={[0.2, 0, -0.3]} castShadow>
        <boxGeometry args={[0.4, 1.8, 0.4]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.7} toneMapped={false} roughness={0.2} />
      </mesh>
      <mesh position={[-0.6, 0.8, -0.2]} rotation={[0.1, 0.4, 0.35]} castShadow>
        <boxGeometry args={[0.35, 1.3, 0.35]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.7} toneMapped={false} roughness={0.2} />
      </mesh>
    </group>
  )
}
