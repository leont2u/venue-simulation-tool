import { Project } from "@/types/types";

const PROJECTS_KEY = "venuesim-projects";

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getProjectById(projectId: string): Project | null {
  return getProjects().find((p) => p.id === projectId) ?? null;
}

export function upsertProject(project: Project) {
  const projects = getProjects();
  const existingIndex = projects.findIndex((p) => p.id === project.id);

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.unshift(project);
  }

  saveProjects(projects);
}
