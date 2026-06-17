/** Central tunables. Keep gameplay numbers here, not scattered in code. */

export const SIM = {
  /** Clamp delta so a stalled tab can't explode the physics. */
  maxDt: 0.05,
  /** How often (seconds) the sim publishes stats to the store for the HUD. */
  statPublishInterval: 0.1,
} as const

export const PLAYER = {
  /** On-foot movement speed (units/sec). */
  footSpeed: 7.5,
  /** How quickly the character rotates to face movement (per second). */
  turnLerp: 14,
  /** Radius within which the player can steal/enter a vehicle. */
  enterRadius: 4.5,
  /** Spawn position. */
  spawn: [0, 0, 0] as [number, number, number],
} as const

export const CAMERA = {
  foot: { distance: 11, height: 9 },
  vehicle: { distance: 13.5, height: 7.5 },
  /** Position smoothing factor (per second). Higher = snappier. */
  lerp: 6,
  /** Look-at smoothing. */
  lookLerp: 9,
} as const

export const CITY = {
  /** Number of blocks per side. */
  blocks: 12,
  /** Building footprint size. */
  blockSize: 14,
  /** Road width between blocks. */
  roadWidth: 9,
} as const

/** Derived: total spacing between block centers. */
export const CITY_PITCH = CITY.blockSize + CITY.roadWidth

/** Scoring weights (prototype baseline; tuned with the chase system later). */
export const SCORE = {
  perSecond: 10,
  perDistanceUnit: 0.4,
  peakHeatBonus: 250,
} as const
