export type KnownAssetType =
  | "chair"
  | "desk"
  | "podium"
  | "piano"
  | "camera"
  | "speaker"
  | "mixing_desk"
  | "altar"
  | "banquet_table"
  | "church_bench"
  | "screen"
  | "tv"
  | "stand-up";

export type AssetType = KnownAssetType | `poly_pizza_${string}` | (string & {});

export type KnownAssetCategory =
  | "Seating"
  | "Tables"
  | "Stage & Decor"
  | "Media Equipment"
  | "AV Gear";

export type AssetCategory = KnownAssetCategory | (string & {});

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
  source?: string;
  polyPizzaId?: string;
  polyPizzaUrl?: string;
  attribution?: string;
  license?: string;
  creator?: string;
  triCount?: number;
  animated?: boolean;
  tags?: string[];
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
  layer?: "layout" | "av";
  source?: string;
  sourceId?: string;
  sourceUrl?: string;
  attribution?: string;
  license?: string;
  creator?: string;
};

export type CableType = "power" | "video" | "audio" | "data" | "lighting";

export type SceneConnection = {
  id: string;
  fromItemId: string;
  toItemId: string;
  cableType: CableType;
};

export type SceneSettings = {
  showGrid: boolean;
  enableHdri: boolean;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  snapToGrid: boolean;
  livestreamMode: boolean;
  cameraMode?: "orbit" | "walkthrough";
  presentationMode?: boolean;
  wallThickness: number;
  wallColor: string;
  floorColor: string;
  floorMaterial: "Carpet" | "Wood" | "Marble" | "Concrete" | "Tiles" | "Banquet";
  wallMaterial?: "Painted" | "Decorative" | "Draping" | "LED Backdrop" | "Stage Background";
  venueEnvironment?: "indoor" | "outdoor" | "tent";
  lightingMood?: "presentation" | "wedding" | "conference" | "chapel" | "concert" | "daylight";
};

export type VenueOpening = {
  id: string;
  wall: "north" | "south" | "east" | "west";
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
  label?: string;
};

export type VenueColumn = {
  id: string;
  x: number;
  z: number;
  radius: number;
  height?: number;
  label?: string;
};

export type VenueRoute = {
  id: string;
  label: string;
  points: { x: number; z: number }[];
  width: number;
};

export type VenueArchitecture = {
  shape: "rectangular" | "irregular";
  boundary?: { x: number; z: number }[];
  doors: VenueOpening[];
  windows: VenueOpening[];
  columns: VenueColumn[];
  entrances: VenueOpening[];
  exits: VenueOpening[];
  stageAccessRoutes: VenueRoute[];
  hasCeiling: boolean;
  ceilingHeight?: number;
  ceilingDraping?: boolean;
  decorativeLighting?: boolean;
  stageBackdrop?: "draping" | "led" | "painted" | "none";
};

export type EditorViewMode = "2d" | "3d";
export type EditorLayerMode = "layout" | "av" | "combined";

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
  architecture?: VenueArchitecture;
  items: SceneItem[];
  connections?: SceneConnection[];
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
