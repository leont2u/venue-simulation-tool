"use client";

import { Layers3, Search, SlidersHorizontal } from "lucide-react";
import type { EventType } from "@/types/types";
import { EVENT_TYPE_LABELS } from "@/types/types";

type Reason = "no_results" | "no_community_layouts" | "filtered_empty";

type Props = {
  reason: Reason;
  activeFilter: EventType | null;
  query: string;
  onClear: () => void;
  onGenerate?: (prompt: string) => void;
};

export function EmptyDiscovery({
  reason,
  activeFilter,
  query,
  onClear,
}: Props) {
  if (reason === "no_community_layouts") {
    return (
      <div className="flex flex-col items-center py-20 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#f0f4f2] flex items-center justify-center">
          <Layers3 size={24} className="text-[#5d7f73]" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#17211e]">
            No layouts published yet
          </p>
          <p className="text-sm text-[#657872] mt-1 max-w-xs">
            Be the first to publish a layout to the community.
          </p>
        </div>
        <a
          href="/dashboard"
          className="mt-2 px-5 py-2.5 bg-[#5d7f73] text-white text-sm font-semibold rounded-[10px]
                     hover:bg-[#4e7165] transition-colors"
        >
          Create a layout →
        </a>
      </div>
    );
  }

  if (reason === "filtered_empty" && activeFilter) {
    const label = EVENT_TYPE_LABELS[activeFilter] ?? activeFilter;
    return (
      <div className="flex flex-col items-center py-20 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#f0f4f2] flex items-center justify-center">
          <SlidersHorizontal
            size={24}
            className="text-[#5d7f73]"
            strokeWidth={1.5}
          />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#17211e]">
            No {label.toLowerCase()} layouts yet
          </p>
          <p className="text-sm text-[#657872] mt-1 max-w-xs">
            Be the first to publish one for this event type.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={onClear}
            className="px-4 py-2 border border-[#dfe8e4] rounded-[10px] text-sm text-[#314a43]
                       hover:bg-[#f5f7f5] transition-colors"
          >
            See all layouts
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-[#5d7f73] text-white text-sm font-semibold rounded-[10px]
                       hover:bg-[#4e7165] transition-colors"
          >
            Create one →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-20 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[#f0f4f2] flex items-center justify-center">
        <Search size={24} className="text-[#5d7f73]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#17211e]">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm text-[#657872] mt-1 max-w-xs">
          Try different keywords or browse all layouts.
        </p>
      </div>
      <button
        onClick={onClear}
        className="mt-1 px-5 py-2.5 border border-[#dfe8e4] rounded-[10px] text-sm
                   text-[#314a43] hover:bg-[#f5f7f5] transition-colors"
      >
        Clear search
      </button>
    </div>
  );
}
