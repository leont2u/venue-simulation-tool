import { Project } from "@/types/types";

export default function estimateCapacity(project: Project) {
  const chairLike = project.items.filter((item) =>
    ["chair", "church_bench", "banquet_table", "desk"].includes(item.type),
  ).length;
  if (chairLike > 0) return Math.max(chairLike, Math.round(chairLike * 8));
  return Math.round((project.room.width * project.room.depth) / 2.8);
}
