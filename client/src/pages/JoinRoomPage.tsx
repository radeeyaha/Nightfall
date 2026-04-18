import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RoomCodeBoxes } from '../components/RoomCodeBoxes'
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '../lib/roomCode'
import type { LobbyRouteState } from '../navigation/types'
import type { RoomJoinAck } from '../socket/protocol'
import { useSocket } from '../socket/SocketContext'

const ACK_TIMEOUT_MS = 12_000

export function JoinRoomPage() {
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [nickname, setNickname] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    const code = normalizeRoomCode(roomCodeInput)
    if (!name) {
      setError('Enter a nickname.')
      return
    }
    if (code.length !== ROOM_CODE_LENGTH) {
      setError(`Enter the full ${ROOM_CODE_LENGTH}-character room code.`)
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
      .emit(
        'room:join',
        { roomCode: code, nickname: name },
        (err: Error, res?: RoomJoinAck) => {
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
        },
      )
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
        Join room
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Enter the code your host shared.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="join-nickname" className="block text-sm text-zinc-400">
            Nickname
          </label>
          <input
            id="join-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="room-code-0" className="block text-sm text-zinc-400">
            Room code
          </label>
          <RoomCodeBoxes
            id="room-code"
            value={roomCodeInput}
            onChange={setRoomCodeInput}
            disabled={pending}
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !socket.connected}
          className="min-h-[48px] rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Joining…' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}
