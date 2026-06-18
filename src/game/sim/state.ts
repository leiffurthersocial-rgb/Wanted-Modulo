import * as THREE from 'three'
import type { VehicleDef } from '@/types'
import type { VehicleState } from '@/game/vehicles/vehiclePhysics'
import type { PoliceClassId } from '@/game/vehicles/policeCatalog'
import { POLICE_CLASSES } from '@/game/vehicles/policeCatalog'
import type { PropInstance } from '@/game/world/propModel'
import { ensurePropWindow, getProps } from '@/game/world/propModel'
import type { PropType } from '@/game/world/propCatalog'
import { VEHICLE_SPAWNS } from '@/game/vehicles/vehicleSpawns'
import { PARTICLES, PLAYER, POLICE } from '@/config/constants'
import { mulberry32 } from '@/game/world/cityModel'

export type DamageTier = 'healthy' | 'dented' | 'smoking' | 'onfire' | 'wreck'

export type PoliceAI = 'spawn' | 'pursue' | 'intercept' | 'flank' | 'block' | 'search'

export interface PlayerSim {
  pos: THREE.Vector3
  heading: number
  mode: 'foot' | 'vehicle'
  vehicleIndex: number
  /** True while wading/swimming in a river (on foot). */
  swimming: boolean
}

/** A destructible prop with run-scoped alive state (cloned from the model). */
export interface SimProp extends PropInstance {
  alive: boolean
}

/** A request for the renderer to hide a destroyed prop instance. */
export interface HideRequest {
  type: PropType
  index: number
}

export interface VehicleEntity {
  def: VehicleDef
  pos: THREE.Vector3
  state: VehicleState
  health: number
  occupied: boolean
  wrecked: boolean
  smokeTimer: number
  /** Transient squash applied on impact (visual), decays to 0. */
  squash: number
  /** Current height above the world baseline (gravity-integrated). */
  y: number
  /** Vertical velocity (units/s) for ramp jumps and falling off ledges. */
  vy: number
}

export interface PoliceUnit {
  active: boolean
  classId: PoliceClassId
  def: VehicleDef
  pos: THREE.Vector3
  state: VehicleState
  health: number
  ai: PoliceAI
  /** Assigned surround angle offset for flanking. */
  flankAngle: number
  smokeTimer: number
  nearMissArmed: boolean
  /** Stationary roadblock units release into pursuit when the player nears. */
  blockUntilNear: boolean
}

export interface HeliUnit {
  active: boolean
  pos: THREE.Vector3
  heading: number
  attack: boolean
  /** Countdown to next strike run (attack helis only). */
  strikeTimer: number
  /** Active strike marker position + fuse; -1 when idle. */
  strikeFuse: number
  strikeX: number
  strikeZ: number
}

export interface Particle {
  active: boolean
  kind: 'debris' | 'smoke' | 'fire'
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color
}

export interface HeatSim {
  /** Continuous 0..10. */
  progress: number
  /** Minimum heat from survival time. */
  floor: number
  spotted: boolean
  timeSinceSpotted: number
  lastKnown: THREE.Vector3
  hasLastKnown: boolean
  searchTimer: number
}

export interface ScoreSim {
  value: number
  cops: number
  nearMisses: number
}

export interface SimState {
  player: PlayerSim
  /** Player velocity (world units/s) — consumed by AI prediction. */
  playerVel: THREE.Vector3
  playerSpeed: number
  vehicles: VehicleEntity[]
  police: PoliceUnit[]
  helis: HeliUnit[]
  props: SimProp[]
  hideQueue: HideRequest[]
  particles: Particle[]
  particleCursor: number
  heat: HeatSim
  score: ScoreSim
  capture: number
  busted: boolean
  spawnTimer: number
  roadblockTimer: number
  flashPhase: number
  /** Monotonic explosion counter — drives the explosion SFX cue. */
  explosions: number
  acc: {
    time: number
    distance: number
    topSpeed: number
    vehiclesUsed: number
    statTimer: number
  }
  rand: () => number
}

function makePolicePool(): PoliceUnit[] {
  const out: PoliceUnit[] = []
  for (let i = 0; i < POLICE.maxUnits; i++) {
    out.push({
      active: false,
      classId: 'patrol',
      def: POLICE_CLASSES.patrol.def,
      pos: new THREE.Vector3(),
      state: { heading: 0, speed: 0, slip: 0 },
      health: 1,
      ai: 'spawn',
      flankAngle: 0,
      smokeTimer: 0,
      nearMissArmed: true,
      blockUntilNear: false,
    })
  }
  return out
}

function makeHeliPool(): HeliUnit[] {
  const out: HeliUnit[] = []
  for (let i = 0; i < POLICE.maxHelis; i++) {
    out.push({
      active: false,
      pos: new THREE.Vector3(),
      heading: 0,
      attack: false,
      strikeTimer: 0,
      strikeFuse: -1,
      strikeX: 0,
      strikeZ: 0,
    })
  }
  return out
}

function makeParticlePool(): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < PARTICLES.max; i++) {
    out.push({
      active: false,
      kind: 'debris',
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      size: 0.2,
      color: new THREE.Color(),
    })
  }
  return out
}

/** Builds a fresh simulation state for a new run. */
export function createSimState(): SimState {
  // Seed the streaming prop window around the spawn before snapshotting props.
  ensurePropWindow(0, 0)
  const vehicles: VehicleEntity[] = VEHICLE_SPAWNS.map((s) => ({
    def: s.def,
    pos: new THREE.Vector3(...s.position),
    state: { heading: s.heading, speed: 0, slip: 0 },
    health: s.def.durability,
    occupied: false,
    wrecked: false,
    smokeTimer: 0,
    squash: 0,
    y: 0,
    vy: 0,
  }))

  return {
    player: {
      pos: new THREE.Vector3(...PLAYER.spawn),
      heading: 0,
      mode: 'foot',
      vehicleIndex: -1,
      swimming: false,
    },
    playerVel: new THREE.Vector3(),
    playerSpeed: 0,
    vehicles,
    police: makePolicePool(),
    helis: makeHeliPool(),
    props: getProps().props.map((p) => ({ ...p, alive: true })),
    hideQueue: [],
    particles: makeParticlePool(),
    particleCursor: 0,
    heat: {
      progress: 0,
      floor: 0,
      spotted: false,
      timeSinceSpotted: 999,
      lastKnown: new THREE.Vector3(),
      hasLastKnown: false,
      searchTimer: 0,
    },
    score: { value: 0, cops: 0, nearMisses: 0 },
    capture: 0,
    busted: false,
    spawnTimer: 0,
    roadblockTimer: 6,
    flashPhase: 0,
    explosions: 0,
    acc: { time: 0, distance: 0, topSpeed: 0, vehiclesUsed: 0, statTimer: 0 },
    rand: mulberry32((Math.random() * 1e9) | 0),
  }
}

/** Current health ratio -> damage tier. */
export function damageTier(health: number, durability: number): DamageTier {
  if (health <= 0) return 'wreck'
  const r = health / durability
  if (r > 0.6) return 'healthy'
  if (r > 0.35) return 'dented'
  if (r > 0.15) return 'smoking'
  return 'onfire'
}
