"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* subtle backdrop + border */}
      <div className="border-b border-gray-100 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left: brand */}
            <Link href="/" className="group flex items-center gap-2">
              <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gray-900 text-white shadow-sm">
                {/* simple “VR” mark */}
                <span className="text-xs font-bold tracking-widest">VR</span>

                {/* tiny corner accent */}
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-white" />
              </div>

              <div className="leading-tight">
                <p className="text-sm font-extrabold tracking-tight text-gray-900">
                  VenueSim
                </p>
                <p className="text-xs text-gray-500 group-hover:text-gray-700">
                  VR venue planner
                </p>
              </div>
            </Link>

            {/* Center: nav (desktop) */}
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Right: actions */}
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/auth"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Sign in
              </Link>

              <Link
                href="/auth"
                className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Launch workspace
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 md:hidden"
              aria-label="Toggle menu"
            >
              {open ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile dropdown */}
          {open && (
            <div className="pb-4 md:hidden">
              <div className="mt-2 space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {l.label}
                  </Link>
                ))}

                <div className="my-2 h-px bg-gray-100" />

                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                >
                  Sign in
                </Link>

                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Launch workspace
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* small accent line (unique touch) */}
      <div className="h-0.5 w-full bg-linear-to-r from-indigo-600/0 via-indigo-600/40 to-indigo-600/0" />
    </header>
  );
}
