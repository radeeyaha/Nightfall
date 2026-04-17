import { useEffect, useState } from 'react'
import type { GameYourRolePayload } from '../socket/protocol'
import { useSocket } from '../socket/SocketContext'
import type { PrivateRoleByRoom } from './privateRoleContextInternals'
import { PrivateRoleContext } from './privateRoleContextInternals'

/**
 * Keeps `game:yourRole` payloads keyed by room code so navigation to GamePage
 * does not miss the event (Lobby unmounts before the handler would run there).
 */
export function PrivateRoleProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket()
  const [byRoom, setByRoom] = useState<PrivateRoleByRoom>({})

  useEffect(() => {
    const onRole = (payload: GameYourRolePayload) => {
      setByRoom((prev) => ({
        ...prev,
        [payload.roomCode]: payload,
      }))
    }
    socket.on('game:yourRole', onRole)
    return () => {
      socket.off('game:yourRole', onRole)
    }
  }, [socket])

  return (
    <PrivateRoleContext.Provider value={byRoom}>
      {children}
    </PrivateRoleContext.Provider>
  )
}
