import type { PlayerId } from './ids.js'
import type { Role } from './role.js'

/**
 * Core player record for lobby + in-game state (no transport fields).
 */
export interface Player {
  id: PlayerId
  nickname: string
  isHost: boolean
  joinedAt: string
  /** Assigned when the game starts; null in lobby */
  role: Role | null
  isAlive: boolean
}
