export type PropType =
  | 'streetlight'
  | 'fence'
  | 'tree'
  | 'mailbox'
  | 'bench'
  | 'sign'
  | 'barrier'

export interface PropPart {
  size: [number, number, number]
  /** Vertical centre offset (origin sits on the ground). */
  y: number
  color: string
  emissive?: string
}

export interface PropTypeDef {
  type: PropType
  /** Primary instanced part. */
  body: PropPart
  /** Optional secondary instanced part (lamp head, foliage, ...). */
  cap?: PropPart
  /** Collision radius. */
  radius: number
  /** Voxel debris colour + count when smashed. */
  debrisColor: string
  debrisCount: number
  /** Relative spawn weight. */
  weight: number
}

export const PROP_TYPES: Record<PropType, PropTypeDef> = {
  streetlight: {
    type: 'streetlight',
    body: { size: [0.22, 4.2, 0.22], y: 2.1, color: '#3b4150' },
    cap: { size: [0.7, 0.3, 0.7], y: 4.1, color: '#fff4cc', emissive: '#ffe9a8' },
    radius: 0.7,
    debrisColor: '#3b4150',
    debrisCount: 8,
    weight: 1.4,
  },
  fence: {
    type: 'fence',
    body: { size: [2.6, 1.1, 0.18], y: 0.55, color: '#8a8f9c' },
    radius: 1.4,
    debrisColor: '#8a8f9c',
    debrisCount: 10,
    weight: 1.2,
  },
  tree: {
    type: 'tree',
    body: { size: [0.4, 1.4, 0.4], y: 0.7, color: '#5b4329' },
    cap: { size: [1.8, 1.9, 1.8], y: 2.2, color: '#3f7d3a' },
    radius: 1.0,
    debrisColor: '#3f7d3a',
    debrisCount: 12,
    weight: 1.6,
  },
  mailbox: {
    type: 'mailbox',
    body: { size: [0.5, 1.0, 0.7], y: 0.5, color: '#2f7fd4' },
    radius: 0.6,
    debrisColor: '#2f7fd4',
    debrisCount: 6,
    weight: 0.8,
  },
  bench: {
    type: 'bench',
    body: { size: [1.8, 0.6, 0.6], y: 0.3, color: '#7a5a3a' },
    radius: 1.1,
    debrisColor: '#7a5a3a',
    debrisCount: 8,
    weight: 0.9,
  },
  sign: {
    type: 'sign',
    body: { size: [0.16, 2.4, 0.16], y: 1.2, color: '#9aa0ad' },
    cap: { size: [0.9, 0.7, 0.08], y: 2.2, color: '#ffd23f' },
    radius: 0.5,
    debrisColor: '#ffd23f',
    debrisCount: 6,
    weight: 1.0,
  },
  barrier: {
    type: 'barrier',
    body: { size: [2.2, 1.0, 0.5], y: 0.5, color: '#ff7a1a' },
    radius: 1.3,
    debrisColor: '#ff7a1a',
    debrisCount: 10,
    weight: 1.0,
  },
}

export const PROP_TYPE_LIST = Object.keys(PROP_TYPES) as PropType[]
