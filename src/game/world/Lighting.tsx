import { CITY, CITY_PITCH } from '@/config/constants'
import { useSettingsStore } from '@/state/useSettingsStore'

/**
 * Scene lighting: a hemisphere fill for stylized ambient plus a shadow-casting
 * "sun". The day/night cycle and neon lighting (GDD) build on this in later
 * phases; shadow casting respects the settings toggle.
 */
export function Lighting() {
  const shadows = useSettingsStore((s) => s.shadows)
  const extent = CITY.blocks * CITY_PITCH

  return (
    <>
      <hemisphereLight args={['#cfe3ff', '#2a2f3d', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[60, 90, 40]}
        intensity={1.6}
        color="#fff4e0"
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
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
