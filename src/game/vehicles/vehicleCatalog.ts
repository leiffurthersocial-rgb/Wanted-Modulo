import type { VehicleDef } from '@/types'

/**
 * Vehicle catalog. Each category has a deliberately distinct feel via the five
 * stats (accel / topSpeed / weight / durability / handling). These numbers are
 * the single source of truth consumed by the physics step.
 */
export const VEHICLES: Record<string, VehicleDef> = {
  hatchback: {
    id: 'hatchback',
    name: 'Hatchback',
    category: 'compact',
    color: '#4fc3f7',
    topSpeed: 22,
    accel: 15,
    handling: 2.7,
    weight: 0.7,
    durability: 60,
    size: { length: 3.2, width: 1.7, height: 1.4 },
  },
  cruiser: {
    id: 'cruiser',
    name: 'Cruiser',
    category: 'sedan',
    color: '#e0e0e0',
    topSpeed: 27,
    accel: 13,
    handling: 2.1,
    weight: 1.0,
    durability: 90,
    size: { length: 4.0, width: 1.9, height: 1.45 },
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    category: 'suv',
    color: '#37474f',
    topSpeed: 25,
    accel: 10,
    handling: 1.6,
    weight: 1.6,
    durability: 150,
    size: { length: 4.3, width: 2.1, height: 1.85 },
  },
  viper: {
    id: 'viper',
    name: 'Viper',
    category: 'sports',
    color: '#ff5252',
    topSpeed: 39,
    accel: 21,
    handling: 2.5,
    weight: 0.8,
    durability: 70,
    size: { length: 4.1, width: 1.95, height: 1.15 },
  },
  hauler: {
    id: 'hauler',
    name: 'Hauler',
    category: 'van',
    color: '#cfd8dc',
    topSpeed: 19,
    accel: 8,
    handling: 1.4,
    weight: 1.8,
    durability: 130,
    size: { length: 4.6, width: 2.1, height: 2.0 },
  },
  workhorse: {
    id: 'workhorse',
    name: 'Workhorse',
    category: 'pickup',
    color: '#8d6e63',
    topSpeed: 26,
    accel: 13,
    handling: 1.9,
    weight: 1.4,
    durability: 130,
    size: { length: 4.5, width: 2.05, height: 1.7 },
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    category: 'muscle',
    color: '#ffb300',
    topSpeed: 35,
    accel: 19,
    handling: 2.0,
    weight: 1.3,
    durability: 110,
    size: { length: 4.4, width: 2.0, height: 1.4 },
  },

  /* ---- Secret / rare finds (not in the common spawn pool) ---- */
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    category: 'sports',
    // A hypercar — absurdly fast and grippy, but fragile. The ultimate escape.
    color: '#b388ff',
    topSpeed: 54,
    accel: 33,
    handling: 2.9,
    weight: 0.7,
    durability: 60,
    size: { length: 4.2, width: 1.95, height: 1.05 },
  },
  moped: {
    id: 'moped',
    name: 'Moped',
    category: 'compact',
    // Tiny and razor-nimble — threads between cops, but slow-topped and frail.
    color: '#ffd54f',
    topSpeed: 30,
    accel: 22,
    handling: 3.7,
    weight: 0.3,
    durability: 20,
    size: { length: 1.9, width: 0.8, height: 1.2 },
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    category: 'suv',
    // A monster truck — slow to wind up but near-unstoppable and crushes cruisers.
    color: '#3e5159',
    topSpeed: 29,
    accel: 12,
    handling: 1.5,
    weight: 2.7,
    durability: 340,
    size: { length: 5.0, width: 2.5, height: 2.4 },
  },
}

/** Common civilian cars that fill the streets. */
export const VEHICLE_IDS = ['hatchback', 'cruiser', 'ranger', 'viper', 'hauler', 'workhorse', 'brute']

/** Rare "secret" vehicles — sprinkled sparsely so finding one feels special. */
export const RARE_VEHICLE_IDS = ['phantom', 'moped', 'titan']
