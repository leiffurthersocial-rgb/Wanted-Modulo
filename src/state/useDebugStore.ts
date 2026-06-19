import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Developer/debug overrides. Hidden behind a secret gesture (tap the title 3×).
 * Every flag is a no-op while `enabled` is false, so a normal player is never
 * affected even if values were left set. The simulation reads these live each
 * frame via `getDebug()` — no React in the hot loop.
 */
export interface DebugStore {
  /** Master switch — when false every override below is ignored. */
  enabled: boolean

  // --- Toggles ---
  /** Player's current vehicle never takes damage. */
  invincible: boolean
  /** Police can never capture/bust the player. */
  noCapture: boolean
  /** Despawn all police/helis and stop new spawns. */
  noPolice: boolean
  /** Keep the nitro boost permanently topped up. */
  infiniteNitro: boolean
  /** Police are destroyed by a single hit. */
  oneHitCops: boolean
  /** Hold heat at `forceHeat` instead of letting it escalate/decay. */
  freezeHeat: boolean

  // --- Sliders ---
  /** Heat level applied while `freezeHeat` is on (0..10). */
  forceHeat: number
  /** Vehicle top-speed + acceleration multiplier. */
  speedMult: number
  /** On-foot movement speed multiplier. */
  footSpeedMult: number
  /** Vehicle gravity multiplier (lower = floatier). */
  gravityMult: number
  /** Ramp launch power multiplier. */
  jumpMult: number
  /** Simulation time scale (slow-mo / fast-forward). */
  timeScale: number
  /** Score-gain multiplier. */
  scoreMult: number

  // --- One-shot actions (monotonic counters the sim watches) ---
  /** Bump to fully repair the player's current vehicle. */
  repairPing: number
  /** Teleport the player back to the spawn plaza. */
  teleportPing: number
  /** Grant a fresh shield. */
  grantShieldPing: number
  /** Grant a fresh nitro boost. */
  grantNitroPing: number
  /** Detonate an EMP around the player (wipes nearby police). */
  empPing: number

  set: <K extends keyof DebugState>(key: K, value: DebugState[K]) => void
  /** Restore all gameplay overrides to their neutral defaults. */
  reset: () => void
}

type DebugState = Omit<DebugStore, 'set' | 'reset'>

const DEFAULTS: DebugState = {
  enabled: false,
  invincible: false,
  noCapture: false,
  noPolice: false,
  infiniteNitro: false,
  oneHitCops: false,
  freezeHeat: false,
  forceHeat: 5,
  speedMult: 1,
  footSpeedMult: 1,
  gravityMult: 1,
  jumpMult: 1,
  timeScale: 1,
  scoreMult: 1,
  repairPing: 0,
  teleportPing: 0,
  grantShieldPing: 0,
  grantNitroPing: 0,
  empPing: 0,
}

export const useDebugStore = create<DebugStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<DebugState>),
      // Keep `enabled` (so the menu stays unlocked) but neutralise gameplay.
      reset: () => set({ ...DEFAULTS, enabled: true }),
    }),
    { name: 'wanted-modulo:debug' },
  ),
)

/** Cheap, React-free accessor for the simulation hot loop. */
export function getDebug(): DebugState {
  return useDebugStore.getState()
}
