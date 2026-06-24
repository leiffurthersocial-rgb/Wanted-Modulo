import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SIM } from '@/config/constants'
import { Input } from '@/core/input/InputManager'
import { useGameStore } from '@/state/useGameStore'
import { Environment } from '@/game/world/Environment'
import { VoxelVehicle } from '@/game/models/VoxelVehicle'
import { sampleAt, leftNormal } from '@/game/world/track'
import { BOT_COLOR, RACE_DEF, createRaceState } from './raceState'
import { stepRace } from './raceState'
import { Track } from './Track'

const CAM = { distance: 14, height: 8, lerp: 6, lookLerp: 9 }

export function RaceScene() {
  const { camera } = useThree()
  const mode = useGameStore((s) => s.mode)
  const trackId = useGameStore((s) => s.raceTrackId)
  const difficulty = useGameStore((s) => s.raceDifficulty)
  const best = useGameStore((s) => s.raceBestFor(trackId, mode === 'endless'))

  const race = useMemo(
    () => createRaceState(mode, trackId, difficulty, best),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const botDef = useMemo(() => ({ ...RACE_DEF, color: BOT_COLOR }), [])

  const playerRef = useRef<THREE.Group>(null)
  const botRef = useRef<THREE.Group>(null)
  const lookTarget = useRef(new THREE.Vector3())
  const statTimer = useRef(1) // publish on the first frame
  const ended = useRef(false)

  // Finish gate (closed circuits): posts + bar across the start line.
  const gate = useMemo(() => {
    if (race.endless) return null
    const sp = sampleAt(race.track, 0)
    const n = leftNormal(sp.tan)
    const yaw = Math.atan2(sp.tan.x, sp.tan.z)
    return { x: sp.pos.x, z: sp.pos.z, yaw, half: race.track.half, n }
  }, [race])

  useFrame((_, delta) => {
    const dt = Math.min(delta, SIM.maxDt)
    const store = useGameStore.getState()

    if (Input.consumePressed('pause')) {
      if (store.phase === 'playing') store.pause()
      else if (store.phase === 'paused') store.resume()
    }
    if (store.phase !== 'playing') {
      Input.lateUpdate()
      return
    }

    const snap = Input.snapshot()
    stepRace(
      race,
      {
        throttle: (snap.forward ? 1 : 0) - (snap.backward ? 1 : 0),
        steer: (snap.left ? 1 : 0) - (snap.right ? 1 : 0),
        handbrake: Input.isDown('handbrake'),
      },
      dt,
    )

    const p = race.player
    // Commit player car.
    if (playerRef.current) {
      const driftYaw = Math.atan2(p.state.slip, Math.abs(p.state.speed) + 4) * 0.6
      playerRef.current.position.set(p.pos.x, p.y, p.pos.z)
      playerRef.current.rotation.set(p.falling ? -0.5 : 0, p.state.heading + driftYaw, 0)
    }
    if (botRef.current && race.bot) {
      botRef.current.position.set(race.bot.pos.x, race.bot.y, race.bot.pos.z)
      botRef.current.rotation.y = race.bot.state.heading
    }

    // Chase camera (behind the player along their heading).
    const fx = Math.sin(p.state.heading)
    const fz = Math.cos(p.state.heading)
    const desiredX = p.pos.x - fx * CAM.distance
    const desiredZ = p.pos.z - fz * CAM.distance
    const t = 1 - Math.exp(-CAM.lerp * dt)
    camera.position.x += (desiredX - camera.position.x) * t
    camera.position.y += (p.y + CAM.height - camera.position.y) * t
    camera.position.z += (desiredZ - camera.position.z) * t
    const lt = 1 - Math.exp(-CAM.lookLerp * dt)
    lookTarget.current.x += (p.pos.x - lookTarget.current.x) * lt
    lookTarget.current.y += (p.y + 1.2 - lookTarget.current.y) * lt
    lookTarget.current.z += (p.pos.z - lookTarget.current.z) * lt
    camera.lookAt(lookTarget.current)

    // Sun/shadows track the player.
    store.setRadar({ px: p.pos.x, pz: p.pos.z, heading: p.state.heading, units: [], helis: [], suspect: null })

    statTimer.current += dt
    if (statTimer.current >= SIM.statPublishInterval || race.finished) {
      statTimer.current = 0
      publish(race)
    }

    if (race.finished && !ended.current) {
      ended.current = true
      publish(race)
      store.endRun()
    }
    Input.lateUpdate()
  })

  return (
    <>
      <Environment />
      <Track race={race} />
      {/* Void floor far below so falling off reads. */}
      <mesh position={[0, -26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#2a3550" />
      </mesh>

      {gate && (
        <group position={[gate.x, 0, gate.z]} rotation={[0, gate.yaw, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (gate.half + 0.6), 2.4, 0]} castShadow>
              <boxGeometry args={[0.6, 4.8, 0.6]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
          <mesh position={[0, 4.8, 0]} castShadow>
            <boxGeometry args={[(gate.half + 0.9) * 2, 0.7, 0.6]} />
            <meshStandardMaterial color="#ff5252" emissive="#ff5252" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}

      <group ref={playerRef}>
        <VoxelVehicle def={RACE_DEF} />
      </group>
      {race.bot && (
        <group ref={botRef}>
          <VoxelVehicle def={botDef} />
        </group>
      )}
    </>
  )
}

function publish(race: ReturnType<typeof createRaceState>): void {
  const p = race.player
  const total = race.totalDist || 1
  const playerProgress = race.endless ? 0 : Math.max(0, Math.min(1, p.traveled / total))
  const botProgress = race.endless || !race.bot ? 0 : Math.max(0, Math.min(1, race.bot.traveled / total))
  const lap = race.endless
    ? 0
    : Math.min(race.totalLaps, Math.floor(Math.max(0, p.traveled) / race.track.length) + 1)
  const position = !race.endless && race.bot ? (p.traveled >= race.bot.traveled ? 1 : 2) : 1
  const distance = Math.max(0, p.traveled)
  const speed = Math.abs(p.state.speed)

  useGameStore.getState().publishStats({
    mode: race.mode,
    speed,
    score: race.endless ? Math.round(distance) : 0,
    race: {
      endless: race.endless,
      countdown: race.countdown,
      time: race.elapsed,
      lap,
      totalLaps: race.totalLaps,
      position,
      playerProgress,
      botProgress,
      distance,
      speed,
      best: race.best,
      recover: race.recover,
      finished: race.finished,
      won: race.won,
      fell: race.fell,
    },
  })
}
