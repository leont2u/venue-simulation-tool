import { Project } from "@/types/types";

export default function projectMatchesFilter(project: Project, filter: string) {
  if (filter === "All") return true;
  return project.name.toLowerCase().includes(filter.toLowerCase());
}
