import { useGameStore } from '@/state/useGameStore'

export function PauseMenu() {
  const resume = useGameStore((s) => s.resume)
  const endRun = useGameStore((s) => s.endRun)

  return (
    <div className="screen overlay">
      <div className="title">
        <div className="wanted" style={{ fontSize: '2rem' }}>PAUSED</div>
      </div>
      <div className="btn-row">
        <button className="btn primary" onClick={resume}>
          Resume
        </button>
        <button className="btn ghost" onClick={endRun}>
          End Run
        </button>
      </div>
      <div className="muted">Press ESC to resume</div>
    </div>
  )
}
