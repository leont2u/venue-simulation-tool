"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import {
  AcceptResponse,
  CVJobStatus,
  SceneGraphResponse,
  UploadResponse,
} from "@/types/venue-cv";

const POLL_INTERVAL_MS  = 2500;
const POLL_TIMEOUT_MS   = 5 * 60 * 1000; // stop after 5 minutes

// ── Upload helpers ────────────────────────────────────────────────────────────

export async function uploadVenueImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await apiClient.post<UploadResponse>(
    "/api/cv/upload/image/",
    form,
  );
  return data;
}

export async function uploadVenueImages(
  files: File[],
): Promise<UploadResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  const { data } = await apiClient.post<UploadResponse>(
    "/api/cv/upload/images/",
    form,
  );
  return data;
}

export async function uploadVenueVideo(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("video", file);
  const { data } = await apiClient.post<UploadResponse>(
    "/api/cv/upload/video/",
    form,
  );
  return data;
}

// ── Main polling hook ─────────────────────────────────────────────────────────

interface UsePipelineStatusReturn {
  status: CVJobStatus | null;
  sceneGraph: SceneGraphResponse | null;
  isComplete: boolean;
  isFailed: boolean;
  error: string | null;
  acceptScene: () => Promise<string>;
}

export function usePipelineStatus(
  jobId: string | null,
): UsePipelineStatusReturn {
  const [status, setStatus]         = useState<CVJobStatus | null>(null);
  const [sceneGraph, setSceneGraph] = useState<SceneGraphResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const { data } = await apiClient.get<CVJobStatus>(
        `/api/cv/jobs/${jobId}/status/`,
      );
      setStatus(data);

      if (data.status === "success") {
        stopPolling();
        const { data: sgData } = await apiClient.get<{ scene_graph: SceneGraphResponse }>(
          `/api/cv/jobs/${jobId}/scene-graph/`,
        );
        setSceneGraph(sgData.scene_graph);
      }

      if (data.status === "failed") {
        stopPolling();
        setError(data.error_message || "Pipeline failed.");
      }
    } catch {
      // Network error — keep polling until timeout
    }
  }, [jobId, stopPolling]);

  useEffect(() => {
    if (!jobId) return;
    setStatus(null);
    setSceneGraph(null);
    setError(null);
    startTimeRef.current = Date.now();

    fetchStatus();
    intervalRef.current = setInterval(() => {
      // Hard stop after POLL_TIMEOUT_MS — prevents infinite polling
      if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setError(
          "Pipeline timed out after 5 minutes. Make sure the Celery worker is running:\n" +
          "celery -A config worker -Q cpu,gpu,llm --loglevel=info",
        );
        return;
      }
      fetchStatus();
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [jobId, fetchStatus, stopPolling]);

  const acceptScene = useCallback(async (): Promise<string> => {
    if (!jobId) throw new Error("No active job");
    const { data } = await apiClient.post<AcceptResponse>(
      `/api/cv/jobs/${jobId}/accept/`,
    );
    return data.project_id;
  }, [jobId]);

  return {
    status,
    sceneGraph,
    isComplete: status?.status === "success",
    isFailed:   status?.status === "failed",
    error,
    acceptScene,
  };
}
