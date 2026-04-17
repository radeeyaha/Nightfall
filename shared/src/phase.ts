export const PHASES = [
  'lobby',
  'roleReveal',
  'night',
  'nightResult',
  'dayDiscussion',
  'dayVoting',
  'dayResult',
  'gameOver',
] as const

export type Phase = (typeof PHASES)[number]
