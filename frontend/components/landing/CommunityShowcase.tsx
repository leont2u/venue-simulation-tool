"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitFork, Heart } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useForkLayout } from "@/hooks/useForkLayout";
import type { DiscoveryLayout, EventType } from "@/types/types";
import { EVENT_TYPE_LABELS } from "@/types/types";

const TABS: Array<{ key: EventType | "all"; label: string }> = [
  { key: "all",        label: "Trending" },
  { key: "wedding",    label: "Weddings" },
  { key: "conference", label: "Conferences" },
  { key: "funeral",    label: "Funerals" },
  { key: "concert",    label: "Concerts" },
];

const EVENT_BG: Record<string, string> = {
  wedding:    "bg-[#f9ece9] text-[#c4736a]",
  conference: "bg-[#e8f0f7] text-[#4a7fa5]",
  funeral:    "bg-[#f0f0f0] text-[#6b7280]",
  concert:    "bg-[#f0ecf9] text-[#7c5cbf]",
  other:      "bg-[#f0f4f2] text-[#657872]",
};

function ShowcaseCard({ layout, onFork, isForkingThis }: {
  layout: DiscoveryLayout;
  onFork: (id: string) => void;
  isForkingThis: boolean;
}) {
  const color = EVENT_BG[layout.eventType] ?? EVENT_BG.other;
  const label = EVENT_TYPE_LABELS[layout.eventType] ?? layout.eventType;

  return (
    <div className="group rounded-[14px] overflow-hidden border border-[#e9eeee] bg-white
                    shadow-[0_1px_8px_rgba(32,43,40,0.05)] transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(32,43,40,0.11)]">
      <div className="relative aspect-video overflow-hidden bg-[#f0f4f2]">
        {layout.coverImageUrl ? (
          <img
            src={layout.coverImageUrl}
            alt={layout.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#9ca8a3] text-xs">No preview</span>
          </div>
        )}
        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
          {label}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-2">
        <p className="text-[13.5px] font-semibold text-[#17211e] line-clamp-1 tracking-[-0.01em]">
          {layout.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9ca8a3] truncate">{layout.publisher.name}</span>
          <div className="flex items-center gap-2.5 shrink-0">
            {layout.forkCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
                <GitFork size={10} strokeWidth={2} /> {layout.forkCount}
              </span>
            )}
            {layout.likeCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
                <Heart size={10} strokeWidth={2} /> {layout.likeCount}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onFork(layout.projectId)}
          disabled={isForkingThis}
          className="mt-1 w-full py-2 text-xs font-semibold text-[#5d7f73] border border-[#c8d8d2]
                     rounded-[8px] hover:bg-[#f0f4f2] disabled:opacity-50 transition-colors"
        >
          {isForkingThis ? "Duplicating…" : "Use this layout"}
        </button>
      </div>
    </div>
  );
}

export function CommunityShowcase() {
  const [activeTab, setActiveTab] = useState<EventType | "all">("all");
  const [layouts, setLayouts]     = useState<DiscoveryLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { fork, forkingId }       = useForkLayout();

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({ sort: "trending", page_size: "4" });
    if (activeTab !== "all") params.set("event_type", activeTab);

    apiClient
      .get<{ results: DiscoveryLayout[] }>(`/api/community/discovery/layouts/?${params}`)
      .then((r) => setLayouts(r.data.results ?? []))
      .catch(() => setLayouts([]))
      .finally(() => setIsLoading(false));
  }, [activeTab]);

  if (!isLoading && layouts.length === 0 && activeTab === "all") return null;

  return (
    <section className="py-16 md:py-20 bg-[#fbfcfb]">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-[#5d7f73] mb-2">
              Community
            </p>
            <h2 className="text-[26px] md:text-[32px] font-bold text-[#17211e] tracking-[-0.03em]">
              What planners are building
            </h2>
          </div>
          <Link
            href="/discover"
            className="flex items-center gap-1.5 text-sm font-semibold text-[#5d7f73]
                       hover:text-[#4e7165] transition-colors shrink-0"
          >
            See all layouts <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[#17211e] text-white"
                  : "bg-white border border-[#dfe8e4] text-[#314a43] hover:bg-[#f5f7f5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[14px] overflow-hidden border border-[#e9eeee] bg-white">
                <div className="aspect-video bg-[#f0f4f2] animate-pulse" />
                <div className="p-3.5 flex flex-col gap-2.5">
                  <div className="h-3.5 bg-[#f0f4f2] rounded animate-pulse w-4/5" />
                  <div className="h-2.5 bg-[#f0f4f2] rounded animate-pulse w-1/2" />
                  <div className="h-8 bg-[#f0f4f2] rounded-lg animate-pulse mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : layouts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {layouts.map((layout) => (
              <ShowcaseCard
                key={layout.id}
                layout={layout}
                onFork={fork}
                isForkingThis={forkingId === layout.projectId}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-[#dfe8e4] rounded-[14px]">
            <p className="text-sm text-[#9ca8a3]">
              No layouts yet for this category.{" "}
              <Link href="/dashboard" className="text-[#5d7f73] underline underline-offset-2">
                Be the first to publish one.
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
