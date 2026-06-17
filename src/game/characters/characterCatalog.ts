import type { CharacterDef, CharacterId } from '@/types'

/**
 * The four playable characters. Differences are strictly cosmetic
 * (hair, eyes, build, outfit) — no gameplay advantages, per the design pillar.
 */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  robin: {
    id: 'robin',
    name: 'Robin',
    description: 'Blonde ponytail · white tee',
    skin: '#e8b98f',
    hair: '#e6c26e',
    hairStyle: 'ponytail',
    eyes: '#5b3a21',
    shirt: '#f2f4f8',
    pants: '#27314a',
    shoes: '#cf3a57',
    height: 0.98,
    width: 0.92,
  },
  leif: {
    id: 'leif',
    name: 'Leif',
    description: 'Messy brown hair · blue eyes · black tee',
    skin: '#e2a87d',
    hair: '#5a3a22',
    hairStyle: 'messy',
    eyes: '#3a6ea5',
    shirt: '#1a1c22',
    pants: '#3a4254',
    shoes: '#e8e8e8',
    height: 1.0,
    width: 1.02,
  },
  jovan: {
    id: 'jovan',
    name: 'Jovan',
    description: 'Tall · short brown hair · white tee',
    skin: '#c98a5e',
    hair: '#4a3120',
    hairStyle: 'short',
    eyes: '#4a3120',
    shirt: '#f2f4f8',
    pants: '#222730',
    shoes: '#2b3a8c',
    height: 1.2,
    width: 0.95,
  },
  leo: {
    id: 'leo',
    name: 'Leo',
    description: 'Muscular · buzz cut · black tee',
    skin: '#d39468',
    hair: '#3c2a1a',
    hairStyle: 'buzz',
    eyes: '#3c2a1a',
    shirt: '#1a1c22',
    pants: '#2a2d36',
    shoes: '#e2932a',
    height: 1.03,
    width: 1.24,
  },
}

export const CHARACTER_ORDER: CharacterId[] = ['robin', 'leif', 'jovan', 'leo']
