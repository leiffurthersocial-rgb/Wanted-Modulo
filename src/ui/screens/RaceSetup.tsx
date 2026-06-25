import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'
import { TRACK_DEFS } from '@/game/world/track'

function fmtMs(ms: number): string {
  if (!ms) return '—'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const r = (s % 60).toFixed(2)
  return m > 0 ? `${m}:${r.padStart(5, '0')}` : `${r}s`
}

export function RaceSetup() {
  const trackId = useGameStore((s) => s.raceTrackId)
  const setTrack = useGameStore((s) => s.setRaceTrack)
  const startRun = useGameStore((s) => s.startRun)
  const setPhase = useGameStore((s) => s.setPhase)
  const raceBest = useProgressionStore((s) => s.raceBest)

  return (
    <div className="screen">
      <div className="panel race-panel">
        <h2>Race Setup</h2>

        <div className="race-section-label">Track</div>
        <div className="track-grid">
          {TRACK_DEFS.map((t) => (
            <div
              key={t.id}
              className={`track-card ${trackId === t.id ? 'selected' : ''}`}
              onClick={() => setTrack(t.id)}
            >
              <div className="track-name">{t.name}</div>
              <div className="track-blurb">{t.blurb}</div>
              <div className="track-meta">best lap {fmtMs(raceBest[t.id] ?? 0)}</div>
            </div>
          ))}
        </div>

        <div className="mode-blurb">
          Solo time trial: one flying lap against the clock — beat your best lap. The track rolls up
          and down, ramps launch you for big air, and barriers force a slalom. There are no walls, so
          run wide and you fall clean off the edge. Clip a barrier and you’ll lose most of your speed.
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={startRun}>
          Start Race
        </button>
        <button className="btn ghost" onClick={() => setPhase('menu')}>
          Back
        </button>
      </div>
    </div>
  )
}
