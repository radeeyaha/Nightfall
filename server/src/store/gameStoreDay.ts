import type { PlayerId, RoomId } from '@nightfall/shared'
import { checkWinCondition, tallyDayEliminationTarget } from '../game/dayResolve.js'
import { setLastDayResult } from '../game/nightBucket.js'
import type { DayResultPublic } from '../game/nightTypes.js'
import { normalizeRoomCode } from '../lib/roomCode.js'
import { nightPhaseApi, type GameStoreNightAccess } from './gameStoreNight.js'

export const dayPhaseApi = {
  beginDayVotingAutomated(
    store: GameStoreNightAccess,
    rawCode: string,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    const roomCode = normalizeRoomCode(rawCode)
    const room = store.rooms.get(roomCode)
    if (!room) return { ok: false, error: 'Room not found.' }

    if (room.phase !== 'nightResult') {
      return { ok: false, error: 'Voting can only open after the night is resolved.' }
    }

    room.dayVotes = { votes: [] }
    room.phase = 'dayVoting'
    return { ok: true, roomCode }
  },

  submitDayVote(
    store: GameStoreNightAccess,
    rawCode: string,
    socketId: string,
    targetPlayerId: PlayerId,
  ): { ok: true; roomCode: RoomId } | { ok: false; error: string } {
    const ctx = nightPhaseApi.getPlayerInRoom(store, socketId)
    if (!ctx) return { ok: false, error: 'Not in a room.' }
    const { player, room, roomCode } = ctx
    if (room.phase !== 'dayVoting') {
      return { ok: false, error: 'Not the day voting phase.' }
    }
    if (!player.isAlive) return { ok: false, error: 'Eliminated players cannot vote.' }

    const target = store.players.get(targetPlayerId)
    if (!target || target.roomId !== roomCode) {
      return { ok: false, error: 'Invalid target.' }
    }
    if (!target.isAlive) return { ok: false, error: 'Target is not alive.' }
    if (targetPlayerId === player.id) {
      return { ok: false, error: 'You cannot vote for yourself.' }
    }

    const dv = room.dayVotes ?? { votes: [] }
    dv.votes = dv.votes.filter((v) => v.voterPlayerId !== player.id)
    dv.votes.push({ voterPlayerId: player.id, targetPlayerId })
    room.dayVotes = dv
    return { ok: true, roomCode }
  },

  resolveDayVoteAutomated(
    store: GameStoreNightAccess,
    rawCode: string,
  ):
    | {
        ok: true
        roomCode: RoomId
        dayResult: DayResultPublic
        gameOver: boolean
      }
    | { ok: false; error: string } {
    const roomCode = normalizeRoomCode(rawCode)
    const room = store.rooms.get(roomCode)
    if (!room) return { ok: false, error: 'Room not found.' }
    if (room.phase !== 'dayVoting') {
      return { ok: false, error: 'Can only resolve during day voting.' }
    }

    const votes = room.dayVotes?.votes ?? []
    const { targetId, outcome } = tallyDayEliminationTarget(
      votes,
      store.players,
      room.playerIds,
      roomCode,
    )

    let dayResult: DayResultPublic
    if (outcome === 'eliminated' && targetId) {
      const victim = store.players.get(targetId)
      if (victim?.isAlive && victim.role) {
        victim.isAlive = false
        dayResult = {
          outcome: 'eliminated',
          eliminatedPlayerId: targetId,
          eliminatedNickname: victim.nickname,
          eliminatedRole: victim.role,
        }
      } else {
        dayResult = {
          outcome: 'none',
          eliminatedPlayerId: null,
          eliminatedNickname: null,
          eliminatedRole: null,
        }
      }
    } else {
      dayResult = {
        outcome,
        eliminatedPlayerId: null,
        eliminatedNickname: null,
        eliminatedRole: null,
      }
    }

    room.dayVotes = null
    setLastDayResult(room, dayResult)

    const winner = checkWinCondition(room.playerIds, store.players)
    let gameOver = false
    if (winner) {
      gameOver = true
      room.phase = 'gameOver'
      room.phaseDeadlineAt = undefined
      room.gameResult = {
        winner,
        reason:
          winner === 'mafia'
            ? 'The Mafia match or outnumber the town.'
            : 'All Mafia have been eliminated.',
      }
    } else {
      room.phase = 'dayResult'
    }

    nightPhaseApi.clearPhaseTimer(store, roomCode)

    return { ok: true, roomCode, dayResult, gameOver }
  },
}
