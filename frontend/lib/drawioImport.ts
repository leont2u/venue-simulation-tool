import { apiClient } from "@/lib/apiClient";
import { Project } from "@/types/types";

export async function createProjectFromDrawioFile(
  file: File,
  name?: string,
): Promise<Project> {
  const formData = new FormData();
  formData.append("file", file);
  if (name?.trim()) {
    formData.append("name", name.trim());
  }

  const response = await apiClient.post<Project>("/api/imports/drawio/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
