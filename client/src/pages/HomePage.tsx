import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex flex-1 flex-col items-center justify-center pb-4 pt-2">
        {/* Soft glow orbs */}
        <div
          className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-12 bottom-24 h-40 w-40 rounded-full bg-rose-600/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-amber-500/25 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-zinc-950 p-8 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_24px_48px_-12px_rgba(0,0,0,0.65)] sm:p-10">
          <div className="flex justify-center gap-1.5" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
          </div>

          <p className="mt-5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-amber-200/75">
            You&apos;re invited
          </p>

          <h1 className="mt-4 text-center font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl sm:leading-tight">
            Tomi&apos;s{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-rose-200 bg-clip-text text-transparent">
              31st
            </span>{' '}
            Birthday
          </h1>

          <div className="mx-auto mt-5 flex items-center justify-center gap-3">
            <span className="h-px flex-1 max-w-[3rem] bg-gradient-to-r from-transparent to-amber-500/40" />
            <p className="whitespace-nowrap text-center font-medium text-rose-200/95 sm:text-lg">
              Mafia game
            </p>
            <span className="h-px flex-1 max-w-[3rem] bg-gradient-to-l from-transparent to-rose-500/35" />
          </div>

          <p className="mx-auto mt-6 max-w-[17rem] text-center text-sm leading-relaxed text-zinc-400">
            Dress sharp, trust no one, and try not to get voted off before the candles
            go out.
          </p>
        </div>

        <div className="relative z-10 mt-10 flex w-full max-w-sm flex-col items-stretch gap-3">
          <Link
            to="/create"
            className="rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-rose-600 px-6 py-4 text-center text-base font-semibold text-zinc-950 shadow-lg shadow-amber-900/30 ring-1 ring-amber-300/40 transition hover:brightness-110 hover:ring-amber-200/50 active:scale-[0.99]"
          >
            Play Mafia
          </Link>
          <Link
            to="/join"
            className="rounded-xl border border-zinc-700/80 bg-zinc-900/50 py-3 text-center text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            Join with a room code
          </Link>
        </div>
      </div>
    </div>
  )
}
