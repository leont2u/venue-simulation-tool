"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--sf-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[52px] w-full max-w-[1400px] items-center gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--sf-text)] text-[10px] font-semibold text-white">
            SF
          </div>
          <div className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
            SpaceForge
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <a
            href="#pipelines"
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-muted)] hover:text-[var(--sf-text)]"
          >
            Pipelines
          </a>
          <a
            href="#features"
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-muted)] hover:text-[var(--sf-text)]"
          >
            Features
          </a>
          <a
            href="#launch"
            className="rounded-md px-3 py-1.5 text-[13px] text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-muted)] hover:text-[var(--sf-text)]"
          >
            Launch
          </a>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-muted)] hover:text-[var(--sf-text)]"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-[var(--sf-text)] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#333333]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
