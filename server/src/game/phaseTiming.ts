import type { GameSettings, Room } from '@nightfall/shared'

function sec(
  settings: GameSettings,
  key: keyof GameSettings,
  fallback: number,
): number {
  const v = settings[key]
  return typeof v === 'number' && v > 0 ? v : fallback
}

export function roleRevealMs(room: Room): number {
  return sec(room.settings, 'roleRevealSeconds', 8) * 1000
}

export function nightPhaseMs(room: Room): number {
  return sec(room.settings, 'nightPhaseSeconds', 45) * 1000
}

export function nightResultMs(room: Room): number {
  const v = room.settings.nightResultSeconds
  if (typeof v === 'number' && v >= 0 && Number.isFinite(v)) {
    return v * 1000
  }
  return 10_000
}

export function dayDiscussionMs(room: Room): number {
  return sec(room.settings, 'dayDiscussionSeconds', 45) * 1000
}

export function dayResultMs(room: Room): number {
  return sec(room.settings, 'dayResultSeconds', 12) * 1000
}
