import { create } from 'zustand'
import type { BotDifficulty, CharacterId, GameMode, GamePhase, RunStats } from '@/types'
import { SCORE } from '@/config/constants'
import { TRACK_DEFS } from '@/game/world/track'
import { useProgressionStore } from './useProgressionStore'

const emptyStats = (mode: GameMode = 'survive'): RunStats => ({
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
  cloak: 0,
  mode,
  chase: null,
  race: null,
})

export interface RadarBlip {
  x: number
  z: number
}
export interface RadarData {
  px: number
  pz: number
  /** Player heading (radians) — the minimap rotates so this points "up". */
  heading: number
  units: RadarBlip[]
  helis: RadarBlip[]
  /** The fleeing suspect in cop-chase mode (null otherwise). */
  suspect?: RadarBlip | null
}

interface GameStore {
  phase: GamePhase
  selectedCharacter: CharacterId
  /** Which mode the next/current run uses. */
  mode: GameMode
  /** Selected race track + bot difficulty. */
  raceTrackId: string
  raceDifficulty: BotDifficulty
  stats: RunStats
  radar: RadarData
  /** True once any debug override was active during the current run — its
   *  result is not recorded to the lifetime stats / personal best. */
  cheated: boolean

  setRadar: (radar: RadarData) => void
  setPhase: (phase: GamePhase) => void
  selectCharacter: (id: CharacterId) => void
  setMode: (mode: GameMode) => void
  setRaceTrack: (id: string) => void
  setRaceDifficulty: (d: BotDifficulty) => void
  /** Best time (ms, race) or distance (m, endless) for the given track. */
  raceBestFor: (trackId: string, endless: boolean) => number
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
  mode: 'survive',
  raceTrackId: TRACK_DEFS[0].id,
  raceDifficulty: 'medium',
  stats: emptyStats(),
  radar: { px: 0, pz: 0, heading: 0, units: [], helis: [] },
  cheated: false,

  setRadar: (radar) => set({ radar }),
  setPhase: (phase) => set({ phase }),
  selectCharacter: (id) => set({ selectedCharacter: id }),
  setMode: (mode) => set({ mode }),
  setRaceTrack: (id) => set({ raceTrackId: id }),
  setRaceDifficulty: (d) => set({ raceDifficulty: d }),
  raceBestFor: (trackId, endless) =>
    endless
      ? useProgressionStore.getState().endlessBest
      : useProgressionStore.getState().raceBest[trackId] ?? 0,

  startRun: () =>
    set((s) => ({ phase: 'playing', stats: emptyStats(s.mode), cheated: false })),

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
    const cur = get().stats
    if (cur.mode === 'race' || cur.mode === 'endless') {
      const r = cur.race
      if (r && !get().cheated) {
        if (cur.mode === 'endless') {
          useProgressionStore.getState().recordEndless(Math.round(r.distance))
        } else if (r.won) {
          useProgressionStore.getState().recordRace(get().raceTrackId, Math.round(r.time * 1000))
        }
      }
      set({ phase: 'gameover', stats: cur })
      return
    }
    if (cur.mode === 'pursuit') {
      // Cop-chase: score is finalised live (per catch). Record to the separate
      // pursuit best so it never mixes with the survive personal best.
      const stats = { ...cur }
      if (!get().cheated) {
        useProgressionStore.getState().recordChase(stats.chase?.caught ?? 0, stats.score)
      }
      set({ phase: 'gameover', stats })
      return
    }
    // Survive: score is accumulated live; finalise with the peak-heat bonus.
    const stats = { ...cur, capture: 1 }
    stats.score = Math.round(stats.score + stats.peakHeat * SCORE.peakHeatBonus)
    // Debug-tainted runs are never recorded to the lifetime stats / best.
    if (!get().cheated) useProgressionStore.getState().recordRun(stats)
    set({ phase: 'gameover', stats })
  },

  toMenu: () => set({ phase: 'menu', stats: emptyStats(get().mode) }),
}))
