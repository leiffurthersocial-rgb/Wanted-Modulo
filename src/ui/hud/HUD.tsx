import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { HEAT_TABLE } from '@/game/sim/heatTable'
import { Minimap } from './Minimap'

const POWER_LABEL: Record<string, string> = {
  nitro: '🚀 NITRO',
  repair: '🔧 REPAIR',
  shield: '🛡 SHIELD',
  emp: '⚡ EMP',
}

function PowerHud({ banner, boost, shield }: { banner: string | null; boost: number; shield: number }) {
  return (
    <div className="power-hud">
      {banner && <div className="power-banner">{POWER_LABEL[banner] ?? banner}</div>}
      {boost > 0 && <div className="power-chip nitro">🚀 {boost.toFixed(1)}s</div>}
      {shield > 0 && <div className="power-chip shield">🛡 {shield.toFixed(1)}s</div>}
    </div>
  )
}

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
  const showMinimap = useSettingsStore((s) => s.minimap)
  const speedReadout = Math.round(stats.speed * 7)
  const capturePct = Math.round(stats.capture * 100)

  return (
    <div className="hud">
      <div className="hud-top">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
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
      </div>

      <div className="hud-center">
        <StatusBanner status={stats.status} policeCount={stats.policeCount} />
        <PowerHud banner={stats.powerBanner} boost={stats.boost} shield={stats.shield} />
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
      </div>

      {showMinimap && <Minimap />}

      <div className="hud-hint">
        WASD · {stats.vehicleName ? 'Space drift' : 'drag to look'} · E steal / exit · ESC pause
      </div>
    </div>
  )
}
