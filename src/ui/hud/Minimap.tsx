import { useEffect, useRef } from 'react'
import { useGameStore } from '@/state/useGameStore'
import { buildingAtCell, worldToCell } from '@/game/world/cityModel'
import { isWater, urbanization } from '@/game/world/terrain'

const SIZE = 150 // visible (clipped) minimap size
/** Oversize factor for the rotating layer so the square always covers the clip
 *  even when rotated 45° (needs ≥ √2). */
const K = 1.5
const INNER = Math.round(SIZE * K)
const RANGE = 130 // world units mapped across the visible half
/** Resolution the terrain layer is sampled at (kept small for speed). */
const RES = 84

/**
 * A real radar map: it samples the procedural world around the player (grass,
 * roads, rivers, buildings) onto a canvas, then overlays police, heli, suspect
 * and player blips. The map ROTATES with the player's heading so "forward" is
 * always up — the player marker sits fixed at the centre pointing up.
 */
export function Minimap() {
  const radar = useGameStore((s) => s.radar)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const half = SIZE / 2
  const innerHalf = INNER / 2
  const scale = half / RANGE // px per world unit (zoom unchanged)
  const worldPerCell = (innerHalf / scale) * 2 / RES

  // Unwrap the heading into a continuous angle so the map never spins a full
  // turn when the raw value wraps across ±π (keeps the CSS transition smooth).
  const contRef = useRef(0)
  const lastRawRef = useRef(radar.heading)
  let delta = radar.heading - lastRawRef.current
  delta = Math.atan2(Math.sin(delta), Math.cos(delta))
  contRef.current += delta
  lastRawRef.current = radar.heading
  const rotation = contRef.current

  // Draw the terrain layer whenever the player has moved (north-up; the wrapper
  // rotates it). +x → right, +z → up.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const cell = INNER / RES
    for (let yi = 0; yi < RES; yi++) {
      for (let xi = 0; xi < RES; xi++) {
        const wx = radar.px + (xi - RES / 2 + 0.5) * worldPerCell
        const wz = radar.pz + (RES / 2 - 0.5 - yi) * worldPerCell
        let color: string
        if (isWater(wx, wz)) {
          color = '#3f95dd'
        } else {
          const b = buildingAtCell(worldToCell(wx), worldToCell(wz))
          if (b && Math.abs(wx - b.x) <= b.w / 2 && Math.abs(wz - b.z) <= b.d / 2) {
            color = '#566077'
          } else {
            color = urbanization(wx, wz) > 0.42 ? '#9aa3b4' : '#7fc25f'
          }
        }
        ctx.fillStyle = color
        ctx.fillRect(xi * cell, yi * cell, cell + 1, cell + 1)
      }
    }
  }, [radar.px, radar.pz, worldPerCell])

  // World offset -> inner-layer pixel (+x right, +z up).
  const toLocal = (x: number, z: number) => ({
    left: innerHalf + (x - radar.px) * scale,
    top: innerHalf - (z - radar.pz) * scale,
  })

  return (
    <div className="minimap">
      <div
        className="minimap-rotor"
        style={{
          width: INNER,
          height: INNER,
          left: half - innerHalf,
          top: half - innerHalf,
          transform: `rotate(${-rotation}rad)`,
        }}
      >
        <canvas ref={canvasRef} width={INNER} height={INNER} className="minimap-canvas" />
        {radar.units.map((u, i) => {
          const dx = u.x - radar.px
          const dz = u.z - radar.pz
          if (dx * dx + dz * dz > RANGE * RANGE) return null
          const { left, top } = toLocal(u.x, u.z)
          return <div key={`u${i}`} className="blip police" style={{ left, top }} />
        })}
        {radar.helis.map((h, i) => {
          const { left, top } = toLocal(h.x, h.z)
          return <div key={`h${i}`} className="blip heli" style={{ left, top }} />
        })}
        {radar.suspect && (() => {
          // Always show the suspect — clamp to the edge if out of range so you
          // can always tell which way to chase.
          const dx = radar.suspect.x - radar.px
          const dz = radar.suspect.z - radar.pz
          const d = Math.hypot(dx, dz) || 1
          const cl = Math.min(d, RANGE)
          const { left, top } = toLocal(radar.px + (dx / d) * cl, radar.pz + (dz / d) * cl)
          return <div className="blip suspect" style={{ left, top }} />
        })()}
      </div>
      {/* Player marker — fixed at the centre, always pointing up. */}
      <div className="minimap-player" />
    </div>
  )
}
