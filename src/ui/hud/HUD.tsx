import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { HEAT_TABLE } from '@/game/sim/heatTable'
import type { ChaseStats } from '@/types'
import { Minimap } from './Minimap'

const POWER_LABEL: Record<string, string> = {
  nitro: '🚀 NITRO',
  repair: '🔧 REPAIR',
  shield: '🛡 SHIELD',
  emp: '⚡ EMP',
  cloak: '👻 CLOAK',
}

function PowerHud({
  banner,
  boost,
  shield,
  cloak,
}: {
  banner: string | null
  boost: number
  shield: number
  cloak: number
}) {
  return (
    <div className="power-hud">
      {banner && <div className="power-banner">{POWER_LABEL[banner] ?? banner}</div>}
      {boost > 0 && <div className="power-chip nitro">🚀 {boost.toFixed(1)}s</div>}
      {shield > 0 && <div className="power-chip shield">🛡 {shield.toFixed(1)}s</div>}
      {cloak > 0 && <div className="power-chip cloak">👻 {cloak.toFixed(1)}s</div>}
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

/** Center HUD for cop-chase mode: bust meter, escape warning, catch banner. */
function ChaseHud({ chase }: { chase: ChaseStats }) {
  const onTarget = chase.suspectDist < 9
  const bustPct = Math.round(chase.bust * 100)
  return (
    <>
      {chase.banner > 0 && <div className="chase-banner">🚔 SUSPECT CAUGHT!</div>}

      {chase.escapeWarn > 0.05 && (
        <div className="status-banner spotted">
          🏃 SUSPECT FLEEING
          <span className="status-sub"> · {Math.round((1 - chase.escapeWarn) * 9)}s to catch</span>
        </div>
      )}

      <div className={`bust-meter ${onTarget ? 'active' : ''}`}>
        <div className="bust-label">{onTarget ? 'BUSTING…' : 'Close in to bust'}</div>
        <div className="bust-track">
          <div className="bust-fill" style={{ width: `${bustPct}%` }} />
        </div>
      </div>
    </>
  )
}

/** Off-screen arrow + distance pointing to the suspect (you always know where they are). */
function SuspectTracker({ chase }: { chase: ChaseStats }) {
  return (
    <div className="suspect-tracker">
      <div className="suspect-arrow" style={{ transform: `rotate(${chase.suspectAngle}rad)` }}>
        ▲
      </div>
      <div className="suspect-dist">{Math.round(chase.suspectDist)}m</div>
    </div>
  )
}

export function HUD() {
  const stats = useGameStore((s) => s.stats)
  const showMinimap = useSettingsStore((s) => s.minimap)
  const speedReadout = Math.round(stats.speed * 7)
  const capturePct = Math.round(stats.capture * 100)
  const pursuit = stats.mode === 'pursuit'

  return (
    <div className={`hud ${stats.cloak > 0 ? 'cloaked' : ''}`}>
      <div className="hud-top">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {pursuit && stats.chase && (
              <div className="hud-stat caught">
                <div className="label">Caught</div>
                <div className="value">{stats.chase.caught}</div>
              </div>
            )}
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
          {!pursuit && <HeatMeter heat={stats.heat} />}
        </div>

        {pursuit && stats.chase && <SuspectTracker chase={stats.chase} />}
      </div>

      <div className="hud-center">
        {pursuit && stats.chase ? (
          <ChaseHud chase={stats.chase} />
        ) : (
          <>
            <StatusBanner status={stats.status} policeCount={stats.policeCount} />
            {stats.capture > 0.02 && (
              <div className={`capture-warn ${stats.capture > 0.6 ? 'critical' : ''}`}>
                <div className="capture-label">{capturePct >= 60 ? 'BEING BUSTED!' : 'Capture'}</div>
                <div className="capture-track">
                  <div className="capture-fill" style={{ width: `${capturePct}%` }} />
                </div>
              </div>
            )}
          </>
        )}
        <PowerHud banner={stats.powerBanner} boost={stats.boost} shield={stats.shield} cloak={stats.cloak} />
      </div>

      <div className="hud-bottom">
        <div className="hud-vehicle">
          {pursuit ? (
            <div className="label">🚔 On patrol — run the suspect down</div>
          ) : stats.vehicleName ? (
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
        {pursuit
          ? 'WASD · Space drift · ram or tail the suspect · ESC pause'
          : `WASD · ${stats.vehicleName ? 'Space drift' : 'drag to look'} · E steal / exit · ESC pause`}
      </div>
    </div>
  )
}
