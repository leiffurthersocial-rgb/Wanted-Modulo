import { useGameStore } from '@/state/useGameStore'
import { CHARACTERS, CHARACTER_ORDER } from '@/game/characters/characterCatalog'
import type { CharacterDef } from '@/types'

/** Lightweight CSS portrait standing in for a 3D turntable (Phase 9). */
function Portrait({ def }: { def: CharacterDef }) {
  return (
    <div
      className="swatch"
      style={{
        background: `linear-gradient(180deg, ${def.shirt}22, ${def.pants}44)`,
      }}
    >
      <div style={{ position: 'relative', width: 54, height: 78 }}>
        {/* hair */}
        <div
          style={{
            position: 'absolute', top: 0, left: 11, width: 32, height: 14,
            background: def.hair, borderRadius: '6px 6px 0 0',
          }}
        />
        {/* head */}
        <div
          style={{
            position: 'absolute', top: 8, left: 13, width: 28, height: 26,
            background: def.skin, borderRadius: 5,
          }}
        />
        {/* eyes */}
        <div style={{ position: 'absolute', top: 18, left: 19, width: 5, height: 5, background: def.eyes, borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 18, left: 30, width: 5, height: 5, background: def.eyes, borderRadius: 1 }} />
        {/* body */}
        <div
          style={{
            position: 'absolute', top: 32, left: 8, width: 38 * def.width, height: 30 * def.height,
            background: def.shirt, borderRadius: 6, transform: 'translateX(-2px)',
          }}
        />
      </div>
    </div>
  )
}

export function CharacterSelect() {
  const selected = useGameStore((s) => s.selectedCharacter)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const startRun = useGameStore((s) => s.startRun)
  const setPhase = useGameStore((s) => s.setPhase)

  return (
    <div className="screen">
      <div className="panel">
        <h2>Select Character</h2>
        <div className="char-grid">
          {CHARACTER_ORDER.map((id) => {
            const def = CHARACTERS[id]
            return (
              <div
                key={id}
                className={`char-card ${selected === id ? 'selected' : ''}`}
                onClick={() => selectCharacter(id)}
              >
                <Portrait def={def} />
                <div className="name">{def.name}</div>
                <div className="desc">{def.description}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={startRun}>
          Start Run
        </button>
        <button className="btn ghost" onClick={() => setPhase('menu')}>
          Back
        </button>
      </div>
    </div>
  )
}
