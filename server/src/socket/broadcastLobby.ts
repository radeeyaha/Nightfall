import type { Server as SocketIOServer } from 'socket.io'
import { socketRoomChannel } from '../lib/roomCode.js'
import type { GameStore } from '../store/gameStore.js'

export function broadcastLobby(
  io: SocketIOServer,
  store: GameStore,
  roomCode: string,
): void {
  const state = store.getLobbyState(roomCode)
  if (state) {
    io.to(socketRoomChannel(roomCode)).emit('lobby:update', state)
  }
}
