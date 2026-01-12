export type ObjectType = "chair" | "table" | "stage";

export interface VenueObject {
  id: string;
  type: ObjectType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface SceneData {
  objects: VenueObject[];
  savedAt: string;
}
