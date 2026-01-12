import type { SceneData, VenueObject } from "../types/project.types";

export function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function saveSceneToLocalStorage(objects: VenueObject[]): void {
  const sceneData: SceneData = {
    objects,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem("venueScene", JSON.stringify(sceneData));
}

export function loadSceneFromLocalStorage(): VenueObject[] | null {
  const stored = localStorage.getItem("venueScene");
  if (!stored) return null;

  try {
    const sceneData: SceneData = JSON.parse(stored);
    return sceneData.objects;
  } catch (error) {
    console.error("Failed to parse saved scene:", error);
    return null;
  }
}

export function downloadSceneAsJSON(objects: VenueObject[]): void {
  const sceneData: SceneData = {
    objects,
    savedAt: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(sceneData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `venue-layout-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
