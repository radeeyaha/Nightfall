import type { Server as SocketIOServer } from 'socket.io'
import { NARRATION } from '../game/narration.js'
import {
  armPhaseAutomaton,
  emitNarration,
  onDayVoteMaybeFinish,
  onNightActionMaybeFinish,
} from '../game/phaseAutomaton.js'
import { normalizeRoomCode, socketRoomChannel } from '../lib/roomCode.js'
import type { GameStore } from '../store/gameStore.js'
import type { DetectivePrivatePayload } from '../store/gameStoreNight.js'
import { emitPrivateRoleAssignments } from '../game/emitPrivateRoles.js'
import type { LobbyStateDto } from '../store/types.js'
import { broadcastLobby } from './broadcastLobby.js'

type Ack<T> = (payload: T) => void

function readRoomCode(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const r = payload as { roomCode?: unknown }
  return typeof r.roomCode === 'string' ? r.roomCode : ''
}

function readTargetPlayerId(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const r = payload as { targetPlayerId?: unknown }
  return typeof r.targetPlayerId === 'string' ? r.targetPlayerId : ''
}

function emitDetectiveResult(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
  payload: DetectivePrivatePayload,
): void {
  const room = store.rooms.get(roomCode)
  if (!room) return
  const det = room.playerIds
    .map((id) => store.players.get(id))
    .find((p) => p?.role === 'detective' && p.isAlive)
  if (!det) return
  const sock = io.sockets.sockets.get(det.socketId)
  if (sock?.connected) sock.emit('night:detectiveResult', payload)
}

export function registerSocketHandlers(
  io: SocketIOServer,
  store: GameStore,
): void {
  io.on('connection', (socket) => {
    socket.emit('welcome', {
      serverTime: new Date().toISOString(),
    })

    socket.on(
      'room:create',
      (
        payload: unknown,
        ack?: Ack<
          | { ok: true; roomCode: string; playerId: string }
          | { ok: false; error: string }
        >,
      ) => {
        if (typeof ack !== 'function') return
        const nickname =
          typeof payload === 'object' &&
          payload !== null &&
          'nickname' in payload &&
          typeof (payload as { nickname: unknown }).nickname === 'string'
            ? (payload as { nickname: string }).nickname
            : ''

        const leftRoom = store.removePlayerBySocket(socket.id)
        if (leftRoom) broadcastLobby(io, store, leftRoom)

        const result = store.createRoom(nickname, socket.id)
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }

        void socket.join(socketRoomChannel(result.roomCode))
        broadcastLobby(io, store, result.roomCode)
        ack({
          ok: true,
          roomCode: result.roomCode,
          playerId: result.playerId,
        })
      },
    )

    socket.on(
      'room:join',
      (
        payload: unknown,
        ack?: Ack<
          | { ok: true; roomCode: string; playerId: string }
          | { ok: false; error: string }
        >,
      ) => {
        if (typeof ack !== 'function') return
        const raw =
          typeof payload === 'object' && payload !== null
            ? (payload as { roomCode?: unknown; nickname?: unknown })
            : null
        const roomCode = raw && typeof raw.roomCode === 'string' ? raw.roomCode : ''
        const nickname = raw && typeof raw.nickname === 'string' ? raw.nickname : ''

        const result = store.joinRoom(roomCode, nickname, socket.id)
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }

        if (result.previousRoomId) {
          broadcastLobby(io, store, result.previousRoomId)
        }

        void socket.join(socketRoomChannel(result.roomCode))
        broadcastLobby(io, store, result.roomCode)
        ack({
          ok: true,
          roomCode: result.roomCode,
          playerId: result.playerId,
        })
      },
    )

    socket.on(
      'lobby:fetch',
      (
        payload: unknown,
        ack?: Ack<
          { ok: true } & LobbyStateDto | { ok: false; error: string }
        >,
      ) => {
        if (typeof ack !== 'function') return
        const raw =
          typeof payload === 'object' && payload !== null
            ? (payload as { roomCode?: unknown })
            : null
        const roomCode =
          raw && typeof raw.roomCode === 'string' ? raw.roomCode : ''
        const normalized = normalizeRoomCode(roomCode)
        if (!normalized) {
          ack({ ok: false, error: 'Room not found.' })
          return
        }
        const state = store.getLobbyState(normalized)
        if (!state) {
          ack({ ok: false, error: 'Room not found.' })
          return
        }
        ack({ ok: true, ...state })
      },
    )

    socket.on(
      'lobby:watch',
      (payload: unknown, ack?: Ack<{ ok: true } | { ok: false; error: string }>) => {
        if (typeof ack !== 'function') return
        const raw =
          typeof payload === 'object' && payload !== null
            ? (payload as { roomCode?: unknown })
            : null
        const roomCode =
          raw && typeof raw.roomCode === 'string' ? raw.roomCode : ''
        const normalized = normalizeRoomCode(roomCode)
        if (!store.getLobbyState(normalized)) {
          ack({ ok: false, error: 'Room not found.' })
          return
        }
        void socket.join(socketRoomChannel(normalized))
        ack({ ok: true })
      },
    )

    socket.on('lobby:unwatch', (payload: unknown) => {
      const raw =
        typeof payload === 'object' && payload !== null
          ? (payload as { roomCode?: unknown })
          : null
      const roomCode =
        raw && typeof raw.roomCode === 'string' ? raw.roomCode : ''
      const normalized = normalizeRoomCode(roomCode)
      if (normalized) void socket.leave(socketRoomChannel(normalized))
    })

    socket.on(
      'game:start',
      (
        payload: unknown,
        ack?: Ack<{ ok: true } | { ok: false; error: string }>,
      ) => {
        if (typeof ack !== 'function') return
        const raw =
          typeof payload === 'object' && payload !== null
            ? (payload as { roomCode?: unknown })
            : null
        const roomCode =
          raw && typeof raw.roomCode === 'string' ? raw.roomCode : ''

        const result = store.startGame(roomCode, socket.id)
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }
        const normalized = normalizeRoomCode(roomCode)
        armPhaseAutomaton(io, store, normalized)
        broadcastLobby(io, store, normalized)
        emitPrivateRoleAssignments(io, store, normalized)
        emitNarration(io, normalized, NARRATION.gameBegins())
        ack({ ok: true })
      },
    )

    socket.on(
      'night:mafiaVote',
      (payload: unknown, ack?: Ack<{ ok: true } | { ok: false; error: string }>) => {
        if (typeof ack !== 'function') return
        const roomCode = readRoomCode(payload)
        const targetPlayerId = readTargetPlayerId(payload)
        if (!targetPlayerId) {
          ack({ ok: false, error: 'Missing targetPlayerId.' })
          return
        }
        const result = store.submitMafiaVote(roomCode, socket.id, targetPlayerId)
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }
        store.emitMafiaVoteBoard(io, result.roomCode)
        onNightActionMaybeFinish(io, store, result.roomCode)
        ack({ ok: true })
      },
    )

    socket.on(
      'night:doctorSave',
      (payload: unknown, ack?: Ack<{ ok: true } | { ok: false; error: string }>) => {
        if (typeof ack !== 'function') return
        const roomCode = readRoomCode(payload)
        const targetPlayerId = readTargetPlayerId(payload)
        if (!targetPlayerId) {
          ack({ ok: false, error: 'Missing targetPlayerId.' })
          return
        }
        const result = store.submitDoctorSave(roomCode, socket.id, targetPlayerId)
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }
        onNightActionMaybeFinish(io, store, result.roomCode)
        ack({ ok: true })
      },
    )

    socket.on(
      'night:detectiveInvestigate',
      (payload: unknown, ack?: Ack<{ ok: true } | { ok: false; error: string }>) => {
        if (typeof ack !== 'function') return
        const roomCode = readRoomCode(payload)
        const targetPlayerId = readTargetPlayerId(payload)
        if (!targetPlayerId) {
          ack({ ok: false, error: 'Missing targetPlayerId.' })
          return
        }
        const result = store.submitDetectiveInvestigate(
          roomCode,
          socket.id,
          targetPlayerId,
        )
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }
        emitDetectiveResult(io, store, result.roomCode, result.detectivePrivate)
        onNightActionMaybeFinish(io, store, result.roomCode)
        ack({ ok: true })
      },
    )

    socket.on(
      'day:submitVote',
      (payload: unknown, ack?: Ack<{ ok: true } | { ok: false; error: string }>) => {
        if (typeof ack !== 'function') return
        const roomCode = readRoomCode(payload)
        const targetPlayerId = readTargetPlayerId(payload)
        if (!targetPlayerId) {
          ack({ ok: false, error: 'Missing targetPlayerId.' })
          return
        }
        const result = store.submitDayVote(roomCode, socket.id, targetPlayerId)
        if (!result.ok) {
          ack({ ok: false, error: result.error })
          return
        }
        onDayVoteMaybeFinish(io, store, result.roomCode)
        ack({ ok: true })
      },
    )

    socket.on('disconnect', () => {
      const affectedRoom = store.removePlayerBySocket(socket.id)
      if (affectedRoom) {
        broadcastLobby(io, store, affectedRoom)
      }
    })
  })
}
