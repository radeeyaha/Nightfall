import type { DayVote, PlayerId, WinningFaction } from '@nightfall/shared'
import type { ConnectedPlayer } from '../store/types.js'

/**
 * Tallies day-elimination votes from living players only. Self-votes are ignored.
 * No valid votes → `none`. Votes split on top count → `tie` (MVP: no elimination).
 */
export function tallyDayEliminationTarget(
  votes: readonly DayVote[],
  players: Map<PlayerId, ConnectedPlayer>,
  roomPlayerIds: readonly PlayerId[],
  roomCode: string,
): { targetId: PlayerId | null; outcome: 'eliminated' | 'tie' | 'none' } {
  const tallies = new Map<PlayerId, number>()

  for (const { voterPlayerId, targetPlayerId } of votes) {
    const voter = players.get(voterPlayerId)
    const target = players.get(targetPlayerId)
    if (!voter?.isAlive || voter.roomId !== roomCode) continue
    if (!target?.isAlive || target.roomId !== roomCode) continue
    if (voterPlayerId === targetPlayerId) continue
    if (!roomPlayerIds.includes(voterPlayerId)) continue
    if (!roomPlayerIds.includes(targetPlayerId)) continue
    tallies.set(targetPlayerId, (tallies.get(targetPlayerId) ?? 0) + 1)
  }

  if (tallies.size === 0) return { targetId: null, outcome: 'none' }

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

  if (leaders.length !== 1) return { targetId: null, outcome: 'tie' }
  return { targetId: leaders[0]!, outcome: 'eliminated' }
}

/** Mafia wins when mafia_alive >= non_mafia_alive; town wins when no mafia alive. */
export function checkWinCondition(
  roomPlayerIds: readonly PlayerId[],
  players: Map<PlayerId, ConnectedPlayer>,
): WinningFaction | null {
  let mafiaAlive = 0
  let nonMafiaAlive = 0
  for (const id of roomPlayerIds) {
    const p = players.get(id)
    if (!p?.isAlive || !p.role) continue
    if (p.role === 'mafia') mafiaAlive++
    else nonMafiaAlive++
  }
  if (mafiaAlive === 0) return 'village'
  if (mafiaAlive >= nonMafiaAlive) return 'mafia'
  return null
}
