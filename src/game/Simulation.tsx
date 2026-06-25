import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CharacterId } from '@/types'
import { CAMERA, HEAT, POLICE, SIM } from '@/config/constants'
import { surfaceHeight, WATER_Y } from '@/game/world/terrain'
import { Input } from '@/core/input/InputManager'
import { rumble } from '@/core/input/Haptics'
import { Audio } from '@/core/audio/AudioManager'
import { useGameStore } from '@/state/useGameStore'
import { useFleetStore } from '@/state/useFleetStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { CHARACTERS } from '@/game/characters/characterCatalog'
import { VEHICLE_SPAWNS } from '@/game/vehicles/vehicleSpawns'
import type { PoliceClassId } from '@/game/vehicles/policeCatalog'
import { VoxelCharacter } from '@/game/models/VoxelCharacter'
import { VoxelVehicle } from '@/game/models/VoxelVehicle'
import { VoxelPoliceCar } from '@/game/models/VoxelPoliceCar'
import { Registry } from '@/game/sim/registry'
import { createSimState } from '@/game/sim/state'
import { ESCAPE_LIMIT, SUSPECT_DEF } from '@/game/sim/systems/chase'
import { stepSim } from '@/game/sim/step'
import { getDebug } from '@/state/useDebugStore'

/** Reserved police-pool slot used to flash the player's cruiser lightbar in chase mode. */
const COP_LIGHT_SLOT = POLICE.maxUnits

// Shared scratch objects (single-threaded — safe to reuse).
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const IDENT_Q = new THREE.Quaternion()
const tmpM = new THREE.Matrix4()
const tmpScale = new THREE.Vector3()

export function Simulation({ characterId }: { characterId: CharacterId }) {
  const { camera } = useThree()
  const setPoliceClasses = useFleetStore((s) => s.setPoliceClasses)
  const mode = useGameStore((s) => s.mode)
  const pursuit = mode === 'pursuit'

  const playerRef = useRef<THREE.Group>(null)
  const vehicleRefs = useRef<(THREE.Group | null)[]>([])
  const copRef = useRef<THREE.Group>(null)
  const suspectRef = useRef<THREE.Group>(null)
  const lookTarget = useRef(new THREE.Vector3())
  const peakHeat = useRef(0)
  const prevHeat = useRef(0)
  const prevSpotted = useRef(false)
  const prevHeli = useRef(false)
  const prevExplosions = useRef(0)
  const prevPickups = useRef(0)
  const prevShake = useRef(0)
  const prevClasses = useRef<PoliceClassId[]>(useFleetStore.getState().policeClasses.slice())

  const sim = useMemo(() => createSimState(mode), [mode])

  useFrame((frameState, delta) => {
    const debug = getDebug()
    const scale = debug.enabled ? debug.timeScale : 1
    const dt = Math.min(delta * scale, SIM.maxDt)
    const store = useGameStore.getState()

    // Any active debug override taints the run — it won't count toward bests.
    if (debug.enabled && store.phase === 'playing' && !store.cheated) store.markCheated()

    // Pause toggle works in any phase.
    if (Input.consumePressed('pause')) {
      if (store.phase === 'playing') store.pause()
      else if (store.phase === 'paused') store.resume()
    }
    if (store.phase !== 'playing') {
      Input.lateUpdate()
      return
    }

    const inVehicleNow = sim.player.mode === 'vehicle'
    // While driving, relax free-look back to straight-behind.
    if (inVehicleNow) Input.relaxLook(dt)
    const look = Input.getLook()

    // --- Advance the simulation ---
    const snap = Input.snapshot()
    // In cop-chase you're locked into the cruiser, so swallow the enter/exit key.
    const interact = Input.consumePressed('interact')
    stepSim(
      sim,
      {
        forward: snap.forward,
        backward: snap.backward,
        left: snap.left,
        right: snap.right,
        handbrake: Input.isDown('handbrake'),
        interactPressed: sim.mode === 'pursuit' ? false : interact,
        lookYaw: inVehicleNow ? 0 : look.yaw,
      },
      dt,
    )

    const { player } = sim

    // --- Chase camera (follows the surface; floats on water when swimming) ---
    const inVehicle = player.mode === 'vehicle'
    const py = inVehicle
      ? sim.vehicles[player.vehicleIndex].y
      : player.swimming
        ? WATER_Y
        : surfaceHeight(player.pos.x, player.pos.z)
    // Settings: field of view + chase-camera distance.
    const settings = useSettingsStore.getState()
    const persp = camera as THREE.PerspectiveCamera
    if (persp.isPerspectiveCamera && persp.fov !== settings.fov) {
      persp.fov = settings.fov
      persp.updateProjectionMatrix()
    }
    // On foot the camera orbits with free-look; driving locks behind the car.
    const camHeading = inVehicle ? player.heading : look.yaw
    const cfg = inVehicle ? CAMERA.vehicle : CAMERA.foot
    const pitch = inVehicle ? 0 : look.pitch
    const camMul = settings.cameraDistance
    const fx = Math.sin(camHeading)
    const fz = Math.cos(camHeading)
    const dist = cfg.distance * camMul * (1 - pitch * 0.35)
    const desiredX = player.pos.x - fx * dist
    const desiredZ = player.pos.z - fz * dist
    const posT = 1 - Math.exp(-CAMERA.lerp * dt)
    camera.position.x += (desiredX - camera.position.x) * posT
    camera.position.y += (py + cfg.height * camMul + pitch * 9 - camera.position.y) * posT
    camera.position.z += (desiredZ - camera.position.z) * posT
    const lookT = 1 - Math.exp(-CAMERA.lookLerp * dt)
    lookTarget.current.x += (player.pos.x - lookTarget.current.x) * lookT
    lookTarget.current.y += (py + 1.2 - lookTarget.current.y) * lookT
    lookTarget.current.z += (player.pos.z - lookTarget.current.z) * lookT
    camera.lookAt(lookTarget.current)

    // --- Impact/landing shake + controller rumble (gated by settings) ---
    const shake = sim.shake
    if (shake > 0.01 && settings.cameraShake) {
      camera.position.x += (Math.random() - 0.5) * shake * 3
      camera.position.y += (Math.random() - 0.5) * shake * 3
    }
    // Fire rumble on the rising edge of a fresh impact.
    if (settings.rumble && shake > 0.25 && shake > prevShake.current + 0.12) {
      rumble(shake, 120 + shake * 180)
    }
    prevShake.current = shake

    // Publish locomotion for character animation.
    Registry.playerSpeed = sim.playerSpeed
    Registry.playerOnFoot = player.mode === 'foot'

    // --- Commit player + world vehicles ---
    if (playerRef.current) {
      playerRef.current.position.set(player.pos.x, py, player.pos.z)
      playerRef.current.rotation.y = player.heading
      playerRef.current.visible = player.mode === 'foot'
    }
    for (let i = 0; i < sim.vehicles.length; i++) {
      const g = vehicleRefs.current[i]
      if (!g) continue
      // In chase mode slot 0 is the player's cruiser, drawn by a dedicated cop
      // model — hide the civilian body that would otherwise overlap it.
      if (pursuit && i === 0) {
        g.visible = false
        continue
      }
      const v = sim.vehicles[i]
      // Gravity-driven height + drift yaw + airborne nose pitch.
      const driftYaw = Math.atan2(v.state.slip, Math.abs(v.state.speed) + 4) * 0.6
      g.position.set(v.pos.x, v.y, v.pos.z)
      g.rotation.y = v.state.heading + driftYaw
      g.rotation.x = THREE.MathUtils.clamp(-v.vy * 0.03, -0.35, 0.35)
      const sq = v.squash
      g.scale.set(1 + sq * 0.4, 1 - sq * 0.6, 1 + sq * 0.4)
    }

    // --- Chase mode: commit the player cruiser + the fleeing suspect ---
    if (pursuit && sim.chase) {
      const v = sim.vehicles[0]
      if (copRef.current) {
        const driftYaw = Math.atan2(v.state.slip, Math.abs(v.state.speed) + 4) * 0.6
        copRef.current.position.set(v.pos.x, v.y, v.pos.z)
        copRef.current.rotation.y = v.state.heading + driftYaw
      }
      const s = sim.chase.suspect
      if (suspectRef.current) {
        const sDrift = Math.atan2(s.state.slip, Math.abs(s.state.speed) + 4) * 0.6
        suspectRef.current.position.set(s.pos.x, s.y, s.pos.z)
        suspectRef.current.rotation.y = s.state.heading + sDrift
      }
      // Flash the cruiser lightbar (reuses the police lightbar materials).
      const on = Math.sin(frameState.clock.elapsedTime * 14) > 0
      const ll = Registry.policeLightL[COP_LIGHT_SLOT]
      const rl = Registry.policeLightR[COP_LIGHT_SLOT]
      if (ll) ll.emissiveIntensity = on ? 1.9 : 0.15
      if (rl) rl.emissiveIntensity = on ? 0.15 : 1.9
    }

    // --- Commit police pool ---
    for (let i = 0; i < sim.police.length; i++) {
      const g = Registry.police[i]
      if (!g) continue
      const u = sim.police[i]
      if (u.active) {
        g.visible = true
        g.position.set(u.pos.x, surfaceHeight(u.pos.x, u.pos.z), u.pos.z)
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
        g.position.set(h.pos.x, surfaceHeight(h.pos.x, h.pos.z) + POLICE.heliHeight, h.pos.z)
        g.rotation.y = h.heading
        const rotor = Registry.heliRotors[i]
        if (rotor) rotor.rotation.y += 40 * dt
      } else {
        g.visible = false
      }
    }

    // --- Commit police ground bombs (+ blink) ---
    for (let i = 0; i < sim.mines.length; i++) {
      const g = Registry.mines[i]
      if (!g) continue
      const m = sim.mines[i]
      if (m.active) {
        g.visible = true
        g.position.set(m.pos.x, surfaceHeight(m.pos.x, m.pos.z), m.pos.z)
        const light = Registry.mineLights[i]
        if (light) {
          // Slow amber pulse while arming, then a fast red blink once live.
          const live = m.arm <= 0
          const rate = live ? 11 : 4
          const on = Math.sin(m.blink * rate) > 0
          light.emissiveIntensity = on ? 2.2 : 0.15
          light.color.set(live ? '#ff2a20' : '#ffb020')
          light.emissive.set(live ? '#ff2a20' : '#ffb020')
        }
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

    // --- End-of-run checks ---
    if (sim.busted || (sim.chase?.escaped ?? false)) {
      publishStats(sim, peakHeat)
      Audio.cue('bust')
      store.endRun()
      Input.lateUpdate()
      return
    }

    // --- Publish HUD stats + audio (throttled) ---
    sim.acc.statTimer += dt
    if (sim.acc.statTimer >= SIM.statPublishInterval) {
      sim.acc.statTimer = 0
      publishStats(sim, peakHeat)

      const level = Math.floor(sim.heat.progress)
      let heliActive = false
      for (const h of sim.helis) if (h.active) { heliActive = true; break }
      Audio.update({
        heat: level,
        spotted: sim.heat.spotted,
        speed: sim.playerSpeed,
        inVehicle: player.mode === 'vehicle',
      })
      if (level > prevHeat.current) Audio.cue('heatUp')
      prevHeat.current = level
      if (prevSpotted.current && !sim.heat.spotted) Audio.cue('escape')
      prevSpotted.current = sim.heat.spotted
      if (heliActive && !prevHeli.current) Audio.cue('heli')
      prevHeli.current = heliActive
      if (sim.explosions > prevExplosions.current) {
        Audio.cue('explosion')
        prevExplosions.current = sim.explosions
      }
      if (sim.pickups > prevPickups.current) {
        Audio.cue('pickup')
        prevPickups.current = sim.pickups
      }
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

      {pursuit && (
        <>
          <group ref={copRef}>
            <VoxelPoliceCar classId="interceptor" slot={COP_LIGHT_SLOT} />
          </group>
          <group ref={suspectRef}>
            <VoxelVehicle def={SUSPECT_DEF} />
          </group>
        </>
      )}
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
  const units: { x: number; z: number }[] = []
  for (const u of sim.police) {
    if (!u.active) continue
    policeCount++
    units.push({ x: u.pos.x, z: u.pos.z })
  }
  const helis: { x: number; z: number }[] = []
  for (const h of sim.helis) if (h.active) helis.push({ x: h.pos.x, z: h.pos.z })
  const suspect = sim.chase ? { x: sim.chase.suspect.pos.x, z: sim.chase.suspect.pos.z } : null
  useGameStore.getState().setRadar({
    px: sim.player.pos.x,
    pz: sim.player.pos.z,
    heading: sim.player.heading,
    units,
    helis,
    suspect,
  })

  const inVehicle = sim.player.mode === 'vehicle'
  const v = inVehicle ? sim.vehicles[sim.player.vehicleIndex] : null

  const chase = sim.chase
    ? {
        caught: sim.chase.caught,
        bust: sim.chase.bust,
        suspectDist: sim.chase.dist,
        suspectAngle: sim.chase.bearing,
        escapeWarn: Math.min(1, sim.chase.escapeTimer / ESCAPE_LIMIT),
        banner: sim.chase.banner,
      }
    : null

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
    powerBanner: sim.power.banner > 0 ? sim.power.lastKind : null,
    boost: sim.power.boost,
    shield: sim.power.shield,
    cloak: sim.power.cloak,
    mode: sim.mode,
    chase,
  })
}
