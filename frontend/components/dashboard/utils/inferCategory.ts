import { Project } from "@/types/types";

export default function inferCategory(project: Project) {
  const normalized = project.name.toLowerCase();
  if (normalized.includes("wedding") || normalized.includes("banquet"))
    return "WEDDING";
  if (normalized.includes("church") || normalized.includes("service"))
    return "CHURCH";
  if (normalized.includes("concert") || normalized.includes("festival"))
    return "CONCERT";
  if (normalized.includes("funeral") || normalized.includes("memorial"))
    return "FUNERAL";
  if (normalized.includes("live") || normalized.includes("stream"))
    return "LIVESTREAM";
  if (normalized.includes("conference") || normalized.includes("keynote"))
    return "CONFERENCE";
  return "PROJECT";
}
