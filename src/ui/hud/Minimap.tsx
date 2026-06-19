import { useEffect, useRef } from 'react'
import { useGameStore } from '@/state/useGameStore'
import { buildingAtCell, worldToCell } from '@/game/world/cityModel'
import { isWater, urbanization } from '@/game/world/terrain'

const SIZE = 150
const RANGE = 130 // world units mapped across the minimap radius
/** Resolution the terrain layer is sampled at (kept small for speed). */
const RES = 60

/**
 * A real radar map: it samples the procedural world around the player (grass,
 * roads, rivers, buildings) onto a small canvas, then overlays police, heli and
 * player blips. North-up, recentred on the player every publish tick.
 */
export function Minimap() {
  const radar = useGameStore((s) => s.radar)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const half = SIZE / 2
  const scale = half / RANGE

  // Draw the terrain layer whenever the player has moved.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const cell = SIZE / RES
    const world = (RANGE * 2) / RES
    for (let yi = 0; yi < RES; yi++) {
      for (let xi = 0; xi < RES; xi++) {
        const wx = radar.px + (xi - RES / 2 + 0.5) * world
        const wz = radar.pz + (yi - RES / 2 + 0.5) * world
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
    top: half + (z - radar.pz) * scale,
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
        // Always show the suspect — clamp it to the minimap edge if out of range
        // so you can always tell which way to chase.
        const dx = radar.suspect.x - radar.px
        const dz = radar.suspect.z - radar.pz
        const d = Math.hypot(dx, dz) || 1
        const cl = Math.min(d, RANGE)
        const { left, top } = toLocal(radar.px + (dx / d) * cl, radar.pz + (dz / d) * cl)
        return <div className="blip suspect" style={{ left, top }} />
      })()}
      <div className="blip player" style={{ left: half, top: half }} />
    </div>
  )
}
