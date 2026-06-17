import { useGameStore } from '@/state/useGameStore'
import { Game } from '@/game/Game'
import { HUD } from '@/ui/hud/HUD'
import { MainMenu } from '@/ui/screens/MainMenu'
import { CharacterSelect } from '@/ui/screens/CharacterSelect'
import { PauseMenu } from '@/ui/screens/PauseMenu'
import { GameOver } from '@/ui/screens/GameOver'

/**
 * Phase router. A single `phase` enum decides which screen renders and whether
 * the 3D Canvas is mounted. The Canvas persists across play/pause so resuming
 * is instant.
 */
export default function App() {
  const phase = useGameStore((s) => s.phase)
  const inRun = phase === 'playing' || phase === 'paused'

  return (
    <>
      {inRun && (
        <>
          <Game />
          <HUD />
          {phase === 'paused' && <PauseMenu />}
        </>
      )}

      {phase === 'menu' && <MainMenu />}
      {phase === 'characterSelect' && <CharacterSelect />}
      {phase === 'gameover' && <GameOver />}
    </>
  )
}
