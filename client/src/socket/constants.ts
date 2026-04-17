/**
 * Socket.IO URL.
 * - Development (`import.meta.env.DEV`): always same origin as the page so requests go
 *   through Vite’s `/socket.io` proxy → API on :3001 (avoids direct ws://localhost:3001).
 * - Production / `vite preview`: `VITE_SOCKET_URL` or `http://localhost:3001`.
 */
export function getSocketServerUrl(): string {
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'http://localhost:5173'
  }

  const raw = import.meta.env.VITE_SOCKET_URL
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim()
  }

  return 'http://localhost:3001'
}
