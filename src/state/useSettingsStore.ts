import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra'

interface SettingsStore {
  graphics: GraphicsPreset
  shadows: boolean
  postProcessing: boolean
  weather: boolean
  cameraShake: boolean
  mobileControls: boolean
  musicVolume: number
  effectsVolume: number

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

type SettingsState = Omit<SettingsStore, 'set'>

/**
 * Settings persist to localStorage. The full Settings screen + key rebinding
 * lands in Phase 9; the store and defaults are wired now so other systems can
 * read presets early.
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      graphics: 'high',
      shadows: true,
      postProcessing: true,
      weather: true,
      cameraShake: true,
      mobileControls: false,
      musicVolume: 0.7,
      effectsVolume: 0.8,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    { name: 'wanted-modulo:settings' },
  ),
)
