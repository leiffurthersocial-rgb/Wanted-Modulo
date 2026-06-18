import type { VehicleDef } from '@/types'
import { CITY_PITCH } from '@/config/constants'
import { getCity, mulberry32 } from '@/game/world/cityModel'
import { VEHICLES, VEHICLE_IDS } from './vehicleCatalog'

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
 * Stealable cars are scattered across the city (on roadsides beside buildings)
 * so the player is never stranded far from a vehicle — plus the guaranteed set
 * near the spawn. Deterministic so renderer and simulation agree.
 */
function build(): VehicleSpawn[] {
  const list = [...NEAR_SPAWN]
  const rand = mulberry32(424242)
  const city = getCity()
  const p = Math.min(0.08, 42 / Math.max(1, city.buildings.length))
  const o = CITY_PITCH / 2
  for (const b of city.buildings) {
    if (rand() > p) continue
    const side = (rand() * 4) | 0
    const x = b.x + (side === 0 ? o : side === 1 ? -o : 0)
    const z = b.z + (side === 2 ? o : side === 3 ? -o : 0)
    const id = VEHICLE_IDS[(rand() * VEHICLE_IDS.length) | 0]
    list.push({ def: VEHICLES[id], position: [x, 0, z], heading: rand() * Math.PI * 2 })
  }
  return list
}

export const VEHICLE_SPAWNS: VehicleSpawn[] = build()
