import type { Room } from '@nightfall/shared'
import type { DayResultPublic, NightBucket, RoomMetaGame } from './nightTypes.js'

export function getRoomMeta(room: Room): RoomMetaGame {
  return (room.meta ?? {}) as RoomMetaGame
}

export function getNightBucket(room: Room): NightBucket {
  const m = getRoomMeta(room)
  return m.nightBucket ?? { mafiaVotes: {} }
}

export function setNightBucket(room: Room, bucket: NightBucket): void {
  const m = getRoomMeta(room)
  room.meta = { ...m, nightBucket: bucket } as Record<string, unknown>
}

export function setLastNightSummary(
  room: Room,
  summary: import('./nightTypes.js').NightSummaryPublic,
): void {
  const m = getRoomMeta(room)
  room.meta = { ...m, lastNightSummary: summary } as Record<string, unknown>
}

export function clearNightBucket(room: Room): void {
  const m = getRoomMeta(room)
  const next = { ...m }
  delete next.nightBucket
  room.meta = next as Record<string, unknown>
}

export function setLastDayResult(room: Room, summary: DayResultPublic): void {
  const m = getRoomMeta(room)
  room.meta = { ...m, lastDayResult: summary } as Record<string, unknown>
}

export function clearLastDayResult(room: Room): void {
  const m = getRoomMeta(room)
  const next = { ...m }
  delete next.lastDayResult
  room.meta = next as Record<string, unknown>
}
