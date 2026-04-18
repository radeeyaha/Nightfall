import { Link, Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6 sm:px-6">
        <header className="mb-4">
          <Link
            to="/"
            className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-400"
          >
            Nightfall
          </Link>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
