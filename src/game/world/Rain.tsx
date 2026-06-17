import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSettingsStore } from '@/state/useSettingsStore'

const SPREAD = 60
const TOP = 40

/**
 * Instanced rain that follows the camera. One draw call; count scales with the
 * graphics preset. Gated by the weather setting.
 */
export function Rain() {
  const weather = useSettingsStore((s) => s.weather)
  const graphics = useSettingsStore((s) => s.graphics)
  const { camera } = useThree()
  const ref = useRef<THREE.InstancedMesh>(null)

  const count = useMemo(() => {
    if (!weather) return 0
    return graphics === 'ultra' ? 1600 : graphics === 'high' ? 1000 : graphics === 'medium' ? 600 : 300
  }, [weather, graphics])

  const drops = useMemo(() => {
    const arr = new Float32Array(count * 4) // x, y, z, speed
    for (let i = 0; i < count; i++) {
      arr[i * 4] = (Math.random() - 0.5) * SPREAD * 2
      arr[i * 4 + 1] = Math.random() * TOP
      arr[i * 4 + 2] = (Math.random() - 0.5) * SPREAD * 2
      arr[i * 4 + 3] = 32 + Math.random() * 26
    }
    return arr
  }, [count])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (mesh) mesh.frustumCulled = false
  }, [count])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const s = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const p = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh || count === 0) return
    const dt = Math.min(delta, 0.05)
    const cx = camera.position.x
    const cz = camera.position.z
    for (let i = 0; i < count; i++) {
      let y = drops[i * 4 + 1] - drops[i * 4 + 3] * dt
      if (y < 0) {
        y = TOP
        drops[i * 4] = cx + (Math.random() - 0.5) * SPREAD * 2
        drops[i * 4 + 2] = cz + (Math.random() - 0.5) * SPREAD * 2
      }
      drops[i * 4 + 1] = y
      p.set(drops[i * 4], y, drops[i * 4 + 2])
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (count === 0) return null

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.035, 0.7, 0.035]} />
      <meshBasicMaterial color="#9fb8d8" transparent opacity={0.45} />
    </instancedMesh>
  )
}
