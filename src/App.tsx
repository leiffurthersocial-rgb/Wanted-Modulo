import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { Game } from '@/game/Game'
import { HUD } from '@/ui/hud/HUD'
import { TouchControls } from '@/ui/hud/TouchControls'
import { MainMenu } from '@/ui/screens/MainMenu'
import { CharacterSelect } from '@/ui/screens/CharacterSelect'
import { Settings } from '@/ui/screens/Settings'
import { Statistics } from '@/ui/screens/Statistics'
import { PauseMenu } from '@/ui/screens/PauseMenu'
import { GameOver } from '@/ui/screens/GameOver'

const IS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

/**
 * Phase router. A single `phase` enum decides which screen renders and whether
 * the 3D Canvas is mounted. The Canvas persists across play/pause so resuming
 * is instant.
 */
export default function App() {
  const phase = useGameStore((s) => s.phase)
  const mobileControls = useSettingsStore((s) => s.mobileControls)
  const inRun = phase === 'playing' || phase === 'paused'
  const showTouch = inRun && (mobileControls || IS_TOUCH)

  return (
    <>
      {inRun && (
        <>
          <Game />
          <HUD />
          {showTouch && <TouchControls />}
          {phase === 'paused' && <PauseMenu />}
        </>
      )}

      {phase === 'menu' && <MainMenu />}
      {phase === 'characterSelect' && <CharacterSelect />}
      {phase === 'settings' && <Settings />}
      {phase === 'statistics' && <Statistics />}
      {phase === 'gameover' && <GameOver />}
    </>
  )
}
