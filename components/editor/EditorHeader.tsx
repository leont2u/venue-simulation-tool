"use client";

import Link from "next/link";

export function EditorHeader({ name }: { name: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-zinc-950 px-4">
      <div className="flex items-center gap-3">
        <div className="text-base font-semibold text-white">{name}</div>
        <div className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
          3D Venue Editor
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
        >
          Dashboard
        </Link>

        <button className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-400">
          Share
        </button>
      </div>
    </header>
  );
}
