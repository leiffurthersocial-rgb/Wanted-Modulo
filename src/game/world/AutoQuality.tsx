import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSettingsStore } from '@/state/useSettingsStore'
import { useQualityStore } from '@/state/useQualityStore'

/**
 * Frame-rate auto-scaler (toggleable). Watches a smoothed FPS and nudges the
 * global quality level up/down, which shrinks streaming radii (read by the world
 * components) and the renderer pixel ratio. Keeps the game smooth on weak
 * devices without the player touching settings. No-op when the setting is off.
 */
export function AutoQuality() {
  const { gl } = useThree()
  const fps = useRef(60)
  const cooldown = useRef(1)
  const baseDpr = useRef(gl.getPixelRatio())

  useFrame((_, delta) => {
    const settings = useSettingsStore.getState()
    // Battery saver pins quality (and pixel ratio) low and shrinks streaming.
    if (settings.batterySaver) {
      if (useQualityStore.getState().level !== 0.5) {
        useQualityStore.getState().setLevel(0.5)
        gl.setPixelRatio(Math.min(baseDpr.current, 0.75))
      }
      return
    }
    const enabled = settings.autoQuality
    if (!enabled) {
      if (useQualityStore.getState().level !== 1) {
        useQualityStore.getState().setLevel(1)
        gl.setPixelRatio(baseDpr.current)
      }
      return
    }

    // Exponential moving average of FPS.
    const inst = delta > 0 ? 1 / delta : 60
    fps.current += (inst - fps.current) * 0.1

    cooldown.current -= delta
    if (cooldown.current > 0) return
    cooldown.current = 1.2

    const q = useQualityStore.getState()
    if (fps.current < 40 && q.level > 0.5) {
      const next = Math.max(0.5, q.level - 0.1)
      q.setLevel(next)
      gl.setPixelRatio(baseDpr.current * (0.7 + next * 0.3))
    } else if (fps.current > 56 && q.level < 1) {
      const next = Math.min(1, q.level + 0.05)
      q.setLevel(next)
      gl.setPixelRatio(baseDpr.current * (0.7 + next * 0.3))
    }
  })

  return null
}
