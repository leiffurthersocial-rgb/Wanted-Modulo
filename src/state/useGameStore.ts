import { create } from 'zustand'
import type { CharacterId, GamePhase, RunStats } from '@/types'
import { SCORE } from '@/config/constants'
import { useProgressionStore } from './useProgressionStore'

const emptyStats = (): RunStats => ({
  time: 0,
  distance: 0,
  speed: 0,
  topSpeed: 0,
  heat: 0,
  peakHeat: 0,
  vehiclesUsed: 0,
  score: 0,
})

function computeScore(s: RunStats): number {
  return Math.round(
    s.time * SCORE.perSecond +
      s.distance * SCORE.perDistanceUnit +
      s.peakHeat * SCORE.peakHeatBonus,
  )
}

interface GameStore {
  phase: GamePhase
  selectedCharacter: CharacterId
  stats: RunStats

  setPhase: (phase: GamePhase) => void
  selectCharacter: (id: CharacterId) => void
  startRun: () => void
  pause: () => void
  resume: () => void
  /** Push live stats from the simulation (throttled). */
  publishStats: (partial: Partial<RunStats>) => void
  endRun: () => void
  toMenu: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  selectedCharacter: 'robin',
  stats: emptyStats(),

  setPhase: (phase) => set({ phase }),
  selectCharacter: (id) => set({ selectedCharacter: id }),

  startRun: () => set({ phase: 'playing', stats: emptyStats() }),

  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },
  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },

  publishStats: (partial) =>
    set((state) => ({ stats: { ...state.stats, ...partial } })),

  endRun: () => {
    const stats = { ...get().stats }
    stats.score = computeScore(stats)
    useProgressionStore.getState().recordRun(stats)
    set({ phase: 'gameover', stats })
  },

  toMenu: () => set({ phase: 'menu', stats: emptyStats() }),
}))
