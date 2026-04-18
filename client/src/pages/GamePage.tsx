import type { Phase, Role } from '@nightfall/shared'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PhaseTimerBar } from '../components/PhaseTimerBar'
import { sortPlayersForViewer } from '../game/viewerPlayerOrder'
import { usePrivateRoleForRoom } from '../game/usePrivateRoleForRoom'
import type { LobbyRouteState } from '../navigation/types'
import type {
  DayResultPublicDto,
  GameNarrationPayload,
  NightDetectiveResultPayload,
  NightMafiaVoteBoardPayload,
  SimpleOkAck,
} from '../socket/protocol'
import { useSocket } from '../socket/SocketContext'
import { useLobbyRoom } from '../socket/useLobbyRoom'

const ACK_TIMEOUT_MS = 12_000

/** Narration alone on a blank screen, then moves up before actions appear. */
const NARRATION_SOLO_MS = 10_000
const NARRATION_MOVE_MS = 550

type NarrationPresentation = 'idle' | 'solo' | 'moving' | 'revealed'

function phaseTimerLabel(phase: Phase): string {
  switch (phase) {
    case 'roleReveal':
      return 'Read your role'
    case 'night':
      return 'Night ends'
    case 'nightResult':
      return 'Voting opens'
    case 'dayVoting':
      return 'Day vote'
    case 'dayResult':
      return 'Next night'
    default:
      return 'Time left'
  }
}

function roleNightLabel(role: Role): string {
  switch (role) {
    case 'mafia':
      return 'Mafia'
    case 'doctor':
      return 'Doctor'
    case 'detective':
      return 'Detective'
    case 'villager':
    default:
      return 'Villager'
  }
}

function dayHeadline(d: DayResultPublicDto): string {
  switch (d.outcome) {
    case 'eliminated':
      return d.eliminatedNickname
        ? `${d.eliminatedNickname} was eliminated by the town.`
        : 'A player was eliminated by the town.'
    case 'tie':
      return 'The vote was tied — nobody was eliminated.'
    case 'none':
    default:
      return 'Nobody was eliminated today.'
  }
}

export function GamePage() {
  const { roomCode = '' } = useParams<{ roomCode: string }>()
  const location = useLocation()
  const myPlayerId = (location.state as LobbyRouteState | undefined)?.myPlayerId
  const { socket } = useSocket()
  const { lobby, fetchError } = useLobbyRoom(roomCode)
  const privateRole = usePrivateRoleForRoom(roomCode)

  const [mafiaBoard, setMafiaBoard] = useState<NightMafiaVoteBoardPayload | null>(
    null,
  )
  const [detectiveResult, setDetectiveResult] =
    useState<NightDetectiveResultPayload | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  /** Night actions only — never blocks day voting (fixes stuck busy after investigate). */
  const [nightActionBusy, setNightActionBusy] = useState(false)
  const [dayVoteBusy, setDayVoteBusy] = useState(false)
  /** Your latest successful night pick (highlights list rows). */
  const [myNightMafiaTarget, setMyNightMafiaTarget] = useState<string | null>(null)
  const [myNightDoctorTarget, setMyNightDoctorTarget] = useState<string | null>(null)
  const [myNightDetectiveTarget, setMyNightDetectiveTarget] = useState<string | null>(
    null,
  )
  const [narration, setNarration] = useState<string | null>(null)
  const [narrationPresentation, setNarrationPresentation] =
    useState<NarrationPresentation>('idle')
  /** Server does not echo day votes; we track selection locally after a successful submit. */
  const [myDayVoteTarget, setMyDayVoteTarget] = useState<string | null>(null)
  /** Detective may only submit one investigate per night (mirrors server). */
  const [detectiveActedThisNight, setDetectiveActedThisNight] = useState(false)
  const prevPhase = useRef<string | undefined>(undefined)

  const phase = lobby?.phase
  const myRole = privateRole?.myRole

  const meAlive = useMemo(() => {
    if (!myPlayerId || !lobby) return false
    return lobby.players.find((p) => p.playerId === myPlayerId)?.isAlive ?? false
  }, [lobby, myPlayerId])

  const nicknameById = useMemo(() => {
    const m = new Map<string, string>()
    lobby?.players.forEach((p) => m.set(p.playerId, p.nickname))
    return m
  }, [lobby])

  const aliveOthers = useMemo(() => {
    if (!lobby || !myPlayerId) return []
    return lobby.players.filter(
      (p) => p.isAlive && p.playerId !== myPlayerId,
    )
  }, [lobby, myPlayerId])

  const nightVoteOrderKey = `night-${lobby?.phaseDeadlineAt ?? ''}`
  const doctorOrderKey = `doctor-${lobby?.phaseDeadlineAt ?? ''}`
  const dayVoteOrderKey = `dayvote-${lobby?.phaseDeadlineAt ?? ''}`

  const orderedNightOthers = useMemo(
    () => sortPlayersForViewer(aliveOthers, myPlayerId, roomCode, nightVoteOrderKey),
    [aliveOthers, myPlayerId, roomCode, nightVoteOrderKey],
  )

  const orderedDoctorTargets = useMemo(() => {
    if (!lobby) return []
    const alive = lobby.players.filter((p) => p.isAlive)
    return sortPlayersForViewer(alive, myPlayerId, roomCode, doctorOrderKey)
  }, [lobby, myPlayerId, roomCode, doctorOrderKey])

  const orderedDayVoteTargets = useMemo(
    () => sortPlayersForViewer(aliveOthers, myPlayerId, roomCode, dayVoteOrderKey),
    [aliveOthers, myPlayerId, roomCode, dayVoteOrderKey],
  )

  const orderedMafiaTeammates = useMemo(() => {
    const mates = privateRole?.mafiaTeammates
    if (!mates?.length) return []
    return sortPlayersForViewer(mates, myPlayerId, roomCode, `mates-${nightVoteOrderKey}`)
  }, [privateRole?.mafiaTeammates, myPlayerId, roomCode, nightVoteOrderKey])

  const showPhaseTimer =
    Boolean(lobby?.gameStarted && lobby.phaseDeadlineAt) &&
    (phase === 'roleReveal' ||
      phase === 'night' ||
      phase === 'nightResult' ||
      phase === 'dayResult')

  useEffect(() => {
    if (phase !== 'night') setMafiaBoard(null)
  }, [phase])

  useEffect(() => {
    if (phase !== 'night') {
      setMyNightMafiaTarget(null)
      setMyNightDoctorTarget(null)
      setMyNightDetectiveTarget(null)
    }
  }, [phase])

  useEffect(() => {
    if (!mafiaBoard?.lines?.length || !myPlayerId) return
    const mine = mafiaBoard.lines.find((l) => l.voterId === myPlayerId)
    if (mine) setMyNightMafiaTarget(mine.targetId)
  }, [mafiaBoard, myPlayerId])

  useEffect(() => {
    if (phase === 'night' && prevPhase.current !== 'night') {
      setDetectiveActedThisNight(false)
      setDetectiveResult(null)
    }
    prevPhase.current = phase
  }, [phase])

  useEffect(() => {
    if (phase === 'dayVoting' || phase === 'nightResult') {
      setNightActionBusy(false)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'dayVoting') setMyDayVoteTarget(null)
  }, [phase])

  useEffect(() => {
    setMyDayVoteTarget(null)
  }, [roomCode])

  useLayoutEffect(() => {
    if (!narration) {
      setNarrationPresentation('idle')
      return
    }
    setNarrationPresentation('solo')
    const tMove = window.setTimeout(() => {
      setNarrationPresentation('moving')
    }, NARRATION_SOLO_MS)
    const tReveal = window.setTimeout(() => {
      setNarrationPresentation('revealed')
    }, NARRATION_SOLO_MS + NARRATION_MOVE_MS)
    return () => {
      window.clearTimeout(tMove)
      window.clearTimeout(tReveal)
    }
  }, [narration])

  useEffect(() => {
    const onBoard = (p: NightMafiaVoteBoardPayload) => {
      if (p.roomCode === roomCode) setMafiaBoard(p)
    }
    const onDet = (p: NightDetectiveResultPayload) => {
      if (p.roomCode === roomCode) {
        setDetectiveResult(p)
        setDetectiveActedThisNight(true)
        setMyNightDetectiveTarget(p.targetPlayerId)
      }
    }
    const onNarration = (p: GameNarrationPayload) => {
      if (p.roomCode === roomCode) setNarration(p.text)
    }
    socket.on('night:mafiaVoteUpdate', onBoard)
    socket.on('night:detectiveResult', onDet)
    socket.on('game:narration', onNarration)
    return () => {
      socket.off('night:mafiaVoteUpdate', onBoard)
      socket.off('night:detectiveResult', onDet)
      socket.off('game:narration', onNarration)
    }
  }, [socket, roomCode])

  function submitDayEliminationVote(targetPlayerId: string) {
    if (!roomCode || !socket.connected) return
    setActionError(null)
    const previousVote = myDayVoteTarget
    setMyDayVoteTarget(targetPlayerId)
    setDayVoteBusy(true)
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('day:submitVote', { roomCode, targetPlayerId }, (err: Error, res?: SimpleOkAck) => {
        setDayVoteBusy(false)
        if (err) {
          setMyDayVoteTarget(previousVote)
          setActionError('Request timed out.')
          return
        }
        if (!res) {
          setMyDayVoteTarget(previousVote)
          setActionError('Unexpected server response.')
          return
        }
        if (res.ok === false) {
          setMyDayVoteTarget(previousVote)
          setActionError(res.error)
        }
      })
  }

  function submitRoleTarget(
    event: 'night:mafiaVote' | 'night:doctorSave' | 'night:detectiveInvestigate',
    targetPlayerId: string,
  ) {
    if (!roomCode || !socket.connected) return
    const prevMafia = myNightMafiaTarget
    const prevDoc = myNightDoctorTarget
    const prevDet = myNightDetectiveTarget
    setActionError(null)
    setNightActionBusy(true)
    if (event === 'night:mafiaVote') setMyNightMafiaTarget(targetPlayerId)
    if (event === 'night:doctorSave') setMyNightDoctorTarget(targetPlayerId)
    if (event === 'night:detectiveInvestigate') setMyNightDetectiveTarget(targetPlayerId)
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit(event, { roomCode, targetPlayerId }, (err: Error, res?: SimpleOkAck) => {
        setNightActionBusy(false)
        if (err) {
          if (event === 'night:mafiaVote') setMyNightMafiaTarget(prevMafia)
          if (event === 'night:doctorSave') setMyNightDoctorTarget(prevDoc)
          if (event === 'night:detectiveInvestigate') setMyNightDetectiveTarget(prevDet)
          setActionError('Request timed out.')
          return
        }
        if (!res) {
          if (event === 'night:mafiaVote') setMyNightMafiaTarget(prevMafia)
          if (event === 'night:doctorSave') setMyNightDoctorTarget(prevDoc)
          if (event === 'night:detectiveInvestigate') setMyNightDetectiveTarget(prevDet)
          setActionError('Unexpected server response.')
          return
        }
        if (res.ok === false) {
          if (event === 'night:mafiaVote') setMyNightMafiaTarget(prevMafia)
          if (event === 'night:doctorSave') setMyNightDoctorTarget(prevDoc)
          if (event === 'night:detectiveInvestigate') setMyNightDetectiveTarget(prevDet)
          setActionError(res.error)
        }
      })
  }

  /** Full-screen until the beat ends (includes a brief `idle` frame before layout sets `solo`). */
  const narrationOnOverlay =
    Boolean(narration) && narrationPresentation !== 'revealed'
  /** In-page card after the spotlight sequence (or whenever there is no narration). */
  const narrationInline = Boolean(narration) && narrationPresentation === 'revealed'
  /** Role panel, errors, nav — only after narration has moved up and the beat finishes. */
  const showRestOfGame =
    !narration || narrationPresentation === 'revealed'

  const narrationCard = (
    <aside
      className={[
        'rounded-xl border border-indigo-800/50 bg-indigo-950/35 px-5 py-4 text-sm leading-relaxed text-indigo-100/95 shadow-lg shadow-indigo-950/20 sm:px-6 sm:py-5',
        narrationOnOverlay
          ? 'mx-auto w-full max-w-[min(100%,36rem)] transition-all duration-500 ease-out sm:max-w-xl'
          : 'mt-4 transition-opacity duration-500 ease-out',
        narrationOnOverlay &&
          (narrationPresentation === 'solo' || narrationPresentation === 'idle')
          ? 'scale-[1.02] text-[1rem] sm:text-[1.05rem]'
          : '',
        narrationOnOverlay && narrationPresentation === 'moving'
          ? 'scale-100 text-[0.95rem] sm:text-[1rem]'
          : '',
      ].join(' ')}
      aria-live="polite"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-indigo-300/80">
        Narrator
      </p>
      <p className="mt-2 text-[0.95rem] text-zinc-100 sm:mt-2.5 sm:text-base">{narration}</p>
    </aside>
  )

  return (
    <div className="flex flex-1 flex-col">
      {narrationOnOverlay && (
        <div
          className={[
            'fixed inset-0 z-50 flex flex-col bg-zinc-950 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] transition-[padding] duration-500 ease-out',
            narrationPresentation === 'moving'
              ? 'items-center justify-start pt-[max(3.5rem,env(safe-area-inset-top))] sm:pt-[max(5rem,env(safe-area-inset-top))]'
              : 'items-center justify-center pt-[max(1rem,env(safe-area-inset-top))]',
          ].join(' ')}
        >
          {narrationCard}
        </div>
      )}

      <div
        className={
          showRestOfGame
            ? 'flex flex-1 flex-col opacity-100 transition-opacity duration-500 ease-out'
            : 'pointer-events-none max-h-0 overflow-hidden opacity-0'
        }
      >
        <div className="mb-4">
          <Link
            to={`/lobby/${roomCode}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Lobby
          </Link>
        </div>

        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Game</h1>

        {narrationInline && narrationCard}

        {fetchError && (
        <p className="mt-4 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
          {fetchError}
        </p>
      )}

      {actionError && (
        <p className="mt-2 text-sm text-rose-400" role="alert">
          {actionError}
        </p>
      )}

      {!myPlayerId && (
        <p className="mt-2 text-xs text-amber-600/90">
          Open this page from the lobby after joining so night actions and votes
          know your seat. Refresh may clear that — re-enter from the lobby if
          needed.
        </p>
      )}

      {phase === 'gameOver' && lobby?.gameWinner && (
        <section className="mt-6 rounded-xl border border-violet-800/50 bg-violet-950/30 p-4">
          <h2 className="text-sm font-semibold text-violet-200">Game over</h2>
          <p className="mt-2 text-lg font-medium text-zinc-100">
            {lobby.gameWinner === 'mafia'
              ? 'Mafia wins'
              : 'Town wins'}
          </p>
          {lobby.gameOverReason && (
            <p className="mt-2 text-sm text-zinc-400">{lobby.gameOverReason}</p>
          )}
          <Link
            to="/"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-violet-600/50 bg-violet-900/40 px-4 py-3 text-sm font-medium text-violet-100 hover:bg-violet-900/60 sm:w-auto"
          >
            Back to home
          </Link>
        </section>
      )}

      <section
        className="mt-6 flex min-h-[160px] flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
        aria-label="Role and night actions"
      >
        {showPhaseTimer && lobby?.phase && lobby.phaseDeadlineAt && (
          <PhaseTimerBar
            deadlineIso={lobby.phaseDeadlineAt}
            label={phaseTimerLabel(lobby.phase)}
          />
        )}
        {!privateRole && (
          <p className="text-sm text-zinc-500">
            Waiting for your role… If this stays empty, go back through the lobby to
            rejoin the room.
          </p>
        )}
        {privateRole && (
          <>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              <span className="font-medium text-zinc-400">Tip:</span> keep this closed
              around other players.{' '}
              <span className="text-zinc-400">Tap the bar below</span> only when you can
              read privately — that&apos;s where your secret role lives.
            </p>
            <details className="mt-2 rounded-lg border border-zinc-700/50 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-500 open:border-zinc-600/70">
              <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-200">
                Tap to show / hide your role (private)
              </summary>
              <p className="mt-3 border-t border-zinc-800/80 pt-3 text-base font-semibold capitalize tracking-tight text-zinc-100">
                {privateRole.myRole}
              </p>
            </details>

            {phase === 'night' && myRole === 'villager' && (
              <div className="mt-5 rounded-lg border border-zinc-700/50 bg-zinc-950/25 px-4 py-3">
                <p className="text-sm font-medium text-zinc-200">
                  You&apos;re a{' '}
                  <span className="text-amber-200/95">{roleNightLabel(myRole)}</span>
                  .
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Tonight you don&apos;t choose anything — there&apos;s no button for your
                  role. Wait for morning; the story moves on when the night timer ends.
                </p>
              </div>
            )}

            {phase === 'night' &&
              myRole === 'mafia' &&
              meAlive &&
              aliveOthers.length > 0 && (
                <div className="mt-5 space-y-3 rounded-lg border border-rose-900/35 bg-rose-950/15 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-rose-100">
                      You&apos;re{' '}
                      <span className="text-rose-200">{roleNightLabel(myRole)}</span>.
                      Choose who your team should try to eliminate tonight.
                    </p>
                    <p className="mt-1.5 text-sm text-rose-200/75">
                      Tap a name to vote — everyone on your team sees the vote list.
                    </p>
                  </div>
                  {orderedMafiaTeammates.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-rose-300/70">Teammates</p>
                      <ul className="mt-1 list-inside list-disc text-xs text-rose-100/85">
                        {orderedMafiaTeammates.map((t) => (
                          <li key={t.playerId}>{t.nickname}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {mafiaBoard && mafiaBoard.lines.length > 0 && (
                    <div className="rounded-lg border border-rose-900/40 bg-rose-950/15 p-3 text-sm text-zinc-300">
                      <p className="text-xs font-medium uppercase text-rose-300/80">
                        Team votes
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {mafiaBoard.lines.map((l) => {
                          const isMine = myPlayerId && l.voterId === myPlayerId
                          return (
                            <li
                              key={`${l.voterId}-${l.targetId}`}
                              className={
                                isMine
                                  ? 'rounded-md border border-rose-400/50 bg-rose-950/50 px-2 py-1.5 text-rose-50'
                                  : undefined
                              }
                            >
                              <span className={isMine ? 'font-medium' : undefined}>
                                {l.voterNickname}
                              </span>{' '}
                              → {l.targetNickname}
                              {isMine ? (
                                <span className="ml-1 text-[0.65rem] uppercase text-rose-200/80">
                                  (you)
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  <ul className="mt-2 divide-y divide-zinc-800/90 rounded-lg border border-zinc-700/80 bg-zinc-950/50">
                    {orderedNightOthers.map((p) => {
                      const picked = myNightMafiaTarget === p.playerId
                      return (
                        <li key={p.playerId}>
                          <button
                            type="button"
                            disabled={nightActionBusy || !socket.connected}
                            className={[
                              'flex min-h-[48px] w-full min-w-0 items-center gap-2 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800/70 disabled:opacity-50 sm:gap-3',
                              picked
                                ? 'border-l-4 border-rose-400 bg-rose-950/45 font-medium text-rose-50'
                                : '',
                            ].join(' ')}
                            onClick={() => submitRoleTarget('night:mafiaVote', p.playerId)}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {picked ? '✓ ' : ''}
                              {p.nickname}
                            </span>
                            <span className="shrink-0 text-xs text-rose-300/90">
                              Vote target →
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

            {phase === 'night' &&
              myRole === 'doctor' &&
              meAlive &&
              lobby &&
              lobby.players.some((p) => p.isAlive) && (
                <div className="mt-5 space-y-3 rounded-lg border border-emerald-900/35 bg-emerald-950/15 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">
                      You&apos;re the{' '}
                      <span className="text-emerald-200">{roleNightLabel(myRole)}</span>.
                    </p>
                    <p className="mt-1.5 text-sm text-emerald-200/80">
                      Choose one living player to protect from the Mafia tonight — you can
                      pick yourself.
                    </p>
                  </div>
                  <ul className="mt-2 divide-y divide-zinc-800/90 rounded-lg border border-zinc-700/80 bg-zinc-950/50">
                    {orderedDoctorTargets.map((p) => {
                      const picked = myNightDoctorTarget === p.playerId
                      return (
                        <li key={p.playerId}>
                          <button
                            type="button"
                            disabled={nightActionBusy || !socket.connected}
                            className={[
                              'flex min-h-[48px] w-full min-w-0 items-center gap-2 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800/70 disabled:opacity-50 sm:gap-3',
                              picked
                                ? 'border-l-4 border-emerald-400 bg-emerald-950/40 font-medium text-emerald-50'
                                : '',
                            ].join(' ')}
                            onClick={() =>
                              submitRoleTarget('night:doctorSave', p.playerId)
                            }
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {picked ? '✓ ' : ''}
                              {p.nickname}
                              {p.playerId === myPlayerId ? (
                                <span className="text-zinc-500"> (you)</span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-xs text-emerald-300/90">
                              Protect →
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

            {phase === 'night' &&
              myRole === 'detective' &&
              meAlive &&
              aliveOthers.length > 0 &&
              !detectiveActedThisNight && (
                <div className="mt-5 space-y-3 rounded-lg border border-sky-900/35 bg-sky-950/15 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-sky-100">
                      You&apos;re the{' '}
                      <span className="text-sky-200">{roleNightLabel(myRole)}</span>.
                    </p>
                    <p className="mt-1.5 text-sm text-sky-200/80">
                      Pick one person to investigate this night only. You&apos;ll get{' '}
                      <strong className="font-medium text-sky-100">Mafia</strong> or{' '}
                      <strong className="font-medium text-sky-100">Not Mafia</strong>{' '}
                      right away — no second check until the next night.
                    </p>
                  </div>
                  <ul className="mt-2 divide-y divide-zinc-800/90 rounded-lg border border-zinc-700/80 bg-zinc-950/50">
                    {orderedNightOthers.map((p) => {
                      const picked = myNightDetectiveTarget === p.playerId
                      return (
                        <li key={p.playerId}>
                          <button
                            type="button"
                            disabled={nightActionBusy || !socket.connected}
                            className={[
                              'flex min-h-[48px] w-full min-w-0 items-center gap-2 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800/70 disabled:opacity-50 sm:gap-3',
                              picked
                                ? 'border-l-4 border-sky-400 bg-sky-950/40 font-medium text-sky-50'
                                : '',
                            ].join(' ')}
                            onClick={() =>
                              submitRoleTarget('night:detectiveInvestigate', p.playerId)
                            }
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {picked ? '✓ ' : ''}
                              {p.nickname}
                            </span>
                            <span className="shrink-0 text-xs text-sky-300/90">
                              Investigate →
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

            {phase === 'night' &&
              myRole === 'detective' &&
              meAlive &&
              detectiveActedThisNight && (
                <div className="mt-5 rounded-lg border border-sky-900/30 bg-sky-950/10 px-4 py-3 text-sm text-sky-100/90">
                  <p className="font-medium text-sky-100">
                    You&apos;re the {roleNightLabel(myRole)} — you&apos;ve already
                    investigated this night.
                  </p>
                  <p className="mt-1 text-sky-200/75">
                    Hang tight until morning; your result is below if you just finished.
                  </p>
                </div>
              )}

            {detectiveResult && detectiveResult.roomCode === roomCode && (
              <div className="mt-4 rounded-lg border border-sky-900/40 bg-sky-950/20 p-3 text-sm text-zinc-200">
                <p className="text-xs font-medium uppercase text-sky-300/90">
                  Investigation result
                </p>
                <p className="mt-2">
                  {nicknameById.get(detectiveResult.targetPlayerId) ?? 'Player'}:{' '}
                  <span className="font-semibold">
                    {detectiveResult.alignment === 'mafia'
                      ? 'Mafia'
                      : 'Not Mafia'}
                  </span>
                </p>
              </div>
            )}
          </>
        )}

        {phase === 'dayVoting' && meAlive && aliveOthers.length > 0 && myPlayerId && (
          <div className="mt-5 space-y-3 rounded-lg border border-amber-900/30 bg-amber-950/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-amber-100">
                Day vote — you need to pick someone.
              </p>
              <p className="mt-1.5 text-sm text-amber-100/75">
                Choose who you want eliminated. You can change your pick until everyone
                still in the game has voted. Your secret role stays inside the collapsible
                above so it isn&apos;t obvious to someone glancing at your screen.
              </p>
            </div>
            {myDayVoteTarget && (
              <p className="text-xs text-zinc-500">
                Your vote:{' '}
                <span className="font-medium text-amber-200/90">
                  {nicknameById.get(myDayVoteTarget) ?? '…'}
                </span>
              </p>
            )}
            <ul className="mt-2 divide-y divide-zinc-800/90 rounded-lg border border-zinc-700/80 bg-zinc-950/50">
              <li>
                <div
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-left text-sm text-zinc-400 sm:gap-x-3"
                  title="You cannot vote for yourself."
                >
                  <span className="min-w-0 max-w-full font-medium text-zinc-300">
                    You — {nicknameById.get(myPlayerId) ?? 'You'}
                  </span>
                  <span className="text-xs text-zinc-500 sm:whitespace-nowrap">
                    cannot vote for yourself
                  </span>
                </div>
              </li>
              {orderedDayVoteTargets.map((p) => {
                const selected = myDayVoteTarget === p.playerId
                return (
                  <li key={p.playerId}>
                    <button
                      type="button"
                      disabled={dayVoteBusy || !socket.connected}
                      aria-pressed={selected}
                      className={
                        selected
                          ? 'flex min-h-[48px] w-full min-w-0 items-center gap-2 border-l-4 border-amber-500 bg-amber-950/40 px-4 py-3 text-left text-sm font-medium text-amber-50 disabled:opacity-50 sm:gap-3'
                          : 'flex min-h-[48px] w-full min-w-0 items-center gap-2 px-4 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800/70 disabled:opacity-50 sm:gap-3'
                      }
                      onClick={() => submitDayEliminationVote(p.playerId)}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {selected ? '✓ ' : ''}
                        {p.nickname}
                      </span>
                      <span className="shrink-0 text-xs text-amber-200/80">Vote out →</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

        {(phase === 'dayResult' || phase === 'gameOver') &&
          lobby?.lastDayResult && (
            <section className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900/40 p-4">
              <h2 className="text-sm font-medium text-zinc-300">Town vote</h2>
              <p className="mt-2 text-sm text-zinc-200">
                {dayHeadline(lobby.lastDayResult)}
              </p>
              {lobby.lastDayResult.outcome === 'eliminated' &&
                lobby.lastDayResult.eliminatedRole && (
                  <p className="mt-2 text-sm text-amber-200/90">
                    Their role was:{' '}
                    <span className="font-semibold capitalize">
                      {lobby.lastDayResult.eliminatedRole}
                    </span>
                  </p>
                )}
            </section>
          )}
      </div>
    </div>
  )
}
