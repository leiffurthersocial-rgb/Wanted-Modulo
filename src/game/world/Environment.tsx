import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY, CITY_PITCH } from '@/config/constants'
import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { Registry } from '@/game/sim/registry'

const DAY_LENGTH = 150 // seconds for a full day/night cycle
const DAY_BG = new THREE.Color('#aac4e6')
const NIGHT_BG = new THREE.Color('#0a1022')
const WARM = new THREE.Color('#ffd2a0')
const COOL = new THREE.Color('#fff4e0')

const tmpColor = new THREE.Color()

/**
 * Dynamic lighting + day/night cycle. The sun arcs over the run; at dusk/night
 * the sky darkens and building windows (emissive) light up. Drives shadows per
 * the settings toggle. Atmosphere ties the world together (GDD §5).
 */
export function Environment() {
  const { scene } = useThree()
  const shadows = useSettingsStore((s) => s.shadows)
  const graphics = useSettingsStore((s) => s.graphics)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)

  const extent = CITY.blocks * CITY_PITCH
  const shadowSize = graphics === 'ultra' ? 4096 : graphics === 'high' ? 2048 : 1024

  useFrame(() => {
    const time = useGameStore.getState().stats.time
    const phase = (time / DAY_LENGTH + 0.2) % 1
    const ang = phase * Math.PI * 2
    const ele = Math.sin(ang)
    const dayFactor = THREE.MathUtils.clamp(ele * 0.6 + 0.5, 0, 1)
    const nightFactor = THREE.MathUtils.clamp(1 - dayFactor * 1.3, 0, 1)

    const sun = sunRef.current
    if (sun) {
      sun.position.set(Math.cos(ang) * 90, Math.max(6, 20 + ele * 80), Math.sin(ang) * 90)
      sun.intensity = 0.15 + dayFactor * 1.7
      sun.color.copy(WARM).lerp(COOL, dayFactor)
    }
    if (hemiRef.current) hemiRef.current.intensity = 0.25 + dayFactor * 0.7
    if (ambientRef.current) ambientRef.current.intensity = 0.12 + dayFactor * 0.2

    tmpColor.copy(NIGHT_BG).lerp(DAY_BG, dayFactor)
    if (scene.background instanceof THREE.Color) scene.background.copy(tmpColor)
    if (scene.fog) scene.fog.color.copy(tmpColor)

    if (Registry.cityMaterial) Registry.cityMaterial.emissiveIntensity = nightFactor * 1.5
  })

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#cfe3ff', '#2a2f3d', 0.9]} />
      <ambientLight ref={ambientRef} intensity={0.25} />
      <directionalLight
        ref={sunRef}
        position={[60, 90, 40]}
        intensity={1.6}
        color="#fff4e0"
        castShadow={shadows}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-camera-left={-extent / 2}
        shadow-camera-right={extent / 2}
        shadow-camera-top={extent / 2}
        shadow-camera-bottom={-extent / 2}
        shadow-bias={-0.0004}
      />
    </>
  )
}
