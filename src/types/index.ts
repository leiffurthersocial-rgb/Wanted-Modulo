/** Shared domain types for WANTED: MODULO. */

/** High-level game flow states. The UI router and the simulation both read this. */
export type GamePhase =
  | 'menu'
  | 'characterSelect'
  | 'raceSetup'
  | 'settings'
  | 'statistics'
  | 'playing'
  | 'paused'
  | 'gameover'

/** Which game mode a run uses. */
export type GameMode = 'survive' | 'pursuit' | 'race' | 'endless'

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
  | 'sofia'

export type HairStyle = 'ponytail' | 'messy' | 'short' | 'buzz' | 'side' | 'long' | 'bob'

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
  /** Remaining cloak / invisibility (s). */
  cloak: number
  /** Which mode this run is. */
  mode: GameMode
  /** Cop-chase stats (present only in pursuit mode). */
  chase: ChaseStats | null
  /** Race / endless stats (present only in those modes). */
  race: RaceStats | null
}

/** Live HUD stats for Race + Endless modes. */
export interface RaceStats {
  /** True for the solo endless mode (false for head-to-head race). */
  endless: boolean
  /** Start countdown (seconds, 3..0); 0 once racing. */
  countdown: number
  /** Elapsed race time (seconds). */
  time: number
  /** Current lap (1-based) and total laps (race only). */
  lap: number
  totalLaps: number
  /** Player position: 1 = leading, 2 = behind (race only). */
  position: number
  /** Player + bot progress along the whole race (0..1, race only). */
  playerProgress: number
  botProgress: number
  /** Distance travelled (metres) — the endless score. */
  distance: number
  /** Current speed readout. */
  speed: number
  /** Best time (ms, race) or best distance (m, endless) for this track. */
  best: number
  /** Brief "recovering after a fall" timer (s). */
  recover: number
  /** Run finished + outcome. */
  finished: boolean
  won: boolean
  /** Fell off the track (endless game-over). */
  fell: boolean
}

/** Live HUD stats for the cop-chase (pursuit) mode. */
export interface ChaseStats {
  /** Suspects busted so far this run. */
  caught: number
  /** Bust progress on the current suspect (0..1). */
  bust: number
  /** Distance (world units) to the current suspect. */
  suspectDist: number
  /** Bearing to the suspect relative to the camera/heading (radians). */
  suspectAngle: number
  /** Escape warning 0..1 — suspect is slipping away. */
  escapeWarn: number
  /** "CAUGHT!" banner flash timer (s). */
  banner: number
}
