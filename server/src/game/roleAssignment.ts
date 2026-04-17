import type { PlayerId, Role, Room } from '@nightfall/shared'
import { MIN_PLAYERS_TO_START } from '@nightfall/shared'
import type { ConnectedPlayer } from '../store/types.js'

/**
 * Mafia count by table size:
 * - 4–5 players: 1 Mafia
 * - 6–10: 2 Mafia
 * - 11–15: 3 Mafia
 * - 16–20: 4 Mafia
 * - then +1 Mafia every 5 additional players (same as 1 + floor((n-1)/5) for n ≥ 6).
 */
export function mafiaCountForPlayerCount(playerCount: number): number {
  if (playerCount < MIN_PLAYERS_TO_START) {
    throw new Error(`Need at least ${MIN_PLAYERS_TO_START} players`)
  }
  if (playerCount <= 5) return 1
  return 1 + Math.floor((playerCount - 1) / 5)
}

/** 6+ players include a Detective; 4–5 players do not. */
export function includesDetective(playerCount: number): boolean {
  return playerCount > 5
}

/**
 * Builds the role deck: N× Mafia, 1 Doctor, optional Detective, rest Villagers.
 * Shuffled by `assignRolesForRoom`.
 */
export function buildRoleDeck(playerCount: number): Role[] {
  if (playerCount < MIN_PLAYERS_TO_START) {
    throw new Error(`Need at least ${MIN_PLAYERS_TO_START} players`)
  }

  const mafia = mafiaCountForPlayerCount(playerCount)
  const doctor = 1
  const detective = includesDetective(playerCount) ? 1 : 0
  const fixed = mafia + doctor + detective
  const villagers = playerCount - fixed

  if (villagers < 0) {
    throw new Error('Invalid player count for role deck')
  }

  const deck: Role[] = []
  for (let i = 0; i < mafia; i++) deck.push('mafia')
  deck.push('doctor')
  if (detective === 1) deck.push('detective')
  for (let i = 0; i < villagers; i++) deck.push('villager')

  return deck
}

export function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
}

/**
 * Assigns roles randomly, sets every player alive. Mutates `players` map entries for `room.playerIds`.
 */
export function assignRolesForRoom(
  room: Room,
  players: Map<PlayerId, ConnectedPlayer>,
): void {
  const ids = [...room.playerIds]
  const deck = buildRoleDeck(ids.length)
  shuffleInPlace(deck)

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!
    const role = deck[i]!
    const p = players.get(id)
    if (p) {
      p.role = role
      p.isAlive = true
    }
  }
}
