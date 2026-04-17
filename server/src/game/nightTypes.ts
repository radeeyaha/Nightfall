import type { PlayerId, Role } from '@nightfall/shared'

/** In-flight night actions (server-only; stored in room.meta). */
export interface NightBucket {
  /** Each living mafia voter → kill vote target (latest overwrites). */
  mafiaVotes: Record<PlayerId, PlayerId>
  doctorSave?: PlayerId
  detectiveTarget?: PlayerId
}

export interface NightSummaryPublic {
  killedPlayerId: PlayerId | null
  killedNickname: string | null
  outcome: 'killed' | 'saved' | 'no_consensus' | 'none'
}

/** Public outcome of the day vote resolution (broadcast in lobby). */
export interface DayResultPublic {
  outcome: 'eliminated' | 'tie' | 'none'
  eliminatedPlayerId: PlayerId | null
  eliminatedNickname: string | null
  eliminatedRole: Role | null
}

export interface RoomMetaGame {
  nightBucket?: NightBucket
  lastNightSummary?: NightSummaryPublic
  lastDayResult?: DayResultPublic
}
