import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'

export function MainMenu() {
  const setPhase = useGameStore((s) => s.setPhase)
  const bestScore = useProgressionStore((s) => s.bestScore)
  const totalRuns = useProgressionStore((s) => s.totalRuns)

  return (
    <div className="screen">
      <div className="title">
        <div className="wanted">WANTED</div>
        <div className="modulo">MODULO</div>
      </div>
      <div className="tagline">You are hunted · Survive</div>

      <div className="btn-row">
        <button className="btn primary" onClick={() => setPhase('characterSelect')}>
          Play
        </button>
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
        Phase 4 prototype · police pursuit &amp; destruction arriving in later phases
      </div>
    </div>
  )
}
