import { PARTICLES } from '@/config/constants'
import type { Particle, SimState } from '@/game/sim/state'

/** Grab the next pooled particle (ring buffer — overwrites the oldest). */
function alloc(state: SimState): Particle {
  const p = state.particles[state.particleCursor]
  state.particleCursor = (state.particleCursor + 1) % state.particles.length
  return p
}

function rand(state: SimState, min: number, max: number): number {
  return min + state.rand() * (max - min)
}

/** Voxel debris burst (prop smash, scrape sparks). */
export function spawnDebris(
  state: SimState,
  x: number,
  y: number,
  z: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const p = alloc(state)
    p.active = true
    p.kind = 'debris'
    p.pos.set(x, y + rand(state, 0, 0.6), z)
    p.vel.set(rand(state, -4, 4), rand(state, 2, 7), rand(state, -4, 4))
    p.maxLife = rand(state, 0.9, 1.8)
    p.life = p.maxLife
    p.size = rand(state, 0.12, 0.26)
    p.color.set(color)
  }
}

/** A single rising smoke puff (continuous emission from damaged vehicles). */
export function emitSmoke(state: SimState, x: number, y: number, z: number): void {
  const p = alloc(state)
  p.active = true
  p.kind = 'smoke'
  p.pos.set(x + rand(state, -0.3, 0.3), y, z + rand(state, -0.3, 0.3))
  p.vel.set(rand(state, -0.6, 0.6), rand(state, 1.6, 2.6), rand(state, -0.6, 0.6))
  p.maxLife = rand(state, 1.0, 1.7)
  p.life = p.maxLife
  p.size = rand(state, 0.4, 0.7)
  p.color.setRGB(0.25, 0.26, 0.28)
}

/** A single flame flicker (on-fire vehicles). */
export function emitFire(state: SimState, x: number, y: number, z: number): void {
  const p = alloc(state)
  p.active = true
  p.kind = 'fire'
  p.pos.set(x + rand(state, -0.3, 0.3), y, z + rand(state, -0.3, 0.3))
  p.vel.set(rand(state, -0.5, 0.5), rand(state, 2.2, 3.6), rand(state, -0.5, 0.5))
  p.maxLife = rand(state, 0.3, 0.6)
  p.life = p.maxLife
  p.size = rand(state, 0.3, 0.5)
  p.color.setRGB(1.0, rand(state, 0.4, 0.7), 0.12)
}

/** Vehicle/strike explosion: fireball + smoke + scrap. */
export function spawnExplosion(state: SimState, x: number, y: number, z: number): void {
  for (let i = 0; i < 18; i++) {
    const p = alloc(state)
    p.active = true
    p.kind = 'fire'
    p.pos.set(x, y + 0.5, z)
    p.vel.set(rand(state, -7, 7), rand(state, 2, 9), rand(state, -7, 7))
    p.maxLife = rand(state, 0.4, 0.9)
    p.life = p.maxLife
    p.size = rand(state, 0.4, 0.8)
    p.color.setRGB(1.0, rand(state, 0.3, 0.6), 0.1)
  }
  for (let i = 0; i < 10; i++) {
    const p = alloc(state)
    p.active = true
    p.kind = 'debris'
    p.pos.set(x, y + 0.5, z)
    p.vel.set(rand(state, -6, 6), rand(state, 3, 8), rand(state, -6, 6))
    p.maxLife = rand(state, 1.0, 1.8)
    p.life = p.maxLife
    p.size = rand(state, 0.18, 0.34)
    p.color.setRGB(0.12, 0.12, 0.13)
  }
  for (let i = 0; i < 6; i++) emitSmoke(state, x, y + 1, z)
}

/** Integrate all active particles. */
export function updateParticles(state: SimState, dt: number): void {
  const g = PARTICLES.gravity
  for (const p of state.particles) {
    if (!p.active) continue
    p.life -= dt
    if (p.life <= 0) {
      p.active = false
      continue
    }
    if (p.kind === 'debris') {
      p.vel.y += g * dt
      p.pos.addScaledVector(p.vel, dt)
      const floor = p.size * 0.5
      if (p.pos.y <= floor) {
        p.pos.y = floor
        p.vel.y *= -PARTICLES.bounce
        p.vel.x *= PARTICLES.groundFriction
        p.vel.z *= PARTICLES.groundFriction
      }
    } else if (p.kind === 'smoke') {
      p.pos.addScaledVector(p.vel, dt)
      p.vel.multiplyScalar(0.95)
      p.size += dt * 1.4
    } else {
      // fire
      p.pos.addScaledVector(p.vel, dt)
      p.vel.y += 1.5 * dt
    }
  }
}
