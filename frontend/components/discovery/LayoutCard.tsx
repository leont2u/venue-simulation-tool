"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Bookmark, GitFork, Heart } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { EVENT_TYPE_LABELS } from "@/types/types";
import type { DiscoveryLayout } from "@/types/types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  wedding:          "bg-[#f9ece9] text-[#c4736a]",
  funeral:          "bg-[#f0f0f0] text-[#6b7280]",
  conference:       "bg-[#e8f0f7] text-[#4a7fa5]",
  concert:          "bg-[#f0ecf9] text-[#7c5cbf]",
  church_service:   "bg-[#f4efea] text-[#8b7355]",
  gala:             "bg-[#f5eedf] text-[#b07d3a]",
  graduation:       "bg-[#e8f4f2] text-[#3a7a6b]",
  agm:              "bg-[#e8f0f7] text-[#4a6fa5]",
  birthday:         "bg-[#faeee6] text-[#d4855a]",
  corporate_dinner: "bg-[#e8f0f7] text-[#4a6fa5]",
  product_launch:   "bg-[#f0ecf9] text-[#7c5cbf]",
  memorial:         "bg-[#f0f0f0] text-[#6b7280]",
  engagement:       "bg-[#f9ece9] text-[#c4736a]",
  award_ceremony:   "bg-[#f5eedf] text-[#b07d3a]",
  fundraiser:       "bg-[#e8f4f2] text-[#3a7a6b]",
  livestream:       "bg-[#f0ecf9] text-[#7c5cbf]",
  exhibition:       "bg-[#e8f0f7] text-[#4a7fa5]",
  other:            "bg-[#f0f4f2] text-[#657872]",
};

type Props = {
  layout:        DiscoveryLayout;
  onFork:        (projectId: string) => void;
  onPreview:     (layout: DiscoveryLayout) => void;
  isForkingThis: boolean;
};

export function LayoutCard({ layout, onFork, onPreview, isForkingThis }: Props) {
  const [saved, setSaved]       = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const eventColor = EVENT_TYPE_COLORS[layout.eventType] ?? EVENT_TYPE_COLORS.other;
  const eventLabel = EVENT_TYPE_LABELS[layout.eventType] ?? layout.eventType;

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) {
        await apiClient.post(`/api/community/layouts/${layout.projectId}/save/`);
      } else {
        await apiClient.delete(`/api/community/layouts/${layout.projectId}/save/`);
      }
    } catch {
      setSaved(!next); // rollback
    } finally {
      setIsSaving(false);
    }
  }, [saved, isSaving, layout.projectId]);

  const handleFork = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFork(layout.projectId);
  }, [onFork, layout.projectId]);

  return (
    <article
      onClick={() => onPreview(layout)}
      className="
        group relative flex flex-col rounded-[14px] overflow-hidden bg-white cursor-pointer
        border border-[#e9eeee] shadow-[0_1px_8px_rgba(32,43,40,0.05)]
        transition-all duration-200 hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgba(32,43,40,0.11)] hover:border-[#c8d8d2]
      "
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-[#f0f4f2]">
        {layout.coverImageUrl ? (
          <img
            src={layout.coverImageUrl}
            alt={`${layout.title} layout thumbnail`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#9ca8a3] text-xs">No preview</span>
          </div>
        )}

        {/* Event type pill — top left */}
        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${eventColor}`}>
          {eventLabel}
        </span>

        {/* Save button — top right, appears on hover */}
        <button
          onClick={handleSave}
          aria-label={saved ? "Remove from saved" : "Save layout"}
          className={`
            absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full
            transition-all duration-150
            ${saved
              ? "bg-[#5d7f73] text-white opacity-100"
              : "bg-white/90 text-[#657872] opacity-0 group-hover:opacity-100"
            }
            hover:scale-110 active:scale-95
          `}
        >
          <Bookmark size={13} strokeWidth={2.2} fill={saved ? "currentColor" : "none"} />
        </button>

        {/* Hover overlay — fork CTA */}
        <div
          className="
            absolute inset-0 flex flex-col items-center justify-center gap-2
            bg-linear-to-t from-[#17211e]/70 via-[#17211e]/20 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
          "
        >
          <button
            onClick={handleFork}
            disabled={isForkingThis}
            className="
              flex items-center gap-2 px-4 py-2 bg-white text-[#17211e] text-xs font-semibold
              rounded-full shadow-lg hover:bg-[#f5f7f5] disabled:opacity-60
              transition-colors duration-150
            "
          >
            {isForkingThis ? (
              <>
                <span className="w-3 h-3 border-2 border-[#9ca8a3] border-t-[#5d7f73] rounded-full animate-spin" />
                Duplicating…
              </>
            ) : (
              <>
                <GitFork size={12} strokeWidth={2.5} />
                Use this layout
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1.5 p-3.5 flex-1">
        <p className="text-[13.5px] font-semibold text-[#17211e] leading-snug line-clamp-1 tracking-[-0.01em]">
          {layout.title}
        </p>
        {layout.tagline && (
          <p className="text-xs text-[#657872] leading-snug line-clamp-2">
            {layout.tagline}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 pb-3 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar initial */}
          <div className="w-5 h-5 rounded-full bg-[#d4e3de] flex items-center justify-center
                          text-[10px] font-bold text-[#5d7f73] shrink-0">
            {layout.publisher.name.charAt(0).toUpperCase()}
          </div>
          {layout.publisher.handle ? (
            <Link
              href={`/planners/${layout.publisher.handle}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[#657872] truncate hover:text-[#5d7f73] transition-colors"
            >
              {layout.publisher.name}
            </Link>
          ) : (
            <span className="text-xs text-[#657872] truncate">{layout.publisher.name}</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {layout.forkCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
              <GitFork size={10} strokeWidth={2} />
              {layout.forkCount}
            </span>
          )}
          {layout.likeCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
              <Heart size={10} strokeWidth={2} />
              {layout.likeCount}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
