import { CITY_PITCH, PROPS } from '@/config/constants'
import { buildingAtCell, mulberry32, worldToCell } from './cityModel'
import { isWater, riverFactor } from './terrain'
import { PROP_TYPES, PROP_TYPE_LIST, type PropType } from './propCatalog'

export interface PropInstance {
  type: PropType
  x: number
  z: number
  rot: number
  /** Index of this prop within its type's InstancedMesh (window-local). */
  typeIndex: number
}

export interface PropModel {
  props: PropInstance[]
  /** Count per type, to size each InstancedMesh. */
  counts: Record<PropType, number>
}

/** Radius (world units) of the streaming prop window around the player. */
export const PROP_WINDOW = 130
/** Player travel (units) before the window recenters and props regenerate. */
const RECENTER_STEP = CITY_PITCH

function emptyCounts(): Record<PropType, number> {
  return PROP_TYPE_LIST.reduce(
    (acc, t) => ((acc[t] = 0), acc),
    {} as Record<PropType, number>,
  )
}

function insideBuildingCell(x: number, z: number): boolean {
  const ci = worldToCell(x)
  const cj = worldToCell(z)
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const b = buildingAtCell(ci + di, cj + dj)
      if (!b) continue
      if (Math.abs(x - b.x) <= b.w / 2 + 0.8 && Math.abs(z - b.z) <= b.d / 2 + 0.8) return true
    }
  }
  return false
}

function pickType(r: number): PropType {
  let total = 0
  for (const t of PROP_TYPE_LIST) total += PROP_TYPES[t].weight
  let acc = r * total
  for (const t of PROP_TYPE_LIST) {
    acc -= PROP_TYPES[t].weight
    if (acc <= 0) return t
  }
  return PROP_TYPE_LIST[0]
}

/** Per-type instanced capacity (fixed so meshes never resize). */
export const PROP_CAPACITY = Math.ceil(PROPS.max / PROP_TYPE_LIST.length)

let current: PropModel = { props: [], counts: emptyCounts() }
let centerX = Infinity
let centerZ = Infinity
let version = 0

/** Bumped whenever the prop window regenerates — renderers watch this. */
export function propVersion(): number {
  return version
}

export function getProps(): PropModel {
  return current
}

/**
 * Regenerates the destructible-prop window centered on (px,pz) when the player
 * has travelled far enough. Deterministic per world position, so props that
 * scroll off one side reappear with the same layout — the world feels infinite
 * and consistent. Returns true when a regeneration happened.
 */
export function ensurePropWindow(px: number, pz: number): boolean {
  if (Math.abs(px - centerX) < RECENTER_STEP && Math.abs(pz - centerZ) < RECENTER_STEP) {
    return false
  }
  centerX = px
  centerZ = pz

  const props: PropInstance[] = []
  const counts = emptyCounts()
  const r2 = PROP_WINDOW * PROP_WINDOW
  const minX = px - PROP_WINDOW
  const maxX = px + PROP_WINDOW
  const minZ = pz - PROP_WINDOW
  const maxZ = pz + PROP_WINDOW

  // Snap the scatter grid to world space so layout is position-stable.
  const startX = Math.floor(minX / PROPS.spacing) * PROPS.spacing
  const startZ = Math.floor(minZ / PROPS.spacing) * PROPS.spacing

  for (let x = startX; x <= maxX; x += PROPS.spacing) {
    for (let z = startZ; z <= maxZ; z += PROPS.spacing) {
      const dx = x - px
      const dz = z - pz
      if (dx * dx + dz * dz > r2) continue
      if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue // spawn plaza

      // Deterministic per-grid-point RNG keyed on world cell.
      const rand = mulberry32(((x * 92837111) ^ (z * 689287499)) | 0)
      if (rand() > PROPS.density) continue

      const jx = x + (rand() - 0.5) * PROPS.spacing * 0.6
      const jz = z + (rand() - 0.5) * PROPS.spacing * 0.6
      if (riverFactor(jx, jz) > 0.12 || isWater(jx, jz)) continue
      if (insideBuildingCell(jx, jz)) continue

      const type = pickType(rand())
      if (counts[type] >= PROP_CAPACITY) continue
      props.push({ type, x: jx, z: jz, rot: rand() * Math.PI * 2, typeIndex: counts[type]++ })
    }
  }

  current = { props, counts }
  version++
  return true
}
