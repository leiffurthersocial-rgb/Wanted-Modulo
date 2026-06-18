import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getProps, propVersion, PROP_CAPACITY } from '@/game/world/propModel'
import { sampleHeight } from '@/game/world/terrain'
import { PROP_TYPES, PROP_TYPE_LIST, type PropType } from '@/game/world/propCatalog'
import { Registry } from '@/game/sim/registry'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)

/**
 * Destructible props for the infinite world: one InstancedMesh per type at fixed
 * `PROP_CAPACITY`, refilled whenever the streaming prop window regenerates
 * (propVersion changes). The simulation hides smashed props by zeroing their
 * matrices via the Registry between regenerations.
 */
export function PropField() {
  const bodyRefs = useRef<Partial<Record<PropType, THREE.InstancedMesh | null>>>({})
  const capRefs = useRef<Partial<Record<PropType, THREE.InstancedMesh | null>>>({})
  const lastVersion = useRef(-1)

  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), pos: new THREE.Vector3(), scl: new THREE.Vector3(1, 1, 1), yAxis: new THREE.Vector3(0, 1, 0) }),
    [],
  )

  useFrame(() => {
    const v = propVersion()
    if (v === lastVersion.current) return
    lastVersion.current = v
    const { props } = getProps()
    const { m, q, pos, scl, yAxis } = scratch

    // Clear every slot, then place the active window's props.
    for (const type of PROP_TYPE_LIST) {
      const b = bodyRefs.current[type]
      const c = capRefs.current[type]
      for (let i = 0; i < PROP_CAPACITY; i++) {
        if (b) b.setMatrixAt(i, ZERO)
        if (c) c.setMatrixAt(i, ZERO)
      }
    }

    for (const prop of props) {
      const tdef = PROP_TYPES[prop.type]
      const by = sampleHeight(prop.x, prop.z)
      q.setFromAxisAngle(yAxis, prop.rot)
      const body = bodyRefs.current[prop.type]
      if (body) {
        pos.set(prop.x, by + tdef.body.y, prop.z)
        m.compose(pos, q, scl)
        body.setMatrixAt(prop.typeIndex, m)
      }
      if (tdef.cap) {
        const cap = capRefs.current[prop.type]
        if (cap) {
          pos.set(prop.x, by + tdef.cap.y, prop.z)
          m.compose(pos, q, scl)
          cap.setMatrixAt(prop.typeIndex, m)
        }
      }
    }

    for (const type of PROP_TYPE_LIST) {
      const b = bodyRefs.current[type]
      if (b) b.instanceMatrix.needsUpdate = true
      const c = capRefs.current[type]
      if (c) c.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {PROP_TYPE_LIST.map((type) => {
        const tdef = PROP_TYPES[type]
        return (
          <group key={type}>
            <instancedMesh
              args={[undefined, undefined, PROP_CAPACITY]}
              castShadow
              receiveShadow
              frustumCulled={false}
              ref={(el) => {
                bodyRefs.current[type] = el
                Registry.props[type] = el
              }}
            >
              <boxGeometry args={tdef.body.size} />
              <meshStandardMaterial color={tdef.body.color} roughness={0.8} />
            </instancedMesh>

            {tdef.cap && (
              <instancedMesh
                args={[undefined, undefined, PROP_CAPACITY]}
                castShadow
                frustumCulled={false}
                ref={(el) => {
                  capRefs.current[type] = el
                  Registry.propsCap[type] = el
                }}
              >
                <boxGeometry args={tdef.cap.size} />
                <meshStandardMaterial
                  color={tdef.cap.color}
                  emissive={tdef.cap.emissive ?? '#000000'}
                  emissiveIntensity={tdef.cap.emissive ? 0.9 : 0}
                  roughness={0.6}
                />
              </instancedMesh>
            )}
          </group>
        )
      })}
    </>
  )
}
