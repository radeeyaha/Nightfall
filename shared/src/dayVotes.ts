import type { PlayerId } from './ids.js'

export interface DayVote {
  voterPlayerId: PlayerId
  targetPlayerId: PlayerId
}

export interface DayVotes {
  votes: DayVote[]
}
