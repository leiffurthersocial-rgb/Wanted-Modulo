import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { Input } from '@/core/input/InputManager'
import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { City } from '@/game/world/City'
import { Lighting } from '@/game/world/Lighting'
import { Simulation } from '@/game/Simulation'

/**
 * The R3F Canvas scene root. Stays mounted across play/pause so resuming is
 * instant; unmounts only when leaving the run (menu / game over).
 */
export function Game() {
  const character = useGameStore((s) => s.selectedCharacter)
  const shadows = useSettingsStore((s) => s.shadows)

  useEffect(() => {
    Input.attach()
    return () => Input.detach()
  }, [])

  return (
    <Canvas
      shadows={shadows}
      dpr={[1, 2]}
      camera={{ position: [0, 9, -12], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#aac4e6']} />
      <fog attach="fog" args={['#aac4e6', 70, 240]} />
      <Suspense fallback={null}>
        <Sky sunPosition={[60, 90, 40]} turbidity={6} rayleigh={1.2} />
        <Lighting />
        <City />
        <Simulation characterId={character} />
      </Suspense>
    </Canvas>
  )
}
