import { useEffect, useState } from 'react'
import type { LobbyFetchAck, LobbyState, WatchAck } from './protocol'
import { useSocket } from './SocketContext'

const ACK_TIMEOUT_MS = 12_000

/**
 * Subscribes to `lobby:update`, fetches initial state, and registers `lobby:watch`.
 */
export function useLobbyRoom(roomCode: string): {
  lobby: LobbyState | null
  fetchError: string | null
} {
  const { socket } = useSocket()
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomCode) return

    const onUpdate = (payload: LobbyState) => {
      setLobby(payload)
      setFetchError(null)
    }

    socket.on('lobby:update', onUpdate)

    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('lobby:fetch', { roomCode }, (err: Error, res?: LobbyFetchAck) => {
        if (err) {
          setFetchError('Could not load lobby (timeout).')
          setLobby(null)
          return
        }
        if (!res) {
          setFetchError('Unexpected server response.')
          setLobby(null)
          return
        }
        if (res.ok === false) {
          setFetchError(res.error)
          setLobby(null)
          return
        }
        setLobby({
          roomCode: res.roomCode,
          players: res.players,
          gameStarted: res.gameStarted,
          phase: res.phase,
          phaseDeadlineAt: res.phaseDeadlineAt,
          lastNightSummary: res.lastNightSummary,
          lastDayResult: res.lastDayResult,
          gameWinner: res.gameWinner,
          gameOverReason: res.gameOverReason,
        })
        setFetchError(null)
      })

    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('lobby:watch', { roomCode }, (err: Error, res?: WatchAck) => {
        if (err || !res?.ok) {
          /* fetch already surfaced errors; watch is best-effort */
        }
      })

    return () => {
      socket.off('lobby:update', onUpdate)
      socket.emit('lobby:unwatch', { roomCode })
    }
  }, [roomCode, socket])

  return { lobby, fetchError }
}
