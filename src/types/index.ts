/** Shared domain types for WANTED: MODULO. */

/** High-level game flow states. The UI router and the simulation both read this. */
export type GamePhase =
  | 'menu'
  | 'characterSelect'
  | 'settings'
  | 'statistics'
  | 'playing'
  | 'paused'
  | 'gameover'

/** Logical input actions, decoupled from physical keys (see InputManager). */
export type InputAction =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'handbrake'
  | 'interact'
  | 'pause'

export type CharacterId =
  | 'robin'
  | 'leif'
  | 'jovan'
  | 'leo'
  | 'till'
  | 'tusya'
  | 'lennard'
  | 'erim'
  | 'david'

export type HairStyle = 'ponytail' | 'messy' | 'short' | 'buzz' | 'side' | 'long'

export interface CharacterDef {
  id: CharacterId
  name: string
  description: string
  /** Cosmetic only — no gameplay effect. */
  skin: string
  hair: string
  hairStyle: HairStyle
  eyes: string
  shirt: string
  pants: string
  shoes: string
  /** Build modifiers (purely visual). */
  height: number
  width: number
  /** Optional cosmetic accessories. */
  glasses?: boolean
  beard?: boolean
}

export type VehicleCategory =
  | 'compact'
  | 'sedan'
  | 'suv'
  | 'sports'
  | 'van'
  | 'pickup'
  | 'muscle'

export interface VehicleDef {
  id: string
  name: string
  category: VehicleCategory
  color: string
  /** Units per second. */
  topSpeed: number
  /** Units per second^2. */
  accel: number
  /** Radians per second at speed (steering authority). */
  handling: number
  /** Relative mass — affects collisions (used in later phases). */
  weight: number
  /** Hit points before wreck (used by the destruction phase). */
  durability: number
  /** Body dimensions (length along Z, width along X, height along Y). */
  size: { length: number; width: number; height: number }
}

/** Pursuit status surfaced to the HUD. */
export type PursuitStatus = 'roam' | 'spotted' | 'search'

/** Live, human-cadence run stats mirrored into the store for the HUD/UI. */
export interface RunStats {
  time: number
  distance: number
  speed: number
  topSpeed: number
  heat: number
  peakHeat: number
  vehiclesUsed: number
  score: number
  status: PursuitStatus
  /** Capture progress 0..1 (how close to being busted). */
  capture: number
  copsDestroyed: number
  nearMisses: number
  policeCount: number
  /** Current vehicle name, or null when on foot. */
  vehicleName: string | null
  /** Current vehicle health 0..1 (1 when on foot). */
  vehicleHealth: number
  /** Just-collected powerup name to flash, or null. */
  powerBanner: string | null
  /** Remaining nitro boost (s). */
  boost: number
  /** Remaining shield (s). */
  shield: number
}
