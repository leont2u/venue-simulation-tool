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
  | "tv"
  | "stand-up";

export type AssetCategory =
  | "Seating"
  | "Tables"
  | "Stage & Decor"
  | "Media Equipment";

export type AssetDefinition = {
  id: string;
  type: AssetType;
  name: string;
  category: AssetCategory;
  thumbnail: string;
  modelUrl: string;
  defaultScale: [number, number, number];
  boundingBox: {
    width: number;
    depth: number;
    height: number;
  };
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
  color?: string;
  material?: {
    roughness: number;
    metalness: number;
  };
};

export type SceneSettings = {
  showGrid: boolean;
  enableHdri: boolean;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  snapToGrid: boolean;
  livestreamMode: boolean;
  wallThickness: number;
  wallColor: string;
  floorColor: string;
  floorMaterial: "Wood" | "Concrete" | "Stone";
};

export type EditorViewMode = "2d" | "3d";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  room: {
    width: number;
    depth: number;
    height: number;
    wallThickness?: number;
  };
  items: SceneItem[];
  measurements?: MeasurementLine[];
  sceneSettings?: SceneSettings;
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
