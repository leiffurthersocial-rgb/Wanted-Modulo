import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function GameOver() {
  const stats = useGameStore((s) => s.stats)
  const startRun = useGameStore((s) => s.startRun)
  const toMenu = useGameStore((s) => s.toMenu)
  const bestScore = useProgressionStore((s) => s.bestScore)

  const isBest = stats.score >= bestScore && stats.score > 0

  return (
    <div className="screen">
      <div className="title">
        <div className="modulo" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>BUSTED</div>
      </div>

      <div className="panel">
        <div className="final-score">
          <div className="n">{stats.score.toLocaleString()}</div>
          <div className="l">{isBest ? '★ New Best Score ★' : 'Final Score'}</div>
        </div>

        <div className="stat-list">
          <div className="k">Time Survived</div>
          <div className="v">{formatTime(stats.time)}</div>
          <div className="k">Highest Heat</div>
          <div className="v">{stats.peakHeat}</div>
          <div className="k">Distance</div>
          <div className="v">{Math.round(stats.distance)} m</div>
          <div className="k">Top Speed</div>
          <div className="v">{Math.round(stats.topSpeed * 7)}</div>
          <div className="k">Vehicles Used</div>
          <div className="v">{stats.vehiclesUsed}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={startRun}>
          Run Again
        </button>
        <button className="btn ghost" onClick={toMenu}>
          Main Menu
        </button>
      </div>
    </div>
  )
}
