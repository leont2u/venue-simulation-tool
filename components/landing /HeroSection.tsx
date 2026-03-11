"use client";

import Link from "next/link";

export function Hero() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-104px)] max-w-6xl flex-col px-6 pb-12 pt-8">
      <div className="mx-auto mt-10 max-w-4xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
          Build smarter venue
          <br />
          layouts, <span className="text-green-400">present them faster.</span>
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-zinc-400 md:text-2xl">
          Design immersive 3D venue layouts with drag-and-drop assets, then
          share polished previews with clients and internal teams.
        </p>
      </div>

      <div className="mx-auto mt-16 w-full max-w-5xl rounded-[36px] border border-white/10 bg-zinc-950/40 p-8 shadow-[0_0_120px_rgba(73,210,77,0.06)] backdrop-blur">
        <div className="text-5xl font-medium text-zinc-500 md:text-6xl">
          Make a 3D venue simulation app that...
        </div>

        <div className="mt-32 flex items-end justify-between">
          <button className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-4xl text-zinc-300 transition hover:border-green-400 hover:text-green-400">
            +
          </button>

          <Link
            href="/dashboard"
            className="rounded-3xl bg-zinc-800 px-8 py-5 text-2xl font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
          >
            Start →
          </Link>
        </div>
      </div>
    </section>
  );
}
