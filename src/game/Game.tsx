import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Input } from '@/core/input/InputManager'
import { Audio } from '@/core/audio/AudioManager'
import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { City } from '@/game/world/City'
import { Ground } from '@/game/world/Ground'
import { Environment } from '@/game/world/Environment'
import { PostFX } from '@/game/world/PostFX'
import { Simulation } from '@/game/Simulation'
import { PolicePool } from '@/game/entities/PolicePool'
import { HeliPool } from '@/game/entities/HeliPool'
import { ParticleField } from '@/game/entities/ParticleField'
import { PropField } from '@/game/entities/PropField'

/**
 * The R3F Canvas scene root. Stays mounted across play/pause so resuming is
 * instant; unmounts only when leaving the run (menu / game over).
 */
export function Game() {
  const character = useGameStore((s) => s.selectedCharacter)
  const shadows = useSettingsStore((s) => s.shadows)
  const graphics = useSettingsStore((s) => s.graphics)

  const musicVolume = useSettingsStore((s) => s.musicVolume)
  const effectsVolume = useSettingsStore((s) => s.effectsVolume)

  useEffect(() => {
    Input.attach()
    Audio.setVolumes(musicVolume, effectsVolume)
    Audio.start()
    return () => {
      Input.detach()
      Audio.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    Audio.setVolumes(musicVolume, effectsVolume)
  }, [musicVolume, effectsVolume])

  const dpr = useMemo<[number, number]>(() => {
    switch (graphics) {
      case 'low':
        return [0.75, 1]
      case 'medium':
        return [1, 1.5]
      default:
        return [1, 2]
    }
  }, [graphics])

  return (
    <Canvas
      shadows={shadows}
      dpr={dpr}
      camera={{ position: [0, 9, -13], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: graphics !== 'low', powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#aac4e6']} />
      <fog attach="fog" args={['#aac4e6', 110, 380]} />
      <Suspense fallback={null}>
        <Environment />
        <Ground />
        <City />
        <PropField />
        <Simulation characterId={character} />
        <PolicePool />
        <HeliPool />
        <ParticleField />
        <PostFX />
      </Suspense>
    </Canvas>
  )
}
