import type * as THREE from 'three'
import type { PropType } from '@/game/world/propCatalog'

/**
 * Render bridge. Pooled entity components register their Three.js objects here
 * on mount (and null them on unmount via ref callbacks). The simulation reads
 * these in its single useFrame to write transforms — decoupling the imperative
 * hot loop from the declarative R3F tree without prop-drilling refs.
 */
export const Registry = {
  player: null as THREE.Group | null,
  vehicles: [] as (THREE.Group | null)[],
  police: [] as (THREE.Group | null)[],
  policeLightL: [] as (THREE.MeshStandardMaterial | null)[],
  policeLightR: [] as (THREE.MeshStandardMaterial | null)[],
  helis: [] as (THREE.Group | null)[],
  heliRotors: [] as (THREE.Object3D | null)[],
  particles: null as THREE.InstancedMesh | null,
  props: {} as Partial<Record<PropType, THREE.InstancedMesh | null>>,
  propsCap: {} as Partial<Record<PropType, THREE.InstancedMesh | null>>,
}
