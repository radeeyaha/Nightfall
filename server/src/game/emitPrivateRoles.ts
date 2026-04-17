import type { Server as SocketIOServer } from 'socket.io'
import type { PlayerId, Role } from '@nightfall/shared'
import type { GameStore } from '../store/gameStore.js'

export type MafiaTeammateDto = { playerId: PlayerId; nickname: string }

export type GameYourRolePayload = {
  roomCode: string
  phase: 'roleReveal'
  playerId: PlayerId
  myRole: Role
  mafiaTeammates?: MafiaTeammateDto[]
}

/**
 * Sends role + mafia team only to each player's own socket (`socket.emit` → that connection).
 * Nothing here is emitted on the room channel, so other clients never see another player's role.
 */
export function emitPrivateRoleAssignments(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  const room = store.rooms.get(roomCode)
  if (!room) return

  const mafiaIds = room.playerIds.filter(
    (id) => store.players.get(id)?.role === 'mafia',
  )

  for (const id of room.playerIds) {
    const p = store.players.get(id)
    if (!p?.role) continue

    const sock = io.sockets.sockets.get(p.socketId)
    if (!sock?.connected) continue

    const payload: GameYourRolePayload = {
      roomCode,
      phase: 'roleReveal',
      playerId: p.id,
      myRole: p.role,
    }

    if (p.role === 'mafia') {
      payload.mafiaTeammates = mafiaIds
        .filter((mid) => mid !== id)
        .map((mid) => {
          const mp = store.players.get(mid)
          return { playerId: mid, nickname: mp?.nickname ?? '' }
        })
    }

    sock.emit('game:yourRole', payload)
  }
}
