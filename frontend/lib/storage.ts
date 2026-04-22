import { Project } from "@/types/types";

const STORAGE_KEY = "venue-projects";

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function getProjectById(id: string): Project | null {
  const projects = getProjects();
  return projects.find((project) => project.id === id) ?? null;
}

export function upsertProject(project: Project) {
  if (typeof window === "undefined") return;

  const projects = getProjects();
  const existingIndex = projects.findIndex((p) => p.id === project.id);

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
