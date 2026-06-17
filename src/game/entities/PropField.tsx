import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getProps } from '@/game/world/propModel'
import { PROP_TYPES, PROP_TYPE_LIST, type PropType } from '@/game/world/propCatalog'
import { Registry } from '@/game/sim/registry'

/**
 * Destructible props rendered as one InstancedMesh per type (+ an optional
 * "cap" mesh for lamp heads / foliage). The simulation hides destroyed props by
 * zeroing their instance matrices via the Registry.
 */
export function PropField() {
  const { props, counts } = useMemo(() => getProps(), [])
  const bodyRefs = useRef<Partial<Record<PropType, THREE.InstancedMesh | null>>>({})
  const capRefs = useRef<Partial<Record<PropType, THREE.InstancedMesh | null>>>({})

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scl = new THREE.Vector3(1, 1, 1)
    const yAxis = new THREE.Vector3(0, 1, 0)

    for (const prop of props) {
      const tdef = PROP_TYPES[prop.type]
      q.setFromAxisAngle(yAxis, prop.rot)
      const body = bodyRefs.current[prop.type]
      if (body) {
        pos.set(prop.x, tdef.body.y, prop.z)
        m.compose(pos, q, scl)
        body.setMatrixAt(prop.typeIndex, m)
      }
      if (tdef.cap) {
        const cap = capRefs.current[prop.type]
        if (cap) {
          pos.set(prop.x, tdef.cap.y, prop.z)
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
  }, [props])

  return (
    <>
      {PROP_TYPE_LIST.map((type) => {
        const count = counts[type]
        if (!count) return null
        const tdef = PROP_TYPES[type]
        return (
          <group key={type}>
            <instancedMesh
              args={[undefined, undefined, count]}
              castShadow
              receiveShadow
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
                args={[undefined, undefined, count]}
                castShadow
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
