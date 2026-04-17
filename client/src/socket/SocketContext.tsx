import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { getSocketServerUrl } from './constants'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

type SocketContextValue = {
  socket: Socket
  connectionState: ConnectionState
  serverTime: string | null
  /** Last transport error (e.g. server not running). Cleared on successful connect. */
  lastError: string | null
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket] = useState(() =>
    io(getSocketServerUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    }),
  )

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    () => (socket.connected ? 'connected' : 'connecting'),
  )
  const [serverTime, setServerTime] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const onConnect = () => {
      setConnectionState('connected')
      setLastError(null)
    }
    const onDisconnect = () => {
      setConnectionState('disconnected')
    }
    const onConnectError = (err: Error) => {
      setConnectionState('disconnected')
      setLastError(err.message || 'Could not reach server')
    }
    const onWelcome = (payload: { serverTime: string }) => {
      setServerTime(payload.serverTime)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('welcome', onWelcome)

    // Strict Mode re-runs this effect: the socket may already be connected from the
    // first run (we must not socket.close() in dev cleanup — that leaves a dead instance
    // in useState and `connect` never fires again).
    if (socket.connected) {
      onConnect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('welcome', onWelcome)
      // Production: real unmount — close. Dev: skip close so Strict Mode remount works.
      if (import.meta.env.PROD) {
        socket.close()
      }
    }
  }, [socket])

  const value = useMemo(
    (): SocketContextValue => ({
      socket,
      connectionState,
      serverTime,
      lastError,
    }),
    [socket, connectionState, serverTime, lastError],
  )

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

/* Hook colocated with provider; HMR keeps both in sync. */
// eslint-disable-next-line react-refresh/only-export-components -- useSocket is the public API for this module
export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return ctx
}
