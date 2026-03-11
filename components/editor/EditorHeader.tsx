"use client";

import Link from "next/link";

export function EditorHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
      <div>
        <div className="text-xl font-semibold text-white">{name}</div>
        <div className="text-sm text-zinc-500">3D venue layout editor</div>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          Dashboard
        </Link>
        <button className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white">
          Share
        </button>
      </div>
    </div>
  );
}
