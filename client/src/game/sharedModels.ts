/**
 * Re-exports canonical game types from `@nightfall/shared`.
 * Keep socket/UI code importing from here or from the package — not duplicated locally.
 */
export type {
  Player,
  Room,
  GameSettings,
  Role,
  Phase,
  NightActions,
  NightAction,
  NightActionKind,
  DayVotes,
  DayVote,
  GameResult,
  WinningFaction,
  PlayerId,
  RoomId,
} from '@nightfall/shared'

export {
  ROLES,
  PHASES,
  NIGHT_ACTION_KINDS,
  defaultGameSettings,
  MIN_PLAYERS_TO_START,
} from '@nightfall/shared'
