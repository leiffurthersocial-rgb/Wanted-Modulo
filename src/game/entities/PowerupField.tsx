import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getPowerups, POWERUP_TYPES, type PowerupType } from '@/game/world/powerupModel'
import { sampleHeight } from '@/game/world/terrain'

const CAP = 48
const HOVER = 1.4

/** Distinct geometry + colour per powerup so they read instantly at a glance. */
const STYLE: Record<PowerupType, { color: string; emissive: string; opacity: number }> = {
  nitro: { color: '#18e0ff', emissive: '#18e0ff', opacity: 1 },
  repair: { color: '#2effa6', emissive: '#1bd07e', opacity: 1 },
  shield: { color: '#8fd0ff', emissive: '#5ab8ff', opacity: 0.78 },
  emp: { color: '#c879ff', emissive: '#a64dff', opacity: 1 },
  cloak: { color: '#d9c8ff', emissive: '#9d7bff', opacity: 0.5 },
}

function geometryFor(type: PowerupType): THREE.BufferGeometry {
  switch (type) {
    case 'nitro':
      return new THREE.ConeGeometry(0.6, 1.3, 5)
    case 'repair':
      return new THREE.BoxGeometry(0.95, 0.95, 0.95)
    case 'shield':
      return new THREE.IcosahedronGeometry(0.75, 0)
    case 'emp':
      return new THREE.TorusGeometry(0.6, 0.22, 8, 16)
    case 'cloak':
      return new THREE.OctahedronGeometry(0.78, 0)
  }
}

/**
 * Floating, spinning powerup pickups streamed around the player. One
 * InstancedMesh per type (distinct shape/colour), matrices refreshed every frame
 * for the bob/spin animation; collected pickups (alive=false) are hidden.
 */
export function PowerupField() {
  const refs = useRef<Partial<Record<PowerupType, THREE.InstancedMesh | null>>>({})
  const geoms = useMemo(() => {
    const g = {} as Record<PowerupType, THREE.BufferGeometry>
    for (const t of POWERUP_TYPES) g[t] = geometryFor(t)
    return g
  }, [])
  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), pos: new THREE.Vector3(), scl: new THREE.Vector3(1, 1, 1) }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { items } = getPowerups()
    const { m, q, e, pos, scl } = scratch
    const counts: Partial<Record<PowerupType, number>> = {}
    for (const item of items) {
      if (!item.alive) continue
      const mesh = refs.current[item.type]
      if (!mesh) continue
      const idx = counts[item.type] ?? 0
      if (idx >= CAP) continue
      counts[item.type] = idx + 1
      const bob = Math.sin(t * 2 + item.x * 0.3) * 0.18
      e.set(item.type === 'emp' ? Math.PI / 2 : 0, t * 1.6 + item.x, 0)
      q.setFromEuler(e)
      pos.set(item.x, sampleHeight(item.x, item.z) + HOVER + bob, item.z)
      m.compose(pos, q, scl)
      mesh.setMatrixAt(idx, m)
    }
    for (const t2 of POWERUP_TYPES) {
      const mesh = refs.current[t2]
      if (!mesh) continue
      mesh.count = counts[t2] ?? 0
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {POWERUP_TYPES.map((type) => {
        const st = STYLE[type]
        return (
          <instancedMesh
            key={type}
            ref={(el) => {
              refs.current[type] = el
              if (el) el.count = 0
            }}
            args={[geoms[type], undefined, CAP]}
            frustumCulled={false}
          >
            <meshStandardMaterial
              color={st.color}
              emissive={st.emissive}
              emissiveIntensity={1.1}
              roughness={0.3}
              metalness={0.1}
              transparent={st.opacity < 1}
              opacity={st.opacity}
            />
          </instancedMesh>
        )
      })}
    </>
  )
}
