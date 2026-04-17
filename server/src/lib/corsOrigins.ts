/**
 * CORS for REST + Socket.IO.
 *
 * Vite often uses 5173, but if that port is busy it picks 5174, 5175, … — a fixed
 * allowlist breaks Socket.IO. In development we reflect the request origin unless
 * CLIENT_ORIGIN is set explicitly.
 */

const DEFAULT_PROD_FALLBACK = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

export type CorsOriginSetting = true | string[]

export function getCorsOrigin(): CorsOriginSetting {
  const raw = process.env.CLIENT_ORIGIN?.trim()
  if (raw) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PROD_FALLBACK
  }
  return true
}
