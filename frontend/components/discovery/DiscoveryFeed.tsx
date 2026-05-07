"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDiscoveryFeed } from "@/hooks/useDiscoveryFeed";
import { useForkLayout } from "@/hooks/useForkLayout";
import { LayoutCard } from "./LayoutCard";
import { LayoutCardSkeleton } from "./LayoutCardSkeleton";
import { EmptyDiscovery } from "./EmptyDiscovery";
import { SearchBar } from "./SearchBar";
import { PreviewModal } from "./PreviewModal";
import { EventTypeFilter } from "./EventTypeFilter";
import type { DiscoveryLayout, EventType } from "@/types/types";

const SORT_LABELS = {
  trending:    "Trending",
  newest:      "Newest",
  most_forked: "Most Used",
  most_saved:  "Most Saved",
} as const;

export function DiscoveryFeed() {
  const {
    layouts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    filters,
    setFilter,
    resetFilters,
    loadMore,
    refetch,
  } = useDiscoveryFeed();

  const { fork, forkingId } = useForkLayout();
  const [preview, setPreview] = useState<DiscoveryLayout | null>(null);

  const hasActiveFilter = Boolean(filters.eventType || filters.query);

  // Derive empty state reason
  const emptyReason = (() => {
    if (filters.query) return "no_results" as const;
    if (filters.eventType) return "filtered_empty" as const;
    return "no_community_layouts" as const;
  })();

  return (
    <div className="flex flex-col gap-5">

      {/* Search bar */}
      <SearchBar
        value={filters.query}
        onSearch={(q) => setFilter("query", q)}
        onClear={() => setFilter("query", "")}
      />

      {/* Filter row: event type pills + sort */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <EventTypeFilter
            selected={filters.eventType}
            onChange={(v) => setFilter("eventType", v as EventType | null)}
          />
        </div>
        <select
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value as typeof filters.sort)}
          className="shrink-0 h-8 px-2.5 text-xs border border-[#dfe8e4] rounded-lg
                     bg-white text-[#314a43] outline-none
                     focus-visible:ring-2 focus-visible:ring-[#5d7f73]"
        >
          {(Object.keys(SORT_LABELS) as Array<keyof typeof SORT_LABELS>).map((key) => (
            <option key={key} value={key}>{SORT_LABELS[key]}</option>
          ))}
        </select>
      </div>

      {/* Result count (once loaded) */}
      {!isLoading && !error && totalCount > 0 && (
        <p className="text-xs text-[#9ca8a3]">
          {totalCount} layout{totalCount !== 1 ? "s" : ""}
          {filters.eventType ? ` for ${filters.eventType.replace(/_/g, " ")}` : ""}
          {filters.query ? ` matching "${filters.query}"` : ""}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="py-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm text-[#5d7f73] underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <LayoutCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && layouts.length === 0 && (
        <EmptyDiscovery
          reason={emptyReason}
          activeFilter={filters.eventType}
          query={filters.query}
          onClear={resetFilters}
        />
      )}

      {/* Card grid */}
      {!isLoading && !error && layouts.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {layouts.map((layout) => (
              <LayoutCard
                key={layout.id}
                layout={layout}
                onFork={fork}
                onPreview={setPreview}
                isForkingThis={forkingId === layout.projectId}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-2.5 border border-[#dfe8e4]
                           rounded-[10px] text-sm font-medium text-[#314a43]
                           hover:bg-[#f5f7f5] disabled:opacity-50 transition-colors"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more layouts"
                )}
              </button>
            </div>
          )}

          {/* Clear filters link when filtered */}
          {hasActiveFilter && (
            <div className="text-center">
              <button
                onClick={resetFilters}
                className="text-xs text-[#9ca8a3] hover:text-[#5d7f73] transition-colors underline underline-offset-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          layout={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
