import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { HEAT_TABLE, MAX_HEAT } from '@/game/sim/heatTable'
import type { RaceStats } from '@/types'
import { Minimap } from './Minimap'

function fmtRaceTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`
}

/** Center HUD for Race mode. */
function RaceHud({ race }: { race: RaceStats }) {
  if (race.countdown > 0) {
    const n = Math.ceil(race.countdown)
    return <div className="race-countdown">{n === 0 ? 'GO!' : n}</div>
  }
  return (
    <>
      {race.recover > 0 && <div className="status-banner spotted">↩ BACK ON TRACK</div>}
    </>
  )
}

/** Top stat row for Race mode. */
function RaceTop({ race }: { race: RaceStats }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <div className="hud-stat">
        <div className="label">Time</div>
        <div className="value">{fmtRaceTime(race.time)}</div>
      </div>
      <div className="hud-stat">
        <div className="label">Best Lap</div>
        <div className="value">{race.best > 0 ? fmtRaceTime(race.best / 1000) : '—'}</div>
      </div>
      <div className="hud-stat">
        <div className="label">Speed</div>
        <div className="value">{Math.round(race.speed * 7)}</div>
      </div>
    </div>
  )
}

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
          {Array.from({ length: MAX_HEAT }, (_, i) => {
            const on = i < heat
            const hot = i >= MAX_HEAT - 4
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

  if (stats.mode === 'race') {
    if (!stats.race) return <div className="hud" />
    return (
      <div className="hud">
        <div className="hud-top">
          <RaceTop race={stats.race} />
        </div>
        <div className="hud-center">
          <RaceHud race={stats.race} />
        </div>
        <div className="hud-hint">
          WASD drive · Space drift · dodge the barriers · beat your best lap · P pause
        </div>
      </div>
    )
  }

  return (
    <div className={`hud ${stats.cloak > 0 ? 'cloaked' : ''}`}>
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
        {stats.capture > 0.02 && (
          <div className={`capture-warn ${stats.capture > 0.6 ? 'critical' : ''}`}>
            <div className="capture-label">{capturePct >= 60 ? 'BEING BUSTED!' : 'Capture'}</div>
            <div className="capture-track">
              <div className="capture-fill" style={{ width: `${capturePct}%` }} />
            </div>
          </div>
        )}
        <PowerHud banner={stats.powerBanner} boost={stats.boost} shield={stats.shield} cloak={stats.cloak} />
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
        {`WASD · ${stats.vehicleName ? 'Space drift' : 'drag to look'} · E steal / exit · P pause`}
      </div>
    </div>
  )
}
