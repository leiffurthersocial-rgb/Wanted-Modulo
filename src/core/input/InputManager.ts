import type { InputAction } from '@/types'
import { DEFAULT_BINDINGS } from '@/config/controls'

/**
 * Singleton keyboard input manager.
 *
 * Maps physical keys -> logical actions and exposes a cheap per-frame API for
 * the simulation. Held state powers continuous movement; edge detection
 * (`consumePressed`) powers one-shot actions like Enter/Exit and Pause.
 *
 * Touch controls (Phase 9) will feed the same action set via `setVirtual`.
 */
export interface InputSnapshot {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

class InputManagerImpl {
  private bindings: Record<InputAction, string[]> = DEFAULT_BINDINGS
  private held = new Set<string>()
  private justPressed = new Set<string>()
  /** Virtual (touch/UI) action overrides. */
  private virtual = new Set<InputAction>()
  private attached = false

  attach(): void {
    if (this.attached || typeof window === 'undefined') return
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    this.attached = true
  }

  detach(): void {
    if (!this.attached) return
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.held.clear()
    this.justPressed.clear()
    this.attached = false
  }

  setBindings(bindings: Record<InputAction, string[]>): void {
    this.bindings = bindings
  }

  /** True while any key bound to the action is held (or virtually pressed). */
  isDown(action: InputAction): boolean {
    if (this.virtual.has(action)) return true
    for (const code of this.bindings[action]) {
      if (this.held.has(code)) return true
    }
    return false
  }

  /** True exactly once per physical press of the action (edge-triggered). */
  consumePressed(action: InputAction): boolean {
    for (const code of this.bindings[action]) {
      if (this.justPressed.has(code)) {
        this.justPressed.delete(code)
        return true
      }
    }
    return false
  }

  /** Cheap movement read for the hot loop. */
  snapshot(): InputSnapshot {
    return {
      forward: this.isDown('forward'),
      backward: this.isDown('backward'),
      left: this.isDown('left'),
      right: this.isDown('right'),
    }
  }

  /** Virtual press from touch UI. */
  setVirtual(action: InputAction, on: boolean): void {
    if (on) this.virtual.add(action)
    else this.virtual.delete(action)
  }

  /** Clear per-frame edge state. Call at the end of each tick. */
  lateUpdate(): void {
    this.justPressed.clear()
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Avoid hijacking typing in inputs (rebind screen, etc.).
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

    if (this.isBoundCode(e.code)) e.preventDefault()
    if (!this.held.has(e.code)) this.justPressed.add(e.code)
    this.held.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code)
  }

  private onBlur = (): void => {
    this.held.clear()
    this.justPressed.clear()
  }

  private isBoundCode(code: string): boolean {
    for (const action in this.bindings) {
      if (this.bindings[action as InputAction].includes(code)) return true
    }
    return false
  }
}

export const Input = new InputManagerImpl()
