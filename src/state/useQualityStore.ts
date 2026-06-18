import { create } from 'zustand'

/**
 * Runtime quality level driven by the auto-scaler. 1 = full quality; lower
 * values shrink streaming radii and pixel ratio when the frame rate drops.
 * Not persisted — it adapts live to the device. Streaming world components read
 * `radiusScale` when they rebuild; the auto-scaler adjusts `level`.
 */
interface QualityStore {
  /** 0.5 .. 1 — overall quality multiplier. */
  level: number
  setLevel: (level: number) => void
}

export const useQualityStore = create<QualityStore>((set) => ({
  level: 1,
  setLevel: (level) => set({ level: Math.max(0.5, Math.min(1, level)) }),
}))

/** Non-reactive read for hot loops / rebuilds. */
export function qualityScale(): number {
  return useQualityStore.getState().level
}
