import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { PARTICLES } from '@/config/constants'
import { Registry } from '@/game/sim/registry'

/**
 * All debris / smoke / fire particles rendered in a single InstancedMesh
 * (object pooling + one draw call). The simulation writes per-instance matrices
 * and colours each frame; inactive particles are scaled to zero.
 */
export function ParticleField() {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    const c = new THREE.Color('#000000')
    for (let i = 0; i < PARTICLES.max; i++) {
      mesh.setMatrixAt(i, zero)
      mesh.setColorAt(i, c)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.frustumCulled = false
    Registry.particles = mesh
    return () => {
      Registry.particles = null
    }
  }, [])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, PARTICLES.max]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  )
}
