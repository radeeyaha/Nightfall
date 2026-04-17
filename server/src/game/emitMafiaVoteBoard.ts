import type { Server as SocketIOServer } from 'socket.io'
import type { PlayerId } from '@nightfall/shared'
import type { GameStoreNightAccess } from '../store/gameStoreNight.js'
import type { NightBucket } from './nightTypes.js'

export type MafiaVoteLineDto = {
  voterId: PlayerId
  voterNickname: string
  targetId: PlayerId
  targetNickname: string
}

export type MafiaVoteBoardPayload = {
  roomCode: string
  tallies: Record<PlayerId, number>
  lines: MafiaVoteLineDto[]
}

export function emitMafiaVoteBoardToMafia(
  io: SocketIOServer,
  store: GameStoreNightAccess,
  roomCode: string,
  bucket: NightBucket,
): void {
  const room = store.rooms.get(roomCode)
  if (!room) return

  const tallies: Record<PlayerId, number> = {}
  const lines: MafiaVoteLineDto[] = []

  for (const [voterId, targetId] of Object.entries(bucket.mafiaVotes)) {
    tallies[targetId] = (tallies[targetId] ?? 0) + 1
    const v = store.players.get(voterId)
    const t = store.players.get(targetId)
    lines.push({
      voterId,
      voterNickname: v?.nickname ?? '',
      targetId,
      targetNickname: t?.nickname ?? '',
    })
  }

  const payload: MafiaVoteBoardPayload = {
    roomCode,
    tallies,
    lines,
  }

  for (const id of room.playerIds) {
    const p = store.players.get(id)
    if (p?.role !== 'mafia' || !p.isAlive) continue
    const sock = io.sockets.sockets.get(p.socketId)
    if (sock?.connected) sock.emit('night:mafiaVoteUpdate', payload)
  }
}
