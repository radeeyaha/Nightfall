const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function generateRoomCode(): string {
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)] ?? 'X'
  }
  return out
}

export function socketRoomChannel(roomCode: string): string {
  return `room:${normalizeRoomCode(roomCode)}`
}
