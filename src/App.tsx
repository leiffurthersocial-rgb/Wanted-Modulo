import { lazy, Suspense } from 'react'
import { useGameStore } from '@/state/useGameStore'
import { useSettingsStore } from '@/state/useSettingsStore'
import { HUD } from '@/ui/hud/HUD'
import { TouchControls } from '@/ui/hud/TouchControls'
import { MainMenu } from '@/ui/screens/MainMenu'
import { PauseMenu } from '@/ui/screens/PauseMenu'

// Heavy / less-frequent screens are code-split so the initial menu shell loads
// fast — the 3D engine (three, r3f, postprocessing) only downloads on play.
const Game = lazy(() => import('@/game/Game').then((m) => ({ default: m.Game })))
const CharacterSelect = lazy(() =>
  import('@/ui/screens/CharacterSelect').then((m) => ({ default: m.CharacterSelect })),
)
const Settings = lazy(() => import('@/ui/screens/Settings').then((m) => ({ default: m.Settings })))
const Statistics = lazy(() => import('@/ui/screens/Statistics').then((m) => ({ default: m.Statistics })))
const GameOver = lazy(() => import('@/ui/screens/GameOver').then((m) => ({ default: m.GameOver })))

function Loading() {
  return (
    <div className="screen">
      <div className="loading">Loading…</div>
    </div>
  )
}

/**
 * Phase router. A single `phase` enum decides which screen renders and whether
 * the 3D Canvas is mounted. The Canvas persists across play/pause so resuming
 * is instant.
 */
export default function App() {
  const phase = useGameStore((s) => s.phase)
  const mobileControls = useSettingsStore((s) => s.mobileControls)
  const inRun = phase === 'playing' || phase === 'paused'
  const showTouch = inRun && mobileControls

  return (
    <Suspense fallback={<Loading />}>
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
    </Suspense>
  )
}
