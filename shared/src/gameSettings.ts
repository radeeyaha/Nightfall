/**
 * Tunables for timers and future rules. Extra keys allowed for modes / experiments.
 */
export interface GameSettings {
  /** Study roles before night (default 8). */
  roleRevealSeconds?: number
  /** Mafia / doctor / detective actions (default 45); can end early when all night roles act. */
  nightPhaseSeconds?: number
  /** Pause after night resolves before voting opens (default 10; 0 = next tick). */
  nightResultSeconds?: number
  /** Unused — voting follows night result without a discussion phase. */
  dayDiscussionSeconds?: number
  /** Legacy / optional; day voting has no server time limit (resolves when all living players vote). */
  votingSeconds?: number
  /** Reveal vote result before next night (default 12). */
  dayResultSeconds?: number
  [key: string]: unknown
}

export const defaultGameSettings = (): GameSettings => ({
  roleRevealSeconds: 8,
  nightPhaseSeconds: 45,
  nightResultSeconds: 10,
  dayDiscussionSeconds: 45,
  votingSeconds: 60,
  dayResultSeconds: 12,
})
