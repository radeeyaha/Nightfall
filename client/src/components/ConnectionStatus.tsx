import { getSocketServerUrl } from '../socket/constants'
import { useSocket } from '../socket/SocketContext'

export function ConnectionStatus() {
  const { connectionState: state, serverTime, lastError } = useSocket()

  const statusLabel =
    state === 'connected'
      ? 'Connected'
      : state === 'connecting'
        ? 'Connecting…'
        : 'Disconnected'

  const statusClass =
    state === 'connected'
      ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/40'
      : state === 'connecting'
        ? 'bg-amber-500/15 text-amber-200 ring-amber-500/40'
        : 'bg-rose-500/15 text-rose-200 ring-rose-500/40'

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 ring-1 ring-white/5"
      aria-live="polite"
    >
      <h2 className="text-xs font-medium text-zinc-400">Socket</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusClass}`}
        >
          {statusLabel}
        </span>
        {serverTime && (
          <span className="text-xs text-zinc-500">
            <time dateTime={serverTime}>{serverTime}</time>
          </span>
        )}
      </div>
      <p className="mt-2 break-all text-[10px] leading-snug text-zinc-600">
        Socket: {getSocketServerUrl()}
        {import.meta.env.DEV && (
          <span className="block text-zinc-500">(dev: Vite proxies /socket.io → :3001)</span>
        )}
      </p>
      {lastError && state !== 'connected' && (
        <p className="mt-1 text-[10px] leading-snug text-rose-400" role="alert">
          {lastError}. From repo root run <code className="text-zinc-400">npm run dev</code> so
          the API is on port 3001.
        </p>
      )}
    </section>
  )
}
