import { apiClient } from "@/lib/apiClient";
import { Project } from "@/types/types";

export async function getProjects(): Promise<Project[]> {
  const response = await apiClient.get<Project[]>("/api/projects/");
  return response.data;
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const response = await apiClient.get<Project>(`/api/projects/${id}/`);
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function createProject(project: Project): Promise<Project> {
  const response = await apiClient.post<Project>("/api/projects/", project);
  return response.data;
}

export async function updateProject(project: Project): Promise<Project> {
  const response = await apiClient.put<Project>(
    `/api/projects/${project.id}/`,
    project,
  );
  return response.data;
}

export async function upsertProject(project: Project): Promise<Project> {
  try {
    return await updateProject(project);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return createProject(project);
    }

    throw error;
  }
}
