import { useGameStore } from '@/state/useGameStore'

const SIZE = 150
const RANGE = 130 // world units mapped to the minimap radius

/** World-aligned radar showing nearby police (red) and helicopters (orange). */
export function Minimap() {
  const radar = useGameStore((s) => s.radar)
  const half = SIZE / 2
  const scale = half / RANGE

  const toLocal = (x: number, z: number) => ({
    left: half + (x - radar.px) * scale,
    top: half + (z - radar.pz) * scale,
  })

  return (
    <div className="minimap">
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
      <div className="blip player" style={{ left: half, top: half }} />
    </div>
  )
}
