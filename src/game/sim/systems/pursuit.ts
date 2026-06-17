import { CAPTURE, HEAT, POLICE, SCORE } from '@/config/constants'
import { angleDelta, clamp } from '@/core/math/angles'
import { POLICE_CLASSES, type PoliceClassId } from '@/game/vehicles/policeCatalog'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import { buildingCollision, losBlocked } from '@/game/sim/los'
import { tierFor, type HeatTier } from '@/game/sim/heatTable'
import { damageTier, type PoliceUnit, type SimState } from '@/game/sim/state'
import { damageWorldVehicle } from './destruction'
import { emitFire, emitSmoke, spawnExplosion } from './particles'

/* -------------------------------------------------------------------------- */
/*  Spotting — does anyone currently see the player?                           */
/* -------------------------------------------------------------------------- */

export function updateSpotting(state: SimState, dt: number): void {
  const p = state.player
  const heat = state.heat
  const onFoot = p.mode === 'foot'
  const range = POLICE.sightRange * (onFoot ? 0.6 : 1)
  let spotted = false

  for (const u of state.police) {
    if (!u.active) continue
    const dx = p.pos.x - u.pos.x
    const dz = p.pos.z - u.pos.z
    const dist = Math.hypot(dx, dz)
    if (dist > range) continue
    // Close units see in all directions; otherwise require a forward cone.
    if (dist > 9) {
      const fx = Math.sin(u.state.heading)
      const fz = Math.cos(u.state.heading)
      const dot = (dx * fx + dz * fz) / (dist || 1)
      if (Math.acos(clamp(dot, -1, 1)) > POLICE.sightFov) continue
    }
    if (losBlocked(u.pos.x, u.pos.z, p.pos.x, p.pos.z)) continue
    spotted = true
    break
  }

  // Helicopters spot from above, ignoring building cover.
  if (!spotted) {
    for (const h of state.helis) {
      if (!h.active) continue
      const dx = p.pos.x - h.pos.x
      const dz = p.pos.z - h.pos.z
      if (Math.hypot(dx, dz) < POLICE.heliSightRadius) {
        spotted = true
        break
      }
    }
  }

  heat.spotted = spotted
  if (spotted) {
    heat.lastKnown.copy(p.pos)
    heat.hasLastKnown = true
    heat.timeSinceSpotted = 0
    heat.searchTimer = 0
  } else {
    heat.timeSinceSpotted += dt
    if (heat.hasLastKnown) heat.searchTimer += dt
  }
}

/* -------------------------------------------------------------------------- */
/*  Fleet management — spawn, despawn, roadblocks                              */
/* -------------------------------------------------------------------------- */

function inactiveUnit(state: SimState): PoliceUnit | null {
  for (const u of state.police) if (!u.active) return u
  return null
}

function pickClass(state: SimState, tier: HeatTier): PoliceClassId {
  const classes = tier.classes
  return classes[(state.rand() * classes.length) | 0]
}

function activate(
  state: SimState,
  u: PoliceUnit,
  classId: PoliceClassId,
  x: number,
  z: number,
  block: boolean,
): void {
  const cls = POLICE_CLASSES[classId]
  u.active = true
  u.classId = classId
  u.def = cls.def
  u.pos.set(x, 0, z)
  // Face the player.
  u.state.heading = Math.atan2(state.player.pos.x - x, state.player.pos.z - z)
  u.state.speed = 0
  u.health = cls.def.durability
  u.ai = block ? 'block' : 'pursue'
  u.blockUntilNear = block
  u.flankAngle = (state.rand() - 0.5) * 2.6
  u.smokeTimer = 0
  u.nearMissArmed = true
}

/** Finds a spawn point near the player that isn't inside a building. */
function findSpawnPoint(state: SimState, radius: number): [number, number] {
  const p = state.player.pos
  for (let k = 0; k < 6; k++) {
    const a = state.rand() * Math.PI * 2
    const x = p.x + Math.cos(a) * radius
    const z = p.z + Math.sin(a) * radius
    if (!buildingCollision(x, z, 2.5).hit) return [x, z]
  }
  return [p.x + radius, p.z]
}

function deployRoadblock(state: SimState, tier: HeatTier): void {
  // Place a line of stationary units ahead along the player's travel direction.
  const p = state.player.pos
  let dirX = state.playerVel.x
  let dirZ = state.playerVel.z
  const len = Math.hypot(dirX, dirZ)
  if (len < 1) {
    dirX = Math.sin(state.player.heading)
    dirZ = Math.cos(state.player.heading)
  } else {
    dirX /= len
    dirZ /= len
  }
  const ahead = POLICE.spawnRadius * 0.7
  const cx = p.x + dirX * ahead
  const cz = p.z + dirZ * ahead
  // Perpendicular spread.
  const px = -dirZ
  const pz = dirX
  for (let i = -1; i <= 1; i++) {
    const u = inactiveUnit(state)
    if (!u) return
    const x = cx + px * i * 4
    const z = cz + pz * i * 4
    if (buildingCollision(x, z, 2.5).hit) continue
    activate(state, u, pickClass(state, tier), x, z, true)
  }
}

export function manageFleet(state: SimState, dt: number, level: number): void {
  const tier = tierFor(level)

  // Count and cull.
  let ground = 0
  let helis = 0
  for (const u of state.police) {
    if (!u.active) continue
    ground++
    const far = u.pos.distanceTo(state.player.pos) > POLICE.despawnRadius
    const giveUp = !state.heat.spotted && state.heat.searchTimer > HEAT.searchTimeout
    if (far || ground > tier.ground || giveUp) {
      u.active = false
      ground--
    }
  }
  for (const h of state.helis) if (h.active) helis++

  // Ground spawns (throttled).
  state.spawnTimer -= dt
  if (ground < tier.ground && state.spawnTimer <= 0) {
    state.spawnTimer = POLICE.spawnInterval
    const u = inactiveUnit(state)
    if (u) {
      const [x, z] = findSpawnPoint(state, POLICE.spawnRadius)
      activate(state, u, pickClass(state, tier), x, z, false)
    }
  }

  // Roadblocks while actively pursued.
  if (tier.roadblocks && state.heat.spotted) {
    state.roadblockTimer -= dt
    if (state.roadblockTimer <= 0) {
      state.roadblockTimer = 10 + state.rand() * 6
      deployRoadblock(state, tier)
    }
  }

  // Helicopters.
  if (helis < tier.helis && level >= POLICE.heliMinHeat) {
    for (const h of state.helis) {
      if (h.active) continue
      const [x, z] = findSpawnPoint(state, POLICE.spawnRadius)
      h.active = true
      h.pos.set(x, POLICE.heliHeight, z)
      h.heading = 0
      h.attack = tier.attackHeli && level >= POLICE.attackHeliMinHeat
      h.strikeTimer = 4 + state.rand() * 4
      h.strikeFuse = -1
      break
    }
  } else if (helis > tier.helis) {
    for (const h of state.helis) {
      if (h.active) {
        h.active = false
        break
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Ground unit AI + collisions                                               */
/* -------------------------------------------------------------------------- */

function damagePolice(state: SimState, u: PoliceUnit, amount: number): void {
  if (amount <= 0) return
  u.health -= amount
  if (u.health <= 0) {
    u.active = false
    spawnExplosion(state, u.pos.x, u.pos.y + 0.6, u.pos.z)
    state.score.cops++
    state.score.value += SCORE.copDestroyed
  }
}

export function updatePolice(state: SimState, dt: number, level: number): void {
  const tier = tierFor(level)
  const p = state.player
  const spotted = state.heat.spotted

  for (const u of state.police) {
    if (!u.active) continue

    // --- Decide target ---
    let tx = u.pos.x
    let tz = u.pos.z
    let throttle = 0
    let holding = false

    if (u.blockUntilNear) {
      if (u.pos.distanceTo(p.pos) < 30) {
        u.blockUntilNear = false
        u.ai = 'pursue'
      } else {
        holding = true
        tx = p.pos.x
        tz = p.pos.z
      }
    }

    if (!holding) {
      if (spotted) {
        u.ai = Math.abs(u.flankAngle) > 0.9 ? 'flank' : 'pursue'
        const lead = POLICE.predictLead
        const flankR = u.flankAngle * 7
        tx = p.pos.x + state.playerVel.x * lead + Math.sin(p.heading + u.flankAngle) * flankR
        tz = p.pos.z + state.playerVel.z * lead + Math.cos(p.heading + u.flankAngle) * flankR
        throttle = 1
      } else if (state.heat.hasLastKnown && state.heat.searchTimer < HEAT.searchTimeout) {
        u.ai = 'search'
        const t = state.acc.time
        const wob = 8 + (u.flankAngle + 1.5) * 4
        tx = state.heat.lastKnown.x + Math.cos(t * 0.7 + u.flankAngle * 3) * wob
        tz = state.heat.lastKnown.z + Math.sin(t * 0.7 + u.flankAngle * 3) * wob
        throttle = 0.75
      } else {
        throttle = 0 // idle, coast to stop
      }
    }

    // --- Steer & drive ---
    const desired = Math.atan2(tx - u.pos.x, tz - u.pos.z)
    const err = angleDelta(u.state.heading, desired)
    const steer = clamp(err * POLICE.steerGain, -1, 1)
    const driveThrottle = holding ? 0 : Math.abs(err) < 1.3 ? throttle : throttle * 0.5
    const { dx, dz } = stepVehicle(
      u.state,
      { throttle: driveThrottle, steer },
      u.def,
      dt,
      tier.speedMult,
    )
    u.pos.x += dx
    u.pos.z += dz

    // Building collision.
    const r = u.def.size.width * 0.6
    const c = buildingCollision(u.pos.x, u.pos.z, r)
    if (c.hit) {
      u.pos.x += c.nx * c.depth
      u.pos.z += c.nz * c.depth
      u.state.speed *= 0.5
    }

    // --- Collision / ram vs player ---
    const dxp = p.pos.x - u.pos.x
    const dzp = p.pos.z - u.pos.z
    const dist = Math.hypot(dxp, dzp) || 0.0001
    const playerR = p.mode === 'vehicle' ? state.vehicles[p.vehicleIndex].def.size.width * 0.6 : 0.6
    const sumR = r + playerR

    if (dist < sumR) {
      // Separate.
      const push = sumR - dist
      u.pos.x -= (dxp / dist) * push
      u.pos.z -= (dzp / dist) * push
      const impact = Math.abs(u.state.speed) + state.playerSpeed
      if (p.mode === 'vehicle') {
        const pv = state.vehicles[p.vehicleIndex]
        damageWorldVehicle(state, pv, impact * 0.45 * (0.6 + tier.aggression))
        pv.squash = Math.max(pv.squash, 0.16)
        damagePolice(state, u, impact * 0.6 * pv.def.weight)
      }
      u.state.speed *= 0.6
    } else if (
      spotted &&
      p.mode === 'vehicle' &&
      u.nearMissArmed &&
      dist < CAPTURE.nearMissRadius &&
      Math.abs(u.state.speed) + state.playerSpeed > CAPTURE.nearMissSpeed
    ) {
      u.nearMissArmed = false
      state.score.nearMisses++
      state.score.value += SCORE.nearMiss
    }
    if (dist > CAPTURE.nearMissRadius * 1.6) u.nearMissArmed = true

    // --- Damage visuals ---
    const dt2 = damageTier(u.health, u.def.durability)
    if (dt2 === 'smoking' || dt2 === 'onfire') {
      u.smokeTimer -= dt
      if (u.smokeTimer <= 0) {
        u.smokeTimer = dt2 === 'onfire' ? 0.08 : 0.16
        emitSmoke(state, u.pos.x, u.pos.y + u.def.size.height * 0.7, u.pos.z)
        if (dt2 === 'onfire') emitFire(state, u.pos.x, u.pos.y + 0.5, u.pos.z)
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Helicopters                                                                */
/* -------------------------------------------------------------------------- */

export function updateHelis(state: SimState, dt: number): void {
  const p = state.player
  for (const h of state.helis) {
    if (!h.active) continue
    // Drift toward a point above/near the player.
    const tx = p.pos.x + state.playerVel.x * 0.5
    const tz = p.pos.z + state.playerVel.z * 0.5
    const t = 1 - Math.exp(-1.6 * dt)
    h.pos.x += (tx - h.pos.x) * t
    h.pos.z += (tz - h.pos.z) * t
    h.pos.y += (POLICE.heliHeight - h.pos.y) * t
    h.heading = Math.atan2(tx - h.pos.x, tz - h.pos.z)

    if (!h.attack) continue
    if (h.strikeFuse < 0) {
      h.strikeTimer -= dt
      if (h.strikeTimer <= 0) {
        h.strikeTimer = 6 + state.rand() * 4
        h.strikeFuse = 1.8
        h.strikeX = p.pos.x + state.playerVel.x * 1.2
        h.strikeZ = p.pos.z + state.playerVel.z * 1.2
      }
    } else {
      h.strikeFuse -= dt
      if (h.strikeFuse <= 0) {
        h.strikeFuse = -1
        spawnExplosion(state, h.strikeX, 0.6, h.strikeZ)
        const d = Math.hypot(p.pos.x - h.strikeX, p.pos.z - h.strikeZ)
        if (d < 6 && p.mode === 'vehicle') {
          damageWorldVehicle(state, state.vehicles[p.vehicleIndex], 60)
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Capture / bust                                                             */
/* -------------------------------------------------------------------------- */

export function updateCapture(state: SimState, dt: number): void {
  const p = state.player
  const onFoot = p.mode === 'foot'
  let near = 0
  for (const u of state.police) {
    if (!u.active) continue
    if (u.pos.distanceTo(p.pos) < CAPTURE.radius) near++
  }

  if (near > 0 && (onFoot || state.playerSpeed < CAPTURE.slowSpeed)) {
    const mult = onFoot ? CAPTURE.onFootMultiplier : 1
    state.capture += CAPTURE.ratePerUnit * near * mult * dt
  } else {
    state.capture -= CAPTURE.recover * dt
  }
  state.capture = clamp(state.capture, 0, 1)
  if (state.capture >= 1) state.busted = true
}
