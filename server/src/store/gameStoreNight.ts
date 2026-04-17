import type { Server as SocketIOServer } from 'socket.io'
import type { PlayerId, Room, RoomId } from '@nightfall/shared'
import { emitMafiaVoteBoardToMafia } from '../game/emitMafiaVoteBoard.js'
import {
  clearLastDayResult,
  clearNightBucket,
  getNightBucket,
  setLastNightSummary,
  setNightBucket,
} from '../game/nightBucket.js'
import { isMafiaAlignment, resolveNightActions } from '../game/nightResolve.js'
import type { NightSummaryPublic } from '../game/nightTypes.js'
import { normalizeRoomCode } from '../lib/roomCode.js'
import type { ConnectedPlayer } from './types.js'

export type DetectivePrivatePayload = {
  roomCode: RoomId
  targetPlayerId: PlayerId
  alignment: 'mafia' | 'notMafia'
}

/** Subset of GameStore passed into night helpers (avoids circular imports). */
export interface GameStoreNightAccess {
  readonly rooms: Map<RoomId, Room>
  readonly players: Map<PlayerId, ConnectedPlayer>
  readonly socketToPlayerId: Map<string, PlayerId>
  phaseTimers: Map<RoomId, ReturnType<typeof setTimeout>>
}

export const nightPhaseApi = {
  clearPhaseTimer(store: GameStoreNightAccess, roomCode: RoomId): void {
    const t = store.phaseTimers.get(roomCode)
    if (t) clearTimeout(t)
    store.phaseTimers.delete(roomCode)
  },

  getPlayerInRoom(
    store: GameStoreNightAccess,
    socketId: string,
  ): { player: ConnectedPlayer; room: Room; roomCode: RoomId } | null {
    const playerId = store.socketToPlayerId.get(socketId)
    if (!playerId) return null
    const player = store.players.get(playerId)
    if (!player?.roomId) return null
    const room = store.rooms.get(player.roomId)
    if (!room) return null
    return { player, room, roomCode: player.roomId }
  },

  beginNightAutomated(
    store: GameStoreNightAccess,
    rawCode: string,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    const roomCode = normalizeRoomCode(rawCode)
    const room = store.rooms.get(roomCode)
    if (!room) return { ok: false, error: 'Room not found.' }

    if (room.phase !== 'roleReveal' && room.phase !== 'dayResult') {
      return {
        ok: false,
        error: 'Night can only begin after role reveal or the previous day result.',
      }
    }

    nightPhaseApi.clearPhaseTimer(store, roomCode)
    clearLastDayResult(room)
    room.dayVotes = null
    setNightBucket(room, { mafiaVotes: {} })
    room.phase = 'night'
    return { ok: true, roomCode }
  },

  submitMafiaVote(
    store: GameStoreNightAccess,
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    const ctx = nightPhaseApi.getPlayerInRoom(store, socketId)
    if (!ctx) return { ok: false, error: 'Not in a room.' }
    const { player, room, roomCode } = ctx
    if (room.phase !== 'night') {
      return { ok: false, error: 'Not the night phase.' }
    }
    if (!player.isAlive) return { ok: false, error: 'Eliminated players cannot act.' }
    if (player.role !== 'mafia') {
      return { ok: false, error: 'Only Mafia can vote for a kill target.' }
    }

    const target = store.players.get(targetPlayerId)
    if (!target || target.roomId !== roomCode) {
      return { ok: false, error: 'Invalid target.' }
    }
    if (!target.isAlive) return { ok: false, error: 'Target is not alive.' }
    if (targetPlayerId === player.id) {
      return { ok: false, error: 'You cannot target yourself.' }
    }

    const bucket = getNightBucket(room)
    bucket.mafiaVotes[player.id] = targetPlayerId
    setNightBucket(room, bucket)
    return { ok: true, roomCode }
  },

  submitDoctorSave(
    store: GameStoreNightAccess,
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    const ctx = nightPhaseApi.getPlayerInRoom(store, socketId)
    if (!ctx) return { ok: false, error: 'Not in a room.' }
    const { player, room, roomCode } = ctx
    if (room.phase !== 'night') {
      return { ok: false, error: 'Not the night phase.' }
    }
    if (!player.isAlive) return { ok: false, error: 'Eliminated players cannot act.' }
    if (player.role !== 'doctor') {
      return { ok: false, error: 'Only the Doctor can choose a save target.' }
    }

    const target = store.players.get(targetPlayerId)
    if (!target || target.roomId !== roomCode) {
      return { ok: false, error: 'Invalid target.' }
    }
    if (!target.isAlive) return { ok: false, error: 'Target is not alive.' }

    const bucket = getNightBucket(room)
    bucket.doctorSave = targetPlayerId
    setNightBucket(room, bucket)
    return { ok: true, roomCode }
  },

  submitDetectiveInvestigate(
    store: GameStoreNightAccess,
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ):
    | { ok: true; roomCode: RoomId; detectivePrivate: DetectivePrivatePayload }
    | { ok: false; error: string } {
    const ctx = nightPhaseApi.getPlayerInRoom(store, socketId)
    if (!ctx) return { ok: false, error: 'Not in a room.' }
    const { player, room, roomCode } = ctx
    if (room.phase !== 'night') {
      return { ok: false, error: 'Not the night phase.' }
    }
    if (!player.isAlive) return { ok: false, error: 'Eliminated players cannot act.' }
    if (player.role !== 'detective') {
      return { ok: false, error: 'Only the Detective can investigate.' }
    }

    const target = store.players.get(targetPlayerId)
    if (!target || target.roomId !== roomCode) {
      return { ok: false, error: 'Invalid target.' }
    }
    if (!target.isAlive) return { ok: false, error: 'Target is not alive.' }
    if (targetPlayerId === player.id) {
      return { ok: false, error: 'You cannot investigate yourself.' }
    }

    const bucket = getNightBucket(room)
    if (bucket.detectiveTarget !== undefined) {
      return {
        ok: false,
        error: 'You have already investigated someone tonight.',
      }
    }
    bucket.detectiveTarget = targetPlayerId
    setNightBucket(room, bucket)
    const detectivePrivate: DetectivePrivatePayload = {
      roomCode,
      targetPlayerId,
      alignment: isMafiaAlignment(store.players, targetPlayerId)
        ? 'mafia'
        : 'notMafia',
    }
    return { ok: true, roomCode, detectivePrivate }
  },

  resolveNightAutomated(
    store: GameStoreNightAccess,
    rawCode: string,
  ): { ok: true; roomCode: RoomId; summary: NightSummaryPublic } | { ok: false; error: string } {
    const roomCode = normalizeRoomCode(rawCode)
    const room = store.rooms.get(roomCode)
    if (!room) return { ok: false, error: 'Room not found.' }
    if (room.phase !== 'night') {
      return { ok: false, error: 'Can only resolve during the night phase.' }
    }

    const bucket = getNightBucket(room)
    const { summary } = resolveNightActions({
      bucket,
      players: store.players,
      roomPlayerIds: room.playerIds,
    })

    clearNightBucket(room)
    setLastNightSummary(room, summary)
    room.phase = 'nightResult'

    nightPhaseApi.clearPhaseTimer(store, roomCode)

    return { ok: true, roomCode, summary }
  },
}

export function broadcastMafiaBoard(
  io: SocketIOServer,
  store: GameStoreNightAccess,
  roomCode: RoomId,
): void {
  const room = store.rooms.get(roomCode)
  if (!room) return
  emitMafiaVoteBoardToMafia(io, store, roomCode, getNightBucket(room))
}
