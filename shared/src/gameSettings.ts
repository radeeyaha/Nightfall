/**
 * Tunables for timers and future rules. Extra keys allowed for modes / experiments.
 */
export interface GameSettings {
  /** Study roles before night (default 10). */
  roleRevealSeconds?: number
  /** Mafia / doctor / detective actions (default 60); can end early when all night roles act. */
  nightPhaseSeconds?: number
  /** Brief pause after night narration before voting opens (default 3; 0 = next tick). */
  nightResultSeconds?: number
  /** Unused — voting follows night result without a discussion phase. */
  dayDiscussionSeconds?: number
  /** Cast votes to eliminate (default 60); can end early when all living players vote. */
  votingSeconds?: number
  /** Reveal vote result before next night (default 20). */
  dayResultSeconds?: number
  [key: string]: unknown
}

export const defaultGameSettings = (): GameSettings => ({
  roleRevealSeconds: 10,
  nightPhaseSeconds: 60,
  nightResultSeconds: 3,
  dayDiscussionSeconds: 45,
  votingSeconds: 60,
  dayResultSeconds: 20,
})
