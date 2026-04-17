/** Deterministic 32-bit mix for stable per-viewer shuffles. */
function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}

/**
 * Order `players` differently for each viewer (and sort key) so list positions
 * are not comparable across devices — reduces seat-order metagaming.
 */
export function sortPlayersForViewer<T extends { playerId: string }>(
  players: readonly T[],
  viewerPlayerId: string | undefined,
  roomCode: string,
  sortKey: string,
): T[] {
  const copy = [...players]
  if (!viewerPlayerId) {
    copy.sort((a, b) => a.playerId.localeCompare(b.playerId))
    return copy
  }
  const salt = `${viewerPlayerId}\0${roomCode}\0${sortKey}`
  copy.sort((a, b) => {
    const da = hash32(`${salt}\0${a.playerId}`)
    const db = hash32(`${salt}\0${b.playerId}`)
    if (da !== db) return da - db
    return a.playerId.localeCompare(b.playerId)
  })
  return copy
}
