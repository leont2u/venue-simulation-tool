import { apiClient } from "./apiClient";

export async function uploadProjectThumbnail(
  projectId: string,
  onSuccess?: (url: string) => void,
): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas");
  if (!canvas) return;
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const res = await apiClient.post<{ url: string }>("/api/community/thumbnails/", {
      data_url:   dataUrl,
      project_id: projectId,
    });
    const url = res.data?.url;
    if (url) onSuccess?.(url);
  } catch {
    // Non-fatal — thumbnail failure must never block saves or publishing
  }
}
