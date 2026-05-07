"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/UseEditorStore";
import { usePublishLayout } from "@/hooks/usePublishLayout";
import { PublishForm, type PublishFormData } from "./PublishForm";
import type { EventType } from "@/types/types";

export function PublishDrawer() {
  const open        = useEditorStore((s) => s.publishDrawerOpen);
  const closeDrawer = useEditorStore((s) => s.setPublishDrawerOpen);
  const project     = useEditorStore((s) => s.project);
  const publishError = useEditorStore((s) => s.publishError);

  const { publish, unpublish, isPublishing } = usePublishLayout();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeDrawer]);

  if (!project) return null;

  const listing    = project.publishedListing;
  const isPublished = project.publishState === "PUBLISHED_CLEAN" || project.publishState === "PUBLISHED_DIRTY";

  const handlePublish = async (data: PublishFormData) => {
    await publish(data);
  };

  const handleUnpublish = async () => {
    if (!confirm("Remove this layout from the public feed? It will become private again.")) return;
    await unpublish();
    closeDrawer(false);
  };

  const initialValues = {
    title:              listing?.title      ?? project.name,
    tagline:            listing?.tagline    ?? "",
    event_type:         (listing?.eventType ?? project.eventType ?? "") as EventType | "",
    theme:              listing?.theme      ?? "",
    tags:               listing?.tags       ?? project.tags ?? [],
    estimated_capacity: listing?.estimatedCapacity ?? null,
    cover_image_url:    listing?.coverImageUrl ?? "",
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => closeDrawer(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50
          flex flex-col transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              {isPublished ? "Update Public Listing" : "Publish Layout"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isPublished
                ? "Edit your public listing details and re-publish."
                : "Share this layout with the planning community."}
            </p>
          </div>
          <button
            onClick={() => closeDrawer(false)}
            className="text-zinc-400 hover:text-zinc-700 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Moderation notice */}
        {listing?.moderationStatus === "PENDING" && (
          <div className="mx-5 mt-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 font-medium">Under review</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your layout is pending approval and not yet visible in the community feed.
            </p>
          </div>
        )}

        {listing?.moderationStatus === "REJECTED" && (
          <div className="mx-5 mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800 font-medium">Not approved</p>
            <p className="text-xs text-red-700 mt-0.5">
              You can update the listing and re-submit for review.
            </p>
          </div>
        )}

        {/* Publish error */}
        {publishError && (
          <div className="mx-5 mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{publishError}</p>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PublishForm
            initial={initialValues}
            onSubmit={handlePublish}
            isLoading={isPublishing}
            submitLabel={
              isPublished
                ? "Update Public Listing"
                : "Publish to Community"
            }
          />
        </div>

        {/* Unpublish footer */}
        {isPublished && (
          <div className="px-5 py-3 border-t border-zinc-100">
            <button
              onClick={handleUnpublish}
              disabled={isPublishing}
              className="w-full py-2 text-xs text-red-500 hover:text-red-700
                         border border-red-200 hover:border-red-400 rounded-lg
                         transition-colors disabled:opacity-40"
            >
              Remove from public feed
            </button>
          </div>
        )}
      </div>
    </>
  );
}
