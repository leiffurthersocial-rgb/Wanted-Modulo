import { POLICE } from '@/config/constants'
import type { PoliceClassId } from '@/game/vehicles/policeCatalog'

export interface HeatTier {
  name: string
  /** Desired number of active ground units. */
  ground: number
  /** Desired number of helicopters. */
  helis: number
  /** Classes that may spawn at this tier. */
  classes: PoliceClassId[]
  /** Speed multiplier applied to police top speed/accel. */
  speedMult: number
  /** 0..1 aggression — ramming willingness & heat-rise rate. */
  aggression: number
  /** Whether roadblocks are deployed. */
  roadblocks: boolean
  /** Whether attack helicopters perform strike runs. */
  attackHeli: boolean
}

/**
 * The escalation backbone (GDD §3). Index = heat level 0..10. Each tier stacks
 * new threats on the previous one. Ground counts are capped by POLICE.maxUnits.
 */
export const HEAT_TABLE: HeatTier[] = [
  { name: 'Clear', ground: 0, helis: 0, classes: [], speedMult: 1.0, aggression: 0.2, roadblocks: false, attackHeli: false },
  { name: 'Wanted', ground: 2, helis: 0, classes: ['patrol'], speedMult: 1.0, aggression: 0.3, roadblocks: false, attackHeli: false },
  { name: 'Hunted', ground: 4, helis: 0, classes: ['patrol'], speedMult: 1.02, aggression: 0.4, roadblocks: true, attackHeli: false },
  { name: 'Pursued', ground: 6, helis: 0, classes: ['patrol', 'interceptor'], speedMult: 1.05, aggression: 0.5, roadblocks: true, attackHeli: false },
  { name: 'Tracked', ground: 7, helis: 1, classes: ['patrol', 'interceptor', 'heavy'], speedMult: 1.07, aggression: 0.58, roadblocks: true, attackHeli: false },
  { name: 'Surrounded', ground: 9, helis: 1, classes: ['interceptor', 'heavy', 'swat', 'military'], speedMult: 1.1, aggression: 0.66, roadblocks: true, attackHeli: false },
  { name: 'Marked', ground: 11, helis: 1, classes: ['interceptor', 'heavy', 'swat', 'military'], speedMult: 1.12, aggression: 0.74, roadblocks: true, attackHeli: false },
  { name: 'Besieged', ground: 13, helis: 2, classes: ['interceptor', 'heavy', 'swat', 'military'], speedMult: 1.15, aggression: 0.82, roadblocks: true, attackHeli: false },
  { name: 'Hellfire', ground: 15, helis: 2, classes: ['interceptor', 'swat', 'military'], speedMult: 1.18, aggression: 0.9, roadblocks: true, attackHeli: true },
  { name: 'Lockdown', ground: 18, helis: 3, classes: ['interceptor', 'swat', 'military'], speedMult: 1.22, aggression: 0.96, roadblocks: true, attackHeli: true },
  { name: 'MODULO', ground: 20, helis: 3, classes: ['interceptor', 'military'], speedMult: 1.28, aggression: 1.0, roadblocks: true, attackHeli: true },
]

export function tierFor(heatLevel: number): HeatTier {
  const i = Math.max(0, Math.min(HEAT_TABLE.length - 1, heatLevel))
  const tier = HEAT_TABLE[i]
  return { ...tier, ground: Math.min(tier.ground, POLICE.maxUnits), helis: Math.min(tier.helis, POLICE.maxHelis) }
}
