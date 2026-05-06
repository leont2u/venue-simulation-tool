import { apiClient } from "@/lib/apiClient";
import { Project } from "@/types/types";

const STRUCTURED_IMPORT_EXTENSIONS = /\.(drawio|xml|html|htm)$/i;
const FLOORPLAN_IMPORT_EXTENSIONS = /\.(png|jpe?g|pdf)$/i;

export async function createProjectFromDrawioFile(
  file: File,
  name?: string,
): Promise<Project> {
  const endpoint = STRUCTURED_IMPORT_EXTENSIONS.test(file.name)
    ? "/api/imports/drawio/"
    : FLOORPLAN_IMPORT_EXTENSIONS.test(file.name)
      ? "/api/imports/floorplan/"
      : "";

  if (!endpoint) {
    throw new Error("Unsupported import type. Upload draw.io, XML, HTML, PNG, JPG, or PDF.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (name?.trim()) {
    formData.append("name", name.trim());
  }

  const response = await apiClient.post<Project>(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
