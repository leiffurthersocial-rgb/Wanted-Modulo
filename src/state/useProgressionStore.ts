import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RunStats } from '@/types'

interface ProgressionStore {
  bestScore: number
  bestTime: number
  totalRuns: number
  totalTime: number
  peakHeatEver: number
  /** Cop-chase mode: most suspects caught in a run, and best chase score. */
  bestCaught: number
  bestChaseScore: number
  /** Race mode: best lap-total time (ms), keyed by `trackId#laps`. */
  raceBest: Record<string, number>
  /** Endless mode: furthest distance (m). */
  endlessBest: number

  recordRun: (stats: RunStats) => void
  recordChase: (caught: number, score: number) => void
  recordRace: (trackId: string, laps: number, timeMs: number) => void
  recordEndless: (distance: number) => void
  reset: () => void
}

/** Personal-best key for a race result (best times differ per lap count). */
export function raceKey(trackId: string, laps: number): string {
  return `${trackId}#${laps}`
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
      bestCaught: 0,
      bestChaseScore: 0,
      raceBest: {},
      endlessBest: 0,

      recordRun: (stats) =>
        set((s) => ({
          bestScore: Math.max(s.bestScore, stats.score),
          bestTime: Math.max(s.bestTime, stats.time),
          totalRuns: s.totalRuns + 1,
          totalTime: s.totalTime + stats.time,
          peakHeatEver: Math.max(s.peakHeatEver, stats.peakHeat),
        })),

      recordChase: (caught, score) =>
        set((s) => ({
          bestCaught: Math.max(s.bestCaught, caught),
          bestChaseScore: Math.max(s.bestChaseScore, score),
        })),

      recordRace: (trackId, laps, timeMs) =>
        set((s) => {
          const key = raceKey(trackId, laps)
          const prev = s.raceBest[key]
          if (prev !== undefined && prev <= timeMs) return s
          return { raceBest: { ...s.raceBest, [key]: timeMs } }
        }),

      recordEndless: (distance) =>
        set((s) => ({ endlessBest: Math.max(s.endlessBest, distance) })),

      reset: () =>
        set({
          bestScore: 0,
          bestTime: 0,
          totalRuns: 0,
          totalTime: 0,
          peakHeatEver: 0,
          bestCaught: 0,
          bestChaseScore: 0,
          raceBest: {},
          endlessBest: 0,
        }),
    }),
    { name: 'wanted-modulo:progression' },
  ),
)
