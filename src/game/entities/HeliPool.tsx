import { POLICE } from '@/config/constants'
import { Registry } from '@/game/sim/registry'
import { VoxelHelicopter } from '@/game/models/VoxelHelicopter'

/** Pooled helicopters; transforms/visibility/rotor spin driven by the sim. */
export function HeliPool() {
  return (
    <>
      {Array.from({ length: POLICE.maxHelis }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(el) => {
            Registry.helis[i] = el
          }}
        >
          <VoxelHelicopter slot={i} />
        </group>
      ))}
    </>
  )
}
