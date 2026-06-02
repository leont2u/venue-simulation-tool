"use client";

import { useCallback, useState } from "react";
import { useEditorStore } from "@/store/UseEditorStore";
import { apiClient } from "@/lib/apiClient";
import { uploadProjectThumbnail } from "@/lib/captureCanvas";
import type { PublishFormData } from "@/components/publishing/PublishForm";

export function usePublishLayout() {
  const project            = useEditorStore((s) => s.project);
  const updateListing      = useEditorStore((s) => s.updatePublishedListing);
  const closeDrawer        = useEditorStore((s) => s.setPublishDrawerOpen);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError]              = useState<string | null>(null);

  const publish = useCallback(async (formData: PublishFormData) => {
    if (!project) return;
    setIsPublishing(true);
    setError(null);

    let coverUrl = formData.cover_image_url;

    // Auto-capture 3D viewport as thumbnail if user didn't provide a URL
    if (!coverUrl) {
      await uploadProjectThumbnail(project.id, (url) => { coverUrl = url; });
    }

    try {
      const res = await apiClient.post(
        `/api/community/layouts/${project.id}/publish/`,
        { ...formData, cover_image_url: coverUrl },
      );

      // Sync store — triggers publishState recompute on next render
      updateListing(res.data);
      closeDrawer(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to publish. Please try again.";
      setError(msg);
      useEditorStore.setState({ publishError: msg });
    } finally {
      setIsPublishing(false);
    }
  }, [project, updateListing, closeDrawer]);

  const unpublish = useCallback(async () => {
    if (!project) return;
    setIsPublishing(true);

    // Optimistic: remove listing from store immediately
    const previousListing = project.publishedListing;
    updateListing(null);

    try {
      await apiClient.delete(`/api/community/layouts/${project.id}/publish/`);
    } catch {
      // Roll back on failure
      updateListing(previousListing ?? null);
    } finally {
      setIsPublishing(false);
    }
  }, [project, updateListing]);

  return { publish, unpublish, isPublishing, error };
}
