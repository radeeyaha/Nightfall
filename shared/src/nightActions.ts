import type { PlayerId } from './ids.js'

export const NIGHT_ACTION_KINDS = [
  'mafiaKill',
  'doctorSave',
  'detectiveInvestigate',
] as const

export type NightActionKind = (typeof NIGHT_ACTION_KINDS)[number]

export interface NightAction {
  actorPlayerId: PlayerId
  kind: NightActionKind
  targetPlayerId?: PlayerId
}

export interface NightActions {
  actions: NightAction[]
}
