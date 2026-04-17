/** Socket.IO payloads and ack shapes (mirrors server). */

import type { Phase, Role, WinningFaction } from '@nightfall/shared'

export type LobbyPlayerDto = {
  playerId: string
  nickname: string
  isHost: boolean
  isAlive: boolean
}

export type NightSummaryPublicDto = {
  killedPlayerId: string | null
  killedNickname: string | null
  outcome: 'killed' | 'saved' | 'no_consensus' | 'none'
}

export type DayResultPublicDto = {
  outcome: 'eliminated' | 'tie' | 'none'
  eliminatedPlayerId: string | null
  eliminatedNickname: string | null
  eliminatedRole: Role | null
}

export type LobbyState = {
  roomCode: string
  players: LobbyPlayerDto[]
  gameStarted: boolean
  phase: Phase
  /** ISO time when the current timed phase ends (from server). */
  phaseDeadlineAt?: string
  lastNightSummary?: NightSummaryPublicDto
  lastDayResult?: DayResultPublicDto
  gameWinner?: WinningFaction
  gameOverReason?: string
}

export type MafiaVoteLineDto = {
  voterId: string
  voterNickname: string
  targetId: string
  targetNickname: string
}

/** Emitted only to living Mafia sockets (`night:mafiaVoteUpdate`). */
export type NightMafiaVoteBoardPayload = {
  roomCode: string
  tallies: Record<string, number>
  lines: MafiaVoteLineDto[]
}

/** Emitted only to the Detective socket right after they investigate. */
export type NightDetectiveResultPayload = {
  roomCode: string
  targetPlayerId: string
  alignment: 'mafia' | 'notMafia'
}

export type MafiaTeammateDto = { playerId: string; nickname: string }

/** Emitted only to the receiving socket (never on the room broadcast). */
export type GameYourRolePayload = {
  roomCode: string
  phase: 'roleReveal'
  playerId: string
  myRole: Role
  mafiaTeammates?: MafiaTeammateDto[]
}

export type OkError = { ok: false; error: string }

export type RoomCreateAck =
  | { ok: true; roomCode: string; playerId: string }
  | OkError

export type RoomJoinAck =
  | { ok: true; roomCode: string; playerId: string }
  | OkError

export type LobbyFetchAck = ({ ok: true } & LobbyState) | OkError

export type WatchAck = { ok: true } | OkError

export type GameStartAck = { ok: true } | OkError

export type SimpleOkAck = { ok: true } | OkError

/** Room-wide story beat from the server (same text for every player). */
export type GameNarrationPayload = {
  roomCode: string
  text: string
}

