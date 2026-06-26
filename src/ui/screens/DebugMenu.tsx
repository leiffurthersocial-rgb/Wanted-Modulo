import { useRef } from 'react'
import { useDebugStore } from '@/state/useDebugStore'
import { MAX_HEAT } from '@/game/sim/heatTable'

/** Vehicles offered by the debug "Spawn Vehicle" grid (rares first). */
const SPAWNABLE: { id: string; label: string }[] = [
  { id: 'phantom', label: '⚡ Phantom' },
  { id: 'moped', label: '🛵 Moped' },
  { id: 'titan', label: '🚜 Titan' },
  { id: 'viper', label: 'Viper' },
  { id: 'brute', label: 'Brute' },
  { id: 'cruiser', label: 'Cruiser' },
  { id: 'ranger', label: 'Ranger' },
  { id: 'hauler', label: 'Hauler' },
]

/**
 * Returns a click handler that fires `onUnlock` after 3 quick taps (within
 * ~900ms of each other). Used to reveal the debug menu from a title element —
 * works on the main menu title and the "PAUSED" header alike.
 */
export function useTripleTap(onUnlock: () => void): () => void {
  const taps = useRef(0)
  const last = useRef(0)
  return () => {
    const now = performance.now()
    taps.current = now - last.current < 900 ? taps.current + 1 : 1
    last.current = now
    if (taps.current >= 3) {
      taps.current = 0
      onUnlock()
    }
  }
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      {value ? 'On' : 'Off'}
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <input
      className="slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  )
}

/**
 * Hidden developer overlay (unlocked by tapping the title 3×). Lets you toggle
 * invincibility, tune speeds/gravity, freeze heat, clear the police and more.
 * Every control writes to the persisted debug store; the simulation reads those
 * values live, so changes apply instantly — even mid-run.
 */
export function DebugMenu({ onClose }: { onClose: () => void }) {
  const d = useDebugStore()

  return (
    <div className="screen overlay debug-overlay">
      <div className="panel debug-panel">
        <div className="debug-head">
          <h2>🛠 Debug Menu</h2>
          <Toggle value={d.enabled} onChange={(v) => d.set('enabled', v)} />
        </div>
        <p className="muted debug-note">
          {d.enabled
            ? '⚠ Overrides ACTIVE — this run will NOT count toward your best.'
            : 'Master switch is off — all overrides below are ignored.'}
        </p>

        <div className={`debug-body ${d.enabled ? '' : 'disabled'}`}>
          <h3>Cheats</h3>
          <div className="setting-row">
            <span className="k">Invincible Vehicle</span>
            <Toggle value={d.invincible} onChange={(v) => d.set('invincible', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Can't Be Captured</span>
            <Toggle value={d.noCapture} onChange={(v) => d.set('noCapture', v)} />
          </div>
          <div className="setting-row">
            <span className="k">No Police</span>
            <Toggle value={d.noPolice} onChange={(v) => d.set('noPolice', v)} />
          </div>
          <div className="setting-row">
            <span className="k">One-Hit Cop Kills</span>
            <Toggle value={d.oneHitCops} onChange={(v) => d.set('oneHitCops', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Infinite Nitro</span>
            <Toggle value={d.infiniteNitro} onChange={(v) => d.set('infiniteNitro', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Infinite Shield</span>
            <Toggle value={d.infiniteShield} onChange={(v) => d.set('infiniteShield', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Infinite Cloak</span>
            <Toggle value={d.infiniteCloak} onChange={(v) => d.set('infiniteCloak', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Freeze Police &amp; Helis</span>
            <Toggle value={d.freezePolice} onChange={(v) => d.set('freezePolice', v)} />
          </div>

          <h3>Spawn Vehicle</h3>
          <p className="muted debug-note">Drops you straight into the car (survive &amp; chase).</p>
          <div className="debug-spawn-grid">
            {SPAWNABLE.map((v) => (
              <button
                key={v.id}
                className="btn ghost small"
                onClick={() => {
                  d.set('spawnVehicleId', v.id)
                  d.set('spawnVehiclePing', d.spawnVehiclePing + 1)
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <h3>Heat</h3>
          <div className="setting-row">
            <span className="k">Freeze Heat</span>
            <Toggle value={d.freezeHeat} onChange={(v) => d.set('freezeHeat', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Forced Heat ({Math.round(d.forceHeat)})</span>
            <Slider value={d.forceHeat} min={0} max={MAX_HEAT} step={1} onChange={(v) => d.set('forceHeat', v)} />
          </div>

          <h3>Physics · all driving modes</h3>
          <div className="setting-row">
            <span className="k">Vehicle Speed ({d.speedMult.toFixed(2)}×)</span>
            <Slider value={d.speedMult} min={0.25} max={20} step={0.25} onChange={(v) => d.set('speedMult', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Foot Speed ({d.footSpeedMult.toFixed(2)}×)</span>
            <Slider value={d.footSpeedMult} min={0.25} max={20} step={0.25} onChange={(v) => d.set('footSpeedMult', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Gravity ({d.gravityMult.toFixed(2)}×)</span>
            <Slider value={d.gravityMult} min={0} max={4} step={0.05} onChange={(v) => d.set('gravityMult', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Ramp Launch ({d.jumpMult.toFixed(2)}×)</span>
            <Slider value={d.jumpMult} min={0.5} max={12} step={0.25} onChange={(v) => d.set('jumpMult', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Time Scale ({d.timeScale.toFixed(2)}×)</span>
            <Slider value={d.timeScale} min={0.1} max={4} step={0.05} onChange={(v) => d.set('timeScale', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Score Multiplier ({d.scoreMult.toFixed(1)}×)</span>
            <Slider value={d.scoreMult} min={0} max={20} step={0.5} onChange={(v) => d.set('scoreMult', v)} />
          </div>

          <h3>Race</h3>
          <div className="setting-row">
            <span className="k">No Fall Off (gaps &amp; edges)</span>
            <Toggle value={d.raceNoFall} onChange={(v) => d.set('raceNoFall', v)} />
          </div>
          <div className="setting-row">
            <span className="k">Finish Lap Now</span>
            <button
              className="btn ghost small"
              onClick={() => d.set('raceFinishPing', d.raceFinishPing + 1)}
            >
              Finish
            </button>
          </div>

          <h3>Actions</h3>
          <div className="setting-row">
            <span className="k">Repair Vehicle</span>
            <button className="btn ghost small" onClick={() => d.set('repairPing', d.repairPing + 1)}>
              Repair
            </button>
          </div>
          <div className="setting-row">
            <span className="k">Teleport to Spawn</span>
            <button className="btn ghost small" onClick={() => d.set('teleportPing', d.teleportPing + 1)}>
              Teleport
            </button>
          </div>
          <div className="setting-row">
            <span className="k">Grant Shield</span>
            <button className="btn ghost small" onClick={() => d.set('grantShieldPing', d.grantShieldPing + 1)}>
              Shield
            </button>
          </div>
          <div className="setting-row">
            <span className="k">Grant Nitro</span>
            <button className="btn ghost small" onClick={() => d.set('grantNitroPing', d.grantNitroPing + 1)}>
              Nitro
            </button>
          </div>
          <div className="setting-row">
            <span className="k">Grant Cloak</span>
            <button className="btn ghost small" onClick={() => d.set('grantCloakPing', d.grantCloakPing + 1)}>
              Cloak
            </button>
          </div>
          <div className="setting-row">
            <span className="k">EMP Blast</span>
            <button className="btn ghost small" onClick={() => d.set('empPing', d.empPing + 1)}>
              Detonate
            </button>
          </div>
        </div>

        <div className="debug-actions">
          <button className="btn ghost" onClick={() => d.reset()}>
            Reset Overrides
          </button>
          <button className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
