import { useState } from 'react'
import { useGameStore } from '@/state/useGameStore'
import { DebugMenu, useTripleTap } from './DebugMenu'

export function PauseMenu() {
  const resume = useGameStore((s) => s.resume)
  const startRun = useGameStore((s) => s.startRun)
  const endRun = useGameStore((s) => s.endRun)
  const [showDebug, setShowDebug] = useState(false)
  const onTitleTap = useTripleTap(() => setShowDebug(true))

  return (
    <div className="screen overlay">
      <div className="title" onClick={onTitleTap}>
        <div className="wanted" style={{ fontSize: '2rem' }}>PAUSED</div>
      </div>
      <div className="btn-row">
        <button className="btn primary" onClick={resume}>
          Resume
        </button>
        <button className="btn primary alt" onClick={startRun}>
          Try Again
        </button>
        <button className="btn ghost" onClick={endRun}>
          End Run
        </button>
      </div>
      <div className="muted">Press P to resume</div>

      {showDebug && <DebugMenu onClose={() => setShowDebug(false)} />}
    </div>
  )
}
