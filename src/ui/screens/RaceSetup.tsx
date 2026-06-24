import { useGameStore } from '@/state/useGameStore'
import { useProgressionStore } from '@/state/useProgressionStore'
import { TRACK_DEFS } from '@/game/world/track'
import type { BotDifficulty } from '@/types'

const DIFFS: { id: BotDifficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
]

function fmtMs(ms: number): string {
  if (!ms) return '—'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const r = (s % 60).toFixed(2)
  return m > 0 ? `${m}:${r.padStart(5, '0')}` : `${r}s`
}

export function RaceSetup() {
  const trackId = useGameStore((s) => s.raceTrackId)
  const difficulty = useGameStore((s) => s.raceDifficulty)
  const setTrack = useGameStore((s) => s.setRaceTrack)
  const setDifficulty = useGameStore((s) => s.setRaceDifficulty)
  const startRun = useGameStore((s) => s.startRun)
  const setPhase = useGameStore((s) => s.setPhase)
  const raceBest = useProgressionStore((s) => s.raceBest)

  const def = TRACK_DEFS.find((t) => t.id === trackId) ?? TRACK_DEFS[0]

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
                {t.laps} laps · best {fmtMs(raceBest[t.id] ?? 0)}
              </div>
            </div>
          ))}
        </div>

        <div className="race-section-label">Bot Difficulty</div>
        <div className="seg">
          {DIFFS.map((d) => (
            <button
              key={d.id}
              className={difficulty === d.id ? 'active' : ''}
              onClick={() => setDifficulty(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mode-blurb">
          Race the bot over {def.laps} laps on a parallel track. Stay on the road —
          fall off and you respawn, losing time. Beat the bot to the finish.
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
