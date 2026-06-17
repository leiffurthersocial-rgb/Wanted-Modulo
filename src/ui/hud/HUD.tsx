import { useGameStore } from '@/state/useGameStore'
import { HEAT_TABLE } from '@/game/sim/heatTable'
import { Minimap } from './Minimap'

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function HeatMeter({ heat }: { heat: number }) {
  const tier = HEAT_TABLE[Math.min(HEAT_TABLE.length - 1, heat)]
  return (
    <div className="heat">
      <div className="hud-stat" style={{ padding: '0.45rem 0.7rem' }}>
        <div className="label">
          Heat {heat} · {tier.name}
        </div>
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

function StatusBanner({ status, policeCount }: { status: string; policeCount: number }) {
  if (status === 'roam') return null
  const spotted = status === 'spotted'
  return (
    <div className={`status-banner ${spotted ? 'spotted' : 'search'}`}>
      {spotted ? '⚠ SPOTTED' : '👁 SEARCHING'}
      {policeCount > 0 && <span className="status-sub"> · {policeCount} units</span>}
    </div>
  )
}

export function HUD() {
  const stats = useGameStore((s) => s.stats)
  const speedReadout = Math.round(stats.speed * 7)
  const capturePct = Math.round(stats.capture * 100)

  return (
    <div className="hud">
      <div className="hud-top">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="label">Time</div>
            <div className="value">{formatTime(stats.time)}</div>
          </div>
          <div className="hud-stat">
            <div className="label">Score</div>
            <div className="value">{stats.score.toLocaleString()}</div>
          </div>
          <div className="hud-stat">
            <div className="label">Speed</div>
            <div className="value">{speedReadout}</div>
          </div>
        </div>
        <HeatMeter heat={stats.heat} />
      </div>

      <div className="hud-center">
        <StatusBanner status={stats.status} policeCount={stats.policeCount} />
        {stats.capture > 0.02 && (
          <div className={`capture-warn ${stats.capture > 0.6 ? 'critical' : ''}`}>
            <div className="capture-label">{capturePct >= 60 ? 'BEING BUSTED!' : 'Capture'}</div>
            <div className="capture-track">
              <div className="capture-fill" style={{ width: `${capturePct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="hud-bottom">
        <div className="hud-vehicle">
          {stats.vehicleName ? (
            <>
              <div className="label">{stats.vehicleName}</div>
              <div className="dura-track">
                <div
                  className="dura-fill"
                  style={{
                    width: `${Math.round(stats.vehicleHealth * 100)}%`,
                    background:
                      stats.vehicleHealth > 0.5
                        ? 'var(--good)'
                        : stats.vehicleHealth > 0.2
                          ? 'var(--accent-3)'
                          : 'var(--danger)',
                  }}
                />
              </div>
            </>
          ) : (
            <div className="label">On Foot — find a vehicle (E)</div>
          )}
        </div>
        <div className="hud-tally">
          🚓 {stats.copsDestroyed} · ✦ {stats.nearMisses}
        </div>
      </div>

      <Minimap />

      <div className="hud-hint">WASD / Arrows · E steal / exit · ESC pause</div>
    </div>
  )
}
