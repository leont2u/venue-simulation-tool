"use client";

import Link from "next/link";
import { ArrowRight, Layers3, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function LandingCta() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-20 md:py-24 bg-[#17211e]">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 text-center">

        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#7aab97] mb-4">
          Start planning today
        </p>

        <h2 className="text-[32px] md:text-[44px] font-bold text-white tracking-[-0.03em] leading-[1.1] max-w-[640px] mx-auto">
          Your next event layout is one prompt away
        </h2>

        <p className="mt-5 text-[16px] md:text-[17px] text-[#8fa89f] leading-relaxed max-w-[520px] mx-auto">
          Describe the venue, upload a floor plan, or browse what other planners have already built.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={isAuthenticated ? "/dashboard" : "/register"}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#5d7f73] hover:bg-[#4e7165] text-white text-[15px] font-semibold rounded-[10px] transition-colors shadow-[0_2px_12px_rgba(93,127,115,0.35)]"
          >
            <Layers3 size={16} strokeWidth={2.5} />
            {isAuthenticated ? "Go to Dashboard" : "Start for free"}
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>

          <Link
            href="/discover"
            className="flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white text-[15px] font-semibold rounded-[10px] transition-colors border border-white/10"
          >
            <Search size={15} strokeWidth={2.5} />
            Browse community layouts
          </Link>
        </div>

        <p className="mt-7 text-[12px] text-[#5a726a]">
          No credit card required · Free to start · Layouts save automatically
        </p>
      </div>
    </section>
  );
}
