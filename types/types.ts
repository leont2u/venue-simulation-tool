export type AssetType =
  | "chair"
  | "desk"
  | "podium"
  | "piano"
  | "camera"
  | "altar"
  | "banquet_table"
  | "church_bench"
  | "screen"
  | "tv";

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
  label?: string;
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
  measurements?: MeasurementLine[];
};

export type MeasurementLine = {
  id: string;
  type: "measurement";
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  text?: string;
};

export type LayoutPlanItem = {
  type: AssetType;
  x: number;
  z: number;
  rotationY?: number;
  label?: string;
};

export type LayoutPlanChairBlock = {
  label?: string;
  rows: number;
  cols: number;
  startX: number;
  startZ: number;
  spacingX: number;
  spacingZ: number;
  rotationY?: number;
  aisleAfterCol?: number;
  aisleWidth?: number;
};

export type LayoutPlan = {
  projectName: string;
  room: {
    width: number;
    depth: number;
    height: number;
  };
  chairBlocks?: LayoutPlanChairBlock[];
  items: LayoutPlanItem[];
};
