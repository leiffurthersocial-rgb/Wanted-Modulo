import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useSettingsStore } from '@/state/useSettingsStore'

/**
 * Post-processing stack. Bloom makes emissive surfaces (neon windows, police
 * lights, fire, explosions) glow — the core of the night-time look. Gated by
 * the settings toggle so lower-end devices can switch it off.
 */
export function PostFX() {
  const enabled = useSettingsStore((s) => s.postProcessing)
  if (!enabled) return null
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
      <Vignette offset={0.22} darkness={0.65} />
    </EffectComposer>
  )
}
