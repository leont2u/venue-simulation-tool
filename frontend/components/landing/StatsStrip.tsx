"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type Stats = {
  layoutCount:  number;
  plannerCount: number;
  forkCount:    number;
};

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    const start  = performance.now();
    const tick   = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setValue(Math.round(ease * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function StatItem({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref       = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const animated  = useCountUp(seen ? value : 0);

  useEffect(() => {
    const el  = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSeen(true); obs.disconnect(); } },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <span className="font-mono text-[32px] md:text-[40px] font-semibold text-[#17211e] tracking-[-0.03em] tabular-nums leading-none">
        {seen ? animated.toLocaleString() : "0"}{suffix}
      </span>
      <span className="text-[13px] text-[#657872]">{label}</span>
    </div>
  );
}

export function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiClient
      .get<Stats>("/api/community/stats/")
      .then((r) => setStats(r.data))
      .catch(() => {/* non-fatal — strip stays hidden */});
  }, []);

  // Show placeholder numbers during dev / if community has no data yet
  const data: Stats = stats ?? { layoutCount: 0, plannerCount: 0, forkCount: 0 };
  if (!stats) return null;

  return (
    <section className="border-y border-[#e9eeee] bg-white py-8">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-0 md:divide-x divide-[#e9eeee]">
          <StatItem value={data.layoutCount}  suffix="+"  label="Layouts published" />
          <StatItem value={data.plannerCount} suffix="+"  label="Event planners" />
          <div className="col-span-2 md:col-span-1">
            <StatItem value={data.forkCount}    suffix="×"  label="Layouts duplicated" />
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] text-[#9ca8a3] tracking-[0.06em] uppercase">
          Used by planners across Zimbabwe · Kenya · Nigeria · South Africa
        </p>
      </div>
    </section>
  );
}
