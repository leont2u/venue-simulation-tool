import { apiClient } from "@/lib/apiClient";
import { Project } from "@/types/types";

export async function createShareToken(projectId: string) {
  const response = await apiClient.post<{ token: string }>(
    `/api/projects/${projectId}/share/`,
    {},
  );
  return response.data.token;
}

export async function getSharedProjectByToken(token: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/api/projects/shared/${token}/`);
  return response.data;
}
