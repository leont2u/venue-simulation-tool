"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";

export function Navbar() {
  const { isAuthenticated, isHydrating, user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const unread = user?.unreadNotifications ?? 0;

  return (
    <header className="relative z-50 bg-[#fbfcfb]">
      <div className="mx-auto flex h-20.5 w-full max-w-7xl items-center gap-5 px-6 md:px-10">
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
          <a className="text-[15px] font-medium text-[#314a43]" href="#features">
            Features
          </a>
          <a className="text-[15px] font-medium text-[#314a43]" href="#how-it-works">
            How It Works
          </a>
          <a className="text-[15px] font-medium text-[#314a43]" href="#templates">
            Templates
          </a>
          <Link
            href="/discover"
            className="text-[15px] font-medium text-[#314a43] hover:text-[#5d7f73] transition-colors"
          >
            Discover
          </Link>
        </nav>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                className="relative w-9 h-9 flex items-center justify-center rounded-lg
                           text-[#657872] hover:bg-[#f0f4f2] transition-colors"
              >
                <Bell size={18} strokeWidth={2} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center
                                   rounded-full bg-[#5d7f73] text-white text-[9px] font-bold leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              <NotificationDropdown
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
              />
            </div>

            <Link
              href="/dashboard"
              className="rounded-lg bg-[#4f796f] px-5 py-3 text-[15px] font-semibold text-white
                         shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition hover:bg-[#416b61]"
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-3 text-[15px] font-semibold text-[#314a43]
                         transition hover:text-[#416b61] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              aria-disabled={isHydrating}
              className="rounded-lg bg-[#4f796f] px-5 py-3 text-[15px] font-semibold text-white
                         shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition hover:bg-[#416b61]"
            >
              Start Free
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
