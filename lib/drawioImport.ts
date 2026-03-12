import { AssetType, Project, SceneItem } from "@/types/types";
import { ASSET_CATALOG } from "./DemoAssets";

type ParsedCell = {
  id: string;
  style: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
};

type ClassifiedCell = ParsedCell & {
  objectType: AssetType;
  label?: string;
};

const PX_TO_WORLD = 0.02;

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function decodeHtmlEntities(value: string) {
  if (typeof window === "undefined") return value;
  const txt = document.createElement("textarea");
  txt.innerHTML = value;
  return txt.value;
}

function stripHtml(value: string) {
  const decoded = decodeHtmlEntities(value || "");
  if (typeof window === "undefined")
    return decoded.replace(/<[^>]+>/g, "").trim();
  const div = document.createElement("div");
  div.innerHTML = decoded;
  return (div.textContent || div.innerText || "").trim();
}

function extractXmlFromContent(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith("<mxfile") || trimmed.startsWith("<?xml")) {
    return trimmed;
  }

  const htmlDoc = new DOMParser().parseFromString(content, "text/html");
  const graphHolder = htmlDoc.querySelector("[data-mxgraph]");
  const dataMxGraph = graphHolder?.getAttribute("data-mxgraph");

  if (!dataMxGraph) {
    throw new Error("Could not find draw.io data in the uploaded file.");
  }

  const parsed = JSON.parse(dataMxGraph);
  if (!parsed?.xml) {
    throw new Error("Could not extract XML from draw.io HTML export.");
  }

  return parsed.xml as string;
}

function parseRotation(style: string) {
  const match = style.match(/rotation=([0-9.]+)/);
  return match ? Number(match[1]) : 0;
}

function parseCells(xml: string): ParsedCell[] {
  const xmlDoc = new DOMParser().parseFromString(xml, "text/xml");
  const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"));

  const parsed: ParsedCell[] = [];

  for (const cell of cells) {
    const vertex = cell.getAttribute("vertex");
    if (vertex !== "1") continue;

    const geometry = cell.getElementsByTagName("mxGeometry")[0];
    if (!geometry) continue;

    const x = Number(geometry.getAttribute("x") || 0);
    const y = Number(geometry.getAttribute("y") || 0);
    const width = Number(geometry.getAttribute("width") || 0);
    const height = Number(geometry.getAttribute("height") || 0);

    if (!width && !height) continue;

    parsed.push({
      id: cell.getAttribute("id") || crypto.randomUUID(),
      style: cell.getAttribute("style") || "",
      value: cell.getAttribute("value") || "",
      x,
      y,
      width,
      height,
      rotationDeg: parseRotation(cell.getAttribute("style") || ""),
    });
  }

  return parsed;
}

function classifyCell(cell: ParsedCell): ClassifiedCell | null {
  const style = cell.style.toLowerCase();
  const label = stripHtml(cell.value).toLowerCase();

  if (style.includes("mxgraph.floorplan.office_chair")) {
    return {
      ...cell,
      objectType: "chair",
      label: "Chair",
    };
  }

  if (label.includes("podium")) {
    return {
      ...cell,
      objectType: "podium",
      label: "Podium",
    };
  }

  if (label.includes("operation desk") || label.includes("desk")) {
    return {
      ...cell,
      objectType: "desk",
      label: "Operation Desk",
    };
  }

  if (label.includes("led screen")) {
    return {
      ...cell,
      objectType: "screen",
      label: "LED Screen",
    };
  }

  if (label.includes("tv")) {
    return {
      ...cell,
      objectType: "tv",
      label: "TV",
    };
  }

  if (label.includes("camera")) {
    return {
      ...cell,
      objectType: "camera",
      label: "Camera",
    };
  }

  if (label.includes("piano")) {
    return {
      ...cell,
      objectType: "piano",
      label: "Piano",
    };
  }

  if (label.includes("altar")) {
    return {
      ...cell,
      objectType: "altar",
      label: "Altar",
    };
  }

  return null;
}

function nearestShapeCenter(labelCell: ClassifiedCell, cells: ParsedCell[]) {
  const labelCx = labelCell.x + labelCell.width / 2;
  const labelCy = labelCell.y + labelCell.height / 2;

  let best: ParsedCell | null = null;
  let bestDistance = Infinity;

  for (const candidate of cells) {
    if (candidate.id === labelCell.id) continue;

    const candidateLabel = stripHtml(candidate.value).trim();
    const isTextOnly = candidate.style.includes("text;");

    if (candidateLabel && isTextOnly) continue;
    if (!candidate.width || !candidate.height) continue;

    const cx = candidate.x + candidate.width / 2;
    const cy = candidate.y + candidate.height / 2;
    const dx = cx - labelCx;
    const dy = cy - labelCy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  if (bestDistance <= 120) return best;
  return null;
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function createSceneItem(
  cell: ClassifiedCell,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  allCells: ParsedCell[],
): SceneItem {
  const asset = ASSET_CATALOG.find((a) => a.type === cell.objectType);
  if (!asset) {
    throw new Error(`No asset mapping found for ${cell.objectType}`);
  }

  let centerX = cell.x + cell.width / 2;
  let centerY = cell.y + cell.height / 2;

  if (cell.objectType !== "chair") {
    const attachedShape = nearestShapeCenter(cell, allCells);
    if (attachedShape) {
      centerX = attachedShape.x + attachedShape.width / 2;
      centerY = attachedShape.y + attachedShape.height / 2;
    }
  }

  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;

  const worldX = (centerX - midX) * PX_TO_WORLD;
  const worldZ = (centerY - midY) * PX_TO_WORLD;

  return {
    id: crypto.randomUUID(),
    type: cell.objectType,
    x: Number(worldX.toFixed(2)),
    y: 0,
    z: Number(worldZ.toFixed(2)),
    rotationY: Number(toRadians(cell.rotationDeg).toFixed(3)),
    scale: asset.defaultScale,
    assetUrl: asset.modelUrl,
    label: cell.label,
  };
}

function dedupeItems(items: SceneItem[]) {
  const result: SceneItem[] = [];

  for (const item of items) {
    const exists = result.some((existing) => {
      const sameType = existing.type === item.type;
      const dx = existing.x - item.x;
      const dz = existing.z - item.z;
      const near = Math.sqrt(dx * dx + dz * dz) < 0.35;
      return sameType && near;
    });

    if (!exists) result.push(item);
  }

  return result;
}

export async function createProjectFromDrawioFile(
  file: File,
): Promise<Project> {
  const content = await readFileAsText(file);
  const xml = extractXmlFromContent(content);
  const cells = parseCells(xml);
  const classified = cells
    .map(classifyCell)
    .filter(Boolean) as ClassifiedCell[];

  if (!classified.length) {
    throw new Error("No supported draw.io objects were found.");
  }

  const bounds = classified.reduce(
    (acc, cell) => {
      acc.minX = Math.min(acc.minX, cell.x);
      acc.minY = Math.min(acc.minY, cell.y);
      acc.maxX = Math.max(acc.maxX, cell.x + cell.width);
      acc.maxY = Math.max(acc.maxY, cell.y + cell.height);
      return acc;
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    },
  );

  const items = dedupeItems(
    classified.map((cell) => createSceneItem(cell, bounds, cells)),
  );

  const roomWidth = Math.max(
    20,
    Number(((bounds.maxX - bounds.minX) * PX_TO_WORLD + 6).toFixed(1)),
  );
  const roomDepth = Math.max(
    14,
    Number(((bounds.maxY - bounds.minY) * PX_TO_WORLD + 6).toFixed(1)),
  );

  return {
    id: crypto.randomUUID(),
    name:
      file.name.replace(/\.(drawio|xml|html)$/i, "") ||
      "Imported Draw.io Project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room: {
      width: roomWidth,
      depth: roomDepth,
      height: 4,
    },
    items,
  };
}
