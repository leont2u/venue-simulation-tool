"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import type { DiscoveryLayout, EventType } from "@/types/types";

export type SortOption = "trending" | "newest" | "most_forked" | "most_saved";

export type DiscoveryFilters = {
  eventType: EventType | null;
  sort:      SortOption;
  query:     string;
};

const DEFAULT_FILTERS: DiscoveryFilters = {
  eventType: null,
  sort:      "trending",
  query:     "",
};

type PaginatedResponse = {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  DiscoveryLayout[];
};

export type UseDiscoveryFeedReturn = {
  layouts:       DiscoveryLayout[];
  isLoading:     boolean;
  isLoadingMore: boolean;
  error:         string | null;
  hasMore:       boolean;
  totalCount:    number;
  filters:       DiscoveryFilters;
  setFilter:     <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => void;
  resetFilters:  () => void;
  loadMore:      () => void;
  refetch:       () => void;
};

export function useDiscoveryFeed(): UseDiscoveryFeedReturn {
  const [layouts, setLayouts]           = useState<DiscoveryLayout[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [hasMore, setHasMore]           = useState(false);
  const [totalCount, setTotalCount]     = useState(0);
  const [filters, setFilters]           = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [page, setPage]                 = useState(1);

  // Track current fetch so stale responses from previous filters are ignored
  const fetchIdRef = useRef(0);

  const buildParams = useCallback(
    (f: DiscoveryFilters, p: number) => {
      const params = new URLSearchParams();
      if (f.eventType) params.set("event_type", f.eventType);
      if (f.sort)      params.set("sort", f.sort);
      if (f.query)     params.set("q", f.query);
      params.set("page", String(p));
      return params.toString();
    },
    [],
  );

  const fetchPage = useCallback(
    async (f: DiscoveryFilters, p: number, append: boolean) => {
      const fetchId = ++fetchIdRef.current;

      if (append) setIsLoadingMore(true);
      else        setIsLoading(true);

      setError(null);

      try {
        const res = await apiClient.get<PaginatedResponse>(
          `/api/community/discovery/layouts/?${buildParams(f, p)}`,
        );

        // Discard if a newer fetch has started
        if (fetchId !== fetchIdRef.current) return;

        const data = res.data;
        setLayouts((prev) => (append ? [...prev, ...data.results] : data.results));
        setHasMore(Boolean(data.next));
        setTotalCount(data.count ?? 0);
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        setError("Could not load layouts. Please try again.");
      } finally {
        if (fetchId !== fetchIdRef.current) return;
        if (append) setIsLoadingMore(false);
        else        setIsLoading(false);
      }
    },
    [buildParams],
  );

  // On filter change: reset to page 1, replace results
  useEffect(() => {
    setPage(1);
    fetchPage(filters, 1, false);
  }, [filters, fetchPage]);

  const setFilter = useCallback(
    <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(filters, nextPage, true);
  }, [isLoadingMore, hasMore, page, filters, fetchPage]);

  const refetch = useCallback(() => fetchPage(filters, 1, false), [filters, fetchPage]);

  return {
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
  };
}
