import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Home</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Create a room or join with a code. Routing only — no server rooms yet.
      </p>

      <nav className="mt-8 flex flex-col gap-3" aria-label="Main actions">
        <Link
          to="/create"
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-zinc-100 hover:bg-zinc-800"
        >
          Create Game
        </Link>
        <Link
          to="/join"
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-zinc-100 hover:bg-zinc-800"
        >
          Join Game
        </Link>
      </nav>
    </div>
  )
}
