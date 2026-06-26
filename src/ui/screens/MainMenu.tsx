import { useState } from 'react'
import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'
import type { GameMode } from '@/types'
import { DebugMenu, useTripleTap } from './DebugMenu'

export function MainMenu() {
  const setPhase = useGameStore((s) => s.setPhase)
  const setMode = useGameStore((s) => s.setMode)
  const bestScore = useProgressionStore((s) => s.bestScore)
  const totalRuns = useProgressionStore((s) => s.totalRuns)
  const [showDebug, setShowDebug] = useState(false)
  const onTitleTap = useTripleTap(() => setShowDebug(true))

  const play = (mode: GameMode) => {
    setMode(mode)
    setPhase('characterSelect')
  }
  const race = () => {
    setMode('race')
    setPhase('raceSetup')
  }

  return (
    <div className="screen">
      <div className="title" onClick={onTitleTap} title="">
        <div className="wanted">WANTED</div>
        <div className="modulo">MODULO</div>
      </div>
      <div className="tagline">You are hunted · Survive</div>

      <div className="btn-row">
        <button className="btn primary" onClick={() => play('survive')}>
          Play
        </button>
        <button className="btn primary race" onClick={race}>
          🏁 Race
        </button>
      </div>
      <div className="btn-row">
        <button className="btn ghost" onClick={() => setPhase('statistics')}>
          Statistics
        </button>
        <button className="btn ghost" onClick={() => setPhase('settings')}>
          Settings
        </button>
      </div>

      {totalRuns > 0 && (
        <div className="muted">
          Best score: <strong style={{ color: 'var(--accent-3)' }}>{bestScore.toLocaleString()}</strong>
          {' · '}
          {totalRuns} run{totalRuns === 1 ? '' : 's'}
        </div>
      )}

      <div className="muted" style={{ position: 'absolute', bottom: 18 }}>
        Survive the escalating chase — or set a hot lap in Race
      </div>

      {showDebug && <DebugMenu onClose={() => setShowDebug(false)} />}
    </div>
  )
}
