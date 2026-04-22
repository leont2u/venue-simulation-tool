"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50  backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-[#2F3E46]">
            Leon Manhimanzi
          </div>
          <div className="text-xs uppercase tracking-[0.32em] text-[#52796F]">
            3D Venue Simulation Tool
          </div>
        </div>

        <nav className="hidden items-center gap-10 text-base text-[#354F52] md:flex">
          <a href="#features" className="transition hover:text-[#2F3E46]">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-[#2F3E46]">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl px-4 py-2 text-sm font-medium text-[#354F52] transition hover:text-[#2F3E46]"
          >
            Log in
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl bg-[#84A98C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#52796F]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
