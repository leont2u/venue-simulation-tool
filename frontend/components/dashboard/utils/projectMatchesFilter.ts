import { Project } from "@/types/types";

const FILTER_TO_EVENT_TYPE: Record<string, string> = {
  Wedding:    "wedding",
  Conference: "conference",
  Church:     "church_service",
  Concert:    "concert",
};

export default function projectMatchesFilter(project: Project, filter: string) {
  if (filter === "All") return true;
  const eventType = FILTER_TO_EVENT_TYPE[filter];
  if (eventType) return project.eventType === eventType;
  return project.name.toLowerCase().includes(filter.toLowerCase());
}
