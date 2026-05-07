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
  sourceId?: string;
  sourceUrl?: string;
  polyPizzaId?: string;
  polyPizzaUrl?: string;
  sketchfabUid?: string;
  sketchfabUrl?: string;
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
  assetSearch?: string;
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

  // Community fields — optional for backward compatibility
  visibility?:       LayoutVisibility;
  eventType?:        EventType | null;
  tags?:             string[];
  thumbnailUrl?:     string | null;
  forkedFromId?:     string | null;
  forkDepth?:        number;
  attribution?:      Attribution | null;
  publishState?:     LayoutPublishState;
  publishedListing?: PublishedListing | null;
};

// ─── Community / Publishing types ────────────────────────────────────────────

export type LayoutVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export type LayoutPublishState =
  | "DRAFT_PRIVATE"
  | "PUBLISHED_CLEAN"
  | "PUBLISHED_DIRTY"
  | "ARCHIVED";

export type EventType =
  | "wedding"
  | "engagement"
  | "conference"
  | "agm"
  | "corporate_dinner"
  | "product_launch"
  | "funeral"
  | "memorial"
  | "concert"
  | "award_ceremony"
  | "graduation"
  | "birthday"
  | "gala"
  | "fundraiser"
  | "church_service"
  | "livestream"
  | "exhibition"
  | "other";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding:          "Wedding",
  engagement:       "Engagement",
  conference:       "Conference",
  agm:              "AGM",
  corporate_dinner: "Corporate Dinner",
  product_launch:   "Product Launch",
  funeral:          "Funeral",
  memorial:         "Memorial",
  concert:          "Concert",
  award_ceremony:   "Award Ceremony",
  graduation:       "Graduation",
  birthday:         "Birthday",
  gala:             "Gala",
  fundraiser:       "Fundraiser",
  church_service:   "Church Service",
  livestream:       "Livestream",
  exhibition:       "Exhibition",
  other:            "Other",
};

export type PublishedListing = {
  id:                string;
  title:             string;
  tagline:           string;
  eventType:         EventType;
  theme:             string;
  tags:              string[];
  coverImageUrl:     string | null;
  estimatedCapacity: number | null;
  moderationStatus:  "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
  viewCount:         number;
  forkCount:         number;
  saveCount:         number;
  likeCount:         number;
  featuredAt:        string | null;
  trendingScore:     number;
  publishedAt:       string;
  publisherId:       number;
  publisherName:     string;
  autoApproved:      boolean;
};

export type Attribution = {
  sourceId:      string | null;
  sourceTitle:   string;
  sourceCreator: string;
};

export type DiscoveryLayout = {
  id:                string;
  projectId:         string;
  title:             string;
  tagline:           string;
  eventType:         EventType;
  theme:             string;
  tags:              string[];
  coverImageUrl:     string | null;
  estimatedCapacity: number | null;
  forkCount:         number;
  saveCount:         number;
  likeCount:         number;
  trendingScore:     number;
  publishedAt:       string;
  publisher: {
    id:       number;
    username: string;
    name:     string;
    handle:   string | null;
  };
};

export type DiscoveryLayoutDetail = DiscoveryLayout & {
  publishedSnapshot: {
    room:           Project["room"];
    items:          SceneItem[];
    connections:    SceneConnection[];
    scene_settings: SceneSettings;
    architecture:   VenueArchitecture | null;
  };
  attribution: Attribution | null;
};

// ─── End community types ──────────────────────────────────────────────────────

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
