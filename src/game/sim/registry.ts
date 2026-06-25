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
  mines: [] as (THREE.Group | null)[],
  mineLights: [] as (THREE.MeshStandardMaterial | null)[],
  particles: null as THREE.InstancedMesh | null,
  props: {} as Partial<Record<PropType, THREE.InstancedMesh | null>>,
  propsCap: {} as Partial<Record<PropType, THREE.InstancedMesh | null>>,
  /** Building material — emissive (window glow) animated by day/night. */
  cityMaterial: null as THREE.MeshStandardMaterial | null,
  /** Player locomotion for character animation: 0 = idle, higher = faster. */
  playerSpeed: 0,
  /** True while the player is on foot (vs driving). */
  playerOnFoot: true,
}
