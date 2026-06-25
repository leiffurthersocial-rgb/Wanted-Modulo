import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore, raceKey } from '@/state/useProgressionStore'
import { TRACK_DEFS } from '@/game/world/track'

const LAP_CHOICES = [1, 2, 3]

function fmtMs(ms: number): string {
  if (!ms) return '—'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const r = (s % 60).toFixed(2)
  return m > 0 ? `${m}:${r.padStart(5, '0')}` : `${r}s`
}

export function RaceSetup() {
  const trackId = useGameStore((s) => s.raceTrackId)
  const laps = useGameStore((s) => s.raceLaps)
  const setTrack = useGameStore((s) => s.setRaceTrack)
  const setLaps = useGameStore((s) => s.setRaceLaps)
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
              <div className="track-meta">
                best {fmtMs(raceBest[raceKey(t.id, laps)] ?? 0)}
              </div>
            </div>
          ))}
        </div>

        <div className="race-section-label">Laps</div>
        <div className="seg">
          {LAP_CHOICES.map((n) => (
            <button key={n} className={laps === n ? 'active' : ''} onClick={() => setLaps(n)}>
              {n} {n === 1 ? 'lap' : 'laps'}
            </button>
          ))}
        </div>

        <div className="mode-blurb">
          Race a flat-out rival over {laps} {laps === 1 ? 'lap' : 'laps'} on a parallel track that
          rolls up and down. Hit the ramps for big air — but there are no walls, so run wide and you
          fall off and lose time. First to the line wins.
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
