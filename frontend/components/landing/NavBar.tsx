"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function Navbar() {
  const { isAuthenticated, isHydrating } = useAuth();

  return (
    <header className="relative z-50 bg-[#fbfcfb]">
      <div className="mx-auto flex h-[82px] w-full max-w-[1280px] items-center gap-5 px-6 md:px-10">
        <Link href="/" className="leading-tight">
          <div className="text-[21px] font-semibold tracking-[-0.03em] text-[#0f1714]">
            Leon Manhimanzi
          </div>
          <div className="mt-1 text-[13px] font-medium uppercase tracking-[0.16em] text-[#516660]">
            Venue Simulation Tool
          </div>
        </Link>

        <div className="flex-1" />

        <nav className="hidden items-center gap-9 md:flex">
          <a
            className="text-[15px] font-medium text-[#314a43]"
            href="#features"
          >
            Features
          </a>
          <a
            className="text-[15px] font-medium text-[#314a43]"
            href="#how-it-works"
          >
            How It Works
          </a>
          <a
            className="text-[15px] font-medium text-[#314a43]"
            href="#templates"
          >
            Templates
          </a>
        </nav>

        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="rounded-[8px] bg-[#4f796f] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition hover:bg-[#416b61]"
          >
            Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-[8px]  px-4 py-3 text-[15px] font-semibold text-[#314a43] transition hover:text-[#416b61] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              aria-disabled={isHydrating}
              className="rounded-[8px] bg-[#4f796f] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition hover:bg-[#416b61]"
            >
              Start Free
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
