import type { PlayerId, RoomId } from './ids.js'
import type { Phase } from './phase.js'
import type { GameSettings } from './gameSettings.js'
import type { NightActions } from './nightActions.js'
import type { DayVotes } from './dayVotes.js'
import type { GameResult } from './gameResult.js'

/**
 * Authoritative room / session state. Transport (socket ids) lives on the server only.
 */
export interface Room {
  id: RoomId
  hostPlayerId: PlayerId
  /** Join order; source of truth for listing */
  playerIds: PlayerId[]
  createdAt: string
  gameStarted: boolean
  phase: Phase
  settings: GameSettings
  nightActions: NightActions | null
  dayVotes: DayVotes | null
  gameResult: GameResult | null
  /**
   * When the current timed phase auto-advances (ISO 8601). Set by the server
   * whenever a phase timer is armed; omitted for lobby / untimed states.
   */
  phaseDeadlineAt?: string
  /** Open extension point for future modes without schema churn */
  meta?: Record<string, unknown>
}
