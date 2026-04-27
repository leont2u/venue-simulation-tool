import { ASSET_FOOTPRINTS, polyPizzaRequiredUrl } from "@/lib/assetMetadata";
import { createProjectFromDrawioFile } from "@/lib/drawioImport";
import { generateProjectFromPrompt } from "@/lib/promptLayout";
import { upsertProject } from "@/lib/storage";
import { Project, SceneItem } from "@/types/types";

export type VenueInput = {
  prompt: string;
  file?: File | null;
};

function titleFromPrompt(prompt: string) {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned.length > 54 ? `${cleaned.slice(0, 54).trim()}...` : cleaned;
}

function getAsset(type: string) {
  return ASSET_FOOTPRINTS[type];
}

function hasItem(project: Project, type: string) {
  return project.items.some((item) => item.type === type);
}

function makeItem(
  type: string,
  label: string,
  x: number,
  z: number,
  rotationY = 0,
  layer: SceneItem["layer"] = "layout",
): SceneItem | null {
  const asset = getAsset(type);
  if (!asset) return null;

  return {
    id: crypto.randomUUID(),
    type,
    x,
    y: 0,
    z,
    rotationY,
    scale: asset.scale,
    assetUrl: polyPizzaRequiredUrl(type),
    label,
    layer,
  };
}

function dedupe(items: SceneItem[]) {
  const result: SceneItem[] = [];

  for (const item of items) {
    const exists = result.some((existing) => {
      const near =
        Math.hypot(existing.x - item.x, existing.z - item.z) < 0.45;
      return existing.type === item.type && near;
    });
    if (!exists) result.push(item);
  }

  return result;
}

function enhanceImportedProject(project: Project, prompt: string): Project {
  const normalized = prompt.toLowerCase();
  if (!normalized.trim()) return project;

  const halfWidth = project.room.width / 2;
  const halfDepth = project.room.depth / 2;
  const additions: SceneItem[] = [];

  if (/(stage|platform|ceremony|altar|front)/.test(normalized) && !hasItem(project, "podium")) {
    const item = makeItem("podium", "Prompt podium / stage focus", 0, -halfDepth + 3);
    if (item) additions.push(item);
  }

  if (/(screen|led|display|projector|presentation)/.test(normalized) && !hasItem(project, "screen")) {
    const item = makeItem("screen", "Prompt screen", 0, -halfDepth + 1.25);
    if (item) additions.push(item);
  }

  if (/(camera|livestream|live stream|stream|recording|coverage)/.test(normalized) && !hasItem(project, "camera")) {
    [
      makeItem("camera", "Camera A", -Math.min(halfWidth - 2, 5), halfDepth - 3, Math.PI, "av"),
      makeItem("camera", "Camera B", Math.min(halfWidth - 2, 5), halfDepth - 3, Math.PI, "av"),
    ].forEach((item) => {
      if (item) additions.push(item);
    });
  }

  if (/(speaker|audio|pa|sound|av|livestream|live stream)/.test(normalized) && !hasItem(project, "speaker")) {
    [
      makeItem("speaker", "PA Speaker L", -Math.min(halfWidth - 1.5, 6), -halfDepth + 4, 0, "av"),
      makeItem("speaker", "PA Speaker R", Math.min(halfWidth - 1.5, 6), -halfDepth + 4, 0, "av"),
    ].forEach((item) => {
      if (item) additions.push(item);
    });
  }

  if (/(mix|foh|desk|control|livestream|live stream)/.test(normalized) && !hasItem(project, "mixing_desk")) {
    const item = makeItem("mixing_desk", "FOH / streaming desk", 0, halfDepth - 2.5, Math.PI, "av");
    if (item) additions.push(item);
  }

  if (!additions.length) {
    return {
      ...project,
      name: titleFromPrompt(prompt) || project.name,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...project,
    name: titleFromPrompt(prompt) || project.name,
    updatedAt: new Date().toISOString(),
    items: dedupe([...project.items, ...additions]),
  };
}

export async function createProjectFromVenueInput({
  prompt,
  file,
}: VenueInput): Promise<Project> {
  const cleanPrompt = prompt.trim();

  if (file) {
    const importedProject = await createProjectFromDrawioFile(
      file,
      titleFromPrompt(cleanPrompt),
    );
    const finalProject = enhanceImportedProject(importedProject, cleanPrompt);
    return upsertProject(finalProject);
  }

  const generatedProject = await generateProjectFromPrompt(cleanPrompt);
  return upsertProject(generatedProject);
}
