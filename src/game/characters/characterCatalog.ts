import type { CharacterDef, CharacterId } from '@/types'

/**
 * The four playable characters. Differences are strictly cosmetic
 * (hair, eyes, build) — no gameplay advantages, per the design pillar.
 */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  robin: {
    id: 'robin',
    name: 'Robin',
    description: 'Blonde · brown eyes',
    skin: '#e8b98f',
    hair: '#e6c26e',
    eyes: '#5b3a21',
    shirt: '#d83a5a',
    pants: '#27314a',
    height: 1.0,
    width: 1.0,
  },
  leif: {
    id: 'leif',
    name: 'Leif',
    description: 'Brown hair · blue eyes',
    skin: '#e2a87d',
    hair: '#5a3a22',
    eyes: '#3a6ea5',
    shirt: '#2f8f6b',
    pants: '#2b2f3d',
    height: 1.0,
    width: 1.0,
  },
  jovan: {
    id: 'jovan',
    name: 'Jovan',
    description: 'Tall · brown hair',
    skin: '#c98a5e',
    hair: '#4a3120',
    eyes: '#4a3120',
    shirt: '#3a57c4',
    pants: '#24262e',
    height: 1.16,
    width: 0.98,
  },
  leo: {
    id: 'leo',
    name: 'Leo',
    description: 'Muscular · brown hair',
    skin: '#d39468',
    hair: '#3c2a1a',
    eyes: '#3c2a1a',
    shirt: '#e2932a',
    pants: '#2a2d36',
    height: 1.02,
    width: 1.2,
  },
}

export const CHARACTER_ORDER: CharacterId[] = ['robin', 'leif', 'jovan', 'leo']
