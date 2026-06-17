import { useRef } from 'react'
import { Input } from '@/core/input/InputManager'

/**
 * On-screen joystick + action button for mobile. Feeds the same logical input
 * actions as the keyboard, so gameplay code never branches on input source.
 */
export function TouchControls() {
  const nubRef = useRef<HTMLDivElement>(null)
  const active = useRef(false)

  const clearMove = () => {
    Input.setVirtual('forward', false)
    Input.setVirtual('backward', false)
    Input.setVirtual('left', false)
    Input.setVirtual('right', false)
    if (nubRef.current) nubRef.current.style.transform = 'translate(-50%, -50%)'
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const dead = 14
    Input.setVirtual('right', dx > dead)
    Input.setVirtual('left', dx < -dead)
    Input.setVirtual('forward', dy < -dead)
    Input.setVirtual('backward', dy > dead)
    const max = rect.width / 2
    const cx = Math.max(-max, Math.min(max, dx))
    const cy = Math.max(-max, Math.min(max, dy))
    if (nubRef.current) {
      nubRef.current.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`
    }
  }

  return (
    <div className="touch-layer">
      <div
        className="touch-stick"
        onPointerDown={(e) => {
          active.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          handleMove(e)
        }}
        onPointerMove={handleMove}
        onPointerUp={() => {
          active.current = false
          clearMove()
        }}
        onPointerCancel={() => {
          active.current = false
          clearMove()
        }}
      >
        <div className="nub" ref={nubRef} />
      </div>

      <button
        className="touch-btn"
        onPointerDown={(e) => {
          e.preventDefault()
          Input.virtualTap('interact')
        }}
      >
        E
      </button>
    </div>
  )
}
