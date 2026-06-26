import type { VehicleDef } from '@/types'
import { CITY_PITCH } from '@/config/constants'
import { mulberry32, streamBuildings } from '@/game/world/cityModel'
import { isWater } from '@/game/world/terrain'
import { VEHICLES, VEHICLE_IDS, RARE_VEHICLE_IDS } from './vehicleCatalog'

export interface VehicleSpawn {
  def: VehicleDef
  position: [number, number, number]
  heading: number
}

/** A handful of guaranteed cars right by the spawn point. */
const NEAR_SPAWN: VehicleSpawn[] = [
  { def: VEHICLES.viper, position: [8, 0, 11], heading: 0 },
  { def: VEHICLES.ranger, position: [-11, 0, 8], heading: Math.PI / 2 },
  { def: VEHICLES.brute, position: [11, 0, -12], heading: Math.PI },
  { def: VEHICLES.hauler, position: [-13, 0, -10], heading: -Math.PI / 2 },
  { def: VEHICLES.workhorse, position: [17, 0, 2], heading: 0 },
  { def: VEHICLES.cruiser, position: [-5, 0, 17], heading: Math.PI },
  { def: VEHICLES.hatchback, position: [4, 0, -16], heading: 0 },
]

/**
 * Civilian cars parked beside buildings around the spawn region. The world is
 * infinite, so this fixed pool is recycled toward the player as they roam (see
 * recycleVehicles) — the player is never stranded. Deterministic so the
 * renderer and simulation agree on the starting layout.
 */
function build(): VehicleSpawn[] {
  const list = [...NEAR_SPAWN]
  const rand = mulberry32(424242)
  const o = CITY_PITCH / 2
  for (const b of streamBuildings(0, 0, 260)) {
    if (list.length >= 34) break
    if (rand() > 0.16) continue
    const side = (rand() * 4) | 0
    const x = b.x + (side === 0 ? o : side === 1 ? -o : 0)
    const z = b.z + (side === 2 ? o : side === 3 ? -o : 0)
    if (isWater(x, z)) continue
    const id = VEHICLE_IDS[(rand() * VEHICLE_IDS.length) | 0]
    list.push({ def: VEHICLES[id], position: [x, 0, z], heading: rand() * Math.PI * 2 })
  }

  // Sprinkle a few rare "secret" vehicles, tucked away from the spawn plaza.
  // They join the recycled pool, so they keep drifting back into play sparsely.
  let rares = 0
  for (const b of streamBuildings(0, 0, 360)) {
    if (rares >= 3) break
    if (rand() > 0.03) continue
    const side = (rand() * 4) | 0
    const x = b.x + (side === 0 ? o : side === 1 ? -o : 0)
    const z = b.z + (side === 2 ? o : side === 3 ? -o : 0)
    if (isWater(x, z) || Math.hypot(x, z) < 60) continue
    const id = RARE_VEHICLE_IDS[rares % RARE_VEHICLE_IDS.length]
    list.push({ def: VEHICLES[id], position: [x, 0, z], heading: rand() * Math.PI * 2 })
    rares++
  }
  return list
}

export const VEHICLE_SPAWNS: VehicleSpawn[] = build()
