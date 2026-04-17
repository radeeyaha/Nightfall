export const ROLES = ['mafia', 'doctor', 'detective', 'villager'] as const

export type Role = (typeof ROLES)[number]
