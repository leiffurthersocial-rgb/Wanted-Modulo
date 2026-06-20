import { useEffect, useRef } from 'react'
import { useGameStore } from '@/state/useGameStore'
import { buildingAtCell, worldToCell } from '@/game/world/cityModel'
import { isWater, urbanization } from '@/game/world/terrain'

const SIZE = 150
const RANGE = 130 // world units mapped across the minimap radius
/** Resolution the terrain layer is sampled at (kept small for speed). */
const RES = 54
/** Only repaint the terrain layer after the player moves this far (perf). */
const REDRAW_STEP = 5

/**
 * A real radar map: it samples the procedural world around the player (grass,
 * roads, rivers, buildings) onto a small canvas, then overlays police, heli and
 * suspect blips. North-up (static); the player marker is an arrow showing the
 * car's orientation. An off-range suspect is clamped to the map edge as a dot.
 */
export function Minimap() {
  const radar = useGameStore((s) => s.radar)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const half = SIZE / 2
  const scale = half / RANGE

  // Continuous (unwrapped) heading so the arrow never spins a full turn at ±π.
  const contRef = useRef(0)
  const lastRawRef = useRef(radar.heading)
  let d = radar.heading - lastRawRef.current
  d = Math.atan2(Math.sin(d), Math.cos(d))
  contRef.current += d
  lastRawRef.current = radar.heading
  const rotation = contRef.current

  // Repaint the terrain layer only when the player has moved a meaningful
  // distance — drawing RES² cells every publish tick is wasteful.
  const lastDraw = useRef({ x: Infinity, z: Infinity })
  useEffect(() => {
    const dx = radar.px - lastDraw.current.x
    const dz = radar.pz - lastDraw.current.z
    if (dx * dx + dz * dz < REDRAW_STEP * REDRAW_STEP) return
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    lastDraw.current = { x: radar.px, z: radar.pz }
    const cell = SIZE / RES
    const world = (RANGE * 2) / RES
    for (let yi = 0; yi < RES; yi++) {
      for (let xi = 0; xi < RES; xi++) {
        const wx = radar.px + (xi - RES / 2 + 0.5) * world
        const wz = radar.pz + (RES / 2 - 0.5 - yi) * world // +z = up
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
  }, [radar.px, radar.pz])

  const toLocal = (x: number, z: number) => ({
    left: half + (x - radar.px) * scale,
    top: half - (z - radar.pz) * scale, // +z = up
  })

  return (
    <div className="minimap">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="minimap-canvas" />
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
        // In range -> dot at its position; out of range -> dot clamped to the
        // map edge so you always see which way to chase.
        const dx = radar.suspect.x - radar.px
        const dz = radar.suspect.z - radar.pz
        const dist = Math.hypot(dx, dz) || 1
        const cl = Math.min(dist, RANGE)
        const { left, top } = toLocal(radar.px + (dx / dist) * cl, radar.pz + (dz / dist) * cl)
        return <div className={`blip suspect ${dist > RANGE ? 'edge' : ''}`} style={{ left, top }} />
      })()}
      {/* Player marker — fixed at centre, arrow shows the car's orientation. */}
      <div
        className="minimap-player"
        style={{ transform: `translate(-50%, -50%) rotate(${rotation}rad)` }}
      />
    </div>
  )
}
