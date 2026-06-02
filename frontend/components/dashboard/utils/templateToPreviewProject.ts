import { ProjectTemplate } from "@/lib/projectTemplates";
import { Project } from "@/types/types";

export function templateToPreviewProject(template: ProjectTemplate): Project {
  return template.buildProject(template.name);
}
