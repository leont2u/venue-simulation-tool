"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
      <div>
        <div className="text-2xl font-semibold tracking-tight text-white">
          Leon Manhimanzi
        </div>
        <div className="text-xs uppercase tracking-[0.32em] text-zinc-500">
          3D Venue Simulation Tool
        </div>
      </div>

      <nav className="hidden items-center gap-10 text-lg text-zinc-300 md:flex">
        <a href="#" className="transition hover:text-white">
          Home
        </a>
        <a href="#" className="transition hover:text-white">
          Our Service
        </a>
        <a href="#" className="transition hover:text-white">
          Why Us
        </a>
      </nav>

      <Link
        href="/dashboard"
        className="rounded-2xl bg-green-500 px-4 py-2 text-lg font-medium text-white transition hover:bg-green-400"
      >
        Log in
      </Link>
    </header>
  );
}
