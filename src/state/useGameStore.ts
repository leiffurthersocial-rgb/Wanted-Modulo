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
  status: 'roam',
  capture: 0,
  copsDestroyed: 0,
  nearMisses: 0,
  policeCount: 0,
  vehicleName: null,
  vehicleHealth: 1,
  powerBanner: null,
  boost: 0,
  shield: 0,
})

export interface RadarBlip {
  x: number
  z: number
}
export interface RadarData {
  px: number
  pz: number
  units: RadarBlip[]
  helis: RadarBlip[]
}

interface GameStore {
  phase: GamePhase
  selectedCharacter: CharacterId
  stats: RunStats
  radar: RadarData
  /** True once any debug override was active during the current run — its
   *  result is not recorded to the lifetime stats / personal best. */
  cheated: boolean

  setRadar: (radar: RadarData) => void
  setPhase: (phase: GamePhase) => void
  selectCharacter: (id: CharacterId) => void
  startRun: () => void
  pause: () => void
  resume: () => void
  /** Flags the current run as debug-tainted (won't count toward bests). */
  markCheated: () => void
  /** Push live stats from the simulation (throttled). */
  publishStats: (partial: Partial<RunStats>) => void
  endRun: () => void
  toMenu: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  selectedCharacter: 'robin',
  stats: emptyStats(),
  radar: { px: 0, pz: 0, units: [], helis: [] },
  cheated: false,

  setRadar: (radar) => set({ radar }),
  setPhase: (phase) => set({ phase }),
  selectCharacter: (id) => set({ selectedCharacter: id }),

  startRun: () => set({ phase: 'playing', stats: emptyStats(), cheated: false }),

  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },
  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },

  markCheated: () => {
    if (!get().cheated) set({ cheated: true })
  },

  publishStats: (partial) =>
    set((state) => ({ stats: { ...state.stats, ...partial } })),

  endRun: () => {
    // Score is accumulated live by the simulation; finalise with the peak-heat
    // bonus and lock it in.
    const stats = { ...get().stats, capture: 1 }
    stats.score = Math.round(stats.score + stats.peakHeat * SCORE.peakHeatBonus)
    // Debug-tainted runs are never recorded to the lifetime stats / best.
    if (!get().cheated) useProgressionStore.getState().recordRun(stats)
    set({ phase: 'gameover', stats })
  },

  toMenu: () => set({ phase: 'menu', stats: emptyStats() }),
}))
