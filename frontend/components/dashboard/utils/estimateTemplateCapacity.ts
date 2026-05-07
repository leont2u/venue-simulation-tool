import { ProjectTemplate } from "@/lib/projectTemplates";
import { templateToPreviewProject } from "./templateToPreviewProject";

export default function estimateTemplateCapacity(template: ProjectTemplate) {
  const preview = templateToPreviewProject(template);
  const chairLike = preview.items.filter((item) =>
    ["chair", "church_bench", "banquet_table", "desk"].includes(item.type),
  ).length;
  return Math.max(
    chairLike * 8,
    Math.round((preview.room.width * preview.room.depth) / 3),
  );
}
