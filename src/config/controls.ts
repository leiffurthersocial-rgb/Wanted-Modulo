import type { InputAction } from '@/types'

/**
 * Default key bindings: logical action -> physical KeyboardEvent.code list.
 * Rebinding (Phase 9) mutates a copy of this in the settings store.
 */
export const DEFAULT_BINDINGS: Record<InputAction, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  handbrake: ['Space', 'ShiftLeft'],
  interact: ['KeyE'],
  pause: ['Escape', 'KeyP'],
}
