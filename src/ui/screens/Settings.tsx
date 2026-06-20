import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore, type GraphicsPreset } from '@/state/useSettingsStore'

const PRESETS: GraphicsPreset[] = ['low', 'medium', 'high', 'ultra']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      {value ? 'On' : 'Off'}
    </button>
  )
}

export function Settings() {
  const s = useSettingsStore()
  const setPhase = useGameStore((g) => g.setPhase)

  return (
    <div className="screen">
      <div className="panel settings-panel">
        <h2>Settings</h2>

        <div className="setting-row">
          <span className="k">Graphics</span>
          <div className="seg">
            {PRESETS.map((p) => (
              <button
                key={p}
                className={s.graphics === p ? 'active' : ''}
                onClick={() => s.set('graphics', p)}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <span className="k">Shadows</span>
          <Toggle value={s.shadows} onChange={(v) => s.set('shadows', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Post Processing (Bloom)</span>
          <Toggle value={s.postProcessing} onChange={(v) => s.set('postProcessing', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Auto Quality</span>
          <Toggle value={s.autoQuality} onChange={(v) => s.set('autoQuality', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Battery Saver</span>
          <Toggle value={s.batterySaver} onChange={(v) => s.set('batterySaver', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Camera Shake</span>
          <Toggle value={s.cameraShake} onChange={(v) => s.set('cameraShake', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Controller Rumble</span>
          <Toggle value={s.rumble} onChange={(v) => s.set('rumble', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Minimap</span>
          <Toggle value={s.minimap} onChange={(v) => s.set('minimap', v)} />
        </div>
        <div className="setting-row">
          <span className="k">Touch Controls</span>
          <Toggle value={s.mobileControls} onChange={(v) => s.set('mobileControls', v)} />
        </div>

        <div className="setting-row">
          <span className="k">Field of View ({Math.round(s.fov)}°)</span>
          <input
            className="slider"
            type="range"
            min={50}
            max={85}
            step={1}
            value={s.fov}
            onChange={(e) => s.set('fov', parseFloat(e.target.value))}
          />
        </div>
        <div className="setting-row">
          <span className="k">Camera Distance ({s.cameraDistance.toFixed(2)}×)</span>
          <input
            className="slider"
            type="range"
            min={0.7}
            max={1.6}
            step={0.05}
            value={s.cameraDistance}
            onChange={(e) => s.set('cameraDistance', parseFloat(e.target.value))}
          />
        </div>

        <div className="setting-row">
          <span className="k">Music Volume</span>
          <input
            className="slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.musicVolume}
            onChange={(e) => s.set('musicVolume', parseFloat(e.target.value))}
          />
        </div>
        <div className="setting-row">
          <span className="k">Effects Volume</span>
          <input
            className="slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.effectsVolume}
            onChange={(e) => s.set('effectsVolume', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <button className="btn primary" onClick={() => setPhase('menu')}>
        Back
      </button>
    </div>
  )
}
