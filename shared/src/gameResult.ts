import type { PlayerId } from './ids.js'
import type { Role } from './role.js'

export type WinningFaction = 'mafia' | 'village'

export interface GameResult {
  winner: WinningFaction
  reason?: string
  rolesRevealed?: Record<PlayerId, Role>
}
