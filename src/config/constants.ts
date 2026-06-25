/** Central tunables. Keep gameplay numbers here, not scattered in code. */

export const SIM = {
  /** Clamp delta so a stalled tab can't explode the physics. */
  maxDt: 0.05,
  /** How often (seconds) the sim publishes stats to the store for the HUD. */
  statPublishInterval: 0.1,
} as const

export const PLAYER = {
  /** On-foot movement speed (units/sec). */
  footSpeed: 9.2,
  /** How quickly the character rotates to face movement (per second). */
  turnLerp: 14,
  /** Radius within which the player can steal/enter a vehicle. */
  enterRadius: 5.5,
  /** Spawn position. */
  spawn: [0, 0, 0] as [number, number, number],
} as const

/** Vertical (jump/fall) model for vehicles — kept gentle so cars float down
 *  from ramps and ledges with weight instead of dropping like a stone. */
export const VEHICLE = {
  /** Downward acceleration (units/s²). Lower = slower, floatier fall. */
  gravity: 13,
  /** Upward launch speed when hitting a ramp at speed. */
  rampLaunch: 8.5,
  /** Terminal fall speed (units/s). */
  maxFall: 17,
  /** Vertical settle rate when rolling onto higher ground (per second). */
  riseLerp: 14,
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
  /** Number of blocks per side (large world). */
  blocks: 24,
  /** Building footprint size. */
  blockSize: 14,
  /** Road width between blocks. */
  roadWidth: 9,
} as const

/** Derived: total spacing between block centers. */
export const CITY_PITCH = CITY.blockSize + CITY.roadWidth

/** Scoring weights. */
export const SCORE = {
  perSecond: 10,
  perDistanceUnit: 0.4,
  peakHeatBonus: 250,
  nearMiss: 60,
  copDestroyed: 400,
  propDestroyed: 5,
} as const

/* -------------------------------------------------------------------------- */
/*  Phase 5 — Vehicle damage                                                   */
/* -------------------------------------------------------------------------- */

export const DAMAGE = {
  /** Health ratio thresholds for each visual/behaviour tier. */
  dented: 0.6,
  smoking: 0.35,
  onfire: 0.15,
  /** HP drained per second while a vehicle is on fire. */
  fireDps: 14,
  /** Minimum impact speed (units/s) that produces collision damage. */
  minImpactSpeed: 6,
  /** Collision damage = (impactSpeed - min) * scale, modulated by mass. */
  impactScale: 3.2,
  /** Visual squash applied to a body on impact (decays each frame). */
  impactSquash: 0.18,
} as const

/* -------------------------------------------------------------------------- */
/*  Phase 6 — Heat, pursuit AI & capture                                       */
/* -------------------------------------------------------------------------- */

export const HEAT = {
  /** Heat (float) rises this fast per second while the player is spotted. */
  spottedRise: 0.22,
  /** Extra heat-rise per (unit/s) of speed while spotted — fleeing fast is loud. */
  spottedSpeedRise: 0.004,
  /** One-off heat bump when the player wrecks a police unit (mayhem). */
  mayhemBump: 0.25,
  /** Heat decays this fast per second while hidden (down to the floor). */
  hiddenDecay: 0.3,
  /** Seconds of survival required to push the heat floor up by one level. */
  floorTimePerLevel: 42,
  /** Grace period (s) after losing sight before units enter SEARCH. */
  lostGrace: 2.0,
  /** Seconds a search persists before units give up and heat can fall. */
  searchTimeout: 8,
} as const

export const POLICE = {
  maxUnits: 20,
  maxHelis: 3,
  /** Ground unit sight range and field-of-view (radians, half-angle). */
  sightRange: 70,
  sightFov: 1.15,
  /** Distance from the player at which new units spawn (off-screen-ish). */
  spawnRadius: 88,
  despawnRadius: 170,
  /** Seconds between spawn attempts when below the heat target (low = sooner). */
  spawnInterval: 0.55,
  /** Half-angle (radians) of the forward cone kept clear of spawns. */
  frontClearCone: 1.15,
  /** Steering gain converting heading error -> steer input. */
  steerGain: 2.4,
  /** Lead time (s) for predicting the player's future position. */
  predictLead: 0.7,
  /** Helicopter follow height and sight radius (ignores building cover). */
  heliHeight: 26,
  heliSightRadius: 85,
  heliSpeed: 26,
  /** Heat at/above which helicopters appear and attack-runs begin. */
  heliMinHeat: 4,
  attackHeliMinHeat: 8,
} as const

export const MINES = {
  /** Max simultaneous police ground bombs (survive mode only). */
  max: 14,
  /** Heat at/above which units start dropping bombs. */
  minHeat: 3,
  /** Seconds between drop attempts while actively pursued. */
  dropInterval: 2.6,
  /** Arming delay after a bomb is dropped (you can outrun a fresh one). */
  armTime: 1.1,
  /** How long an armed bomb sits before it auto-detonates. */
  life: 11,
  /** Player distance that trips an armed bomb. */
  triggerRadius: 3.2,
  /** Blast radius that damages the car. */
  blastRadius: 6.5,
  /** Damage dealt at point-blank (falls off toward the blast edge). */
  damage: 42,
} as const

export const CAPTURE = {
  /** Radius within which a stopped/slow player is being captured. */
  radius: 6.5,
  /** Player speed (units/s) below which capture can progress. */
  slowSpeed: 5,
  /** Capture progress gained per second per nearby unit. */
  ratePerUnit: 0.5,
  /** On-foot multiplier — far more vulnerable. */
  onFootMultiplier: 2.4,
  /** Recovery per second when clear. */
  recover: 0.7,
  /** Near-miss detection radius and minimum closing speed. */
  nearMissRadius: 4.5,
  nearMissSpeed: 14,
} as const

/* -------------------------------------------------------------------------- */
/*  Phase 7 — Destruction & particles                                          */
/* -------------------------------------------------------------------------- */

export const PARTICLES = {
  max: 420,
  gravity: -26,
  groundFriction: 0.78,
  bounce: 0.32,
} as const

export const PROPS = {
  /** Approximate spacing of the candidate scatter grid. */
  spacing: 9,
  /** Probability a free candidate point becomes a prop (kept sparse). */
  density: 0.24,
  max: 760,
  /** Player speed needed to smash a prop. */
  smashSpeed: 5,
  /** Speed lost when plowing through a prop, scaled by mass. */
  smashDrag: 3.5,
} as const
