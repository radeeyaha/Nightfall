import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { LobbyRouteState } from '../navigation/types'
import type { RoomCreateAck } from '../socket/protocol'
import { useSocket } from '../socket/SocketContext'

const ACK_TIMEOUT_MS = 12_000

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [hostNickname, setHostNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = hostNickname.trim()
    if (!name) {
      setError('Enter a host nickname.')
      return
    }
    if (!socket.connected) {
      setError("Can't reach the game right now. Refresh the page and try again.")
      return
    }

    setError(null)
    setPending(true)

    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('room:create', { nickname: name }, (err: Error, res?: RoomCreateAck) => {
        setPending(false)
        if (err) {
          setError('Request timed out. Try again.')
          return
        }
        if (!res) {
          setError('Unexpected server response.')
          return
        }
        if (res.ok === false) {
          setError(res.error)
          return
        }
        const routeState: LobbyRouteState = { myPlayerId: res.playerId }
        navigate(`/lobby/${res.roomCode}`, { state: routeState })
      })
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link
        to="/"
        className="mb-4 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Back
      </Link>

      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Create room
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        You&apos;ll be the host — pick a nickname, then share the room code with everyone
        at the table.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="host-nickname" className="block text-sm text-zinc-400">
            Host nickname
          </label>
          <input
            id="host-nickname"
            name="hostNickname"
            type="text"
            autoComplete="nickname"
            value={hostNickname}
            onChange={(e) => setHostNickname(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
            placeholder="Your name"
          />
          {error && (
            <p className="mt-1 text-xs text-rose-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending || !socket.connected}
          className="min-h-[48px] rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}
