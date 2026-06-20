import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useSettingsStore } from '@/state/useSettingsStore'

/**
 * Post-processing stack. Bloom makes emissive surfaces (neon windows, police
 * lights, fire, explosions) glow — the core of the night-time look. Gated by
 * the settings toggle so lower-end devices can switch it off.
 */
export function PostFX() {
  const enabled = useSettingsStore((s) => s.postProcessing)
  const batterySaver = useSettingsStore((s) => s.batterySaver)
  if (!enabled || batterySaver) return null
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette offset={0.3} darkness={0.35} />
    </EffectComposer>
  )
}
