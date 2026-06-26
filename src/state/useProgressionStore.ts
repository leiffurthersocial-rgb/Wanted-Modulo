import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunStats } from '@/types'

interface ProgressionStore {
  bestScore: number
  bestTime: number
  totalRuns: number
  totalTime: number
  peakHeatEver: number
  /** Race mode: best single-lap time (ms) per track id. */
  raceBest: Record<string, number>

  recordRun: (stats: RunStats) => void
  recordRace: (trackId: string, timeMs: number) => void
  reset: () => void
}

/**
 * Lifetime stats + bests, persisted locally. Unlock logic (cosmetics/vehicles)
 * builds on this in a later phase; for now it powers the Statistics screen and
 * the "new best" feedback on Game Over.
 */
export const useProgressionStore = create<ProgressionStore>()(
  persist(
    (set) => ({
      bestScore: 0,
      bestTime: 0,
      totalRuns: 0,
      totalTime: 0,
      peakHeatEver: 0,
      raceBest: {},

      recordRun: (stats) =>
        set((s) => ({
          bestScore: Math.max(s.bestScore, stats.score),
          bestTime: Math.max(s.bestTime, stats.time),
          totalRuns: s.totalRuns + 1,
          totalTime: s.totalTime + stats.time,
          peakHeatEver: Math.max(s.peakHeatEver, stats.peakHeat),
        })),

      recordRace: (trackId, timeMs) =>
        set((s) => {
          const prev = s.raceBest[trackId]
          if (prev !== undefined && prev <= timeMs) return s
          return { raceBest: { ...s.raceBest, [trackId]: timeMs } }
        }),

      reset: () =>
        set({
          bestScore: 0,
          bestTime: 0,
          totalRuns: 0,
          totalTime: 0,
          peakHeatEver: 0,
          raceBest: {},
        }),
    }),
    { name: 'wanted-modulo:progression' },
  ),
)
