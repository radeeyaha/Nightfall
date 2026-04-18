import { Link, Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div
        className="mx-auto flex min-h-dvh w-full max-w-md flex-col py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-lg sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:max-w-xl xl:max-w-2xl"
      >
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
