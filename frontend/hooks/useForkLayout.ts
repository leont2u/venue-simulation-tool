"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

export function useForkLayout() {
  const router               = useRouter();
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const fork = useCallback(async (projectId: string) => {
    if (forkingId) return;
    setForkingId(projectId);
    setError(null);

    try {
      const res = await apiClient.post(`/api/community/layouts/${projectId}/fork/`);
      const { id: newProjectId } = res.data as { id: string; name: string };

      // Navigate immediately — the editor handles its own loading state.
      // ?fork=true lets the editor show a "this is your private copy" toast.
      router.push(`/editor/${newProjectId}?fork=true`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not duplicate this layout.");
    } finally {
      setForkingId(null);
    }
  }, [forkingId, router]);

  return { fork, forkingId, error };
}
