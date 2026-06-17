import { useFrame } from '@react-three/fiber'
import { POLICE } from '@/config/constants'
import { useFleetStore } from '@/state/useFleetStore'
import { Registry } from '@/game/sim/registry'
import { VoxelPoliceCar } from '@/game/models/VoxelPoliceCar'

/**
 * Pre-allocated pool of police vehicles (object pooling). All slots stay
 * mounted; the simulation toggles visibility + transforms via the Registry.
 * Only the per-slot class (which model) is reactive. Lightbars flash here.
 */
export function PolicePool() {
  const classes = useFleetStore((s) => s.policeClasses)

  useFrame(({ clock }) => {
    const phase = Math.sin(clock.elapsedTime * 14) > 0
    for (let i = 0; i < POLICE.maxUnits; i++) {
      const l = Registry.policeLightL[i]
      const r = Registry.policeLightR[i]
      if (l) l.emissiveIntensity = phase ? 1.9 : 0.15
      if (r) r.emissiveIntensity = phase ? 0.15 : 1.9
    }
  })

  return (
    <>
      {classes.map((classId, i) => (
        <group
          key={i}
          visible={false}
          ref={(el) => {
            Registry.police[i] = el
          }}
        >
          <VoxelPoliceCar classId={classId} slot={i} />
        </group>
      ))}
    </>
  )
}
