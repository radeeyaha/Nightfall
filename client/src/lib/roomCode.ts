/** Must match server `generateRoomCode` length. */
export const ROOM_CODE_LENGTH = 6

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
