import type { VehicleDef } from '@/types'
import { VEHICLES } from './vehicleCatalog'

export interface VehicleSpawn {
  def: VehicleDef
  position: [number, number, number]
  heading: number
}

/**
 * Stealable vehicles seeded around the open spawn area so the player can try
 * different categories immediately. Full traffic/spawning is a later phase.
 */
export const VEHICLE_SPAWNS: VehicleSpawn[] = [
  { def: VEHICLES.viper, position: [8, 0, 11], heading: 0 },
  { def: VEHICLES.ranger, position: [-11, 0, 8], heading: Math.PI / 2 },
  { def: VEHICLES.brute, position: [11, 0, -12], heading: Math.PI },
  { def: VEHICLES.hauler, position: [-13, 0, -10], heading: -Math.PI / 2 },
  { def: VEHICLES.workhorse, position: [17, 0, 2], heading: 0 },
  { def: VEHICLES.cruiser, position: [-5, 0, 17], heading: Math.PI },
  { def: VEHICLES.hatchback, position: [4, 0, -16], heading: 0 },
]
