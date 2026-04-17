import type {
  Player as GamePlayer,
  Phase,
  PlayerId,
  Role,
  RoomId,
  WinningFaction,
} from '@nightfall/shared'

export type { PlayerId, RoomId }

/**
 * Player row in the server store: shared game fields + socket / room membership.
 */
export interface ConnectedPlayer extends GamePlayer {
  socketId: string
  roomId: RoomId | null
}

/** Re-export shared room type for handlers that need full game shape. */
export type { Room } from '@nightfall/shared'

/** Wire format for lobby broadcasts (no roles until game starts). */
export interface LobbyPlayerDto {
  playerId: PlayerId
  nickname: string
  isHost: boolean
  isAlive: boolean
}

export type NightSummaryPublicDto = {
  killedPlayerId: PlayerId | null
  killedNickname: string | null
  outcome: 'killed' | 'saved' | 'no_consensus' | 'none'
}

export type DayResultPublicDto = {
  outcome: 'eliminated' | 'tie' | 'none'
  eliminatedPlayerId: PlayerId | null
  eliminatedNickname: string | null
  eliminatedRole: Role | null
}

export interface LobbyStateDto {
  roomCode: RoomId
  players: LobbyPlayerDto[]
  gameStarted: boolean
  phase: Phase
  /** ISO time when the current timed phase ends (countdown for clients). */
  phaseDeadlineAt?: string
  lastNightSummary?: NightSummaryPublicDto
  lastDayResult?: DayResultPublicDto
  gameWinner?: WinningFaction
  gameOverReason?: string
}
