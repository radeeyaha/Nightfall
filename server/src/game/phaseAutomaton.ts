import type { Server as SocketIOServer } from 'socket.io'
import { getNightBucket } from './nightBucket.js'
import { dayBreaksNarration, dayVoteOutcomeNarration, NARRATION } from './narration.js'
import * as timing from './phaseTiming.js'
import { socketRoomChannel } from '../lib/roomCode.js'
import { broadcastLobby } from '../socket/broadcastLobby.js'
import type { GameStore } from '../store/gameStore.js'
import { dayPhaseApi } from '../store/gameStoreDay.js'
import { nightPhaseApi } from '../store/gameStoreNight.js'
import type { Room } from '@nightfall/shared'

function setPhaseDeadline(room: Room, ms: number): void {
  room.phaseDeadlineAt = new Date(Date.now() + Math.max(0, ms)).toISOString()
}

export function emitNarration(
  io: SocketIOServer,
  roomCode: string,
  text: string,
): void {
  io.to(socketRoomChannel(roomCode)).emit('game:narration', { roomCode, text })
}

function nightActionsSatisfied(store: GameStore, room: Room): boolean {
  const bucket = getNightBucket(room)
  for (const id of room.playerIds) {
    const p = store.players.get(id)
    if (!p?.isAlive || !p.role) continue
    if (p.role === 'mafia' && bucket.mafiaVotes[id] === undefined) return false
    if (p.role === 'doctor' && bucket.doctorSave === undefined) return false
    if (p.role === 'detective' && bucket.detectiveTarget === undefined) return false
  }
  return true
}

function allLivingHaveVoted(store: GameStore, room: Room): boolean {
  const alive = room.playerIds.filter((id) => store.players.get(id)?.isAlive)
  if (alive.length === 0) return false
  const votes = room.dayVotes?.votes ?? []
  const voted = new Set(
    votes
      .filter((v) => {
        const pl = store.players.get(v.voterPlayerId)
        return pl?.isAlive && pl.roomId === room.id
      })
      .map((v) => v.voterPlayerId),
  )
  return alive.every((id) => voted.has(id))
}

function completeNightPhase(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  if (store.rooms.get(roomCode)?.phase !== 'night') return

  nightPhaseApi.clearPhaseTimer(store, roomCode)

  const r = nightPhaseApi.resolveNightAutomated(store, roomCode)
  if (!r.ok) return

  emitNarration(io, roomCode, dayBreaksNarration(r.summary))
  armPhaseAutomaton(io, store, roomCode)
  broadcastLobby(io, store, roomCode)
  store.emitMafiaVoteBoard(io, roomCode)
}

function completeDayVotePhase(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  if (store.rooms.get(roomCode)?.phase !== 'dayVoting') return

  nightPhaseApi.clearPhaseTimer(store, roomCode)

  const r = dayPhaseApi.resolveDayVoteAutomated(store, roomCode)
  if (!r.ok) return

  armPhaseAutomaton(io, store, roomCode)
  broadcastLobby(io, store, roomCode)
  emitNarration(io, roomCode, dayVoteOutcomeNarration(r.dayResult))
  if (r.gameOver) {
    const winner = store.rooms.get(roomCode)?.gameResult?.winner
    if (winner) {
      emitNarration(io, roomCode, NARRATION.winnerLine(winner))
    }
  }
}

/** Call after mafia / doctor / detective submit; ends night early when everyone has acted. */
export function onNightActionMaybeFinish(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  const room = store.rooms.get(roomCode)
  if (!room || room.phase !== 'night') return
  if (!nightActionsSatisfied(store, room)) return
  completeNightPhase(io, store, roomCode)
}

/** Call after a day vote; tallies early when every living player has voted. */
export function onDayVoteMaybeFinish(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  const room = store.rooms.get(roomCode)
  if (!room || room.phase !== 'dayVoting') return
  if (!allLivingHaveVoted(store, room)) return
  completeDayVotePhase(io, store, roomCode)
}

/**
 * Arms a single timeout for the current phase. Clears any prior schedule for this room.
 */
export function armPhaseAutomaton(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  const room = store.rooms.get(roomCode)
  if (!room?.gameStarted) return
  if (room.phase === 'lobby' || room.phase === 'gameOver') return

  nightPhaseApi.clearPhaseTimer(store, roomCode)

  const schedule = (ms: number, tick: () => void) => {
    const t = setTimeout(() => {
      store.phaseTimers.delete(roomCode)
      tick()
    }, ms)
    store.phaseTimers.set(roomCode, t)
  }

  switch (room.phase) {
    case 'roleReveal': {
      const ms = timing.roleRevealMs(room)
      setPhaseDeadline(room, ms)
      schedule(ms, () => {
        if (store.rooms.get(roomCode)?.phase !== 'roleReveal') return
        emitNarration(io, roomCode, NARRATION.nightFalls())
        const r = nightPhaseApi.beginNightAutomated(store, roomCode)
        if (!r.ok) return
        armPhaseAutomaton(io, store, roomCode)
        broadcastLobby(io, store, roomCode)
        store.emitMafiaVoteBoard(io, roomCode)
      })
      break
    }

    case 'night': {
      const ms = timing.nightPhaseMs(room)
      setPhaseDeadline(room, ms)
      schedule(ms, () => {
        if (store.rooms.get(roomCode)?.phase !== 'night') return
        completeNightPhase(io, store, roomCode)
      })
      break
    }

    case 'nightResult': {
      const ms = timing.nightResultMs(room)
      setPhaseDeadline(room, ms)
      schedule(ms, () => {
        if (store.rooms.get(roomCode)?.phase !== 'nightResult') return
        const r = dayPhaseApi.beginDayVotingAutomated(store, roomCode)
        if (!r.ok) return
        armPhaseAutomaton(io, store, roomCode)
        broadcastLobby(io, store, roomCode)
      })
      break
    }

    case 'dayVoting': {
      const ms = timing.votingMs(room)
      setPhaseDeadline(room, ms)
      schedule(ms, () => {
        if (store.rooms.get(roomCode)?.phase !== 'dayVoting') return
        completeDayVotePhase(io, store, roomCode)
      })
      break
    }

    case 'dayResult': {
      const ms = timing.dayResultMs(room)
      setPhaseDeadline(room, ms)
      schedule(ms, () => {
        if (store.rooms.get(roomCode)?.phase !== 'dayResult') return
        emitNarration(io, roomCode, NARRATION.nightFallsAgain())
        const r = nightPhaseApi.beginNightAutomated(store, roomCode)
        if (!r.ok) return
        armPhaseAutomaton(io, store, roomCode)
        broadcastLobby(io, store, roomCode)
        store.emitMafiaVoteBoard(io, roomCode)
      })
      break
    }

    default:
      break
  }
}
