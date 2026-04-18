import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { MIN_PLAYERS_TO_START } from '@nightfall/shared'
import type { LobbyRouteState } from '../navigation/types'
import type { GameStartAck } from '../socket/protocol'
import { useSocket } from '../socket/SocketContext'
import { useLobbyRoom } from '../socket/useLobbyRoom'

const ACK_TIMEOUT_MS = 12_000

export function LobbyPage() {
  const { roomCode = '' } = useParams<{ roomCode: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()

  const routeState = location.state as LobbyRouteState | undefined
  const myPlayerId = routeState?.myPlayerId

  const { lobby, fetchError } = useLobbyRoom(roomCode)
  const [startError, setStartError] = useState<string | null>(null)
  const [startPending, setStartPending] = useState(false)

  const isHost = useMemo(() => {
    if (!myPlayerId || !lobby) return false
    return lobby.players.some(
      (p) => p.playerId === myPlayerId && p.isHost,
    )
  }, [lobby, myPlayerId])

  useEffect(() => {
    if (!lobby?.gameStarted || !roomCode) return
    if (lobby.phase === 'lobby') return
    navigate(`/game/${roomCode}`, {
      replace: true,
      state: { myPlayerId } satisfies LobbyRouteState,
    })
  }, [lobby?.gameStarted, lobby?.phase, lobby?.roomCode, myPlayerId, navigate, roomCode])

  function handleStartGame() {
    if (!roomCode || !socket.connected) return
    setStartError(null)
    setStartPending(true)
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('game:start', { roomCode }, (err: Error, res?: GameStartAck) => {
        setStartPending(false)
        if (err) {
          setStartError('Request timed out.')
          return
        }
        if (!res) {
          setStartError('Unexpected server response.')
          return
        }
        if (res.ok === false) {
          setStartError(res.error)
        }
      })
  }

  const displayCode = lobby?.roomCode ?? roomCode

  return (
    <div className="flex flex-1 flex-col">
      <Link
        to="/"
        className="mb-4 text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Home
      </Link>

      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Lobby</h1>

      {fetchError && (
        <p className="mt-4 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
          {fetchError}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Room code
        </h2>
        <p className="mt-1 font-mono text-2xl tracking-[0.2em] text-zinc-100">
          {displayCode || '—'}
        </p>
        {!myPlayerId && !fetchError && (
          <p className="mt-2 text-xs text-zinc-500">
            You are viewing this lobby without a seat. Create or join a room to
            appear in the list.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-zinc-300">Players</h2>
        {!lobby || lobby.players.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No players yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {lobby.players.map((p) => (
              <li
                key={p.playerId}
                className="flex min-h-[44px] min-w-0 items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span
                    className={[
                      'min-w-0 truncate',
                      lobby.gameStarted && !p.isAlive
                        ? 'text-zinc-500 line-through'
                        : 'text-zinc-100',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {p.nickname}
                  </span>
                  {p.playerId === myPlayerId && (
                    <span className="shrink-0 text-xs text-zinc-500">(you)</span>
                  )}
                </span>
                <span className="shrink-0 text-right text-xs text-zinc-500">
                  {p.isHost && <span>Organizer</span>}
                  {lobby.gameStarted && !p.isAlive && (
                    <span className="ml-2">Out</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">How Nightfall works</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Nightfall is social deduction: most seats are Town with secret roles, while a
          small Mafia team removes people at night and argues by day to avoid suspicion.
        </p>

        <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Roles &amp; what they do
        </h3>
        <ul className="mt-2 space-y-2.5 text-sm leading-relaxed text-zinc-400">
          <li className="border-l-2 border-zinc-700 pl-3">
            <span className="font-medium text-zinc-200">Villager</span> (Town) — Has no
            night action. Uses the day vote to help eliminate the Mafia.
          </li>
          <li className="border-l-2 border-emerald-900/60 pl-3">
            <span className="font-medium text-zinc-200">Doctor</span> (Town) — Each
            night, chooses one player to protect (including themselves). If that player
            is the Mafia&apos;s target, they survive.
          </li>
          <li className="border-l-2 border-sky-900/50 pl-3">
            <span className="font-medium text-zinc-200">Detective</span> (Town, 6+
            players only) — Once per night, investigates one living player and learns
            whether they are Mafia or not Mafia.
          </li>
          <li className="border-l-2 border-rose-900/50 pl-3">
            <span className="font-medium text-zinc-200">Mafia</span> — Knows teammates.
            Each night the team votes on one elimination target; they win if they are not
            voted out and can match or outnumber Town.
          </li>
        </ul>

        <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Flow &amp; table size
        </h3>
        <ul className="mt-2 list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>
            You need at least{' '}
            <span className="font-medium text-zinc-200">
              {MIN_PLAYERS_TO_START} players
            </span>{' '}
            in the room before the match can start.
          </li>
          <li>
            Nights use timers for role actions; your private screen shows what you can do
            that phase. Day voting has no timer — it finishes when everyone still alive has
            voted.
          </li>
          <li>
            How many Mafia are in play scales with seats: 1 for 4–5 players, 2 for 6–10,
            3 for 11–15, 4 for 16–20, then +1 Mafia per extra block of five players. There
            is always exactly one Doctor. The Detective is only added when there are six
            or more players.
          </li>
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-3">
        {startError && (
          <p className="text-center text-xs text-rose-400" role="alert">
            {startError}
          </p>
        )}
        {lobby && !lobby.gameStarted && (
          <p className="text-center text-xs text-zinc-500">
            {lobby.players.length < MIN_PLAYERS_TO_START
              ? `${lobby.players.length} of ${MIN_PLAYERS_TO_START} players — add ${MIN_PLAYERS_TO_START - lobby.players.length} more to begin.`
              : `${lobby.players.length} players — minimum met; the organizer can start when you are ready.`}
          </p>
        )}
        <button
          type="button"
          disabled={
            !isHost ||
            startPending ||
            !lobby ||
            lobby.gameStarted ||
            !socket.connected ||
            (lobby.players?.length ?? 0) < MIN_PLAYERS_TO_START
          }
          className="min-h-[48px] rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleStartGame}
        >
          {lobby?.gameStarted
            ? 'Game started'
            : startPending
              ? 'Starting…'
              : 'Start Game'}
        </button>
        {!isHost && myPlayerId && (
          <p className="text-center text-xs text-zinc-600">
            The organizer starts the match when everyone is ready.
          </p>
        )}
      </div>
    </div>
  )
}
