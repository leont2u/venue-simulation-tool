import { Project } from "@/types/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidProject(project: unknown): project is Project {
  if (!isObject(project)) return false;
  if (!("id" in project) || typeof project.id !== "string") return false;
  if (!("name" in project) || typeof project.name !== "string") return false;
  if (!("createdAt" in project) || typeof project.createdAt !== "string") {
    return false;
  }
  if (!("updatedAt" in project) || typeof project.updatedAt !== "string") {
    return false;
  }
  if (!("room" in project) || !isObject(project.room)) return false;
  if (
    typeof project.room.width !== "number" ||
    typeof project.room.depth !== "number" ||
    typeof project.room.height !== "number"
  ) {
    return false;
  }
  if (!("items" in project) || !Array.isArray(project.items)) return false;

  return project.items.every((item) => {
    if (!isObject(item)) return false;
    return (
      typeof item.id === "string" &&
      typeof item.type === "string" &&
      typeof item.x === "number" &&
      typeof item.y === "number" &&
      typeof item.z === "number" &&
      typeof item.rotationY === "number" &&
      Array.isArray(item.scale) &&
      item.scale.length === 3 &&
      item.scale.every((entry) => typeof entry === "number") &&
      typeof item.assetUrl === "string"
    );
  });
}

export async function generateProjectFromPrompt(
  prompt: string,
): Promise<Project> {
  const res = await fetch("/api/generate-scene", {
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

  const project: unknown = await res.json();

  if (!isValidProject(project)) {
    throw new Error("Generated scene is invalid.");
  }

  return project;
}
