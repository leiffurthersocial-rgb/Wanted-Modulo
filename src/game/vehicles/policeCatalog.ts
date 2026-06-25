import type { VehicleDef } from '@/types'

export type PoliceClassId =
  | 'patrol'
  | 'interceptor'
  | 'heavy'
  | 'swat'
  | 'military'

export interface PoliceClass {
  id: PoliceClassId
  name: string
  /** Physics/dimensions definition consumed by stepVehicle. */
  def: VehicleDef
  /** Body and accent colours for the voxel model. */
  body: string
  accent: string
  /** Lightbar (false for armored/military which use a roof beacon instead). */
  lightbar: boolean
  /** Minimum heat level at which this class may spawn. */
  minHeat: number
}

const def = (
  id: string,
  topSpeed: number,
  accel: number,
  handling: number,
  weight: number,
  durability: number,
  size: VehicleDef['size'],
): VehicleDef => ({
  id,
  name: id,
  category: 'sedan',
  color: '#ffffff',
  topSpeed,
  accel,
  handling,
  weight,
  durability,
  size,
})

export const POLICE_CLASSES: Record<PoliceClassId, PoliceClass> = {
  patrol: {
    id: 'patrol',
    name: 'Patrol',
    def: def('patrol', 28, 14, 2.1, 1.0, 90, { length: 4.0, width: 1.9, height: 1.45 }),
    // Dark navy + blue stripe — never white, so it can't be mistaken for a
    // stealable civilian car.
    body: '#13284d',
    accent: '#3f7fff',
    lightbar: true,
    minHeat: 1,
  },
  interceptor: {
    id: 'interceptor',
    name: 'Interceptor',
    def: def('interceptor', 37, 19, 2.3, 1.0, 100, { length: 4.3, width: 1.95, height: 1.4 }),
    body: '#15181f',
    accent: '#2f6df0',
    lightbar: true,
    minHeat: 3,
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy Unit',
    def: def('heavy', 27, 11, 1.6, 1.7, 230, { length: 4.4, width: 2.1, height: 1.9 }),
    body: '#23303a',
    accent: '#3a86a8',
    lightbar: true,
    minHeat: 4,
  },
  swat: {
    id: 'swat',
    name: 'SWAT Van',
    def: def('swat', 24, 10, 1.5, 1.9, 220, { length: 4.7, width: 2.15, height: 2.05 }),
    body: '#2a2f36',
    accent: '#8b93a4',
    lightbar: true,
    minHeat: 5,
  },
  military: {
    id: 'military',
    name: 'Military',
    def: def('military', 27, 13, 1.5, 2.4, 460, { length: 4.9, width: 2.3, height: 2.05 }),
    body: '#3f4a2c',
    accent: '#262e1b',
    lightbar: false,
    minHeat: 5,
  },
}

export const POLICE_CLASS_LIST = Object.keys(POLICE_CLASSES) as PoliceClassId[]
