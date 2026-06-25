import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtRaceTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(2)
  return m > 0 ? `${m}:${s.padStart(5, '0')}` : `${s}s`
}

function RaceOver() {
  const stats = useGameStore((s) => s.stats)
  const startRun = useGameStore((s) => s.startRun)
  const toMenu = useGameStore((s) => s.toMenu)
  const r = stats.race!
  const endless = r.endless
  const bestDist = useProgressionStore((s) => s.endlessBest)

  const title = endless ? 'WIPEOUT' : 'LAP COMPLETE'
  const newBest = endless
    ? r.distance > 0 && Math.round(r.distance) >= bestDist
    : r.won && (r.best === 0 || r.time * 1000 <= r.best)
  // Best lap before this run (ms); 0 if none yet.
  const priorBest = r.best

  return (
    <div className="screen">
      <div className="title">
        <div className="modulo" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>{title}</div>
      </div>

      <div className="panel">
        <div className="final-score">
          <div className="n">{endless ? `${Math.round(r.distance)}m` : fmtRaceTime(r.time)}</div>
          <div className="l">
            {endless
              ? newBest ? '★ New Best Distance ★' : 'Distance'
              : newBest ? '★ New Best Lap ★' : 'Lap Time'}
          </div>
        </div>

        <div className="stat-list">
          {endless ? (
            <>
              <div className="k">Best Distance</div>
              <div className="v">{Math.max(bestDist, Math.round(r.distance))}m</div>
              <div className="k">Top Speed</div>
              <div className="v">{Math.round(r.speed * 7)}</div>
            </>
          ) : (
            <>
              <div className="k">Best Lap</div>
              <div className="v">
                {priorBest > 0 || newBest
                  ? fmtRaceTime((newBest ? r.time * 1000 : priorBest) / 1000)
                  : '—'}
              </div>
              <div className="k">Top Speed</div>
              <div className="v">{Math.round(r.speed * 7)}</div>
            </>
          )}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={startRun}>
          {endless ? 'Try Again' : 'Rematch'}
        </button>
        <button className="btn ghost" onClick={toMenu}>
          Main Menu
        </button>
      </div>
    </div>
  )
}

function ChaseOver() {
  const stats = useGameStore((s) => s.stats)
  const startRun = useGameStore((s) => s.startRun)
  const toMenu = useGameStore((s) => s.toMenu)
  const cheated = useGameStore((s) => s.cheated)
  const bestCaught = useProgressionStore((s) => s.bestCaught)
  const caught = stats.chase?.caught ?? 0
  const isBest = !cheated && caught >= bestCaught && caught > 0

  return (
    <div className="screen">
      <div className="title">
        <div className="modulo" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>SUSPECT LOST</div>
      </div>

      <div className="panel">
        <div className="final-score">
          <div className="n">{caught}</div>
          <div className="l">
            {cheated ? '🛠 Debug Run — Not Recorded' : isBest ? '★ New Best — Most Caught ★' : 'Suspects Caught'}
          </div>
        </div>

        <div className="stat-list">
          <div className="k">Score</div>
          <div className="v">{stats.score.toLocaleString()}</div>
          <div className="k">Time on Patrol</div>
          <div className="v">{formatTime(stats.time)}</div>
          <div className="k">Top Speed</div>
          <div className="v">{Math.round(stats.topSpeed * 7)}</div>
          <div className="k">Best (Caught)</div>
          <div className="v">{bestCaught}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={startRun}>
          Patrol Again
        </button>
        <button className="btn ghost" onClick={toMenu}>
          Main Menu
        </button>
      </div>
    </div>
  )
}

export function GameOver() {
  const stats = useGameStore((s) => s.stats)
  const startRun = useGameStore((s) => s.startRun)
  const toMenu = useGameStore((s) => s.toMenu)
  const cheated = useGameStore((s) => s.cheated)
  const bestScore = useProgressionStore((s) => s.bestScore)

  if (stats.mode === 'pursuit') return <ChaseOver />
  if ((stats.mode === 'race' || stats.mode === 'endless') && stats.race) return <RaceOver />

  const isBest = !cheated && stats.score >= bestScore && stats.score > 0

  return (
    <div className="screen">
      <div className="title">
        <div className="modulo" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>BUSTED</div>
      </div>

      <div className="panel">
        <div className="final-score">
          <div className="n">{stats.score.toLocaleString()}</div>
          <div className="l">
            {cheated ? '🛠 Debug Run — Not Recorded' : isBest ? '★ New Best Score ★' : 'Final Score'}
          </div>
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
