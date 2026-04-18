import { useEffect, useState } from 'react'

function formatRemaining(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

type PhaseTimerBarProps = {
  deadlineIso: string | undefined
  label: string
}

/**
 * Live countdown toward a server-provided phase deadline.
 */
export function PhaseTimerBar({ deadlineIso, label }: PhaseTimerBarProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!deadlineIso) return
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [deadlineIso])

  if (!deadlineIso) return null

  const end = Date.parse(deadlineIso)
  if (!Number.isFinite(end)) return null

  const sec = Math.max(0, (end - Date.now()) / 1000)

  return (
    <div
      className="mb-4 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/25 px-3 py-2.5 sm:gap-3 sm:px-4"
      role="timer"
      aria-live="polite"
      aria-label={`${label} time remaining`}
    >
      <span className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wide text-amber-200/85">
        {label}
      </span>
      <span className="shrink-0 font-mono text-lg tabular-nums text-amber-100 sm:text-xl">
        {formatRemaining(sec)}
      </span>
    </div>
  )
}
