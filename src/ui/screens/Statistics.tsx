import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'
import { HEAT_TABLE } from '@/game/sim/heatTable'

function fmtTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Statistics() {
  const setPhase = useGameStore((g) => g.setPhase)
  const p = useProgressionStore()

  return (
    <div className="screen">
      <div className="panel">
        <h2>Career Statistics</h2>
        <div className="stat-list">
          <div className="k">Best Score</div>
          <div className="v">{p.bestScore.toLocaleString()}</div>
          <div className="k">Longest Survival</div>
          <div className="v">{fmtTime(p.bestTime)}</div>
          <div className="k">Highest Heat Reached</div>
          <div className="v">
            {p.peakHeatEver} · {HEAT_TABLE[Math.min(HEAT_TABLE.length - 1, p.peakHeatEver)].name}
          </div>
          <div className="k">Total Runs</div>
          <div className="v">{p.totalRuns}</div>
          <div className="k">Total Time Survived</div>
          <div className="v">{fmtTime(p.totalTime)}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={() => setPhase('menu')}>
          Back
        </button>
        {p.totalRuns > 0 && (
          <button className="btn ghost" onClick={() => p.reset()}>
            Reset Stats
          </button>
        )}
      </div>
    </div>
  )
}
