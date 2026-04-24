import { CableType, Project, SceneConnection, SceneItem } from "@/types/types";

export function isAvItem(item: SceneItem) {
  return ["camera", "speaker", "mixing_desk", "screen", "tv"].includes(item.type);
}

export function getCableColor(cableType: CableType) {
  switch (cableType) {
    case "power":
      return "#E24B4A";
    case "video":
      return "#378ADD";
    case "audio":
      return "#1D9E75";
    case "data":
      return "#BA7517";
    case "lighting":
      return "#534AB7";
    default:
      return "#378ADD";
  }
}

export function inferCableType(fromItem: SceneItem, toItem: SceneItem): CableType {
  if (
    [fromItem.type, toItem.type].includes("mixing_desk") &&
    [fromItem.type, toItem.type].includes("speaker")
  ) {
    return "audio";
  }

  if (
    [fromItem.type, toItem.type].includes("camera") &&
    ["screen", "tv", "mixing_desk"].some((type) =>
      [fromItem.type, toItem.type].includes(type),
    )
  ) {
    return "video";
  }

  return "data";
}

export function resolveConnectionItems(project: Project, connection: SceneConnection) {
  const fromItem = project.items.find((item) => item.id === connection.fromItemId);
  const toItem = project.items.find((item) => item.id === connection.toItemId);

  if (!fromItem || !toItem) return null;

  return { fromItem, toItem };
}

export function getCablePathPoints(fromItem: SceneItem, toItem: SceneItem) {
  const midZ = (fromItem.z + toItem.z) / 2;
  return [
    { x: fromItem.x, z: fromItem.z },
    { x: fromItem.x, z: midZ },
    { x: toItem.x, z: midZ },
    { x: toItem.x, z: toItem.z },
  ];
}
