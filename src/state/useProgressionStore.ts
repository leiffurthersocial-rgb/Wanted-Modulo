import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunStats } from '@/types'

interface ProgressionStore {
  bestScore: number
  bestTime: number
  totalRuns: number
  totalTime: number
  peakHeatEver: number

  recordRun: (stats: RunStats) => void
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

      recordRun: (stats) =>
        set((s) => ({
          bestScore: Math.max(s.bestScore, stats.score),
          bestTime: Math.max(s.bestTime, stats.time),
          totalRuns: s.totalRuns + 1,
          totalTime: s.totalTime + stats.time,
          peakHeatEver: Math.max(s.peakHeatEver, stats.peakHeat),
        })),

      reset: () =>
        set({ bestScore: 0, bestTime: 0, totalRuns: 0, totalTime: 0, peakHeatEver: 0 }),
    }),
    { name: 'wanted-modulo:progression' },
  ),
)
