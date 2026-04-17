import type { Role, WinningFaction } from '@nightfall/shared'
import type { DayResultPublic, NightSummaryPublic } from './nightTypes.js'

/**
 * Room-wide story beats. Emitted to all players via `game:narration`.
 * Lines are picked at random so repeat plays stay a little fresh.
 */
function pick<T>(lines: readonly T[]): T {
  return lines[Math.floor(Math.random() * lines.length)]!
}

function roleSpoken(role: Role): string {
  switch (role) {
    case 'mafia':
      return 'Mafia'
    case 'doctor':
      return 'Doctor'
    case 'detective':
      return 'Detective'
    case 'villager':
    default:
      return 'Villager'
  }
}

export const NARRATION = {
  gameBegins(): string {
    return pick([
      'The village awkwardly shuffles into a circle. Everyone has a secret job title — read yours before you accidentally main-character the wrong storyline. Night is coming, and it is not a spa night.',
      'Welcome to Nightfall, where trust is optional and side-eye is mandatory. You each have a role; try not to read it out loud. The sun is about to clock out.',
      'The town meeting begins. You all have mysterious envelopes. Spoiler: some of them say "crime." Study your card — soon the lights go out and the drama turns professional.',
    ])
  },

  nightFalls(): string {
    return pick([
      'The sun dips behind the hills like it knows something. Streetlamps flicker; the serious people with night jobs clock in. Sleep tight — or don\'t.',
      'Night falls, and the village does that thing where everyone pretends to sleep while secretly plotting. If you have a nighttime to-do list, this is your moment.',
      'Lights out. The crickets start their shift. Somewhere, a spreadsheet titled "Elimination" gets opened. Good luck out there.',
    ])
  },

  nightFallsAgain(): string {
    return pick([
      'The vote is settled. Shadows stretch again — bedtime for heroes, overtime for troublemakers. Another uneasy night begins.',
      'Daytime chaos resolved (sort of). The village yawns, locks doors, and hopes the spreadsheet people are tired. They are not.',
      'Sunset, round two. Blankets up, alibis polished. Night business resumes.',
    ])
  },

  winnerLine(winner: WinningFaction): string {
    if (winner === 'mafia') {
      return pick([
        'The Mafia have tied or outnumbered the town. Evil wins, democracy takes the L, and someone definitely mutters "called it."',
        'Mafia victory: the wolves are now running the sheep committee. Unfortunate for the sheep, great for drama.',
        'That\'s game — the bad guys outnumber the good guys. The village\'s group chat will be weird forever.',
      ])
    }
    return pick([
      'The last of the Mafia are gone. The town survives, justice gets a participation trophy, and the narrator can finally nap.',
      'Town wins! All the sneaky seats are empty. Celebrate with whatever passes for confetti in a medieval square.',
      'Mafia eliminated — the village actually paid attention for once. Rare. Beautiful. Slightly smug.',
    ])
  },
} as const

/** After night resolves: what happened, then voting opens. */
export function dayBreaksNarration(summary: NightSummaryPublic): string {
  const name = summary.killedNickname ?? 'someone who definitely had a name'
  switch (summary.outcome) {
    case 'killed':
      return pick([
        `Unfortunately, the Mafia did not take the night off — they struck, and this time they struck ${name}. Harsh. Cruel. On brand. The town must now vote — choose who to eliminate.`,
        `Bad news bears: the Mafia clocked in, sharpened their pencils, and ${name} did not make it to sunrise. Pour one out, then vote — the town must pick who to eliminate.`,
        `The night had teeth. The Mafia landed a hit, and ${name} is out of the story. Condolences and side-eye all around. Vote — someone has to take the blame.`,
      ])
    case 'saved':
      return pick([
        `Morning comes. The Mafia swung, the Doctor said "not today, reaper," and nobody died. Medical heroics, 10/10. The town must now vote — choose who to eliminate.`,
        `Plot twist with a stethoscope: there was an attack, but the Doctor\'s protection held. Zero eliminations, maximum smug Doctor energy. Time to vote someone out anyway — democracy waits for no one.`,
        `Someone tried to ruin the night; the Doctor said "covered by insurance." Nobody dies. The town still has to vote — pick who looks shifty.`,
      ])
    case 'no_consensus':
      return pick([
        `The Mafia could not agree on a victim — group project energy, but for murder. Nobody died. Small mercies. Now vote — the town must choose who to eliminate.`,
        `Night report: the villains bickered, the spreadsheet stayed blank, and everyone woke up breathing. Cute. Now go argue until someone gets voted out.`,
        `Internal Mafia Slack was a mess; no kill tonight. The village gets a freebie morning. Don\'t get comfortable — cast your votes.`,
      ])
    case 'none':
    default:
      return pick([
        `Morning comes, and the night was suspiciously quiet — no deaths, just vibes. The town must now vote — choose who to eliminate.`,
        `Zero body count. Either everyone behaved, or the drama is saving itself for daylight. Either way: vote someone out. Rules are rules.`,
        `Peaceful night. Too peaceful. The narrator is suspicious, but the tally says nobody died. Vote time — pick your suspect.`,
      ])
  }
}

/** After day votes are tallied: tie, nobody, wrong townie, or caught mafia. */
export function dayVoteOutcomeNarration(result: DayResultPublic): string {
  if (result.outcome === 'tie') {
    return pick([
      'The ballots are in — it\'s a tie. Nobody gets the boot. Democracy shrugged; chaos wins this round.',
      'Votes tallied: deadlock. The guillotine stays in the garage today. Try again next time you suspect literally everyone.',
      'It\'s a tie, which means everyone\'s favorite outcome: awkward silence and zero eliminations.',
    ])
  }
  if (result.outcome === 'none') {
    return pick([
      'The ballots are in. Through indecision or cunning, nobody walks the plank. The narrator is impressed and slightly bored.',
      'Votes tallied: nobody eliminated. The town collectively chose "pass." Bold strategy.',
      'Result: no elimination. Either mercy or confusion — hard to tell from here.',
    ])
  }
  if (result.outcome === 'eliminated' && result.eliminatedNickname && result.eliminatedRole) {
    const nick = result.eliminatedNickname
    const role = roleSpoken(result.eliminatedRole)
    if (result.eliminatedRole === 'mafia') {
      return pick([
        `The ballots are in — plot twist: ${nick} was Mafia. The town finally landed one. Cue suspiciously cheerful birds.`,
        `Votes tallied: ${nick} packs their villain luggage. They were ${role}. Justice stumbled, then face-planted into the right person.`,
        `Eliminated: ${nick}, revealed as ${role}. Rare W for the town. Someone pretend you planned that all along.`,
      ])
    }
    return pick([
      `The ballots are in. Unfortunately, you got tricked — the Mafia played the room, and you voted out ${nick}, a ${role}. Ouch. Own it. Move on. Dramatically.`,
      `Votes tallied: ${nick} is gone… and they were the ${role}. The Mafia are somewhere doing finger guns. Tough lesson in trust falls.`,
      `Eliminated: ${nick} — a ${role}. The town\'s collective Spidey-sense was offline. The Mafia send their regards (and probably a smirk).`,
      `Well, that backfired. ${nick} was a ${role}, and now they\'re out because the town believed the wrong PowerPoint. Mafia, take a bow — from the shadows, obviously.`,
    ])
  }
  if (result.outcome === 'eliminated' && result.eliminatedNickname) {
    return pick([
      `The ballots are in. ${result.eliminatedNickname} is eliminated — role reveal pending, but the mood is already spicy.`,
      `Votes tallied: ${result.eliminatedNickname} leaves the table. The story continues, somehow even messier.`,
    ])
  }
  return pick([
    'The ballots are in. The town learns the outcome of the vote — and the narrator learns that explaining democracy is a full-time job.',
    'Votes tallied. Outcome incoming; try to look innocent regardless.',
  ])
}
