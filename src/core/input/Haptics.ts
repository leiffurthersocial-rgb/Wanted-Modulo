/**
 * Controller rumble via the Gamepad vibration API. No-ops gracefully when no
 * gamepad / actuator is present, or when the rumble setting is off (the caller
 * gates that). Strength and duration are clamped to sane ranges.
 */
interface VibrationActuatorLike {
  playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>
}

let lastFire = 0

export function rumble(strength: number, durationMs: number): void {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return
  // Throttle so rapid impacts don't stack into a constant buzz.
  const now = performance.now()
  if (now - lastFire < 60) return
  lastFire = now

  const s = Math.max(0, Math.min(1, strength))
  const dur = Math.max(40, Math.min(600, durationMs))
  const pads = navigator.getGamepads()
  for (const pad of pads) {
    if (!pad) continue
    const act = (pad as unknown as { vibrationActuator?: VibrationActuatorLike }).vibrationActuator
    if (act?.playEffect) {
      act.playEffect('dual-rumble', {
        startDelay: 0,
        duration: dur,
        weakMagnitude: s * 0.6,
        strongMagnitude: s,
      }).catch(() => {})
    }
  }
}
