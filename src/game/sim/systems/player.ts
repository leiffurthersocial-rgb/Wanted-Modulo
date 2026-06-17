import * as THREE from 'three'
import { DAMAGE, PLAYER } from '@/config/constants'
import { dampAngle } from '@/core/math/angles'
import { getCity } from '@/game/world/cityModel'
import { stepVehicle } from '@/game/vehicles/vehiclePhysics'
import { buildingCollision } from '@/game/sim/los'
import type { SimState } from '@/game/sim/state'
import { damageWorldVehicle, ejectPlayer } from './destruction'

export interface StepInput {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  interactPressed: boolean
}

const FOOT_RADIUS = 0.6

/** Advances the player (on foot or driving) and resolves world collisions. */
export function updatePlayer(state: SimState, input: StepInput, dt: number): void {
  const { player } = state
  const worldHalf = getCity().worldHalf

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
        state.vehicles[best].occupied = true
        player.heading = state.vehicles[best].state.heading
        state.acc.vehiclesUsed++
      }
    } else {
      const v = state.vehicles[player.vehicleIndex]
      v.occupied = false
      v.state.speed = 0
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
    // Mapped to the chase-camera basis: W = into the screen (+Z), D = screen-right.
    const ix = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    const iz = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
    const len = Math.hypot(ix, iz)
    if (len > 0) {
      const nx = ix / len
      const nz = iz / len
      const step = PLAYER.footSpeed * dt
      player.pos.x += nx * step
      player.pos.z += nz * step
      player.heading = dampAngle(player.heading, Math.atan2(nx, nz), PLAYER.turnLerp, dt)
      speed = PLAYER.footSpeed
      state.playerVel.set(nx * speed, 0, nz * speed)
    } else {
      state.playerVel.set(0, 0, 0)
    }

    const c = buildingCollision(player.pos.x, player.pos.z, FOOT_RADIUS)
    if (c.hit) {
      player.pos.x += c.nx * c.depth
      player.pos.z += c.nz * c.depth
    }
  } else {
    const v = state.vehicles[player.vehicleIndex]
    const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
    // Steering matches the chase camera: D turns the car toward screen-right.
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    const { dx, dz } = stepVehicle(v.state, { throttle, steer }, v.def, dt)
    v.pos.x += dx
    v.pos.z += dz

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
      }
      v.state.speed *= 0.25
    }

    player.pos.copy(v.pos)
    player.heading = v.state.heading
    speed = Math.abs(v.state.speed)
    state.playerVel.set(
      Math.sin(v.state.heading) * v.state.speed,
      0,
      Math.cos(v.state.heading) * v.state.speed,
    )
  }

  // Keep within world bounds.
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -worldHalf, worldHalf)
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -worldHalf, worldHalf)
  if (player.mode === 'vehicle') {
    const v = state.vehicles[player.vehicleIndex]
    v.pos.x = player.pos.x
    v.pos.z = player.pos.z
    // A wrecked car mid-drive ejects the player.
    if (v.wrecked) ejectPlayer(state, v)
  }

  state.playerSpeed = speed
}
