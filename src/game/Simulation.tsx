import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CharacterId, VehicleDef } from '@/types'
import { CAMERA, CITY, CITY_PITCH, PLAYER, SIM } from '@/config/constants'
import { Input } from '@/core/input/InputManager'
import { dampAngle } from '@/core/math/angles'
import { useGameStore } from '@/state/useGameStore'
import { CHARACTERS } from '@/game/characters/characterCatalog'
import { VEHICLE_SPAWNS } from '@/game/vehicles/vehicleSpawns'
import { stepVehicle, type VehicleState } from '@/game/vehicles/vehiclePhysics'
import { VoxelCharacter } from '@/game/models/VoxelCharacter'
import { VoxelVehicle } from '@/game/models/VoxelVehicle'

interface PlayerSim {
  pos: THREE.Vector3
  heading: number
  mode: 'foot' | 'vehicle'
  vehicleIndex: number
}

interface VehicleSim {
  def: VehicleDef
  pos: THREE.Vector3
  state: VehicleState
  occupied: boolean
}

interface Accumulators {
  time: number
  distance: number
  topSpeed: number
  vehiclesUsed: number
  statTimer: number
}

const WORLD_HALF = (CITY.blocks * CITY_PITCH) / 2 + CITY_PITCH

/**
 * The authoritative game tick. One `useFrame` advances input, player/vehicle
 * movement, the chase camera, and (throttled) HUD stats — all via mutable refs
 * so the hot loop never triggers a React re-render.
 */
export function Simulation({ characterId }: { characterId: CharacterId }) {
  const { camera } = useThree()

  const playerRef = useRef<THREE.Group>(null)
  const vehicleRefs = useRef<(THREE.Group | null)[]>([])
  const lookTarget = useRef(new THREE.Vector3())

  // One-time simulation state (mutable, non-reactive).
  const sim = useMemo(() => {
    const player: PlayerSim = {
      pos: new THREE.Vector3(...PLAYER.spawn),
      heading: 0,
      mode: 'foot',
      vehicleIndex: -1,
    }
    const vehicles: VehicleSim[] = VEHICLE_SPAWNS.map((s) => ({
      def: s.def,
      pos: new THREE.Vector3(...s.position),
      state: { heading: s.heading, speed: 0 },
      occupied: false,
    }))
    const acc: Accumulators = {
      time: 0,
      distance: 0,
      topSpeed: 0,
      vehiclesUsed: 0,
      statTimer: 0,
    }
    return { player, vehicles, acc }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, SIM.maxDt)
    const store = useGameStore.getState()

    // --- Pause toggle works regardless of phase ---
    if (Input.consumePressed('pause')) {
      if (store.phase === 'playing') store.pause()
      else if (store.phase === 'paused') store.resume()
    }

    if (store.phase !== 'playing') {
      Input.lateUpdate()
      return
    }

    const { player, vehicles, acc } = sim
    const snap = Input.snapshot()

    // --- Enter / exit / steal vehicle ---
    if (Input.consumePressed('interact')) {
      if (player.mode === 'foot') {
        let best = -1
        let bestDist = PLAYER.enterRadius * PLAYER.enterRadius
        for (let i = 0; i < vehicles.length; i++) {
          if (vehicles[i].occupied) continue
          const d = vehicles[i].pos.distanceToSquared(player.pos)
          if (d < bestDist) {
            bestDist = d
            best = i
          }
        }
        if (best >= 0) {
          player.mode = 'vehicle'
          player.vehicleIndex = best
          vehicles[best].occupied = true
          player.heading = vehicles[best].state.heading
          acc.vehiclesUsed++
        }
      } else {
        const v = vehicles[player.vehicleIndex]
        v.occupied = false
        v.state.speed = 0
        // Step out to the left of the vehicle.
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
    let currentSpeed = 0
    let movedThisFrame = 0

    if (player.mode === 'foot') {
      const ix = (snap.right ? 1 : 0) - (snap.left ? 1 : 0)
      const iz = (snap.backward ? 1 : 0) - (snap.forward ? 1 : 0)
      const len = Math.hypot(ix, iz)
      if (len > 0) {
        const nx = ix / len
        const nz = iz / len
        const step = PLAYER.footSpeed * dt
        player.pos.x += nx * step
        player.pos.z += nz * step
        player.heading = dampAngle(player.heading, Math.atan2(nx, nz), PLAYER.turnLerp, dt)
        currentSpeed = PLAYER.footSpeed
        movedThisFrame = step
      }
    } else {
      const v = vehicles[player.vehicleIndex]
      const throttle = (snap.forward ? 1 : 0) - (snap.backward ? 1 : 0)
      const steer = (snap.right ? 1 : 0) - (snap.left ? 1 : 0)
      const { dx, dz } = stepVehicle(v.state, { throttle, steer }, v.def, dt)
      v.pos.x += dx
      v.pos.z += dz
      player.pos.copy(v.pos)
      player.heading = v.state.heading
      currentSpeed = Math.abs(v.state.speed)
      movedThisFrame = currentSpeed * dt
    }

    // Keep within world bounds.
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -WORLD_HALF, WORLD_HALF)
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -WORLD_HALF, WORLD_HALF)
    if (player.mode === 'vehicle') {
      vehicles[player.vehicleIndex].pos.x = player.pos.x
      vehicles[player.vehicleIndex].pos.z = player.pos.z
    }

    // --- Chase camera ---
    const camHeading = player.mode === 'vehicle' ? player.heading : 0
    const cfg = player.mode === 'vehicle' ? CAMERA.vehicle : CAMERA.foot
    const fx = Math.sin(camHeading)
    const fz = Math.cos(camHeading)
    const desiredX = player.pos.x - fx * cfg.distance
    const desiredZ = player.pos.z - fz * cfg.distance
    const posT = 1 - Math.exp(-CAMERA.lerp * dt)
    camera.position.x += (desiredX - camera.position.x) * posT
    camera.position.y += (cfg.height - camera.position.y) * posT
    camera.position.z += (desiredZ - camera.position.z) * posT
    const lookT = 1 - Math.exp(-CAMERA.lookLerp * dt)
    lookTarget.current.x += (player.pos.x - lookTarget.current.x) * lookT
    lookTarget.current.y += (1.2 - lookTarget.current.y) * lookT
    lookTarget.current.z += (player.pos.z - lookTarget.current.z) * lookT
    camera.lookAt(lookTarget.current)

    // --- Commit transforms to the scene graph ---
    if (playerRef.current) {
      playerRef.current.position.copy(player.pos)
      playerRef.current.rotation.y = player.heading
      playerRef.current.visible = player.mode === 'foot'
    }
    for (let i = 0; i < vehicles.length; i++) {
      const g = vehicleRefs.current[i]
      if (!g) continue
      g.position.copy(vehicles[i].pos)
      g.rotation.y = vehicles[i].state.heading
    }

    // --- Publish stats (throttled) ---
    acc.time += dt
    acc.distance += movedThisFrame
    if (currentSpeed > acc.topSpeed) acc.topSpeed = currentSpeed
    acc.statTimer += dt
    if (acc.statTimer >= SIM.statPublishInterval) {
      acc.statTimer = 0
      store.publishStats({
        time: acc.time,
        distance: acc.distance,
        speed: currentSpeed,
        topSpeed: acc.topSpeed,
        vehiclesUsed: acc.vehiclesUsed,
      })
    }

    Input.lateUpdate()
  })

  const character = CHARACTERS[characterId]

  return (
    <group>
      {/* Player on-foot model */}
      <group ref={playerRef}>
        <VoxelCharacter def={character} />
      </group>

      {/* Stealable vehicles */}
      {VEHICLE_SPAWNS.map((spawn, i) => (
        <group
          key={i}
          ref={(el) => {
            vehicleRefs.current[i] = el
          }}
          position={spawn.position}
          rotation={[0, spawn.heading, 0]}
        >
          <VoxelVehicle def={spawn.def} />
        </group>
      ))}
    </group>
  )
}
