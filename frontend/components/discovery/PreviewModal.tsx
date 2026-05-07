"use client";

import { useEffect, useRef } from "react";
import { X, Heart, GitFork, Bookmark, Users, Tag } from "lucide-react";
import { useForkLayout } from "@/hooks/useForkLayout";
import { EVENT_TYPE_LABELS } from "@/types/types";
import type { DiscoveryLayout } from "@/types/types";
import Image from "next/image";

const EVENT_TYPE_COLORS: Record<string, string> = {
  wedding: "bg-[#f9ece9] text-[#c4736a]",
  funeral: "bg-[#f0f0f0] text-[#6b7280]",
  conference: "bg-[#e8f0f7] text-[#4a7fa5]",
  concert: "bg-[#f0ecf9] text-[#7c5cbf]",
  church_service: "bg-[#f4efea] text-[#8b7355]",
  gala: "bg-[#f5eedf] text-[#b07d3a]",
  graduation: "bg-[#e8f4f2] text-[#3a7a6b]",
  agm: "bg-[#e8f0f7] text-[#4a6fa5]",
  birthday: "bg-[#faeee6] text-[#d4855a]",
  corporate_dinner: "bg-[#e8f0f7] text-[#4a6fa5]",
  product_launch: "bg-[#f0ecf9] text-[#7c5cbf]",
  memorial: "bg-[#f0f0f0] text-[#6b7280]",
  engagement: "bg-[#f9ece9] text-[#c4736a]",
  award_ceremony: "bg-[#f5eedf] text-[#b07d3a]",
  fundraiser: "bg-[#e8f4f2] text-[#3a7a6b]",
  livestream: "bg-[#f0ecf9] text-[#7c5cbf]",
  exhibition: "bg-[#e8f0f7] text-[#4a7fa5]",
  other: "bg-[#f0f4f2] text-[#657872]",
};

type Props = {
  layout: DiscoveryLayout;
  onClose: () => void;
};

export function PreviewModal({ layout, onClose }: Props) {
  const { fork, forkingId } = useForkLayout();
  const overlayRef = useRef<HTMLDivElement>(null);
  const isForkingThis = forkingId === layout.projectId;
  const eventColor =
    EVENT_TYPE_COLORS[layout.eventType] ?? EVENT_TYPE_COLORS.other;
  const eventLabel = EVENT_TYPE_LABELS[layout.eventType] ?? layout.eventType;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-[20px] shadow-[0_24px_80px_rgba(32,43,40,0.22)]
                   w-full max-w-3xl overflow-hidden
                   animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center
                     rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left: image */}
          <div className="md:w-[55%] bg-[#f0f4f2] shrink-0">
            {layout.coverImageUrl ? (
              <Image
                src={layout.coverImageUrl}
                alt={layout.title}
                width={1200}
                height={800}
                className="w-full h-full object-cover aspect-video md:aspect-auto md:h-full min-h-55"
              />
            ) : (
              <div
                className="w-full aspect-video md:aspect-auto md:h-full min-h-55
                 flex items-center justify-center"
              >
                <span className="text-[#9ca8a3] text-sm">No preview image</span>
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto max-h-[90vh] md:max-h-none">
            {/* Event type pill */}
            <span
              className={`self-start px-2.5 py-0.5 rounded-full text-xs font-semibold ${eventColor}`}
            >
              {eventLabel}
            </span>

            {/* Title + tagline */}
            <div>
              <h2 className="text-[17px] font-bold text-[#17211e] leading-snug tracking-[-0.02em]">
                {layout.title}
              </h2>
              {layout.tagline && (
                <p className="text-sm text-[#657872] mt-1.5 leading-relaxed">
                  {layout.tagline}
                </p>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 py-3 border-y border-[#edf0ee]">
              <div className="flex items-center gap-1.5 text-xs text-[#657872]">
                <GitFork size={13} strokeWidth={2} />
                <span className="font-semibold text-[#314a43]">
                  {layout.forkCount}
                </span>{" "}
                uses
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#657872]">
                <Heart size={13} strokeWidth={2} />
                <span className="font-semibold text-[#314a43]">
                  {layout.likeCount}
                </span>{" "}
                likes
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#657872]">
                <Bookmark size={13} strokeWidth={2} />
                <span className="font-semibold text-[#314a43]">
                  {layout.saveCount}
                </span>{" "}
                saved
              </div>
              {layout.estimatedCapacity && (
                <div className="flex items-center gap-1.5 text-xs text-[#657872]">
                  <Users size={13} strokeWidth={2} />
                  <span className="font-semibold text-[#314a43]">
                    {layout.estimatedCapacity}
                  </span>{" "}
                  pax
                </div>
              )}
            </div>

            {/* Publisher */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full bg-[#d4e3de] flex items-center justify-center
                              text-xs font-bold text-[#5d7f73] shrink-0"
              >
                {layout.publisher.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-[#9ca8a3]">Created by</p>
                <p className="text-sm font-semibold text-[#314a43] leading-tight">
                  {layout.publisher.name}
                </p>
              </div>
            </div>

            {/* Tags */}
            {layout.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {layout.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#f0f4f2] text-[#5d7f73]
                               text-xs rounded-full"
                  >
                    <Tag size={9} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="mt-auto pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  fork(layout.projectId);
                  onClose();
                }}
                disabled={isForkingThis}
                className="w-full py-3 bg-[#5d7f73] hover:bg-[#4e7165] disabled:opacity-50
                           text-white text-[15px] font-semibold rounded-xl
                           transition-colors flex items-center justify-center gap-2"
              >
                {isForkingThis ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-white/30 border-t-white
                                     rounded-full animate-spin"
                    />
                    Duplicating…
                  </>
                ) : (
                  "Use this layout"
                )}
              </button>
              <p className="text-center text-xs text-[#9ca8a3]">
                Creates a private copy in your workspace. The original stays
                unchanged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
