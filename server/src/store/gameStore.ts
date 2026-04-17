import { randomUUID } from 'node:crypto'
import {
  defaultGameSettings,
  MIN_PLAYERS_TO_START,
  type PlayerId,
  type Room,
  type RoomId,
} from '@nightfall/shared'
import { getRoomMeta } from '../game/nightBucket.js'
import { assignRolesForRoom } from '../game/roleAssignment.js'
import { generateRoomCode, normalizeRoomCode } from '../lib/roomCode.js'
import {
  broadcastMafiaBoard,
  nightPhaseApi,
  type DetectivePrivatePayload,
} from './gameStoreNight.js'
import { dayPhaseApi } from './gameStoreDay.js'
import type { ConnectedPlayer, LobbyStateDto } from './types.js'

/**
 * In-memory rooms and players. Cleared on server restart.
 */
export class GameStore {
  readonly rooms = new Map<RoomId, Room>()
  readonly players = new Map<PlayerId, ConnectedPlayer>()
  /** At most one room membership per socket connection. */
  readonly socketToPlayerId = new Map<string, PlayerId>()
  /** Single scheduled callback per room (phase automation). */
  readonly phaseTimers = new Map<RoomId, ReturnType<typeof setTimeout>>()

  private uniqueRoomCode(): RoomId {
    let code = generateRoomCode()
    let guard = 0
    while (this.rooms.has(code) && guard < 50) {
      code = generateRoomCode()
      guard++
    }
    return code
  }

  private syncHostFlags(room: Room): void {
    for (const id of room.playerIds) {
      const p = this.players.get(id)
      if (p) p.isHost = id === room.hostPlayerId
    }
  }

  private newLobbyPlayer(
    partial: Omit<ConnectedPlayer, 'role' | 'isAlive'>,
  ): ConnectedPlayer {
    return {
      ...partial,
      role: null,
      isAlive: true,
    }
  }

  private newLobbyRoom(
    id: RoomId,
    hostPlayerId: PlayerId,
    createdAt: string,
  ): Room {
    return {
      id,
      hostPlayerId,
      playerIds: [hostPlayerId],
      createdAt,
      gameStarted: false,
      phase: 'lobby',
      settings: defaultGameSettings(),
      nightActions: null,
      dayVotes: null,
      gameResult: null,
      phaseDeadlineAt: undefined,
    }
  }

  /** Remove socket's player from their room (host transfer or room delete). */
  removePlayerBySocket(socketId: string): RoomId | null {
    const playerId = this.socketToPlayerId.get(socketId)
    if (!playerId) return null
    const player = this.players.get(playerId)
    if (!player?.roomId) {
      this.players.delete(playerId)
      this.socketToPlayerId.delete(socketId)
      return null
    }

    const roomId = player.roomId
    const room = this.rooms.get(roomId)
    if (!room) {
      this.players.delete(playerId)
      this.socketToPlayerId.delete(socketId)
      return null
    }

    room.playerIds = room.playerIds.filter((id) => id !== playerId)
    this.players.delete(playerId)
    this.socketToPlayerId.delete(socketId)

    if (room.playerIds.length === 0) {
      nightPhaseApi.clearPhaseTimer(this, roomId)
      this.rooms.delete(roomId)
      return roomId
    }

    if (room.hostPlayerId === playerId) {
      const nextHost = room.playerIds[0]
      if (nextHost) room.hostPlayerId = nextHost
    }
    this.syncHostFlags(room)
    return roomId
  }

  getLobbyState(roomCode: string): LobbyStateDto | null {
    const code = normalizeRoomCode(roomCode)
    const room = this.rooms.get(code)
    if (!room) return null
    const meta = getRoomMeta(room)
    const players: LobbyStateDto['players'] = []
    for (const id of room.playerIds) {
      const p = this.players.get(id)
      if (p) {
        players.push({
          playerId: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          isAlive: p.isAlive,
        })
      }
    }
    return {
      roomCode: code,
      players,
      gameStarted: room.gameStarted,
      phase: room.phase,
      phaseDeadlineAt: room.phaseDeadlineAt,
      lastNightSummary:
        room.gameStarted && meta.lastNightSummary
          ? meta.lastNightSummary
          : undefined,
      lastDayResult:
        room.gameStarted && meta.lastDayResult
          ? meta.lastDayResult
          : undefined,
      gameWinner:
        room.phase === 'gameOver' && room.gameResult
          ? room.gameResult.winner
          : undefined,
      gameOverReason:
        room.phase === 'gameOver' && room.gameResult?.reason
          ? room.gameResult.reason
          : undefined,
    }
  }

  createRoom(
    nickname: string,
    socketId: string,
  ):
    | { ok: true; roomCode: RoomId; playerId: PlayerId }
    | { ok: false; error: string } {
    const name = nickname.trim()
    if (!name) return { ok: false, error: 'Nickname is required.' }

    const roomCode = this.uniqueRoomCode()
    const playerId = randomUUID()
    const joinedAt = new Date().toISOString()

    const player = this.newLobbyPlayer({
      id: playerId,
      nickname: name,
      socketId,
      roomId: roomCode,
      isHost: true,
      joinedAt,
    })

    const room = this.newLobbyRoom(roomCode, playerId, joinedAt)

    this.players.set(playerId, player)
    this.rooms.set(roomCode, room)
    this.socketToPlayerId.set(socketId, playerId)

    return { ok: true, roomCode, playerId }
  }

  joinRoom(
    rawCode: string,
    nickname: string,
    socketId: string,
  ):
    | { ok: true; roomCode: RoomId; playerId: PlayerId; previousRoomId: RoomId | null }
    | { ok: false; error: string } {
    const name = nickname.trim()
    if (!name) return { ok: false, error: 'Nickname is required.' }

    const roomCode = normalizeRoomCode(rawCode)
    if (!roomCode) return { ok: false, error: 'Room not found.' }

    const room = this.rooms.get(roomCode)
    if (!room) return { ok: false, error: 'Room not found.' }
    if (room.gameStarted) return { ok: false, error: 'Game already started.' }

    const previousRoomId = this.removePlayerBySocket(socketId)

    const playerId = randomUUID()
    const joinedAt = new Date().toISOString()

    const player = this.newLobbyPlayer({
      id: playerId,
      nickname: name,
      socketId,
      roomId: roomCode,
      isHost: false,
      joinedAt,
    })

    room.playerIds.push(playerId)
    this.players.set(playerId, player)
    this.socketToPlayerId.set(socketId, playerId)
    this.syncHostFlags(room)

    return { ok: true, roomCode, playerId, previousRoomId }
  }

  startGame(
    rawCode: string,
    socketId: string,
  ): { ok: true } | { ok: false; error: string } {
    const roomCode = normalizeRoomCode(rawCode)
    const room = this.rooms.get(roomCode)
    if (!room) return { ok: false, error: 'Room not found.' }
    if (room.gameStarted) return { ok: false, error: 'Game already started.' }

    const playerId = this.socketToPlayerId.get(socketId)
    if (!playerId || playerId !== room.hostPlayerId) {
      return { ok: false, error: 'Only the host can start the game.' }
    }

    if (room.playerIds.length < MIN_PLAYERS_TO_START) {
      return {
        ok: false,
        error: `Need at least ${MIN_PLAYERS_TO_START} players to start.`,
      }
    }

    try {
      assignRolesForRoom(room, this.players)
    } catch {
      return { ok: false, error: 'Could not assign roles.' }
    }

    room.gameStarted = true
    room.phase = 'roleReveal'
    return { ok: true }
  }

  submitMafiaVote(
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    return nightPhaseApi.submitMafiaVote(this, rawCode, socketId, targetPlayerId)
  }

  submitDoctorSave(
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    return nightPhaseApi.submitDoctorSave(this, rawCode, socketId, targetPlayerId)
  }

  submitDetectiveInvestigate(
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ):
    | { ok: true; roomCode: RoomId; detectivePrivate: DetectivePrivatePayload }
    | { ok: false; error: string } {
    return nightPhaseApi.submitDetectiveInvestigate(
      this,
      rawCode,
      socketId,
      targetPlayerId,
    )
  }

  submitDayVote(
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    return dayPhaseApi.submitDayVote(this, rawCode, socketId, targetPlayerId)
  }

  /** Used after mafia vote mutations. */
  emitMafiaVoteBoard(
    io: import('socket.io').Server,
    roomCode: RoomId,
  ): void {
    broadcastMafiaBoard(io, this, roomCode)
  }
}
