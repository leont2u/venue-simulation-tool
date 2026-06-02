import { polyPizzaRequiredUrl } from "@/lib/assetMetadata";
import { Project, SceneItem } from "@/types/types";

type LayoutWall = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type LayoutRect = {
  id?: string;
  type?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg?: number;
  confidence?: number;
};

type StructuredLayout = {
  walls?: LayoutWall[];
  rooms?: LayoutRect[];
  zones?: LayoutRect[];
  tables?: LayoutRect[];
  table_groups?: Array<{
    layout: string;
    rows: number;
    columns: number;
  }>;
};

const WALL_HEIGHT_METERS = 3;
const WALL_THICKNESS_METERS = 0.2;
const ROOM_PADDING_METERS = 1.6;
const MIN_ROOM_SIZE_METERS = 6;

function round(value: number, precision = 3) {
  return Number(value.toFixed(precision));
}

function wallLength(wall: LayoutWall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

function boundsFromLayout(layout: StructuredLayout) {
  const points: Array<[number, number]> = [];

  for (const wall of layout.walls ?? []) {
    points.push([wall.x1, wall.y1], [wall.x2, wall.y2]);
  }
  for (const rect of [...(layout.rooms ?? []), ...(layout.zones ?? []), ...(layout.tables ?? [])]) {
    points.push([rect.x, rect.y], [rect.x + rect.width, rect.y + rect.height]);
  }

  if (points.length === 0) {
    return null;
  }

  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

function estimateMetersPerPixel(bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  const widthPx = Math.max(1, bounds.maxX - bounds.minX);
  const depthPx = Math.max(1, bounds.maxY - bounds.minY);
  const dominant = Math.max(widthPx, depthPx);
  return 38 / dominant;
}

function toWorldPoint(
  x: number,
  y: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  pxToMeter: number,
) {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    x: (x - centerX) * pxToMeter,
    z: (y - centerY) * pxToMeter,
  };
}

function isPerimeterWall(
  wall: LayoutWall,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  tolerance: number,
) {
  const vertical = Math.abs(wall.x1 - wall.x2) <= tolerance;
  const horizontal = Math.abs(wall.y1 - wall.y2) <= tolerance;
  if (vertical) {
    return Math.abs(wall.x1 - bounds.minX) <= tolerance || Math.abs(wall.x1 - bounds.maxX) <= tolerance;
  }
  if (horizontal) {
    return Math.abs(wall.y1 - bounds.minY) <= tolerance || Math.abs(wall.y1 - bounds.maxY) <= tolerance;
  }
  return false;
}

function wallToSceneItem(
  wall: LayoutWall,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  pxToMeter: number,
): SceneItem {
  const start = toWorldPoint(wall.x1, wall.y1, bounds, pxToMeter);
  const end = toWorldPoint(wall.x2, wall.y2, bounds, pxToMeter);
  const length = Math.max(0.2, Math.hypot(end.x - start.x, end.z - start.z));

  return {
    id: crypto.randomUUID(),
    type: "wall",
    x: round((start.x + end.x) / 2),
    y: 0,
    z: round((start.z + end.z) / 2),
    rotationY: round(-Math.atan2(end.z - start.z, end.x - start.x), 4),
    scale: [round(length), WALL_HEIGHT_METERS, WALL_THICKNESS_METERS],
    assetUrl: "primitive://wall",
    label: "Detected wall",
    color: "#d9d3c7",
    material: { roughness: 0.82, metalness: 0.02 },
    source: "structured_layout",
  };
}

function zoneToSceneItem(
  zone: LayoutRect,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  pxToMeter: number,
): SceneItem {
  const center = toWorldPoint(zone.x + zone.width / 2, zone.y + zone.height / 2, bounds, pxToMeter);
  const type = zone.type ?? "zone";
  return {
    id: zone.id ?? crypto.randomUUID(),
    type,
    x: round(center.x),
    y: 0,
    z: round(center.z),
    rotationY: round(-((zone.rotationDeg ?? 0) * Math.PI) / 180, 4),
    scale: [
      round(Math.max(2, zone.width * pxToMeter)),
      0.035,
      round(Math.max(1.8, zone.height * pxToMeter)),
    ],
    assetUrl: `primitive://${type}`,
    label: zone.label ?? type.replace(/_/g, " "),
    color: type === "dance_floor" ? "#d4a373" : type === "stage/head_table" ? "#6d6875" : "#e9edc9",
    material: { roughness: 0.58, metalness: 0.02 },
    source: "structured_layout",
  };
}

function tableToSceneItem(
  table: LayoutRect,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  pxToMeter: number,
): SceneItem {
  const center = toWorldPoint(table.x, table.y, bounds, pxToMeter);
  const width = Math.max(1, table.width * pxToMeter);
  const depth = Math.max(0.8, table.height * pxToMeter);
  const type = table.type === "rectangular_table" ? "rectangular_table" : "round_table";

  return {
    id: table.id ?? crypto.randomUUID(),
    type,
    x: round(center.x),
    y: 0,
    z: round(center.z),
    rotationY: round(-((table.rotationDeg ?? 0) * Math.PI) / 180, 4),
    scale:
      type === "round_table"
        ? [round(Math.max(1.2, width)), 0.75, round(Math.max(1.2, width))]
        : [round(width), 0.75, round(depth)],
    assetUrl: polyPizzaRequiredUrl(type),
    label: table.label ?? (type === "round_table" ? "Round table" : "Rectangular table"),
    source: "structured_layout",
  };
}

export function structuredLayoutToProject(
  layout: StructuredLayout,
  options?: {
    name?: string;
    pxToMeter?: number;
  },
): Project {
  const bounds = boundsFromLayout(layout);
  if (!bounds) {
    throw new Error("Structured layout is empty.");
  }

  const pxToMeter = options?.pxToMeter ?? estimateMetersPerPixel(bounds);
  const roomWidth = Math.max(MIN_ROOM_SIZE_METERS, round((bounds.maxX - bounds.minX) * pxToMeter + ROOM_PADDING_METERS, 1));
  const roomDepth = Math.max(MIN_ROOM_SIZE_METERS, round((bounds.maxY - bounds.minY) * pxToMeter + ROOM_PADDING_METERS, 1));
  const tolerance = Math.max(4, Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.015);

  const internalWalls = (layout.walls ?? [])
    .filter((wall) => wallLength(wall) * pxToMeter >= 0.55)
    .filter((wall) => !isPerimeterWall(wall, bounds, tolerance))
    .map((wall) => wallToSceneItem(wall, bounds, pxToMeter));
  const zoneItems = (layout.zones ?? []).map((zone) => zoneToSceneItem(zone, bounds, pxToMeter));
  const tableItems = (layout.tables ?? []).map((table) => tableToSceneItem(table, bounds, pxToMeter));

  return {
    id: crypto.randomUUID(),
    name: options?.name?.trim() || "Structured Layout Scene",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room: {
      width: roomWidth,
      depth: roomDepth,
      height: WALL_HEIGHT_METERS,
      wallThickness: WALL_THICKNESS_METERS,
    },
    items: [...internalWalls, ...zoneItems, ...tableItems],
    connections: [],
    measurements: [],
    sceneSettings: {
      showGrid: true,
      enableHdri: true,
      ambientLightIntensity: 0.75,
      directionalLightIntensity: 1.25,
      snapToGrid: true,
      livestreamMode: false,
      cameraMode: "orbit",
      wallThickness: WALL_THICKNESS_METERS,
      wallColor: "#f3efe7",
      floorColor: "#f2eee6",
      floorMaterial: "Concrete",
      wallMaterial: "Painted",
      venueEnvironment: "indoor",
      lightingMood: "conference",
    },
  };
}
