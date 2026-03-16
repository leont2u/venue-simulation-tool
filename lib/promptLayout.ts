import { LayoutPlan, Project } from "@/types/types";
import { layoutPlanToProject } from "@/lib/layoutPlanToProject";

function validateAssetType(type: string) {
  return [
    "chair",
    "desk",
    "podium",
    "piano",
    "camera",
    "altar",
    "screen",
    "tv",
  ].includes(type);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidLayoutPlan(plan: unknown): plan is LayoutPlan {
  if (!isObject(plan)) return false;

  if (!("projectName" in plan) || typeof plan.projectName !== "string") {
    return false;
  }

  if (!("room" in plan) || !isObject(plan.room)) return false;

  if (
    typeof plan.room.width !== "number" ||
    plan.room.width <= 0 ||
    typeof plan.room.depth !== "number" ||
    plan.room.depth <= 0 ||
    typeof plan.room.height !== "number" ||
    plan.room.height <= 0
  ) {
    return false;
  }

  if (!("items" in plan) || !Array.isArray(plan.items)) return false;

  for (const item of plan.items) {
    if (!isObject(item)) return false;
    if (!("type" in item) || typeof item.type !== "string") return false;
    if (!validateAssetType(item.type)) return false;
    if (!("x" in item) || typeof item.x !== "number") return false;
    if (!("z" in item) || typeof item.z !== "number") return false;

    if (
      "rotationY" in item &&
      item.rotationY !== undefined &&
      typeof item.rotationY !== "number"
    ) {
      return false;
    }

    if (
      "label" in item &&
      item.label !== undefined &&
      typeof item.label !== "string"
    ) {
      return false;
    }
  }

  if ("chairBlocks" in plan && plan.chairBlocks !== undefined) {
    if (!Array.isArray(plan.chairBlocks)) return false;

    for (const block of plan.chairBlocks) {
      if (!isObject(block)) return false;
      if (
        !("rows" in block) ||
        typeof block.rows !== "number" ||
        block.rows <= 0
      ) {
        return false;
      }
      if (
        !("cols" in block) ||
        typeof block.cols !== "number" ||
        block.cols <= 0
      ) {
        return false;
      }
      if (!("startX" in block) || typeof block.startX !== "number")
        return false;
      if (!("startZ" in block) || typeof block.startZ !== "number")
        return false;
      if (
        !("spacingX" in block) ||
        typeof block.spacingX !== "number" ||
        block.spacingX <= 0
      ) {
        return false;
      }
      if (
        !("spacingZ" in block) ||
        typeof block.spacingZ !== "number" ||
        block.spacingZ <= 0
      ) {
        return false;
      }
    }
  }

  return true;
}

export async function generateProjectFromPrompt(
  prompt: string,
): Promise<Project> {
  const res = await fetch("/api/generate-layout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to generate layout plan.");
  }

  const plan: unknown = await res.json();

  if (!isValidLayoutPlan(plan)) {
    throw new Error("Generated layout plan is invalid.");
  }

  return layoutPlanToProject(plan);
}
