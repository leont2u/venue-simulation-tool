import { ASSET_FOOTPRINTS } from "@/lib/assetMetadata";
import { Project, SceneItem } from "@/types/types";

const SNAP_THRESHOLD = 0.35;
const ROOM_MARGIN = 0.3;

export type AlignmentGuide = {
  orientation: "vertical" | "horizontal";
  value: number;
};

export function getItemFootprint(item: SceneItem) {
  const asset = ASSET_FOOTPRINTS[item.type];
  const width = asset?.width ?? Math.max(0.6, item.scale[0]);
  const depth = asset?.depth ?? Math.max(0.6, item.scale[2]);

  return {
    halfWidth: Math.max(width, item.scale[0]) / 2,
    halfDepth: Math.max(depth, item.scale[2]) / 2,
  };
}

export function clampToRoom(item: SceneItem, room: Project["room"]) {
  const footprint = getItemFootprint(item);

  return {
    x: Math.min(
      room.width / 2 - footprint.halfWidth - ROOM_MARGIN,
      Math.max(-room.width / 2 + footprint.halfWidth + ROOM_MARGIN, item.x),
    ),
    z: Math.min(
      room.depth / 2 - footprint.halfDepth - ROOM_MARGIN,
      Math.max(-room.depth / 2 + footprint.halfDepth + ROOM_MARGIN, item.z),
    ),
  };
}

export function snapPositionToNeighbors(
  item: SceneItem,
  others: SceneItem[],
) {
  let x = item.x;
  let z = item.z;
  const guides: AlignmentGuide[] = [];

  for (const other of others) {
    if (Math.abs(x - other.x) < SNAP_THRESHOLD) {
      x = other.x;
      guides.push({ orientation: "vertical", value: other.x });
    }

    if (Math.abs(z - other.z) < SNAP_THRESHOLD) {
      z = other.z;
      guides.push({ orientation: "horizontal", value: other.z });
    }
  }

  return { x, z, guides };
}

function overlaps(a: SceneItem, b: SceneItem) {
  const first = getItemFootprint(a);
  const second = getItemFootprint(b);

  return (
    Math.abs(a.x - b.x) < first.halfWidth + second.halfWidth &&
    Math.abs(a.z - b.z) < first.halfDepth + second.halfDepth
  );
}

export function collidesWithOthers(candidate: SceneItem, others: SceneItem[]) {
  return others.some((other) => overlaps(candidate, other));
}
