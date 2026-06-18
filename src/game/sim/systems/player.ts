import { DAMAGE, PLAYER } from '@/config/constants'
import { dampAngle } from '@/core/math/angles'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import { buildingCollision } from '@/game/sim/los'
import { landmarkCollision } from '@/game/world/landmarkModel'
import { isBridge, isWater, surfaceHeight, waterDepth } from '@/game/world/terrain'
import type { SimState } from '@/game/sim/state'
import { getDebug } from '@/state/useDebugStore'
import { POWER } from './powerups'
import { damageWorldVehicle, ejectPlayer } from './destruction'

export interface StepInput {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  handbrake: boolean
  interactPressed: boolean
  /** Camera yaw (radians) so on-foot movement is relative to where you look. */
  lookYaw: number
}

const FOOT_RADIUS = 0.6
/** On-foot swim speed multiplier. */
const SWIM_MULT = 0.55
/** Water depth (units) beyond which a car bogs out and dumps the driver. */
const CAR_DROWN_DEPTH = 1.4

/** Advances the player (on foot or driving) and resolves world collisions. */
export function updatePlayer(state: SimState, input: StepInput, dt: number): void {
  const { player } = state
  const debug = getDebug()

  // --- Enter / exit / steal ---
  if (input.interactPressed) {
    if (player.mode === 'foot') {
      let best = -1
      let bestDist = PLAYER.enterRadius * PLAYER.enterRadius
      for (let i = 0; i < state.vehicles.length; i++) {
        const v = state.vehicles[i]
        if (v.occupied || v.wrecked) continue
        const d = v.pos.distanceToSquared(player.pos)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      if (best >= 0) {
        player.mode = 'vehicle'
        player.vehicleIndex = best
        player.swimming = false
        state.vehicles[best].occupied = true
        player.heading = state.vehicles[best].state.heading
        state.acc.vehiclesUsed++
      }
    } else {
      const v = state.vehicles[player.vehicleIndex]
      v.occupied = false
      v.state.speed = 0
      v.state.slip = 0
      const lx = Math.cos(v.state.heading)
      const lz = -Math.sin(v.state.heading)
      player.pos.set(
        v.pos.x + lx * (v.def.size.width + 1),
        0,
        v.pos.z + lz * (v.def.size.width + 1),
      )
      player.mode = 'foot'
      player.vehicleIndex = -1
    }
  }

  // --- Movement ---
  let speed = 0
  if (player.mode === 'foot') {
    const swimming = isWater(player.pos.x, player.pos.z) && !isBridge(player.pos.x, player.pos.z)
    player.swimming = swimming
    const ix = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    const iz = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
    const len = Math.hypot(ix, iz)
    if (len > 0) {
      // Rotate the raw input by the camera yaw so "forward" is into the screen
      // wherever the player has looked.
      const c = Math.cos(input.lookYaw)
      const s = Math.sin(input.lookYaw)
      const rx = (ix / len) * c + (iz / len) * s
      const rz = -(ix / len) * s + (iz / len) * c
      const nx = rx
      const nz = rz
      const footMult = debug.enabled ? debug.footSpeedMult : 1
      const moveSpeed = PLAYER.footSpeed * footMult * (swimming ? SWIM_MULT : 1)
      const step = moveSpeed * dt
      player.pos.x += nx * step
      player.pos.z += nz * step
      player.heading = dampAngle(player.heading, Math.atan2(nx, nz), PLAYER.turnLerp, dt)
      speed = moveSpeed
      state.playerVel.set(nx * speed, 0, nz * speed)
    } else {
      state.playerVel.set(0, 0, 0)
    }

    const c = buildingCollision(player.pos.x, player.pos.z, FOOT_RADIUS)
    if (c.hit) {
      player.pos.x += c.nx * c.depth
      player.pos.z += c.nz * c.depth
    }
    const lc = landmarkCollision(player.pos.x, player.pos.z, FOOT_RADIUS)
    if (lc.hit) {
      player.pos.x += lc.nx * lc.depth
      player.pos.z += lc.nz * lc.depth
    }
  } else {
    const v = state.vehicles[player.vehicleIndex]
    const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    // Airborne when the body is meaningfully above the surface (ramp/ledge).
    const airborne = v.y > surfaceHeight(v.pos.x, v.pos.z) + 0.5
    const speedMult =
      (state.power.boost > 0 ? POWER.nitroMult : 1) * (debug.enabled ? debug.speedMult : 1)
    const { dx, dz } = stepVehicle(v.state, { throttle, steer, handbrake: input.handbrake }, v.def, dt, speedMult)
    v.pos.x += dx
    v.pos.z += dz

    if (!airborne) {
      // Building collision -> bump + speed loss + impact damage.
      const radius = v.def.size.width * 0.6
      const c = buildingCollision(v.pos.x, v.pos.z, radius)
      if (c.hit) {
        v.pos.x += c.nx * c.depth
        v.pos.z += c.nz * c.depth
        const impact = Math.abs(v.state.speed)
        if (impact > DAMAGE.minImpactSpeed) {
          damageWorldVehicle(state, v, (impact - DAMAGE.minImpactSpeed) * DAMAGE.impactScale)
          v.squash = DAMAGE.impactSquash
          state.shake = Math.max(state.shake, Math.min(1, (impact - DAMAGE.minImpactSpeed) / 22))
        }
        v.state.speed *= 0.25
        v.state.slip *= 0.25
      }

      const lc = landmarkCollision(v.pos.x, v.pos.z, radius)
      if (lc.hit) {
        v.pos.x += lc.nx * lc.depth
        v.pos.z += lc.nz * lc.depth
        const impact = Math.abs(v.state.speed)
        if (impact > DAMAGE.minImpactSpeed) {
          damageWorldVehicle(state, v, (impact - DAMAGE.minImpactSpeed) * DAMAGE.impactScale)
          state.shake = Math.max(state.shake, Math.min(1, (impact - DAMAGE.minImpactSpeed) / 22))
        }
        v.state.speed *= 0.3
        v.state.slip *= 0.3
      }

      // Rivers bog cars down; deep water dumps the driver out to swim — unless
      // a bridge deck carries the car across.
      const depth = isBridge(v.pos.x, v.pos.z) ? 0 : waterDepth(v.pos.x, v.pos.z)
      if (depth > 0) {
        v.state.speed *= 1 - Math.min(0.92, depth * 0.6)
        v.state.slip *= 0.5
        if (depth > CAR_DROWN_DEPTH) {
          ejectPlayer(state, v)
        }
      }
    }

    if (player.mode === 'vehicle') {
      player.pos.copy(v.pos)
      player.heading = v.state.heading
      speed = Math.abs(v.state.speed)
      state.playerVel.set(
        Math.sin(v.state.heading) * v.state.speed,
        0,
        Math.cos(v.state.heading) * v.state.speed,
      )
      // A wrecked car mid-drive ejects the player.
      if (v.wrecked) ejectPlayer(state, v)
    }
  }

  state.playerSpeed = speed
}
