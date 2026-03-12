export type AssetType =
  | "chair"
  | "desk"
  | "podium"
  | "piano"
  | "camera"
  | "altar"
  | "banquet_table"
  | "church_bench";

export type AssetDefinition = {
  type: AssetType;
  name: string;
  modelUrl: string;
  defaultScale: [number, number, number];
  yOffset?: number;
  rotationOffset?: [number, number, number];
  defaultSize?: {
    width: number;
    depth: number;
    height: number;
  };
};

export type SceneItem = {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: [number, number, number];
  assetUrl: string;
  label: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  room: {
    width: number;
    depth: number;
    height: number;
  };
  items: SceneItem[];
};
