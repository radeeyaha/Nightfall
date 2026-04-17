import type { PlayerId } from '@nightfall/shared'
import type { ConnectedPlayer } from '../store/types.js'
import type { NightBucket, NightSummaryPublic } from './nightTypes.js'

/**
 * Tallies mafia kill votes from living mafia only.
 * Tie for the top count (or no votes) → null (no kill).
 */
export function resolveMafiaKillTarget(
  bucket: NightBucket,
  aliveMafiaIds: Set<PlayerId>,
): PlayerId | null {
  const tallies = new Map<PlayerId, number>()
  for (const [voterId, targetId] of Object.entries(bucket.mafiaVotes)) {
    if (!aliveMafiaIds.has(voterId)) continue
    tallies.set(targetId, (tallies.get(targetId) ?? 0) + 1)
  }
  if (tallies.size === 0) return null

  let max = 0
  const leaders: PlayerId[] = []
  for (const [targetId, count] of tallies) {
    if (count > max) {
      max = count
      leaders.length = 0
      leaders.push(targetId)
    } else if (count === max) {
      leaders.push(targetId)
    }
  }
  if (leaders.length !== 1) return null
  return leaders[0]!
}

export interface NightResolveInput {
  bucket: NightBucket
  players: Map<PlayerId, ConnectedPlayer>
  roomPlayerIds: PlayerId[]
}

export interface NightResolveOutput {
  summary: NightSummaryPublic
  detectiveTargetId: PlayerId | undefined
  detectiveResultTargetId: PlayerId | undefined
}

/**
 * Applies kill/save, returns public summary and detective investigation target for private emit.
 */
export function resolveNightActions(input: NightResolveInput): NightResolveOutput {
  const { bucket, players, roomPlayerIds } = input

  const aliveMafia = new Set(
    roomPlayerIds.filter(
      (id) => players.get(id)?.role === 'mafia' && players.get(id)?.isAlive,
    ),
  )

  const killTarget = resolveMafiaKillTarget(bucket, aliveMafia)

  let outcome: NightSummaryPublic['outcome'] = 'none'
  let killedPlayerId: PlayerId | null = null
  let killedNickname: string | null = null

  if (killTarget === null) {
    const hadAnyVote = Object.keys(bucket.mafiaVotes).some((v) =>
      aliveMafia.has(v),
    )
    outcome = hadAnyVote ? 'no_consensus' : 'none'
  } else {
    const targetP = players.get(killTarget)
    const saved =
      bucket.doctorSave !== undefined && bucket.doctorSave === killTarget
    if (saved) {
      outcome = 'saved'
    } else if (targetP?.isAlive) {
      targetP.isAlive = false
      outcome = 'killed'
      killedPlayerId = killTarget
      killedNickname = targetP.nickname
    } else {
      outcome = 'none'
    }
  }

  return {
    summary: {
      killedPlayerId,
      killedNickname,
      outcome,
    },
    detectiveTargetId: bucket.detectiveTarget,
    detectiveResultTargetId: bucket.detectiveTarget,
  }
}

export function isMafiaAlignment(
  players: Map<PlayerId, ConnectedPlayer>,
  targetId: PlayerId,
): boolean {
  return players.get(targetId)?.role === 'mafia'
}
