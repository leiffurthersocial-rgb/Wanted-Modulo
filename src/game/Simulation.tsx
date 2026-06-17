import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CharacterId } from '@/types'
import { CAMERA, HEAT, SIM } from '@/config/constants'
import { Input } from '@/core/input/InputManager'
import { useGameStore } from '@/state/useGameStore'
import { useFleetStore } from '@/state/useFleetStore'
import { CHARACTERS } from '@/game/characters/characterCatalog'
import { VEHICLE_SPAWNS } from '@/game/vehicles/vehicleSpawns'
import type { PoliceClassId } from '@/game/vehicles/policeCatalog'
import { VoxelCharacter } from '@/game/models/VoxelCharacter'
import { VoxelVehicle } from '@/game/models/VoxelVehicle'
import { Registry } from '@/game/sim/registry'
import { createSimState } from '@/game/sim/state'
import { stepSim } from '@/game/sim/step'

// Shared scratch objects (single-threaded — safe to reuse).
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const IDENT_Q = new THREE.Quaternion()
const tmpM = new THREE.Matrix4()
const tmpScale = new THREE.Vector3()

export function Simulation({ characterId }: { characterId: CharacterId }) {
  const { camera } = useThree()
  const setPoliceClasses = useFleetStore((s) => s.setPoliceClasses)

  const playerRef = useRef<THREE.Group>(null)
  const vehicleRefs = useRef<(THREE.Group | null)[]>([])
  const lookTarget = useRef(new THREE.Vector3())
  const peakHeat = useRef(0)
  const prevClasses = useRef<PoliceClassId[]>(useFleetStore.getState().policeClasses.slice())

  const sim = useMemo(() => createSimState(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, SIM.maxDt)
    const store = useGameStore.getState()

    // Pause toggle works in any phase.
    if (Input.consumePressed('pause')) {
      if (store.phase === 'playing') store.pause()
      else if (store.phase === 'paused') store.resume()
    }
    if (store.phase !== 'playing') {
      Input.lateUpdate()
      return
    }

    // --- Advance the simulation ---
    const snap = Input.snapshot()
    stepSim(
      sim,
      {
        forward: snap.forward,
        backward: snap.backward,
        left: snap.left,
        right: snap.right,
        interactPressed: Input.consumePressed('interact'),
      },
      dt,
    )

    const { player } = sim

    // --- Chase camera ---
    const inVehicle = player.mode === 'vehicle'
    const camHeading = inVehicle ? player.heading : 0
    const cfg = inVehicle ? CAMERA.vehicle : CAMERA.foot
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

    // --- Commit player + world vehicles ---
    if (playerRef.current) {
      playerRef.current.position.copy(player.pos)
      playerRef.current.rotation.y = player.heading
      playerRef.current.visible = player.mode === 'foot'
    }
    for (let i = 0; i < sim.vehicles.length; i++) {
      const g = vehicleRefs.current[i]
      if (!g) continue
      const v = sim.vehicles[i]
      g.position.set(v.pos.x, 0, v.pos.z)
      g.rotation.y = v.state.heading
      const sq = v.squash
      g.scale.set(1 + sq * 0.4, 1 - sq * 0.6, 1 + sq * 0.4)
    }

    // --- Commit police pool ---
    for (let i = 0; i < sim.police.length; i++) {
      const g = Registry.police[i]
      if (!g) continue
      const u = sim.police[i]
      if (u.active) {
        g.visible = true
        g.position.set(u.pos.x, 0, u.pos.z)
        g.rotation.y = u.state.heading
      } else {
        g.visible = false
      }
    }

    // --- Commit helicopters (+ rotor spin) ---
    for (let i = 0; i < sim.helis.length; i++) {
      const g = Registry.helis[i]
      if (!g) continue
      const h = sim.helis[i]
      if (h.active) {
        g.visible = true
        g.position.copy(h.pos)
        g.rotation.y = h.heading
        const rotor = Registry.heliRotors[i]
        if (rotor) rotor.rotation.y += 40 * dt
      } else {
        g.visible = false
      }
    }

    // --- Commit particles ---
    const pm = Registry.particles
    if (pm) {
      for (let i = 0; i < sim.particles.length; i++) {
        const p = sim.particles[i]
        let s = 0
        if (p.active) {
          s =
            p.kind === 'debris'
              ? p.size * Math.min(1, p.life * 3)
              : p.size * Math.max(0.05, p.life / p.maxLife)
          pm.setColorAt(i, p.color)
        }
        tmpScale.set(s, s, s)
        tmpM.compose(p.pos, IDENT_Q, tmpScale)
        pm.setMatrixAt(i, tmpM)
      }
      pm.instanceMatrix.needsUpdate = true
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true
    }

    // --- Drain destroyed-prop hide queue ---
    if (sim.hideQueue.length) {
      const touched = new Set<THREE.InstancedMesh>()
      for (const req of sim.hideQueue) {
        const b = Registry.props[req.type]
        if (b) {
          b.setMatrixAt(req.index, ZERO)
          touched.add(b)
        }
        const c = Registry.propsCap[req.type]
        if (c) {
          c.setMatrixAt(req.index, ZERO)
          touched.add(c)
        }
      }
      touched.forEach((m) => (m.instanceMatrix.needsUpdate = true))
      sim.hideQueue.length = 0
    }

    // --- Reactive police class updates (only when a slot changes) ---
    let classesChanged = false
    for (let i = 0; i < sim.police.length; i++) {
      const u = sim.police[i]
      const desired = u.active ? u.classId : prevClasses.current[i]
      if (desired !== prevClasses.current[i]) {
        prevClasses.current[i] = desired
        classesChanged = true
      }
    }
    if (classesChanged) setPoliceClasses(prevClasses.current.slice())

    // --- Bust check ---
    if (sim.busted) {
      publishStats(sim, peakHeat)
      store.endRun()
      Input.lateUpdate()
      return
    }

    // --- Publish HUD stats (throttled) ---
    sim.acc.statTimer += dt
    if (sim.acc.statTimer >= SIM.statPublishInterval) {
      sim.acc.statTimer = 0
      publishStats(sim, peakHeat)
    }

    Input.lateUpdate()
  })

  const character = CHARACTERS[characterId]

  return (
    <group>
      <group ref={playerRef}>
        <VoxelCharacter def={character} />
      </group>

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

/** Mirrors throttled simulation stats into the game store for the HUD/UI. */
function publishStats(
  sim: ReturnType<typeof createSimState>,
  peakHeat: { current: number },
): void {
  const level = Math.floor(sim.heat.progress)
  if (level > peakHeat.current) peakHeat.current = level

  const status =
    sim.heat.spotted
      ? 'spotted'
      : sim.heat.hasLastKnown && sim.heat.searchTimer < HEAT.searchTimeout && level > 0
        ? 'search'
        : 'roam'

  let policeCount = 0
  for (const u of sim.police) if (u.active) policeCount++

  const inVehicle = sim.player.mode === 'vehicle'
  const v = inVehicle ? sim.vehicles[sim.player.vehicleIndex] : null

  useGameStore.getState().publishStats({
    time: sim.acc.time,
    distance: sim.acc.distance,
    speed: sim.playerSpeed,
    topSpeed: sim.acc.topSpeed,
    heat: level,
    peakHeat: peakHeat.current,
    vehiclesUsed: sim.acc.vehiclesUsed,
    score: Math.round(sim.score.value),
    status,
    capture: sim.capture,
    copsDestroyed: sim.score.cops,
    nearMisses: sim.score.nearMisses,
    policeCount,
    vehicleName: v ? v.def.name : null,
    vehicleHealth: v ? Math.max(0, v.health / v.def.durability) : 1,
  })
}
