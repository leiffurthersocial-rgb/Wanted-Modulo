import { CITY_PITCH, PROPS } from '@/config/constants'
import { getCity, mulberry32 } from './cityModel'
import { PROP_TYPES, PROP_TYPE_LIST, type PropType } from './propCatalog'

export interface PropInstance {
  type: PropType
  x: number
  z: number
  rot: number
  /** Index of this prop within its type's InstancedMesh. */
  typeIndex: number
}

export interface PropModel {
  props: PropInstance[]
  /** Count per type, to size each InstancedMesh. */
  counts: Record<PropType, number>
}

let cached: PropModel | null = null

function insideBuilding(x: number, z: number): boolean {
  const { buildings } = getCity()
  for (const b of buildings) {
    if (
      Math.abs(x - b.x) <= b.w / 2 + 0.8 &&
      Math.abs(z - b.z) <= b.d / 2 + 0.8
    ) {
      return true
    }
  }
  return false
}

/** Weighted prop-type pick. */
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

/**
 * Scatters destructible props across the streets/lots, avoiding buildings and
 * the spawn area. Deterministic per seed; cached so renderer and simulation
 * share identical placement and per-type indices.
 */
export function getProps(seed = 9001): PropModel {
  if (cached) return cached

  const { worldHalf } = getCity()
  const rand = mulberry32(seed)
  const props: PropInstance[] = []
  const counts = PROP_TYPE_LIST.reduce(
    (acc, t) => ((acc[t] = 0), acc),
    {} as Record<PropType, number>,
  )

  const pad = CITY_PITCH
  for (let x = -worldHalf + pad; x <= worldHalf - pad; x += PROPS.spacing) {
    for (let z = -worldHalf + pad; z <= worldHalf - pad; z += PROPS.spacing) {
      if (props.length >= PROPS.max) break
      // Keep spawn area clear.
      if (Math.abs(x) < CITY_PITCH && Math.abs(z) < CITY_PITCH) continue
      if (rand() > PROPS.density) continue

      const px = x + (rand() - 0.5) * PROPS.spacing * 0.5
      const pz = z + (rand() - 0.5) * PROPS.spacing * 0.5
      if (insideBuilding(px, pz)) continue

      const type = pickType(rand())
      props.push({
        type,
        x: px,
        z: pz,
        rot: rand() * Math.PI * 2,
        typeIndex: counts[type]++,
      })
    }
  }

  cached = { props, counts }
  return cached
}
