import { useGameStore } from '@/state/useGameStore'

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Renders the 0-10 heat pips. Heat escalation lands with the AI phase. */
function HeatMeter({ heat }: { heat: number }) {
  return (
    <div className="heat">
      <div className="hud-stat" style={{ padding: '0.4rem 0.6rem' }}>
        <div className="label">Heat</div>
        <div className="heat-bar">
          {Array.from({ length: 10 }, (_, i) => {
            const on = i < heat
            const hot = i >= 7
            return <div key={i} className={`heat-pip ${on ? (hot ? 'hot' : 'on') : ''}`} />
          })}
        </div>
      </div>
    </div>
  )
}

/** In-game heads-up display. Reads throttled stats from the store. */
export function HUD() {
  const stats = useGameStore((s) => s.stats)

  // Convert sim units/sec into a punchier "km/h"-style readout.
  const speedReadout = Math.round(stats.speed * 7)

  return (
    <div className="hud">
      <div className="hud-top">
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="hud-stat">
            <div className="label">Time</div>
            <div className="value">{formatTime(stats.time)}</div>
          </div>
          <div className="hud-stat">
            <div className="label">Speed</div>
            <div className="value">{speedReadout}</div>
          </div>
        </div>
        <HeatMeter heat={stats.heat} />
      </div>
      <div className="hud-hint">WASD / Arrows · E to steal / exit · ESC to pause</div>
    </div>
  )
}
