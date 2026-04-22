import {
  AssetType,
  LayoutPlan,
  LayoutPlanChairBlock,
  LayoutPlanItem,
  Project,
  SceneItem,
} from "@/types/types";
import { ASSET_CATALOG } from "./DemoAssets";

function getAsset(type: AssetType) {
  const asset = ASSET_CATALOG.find((a) => a.type === type);
  if (!asset) {
    throw new Error(`Missing asset mapping for "${type}"`);
  }
  return asset;
}

function expandChairBlocks(chairBlocks: LayoutPlanChairBlock[]): SceneItem[] {
  const chairAsset = getAsset("chair");
  const result: SceneItem[] = [];

  chairBlocks.forEach((block, blockIndex) => {
    for (let row = 0; row < block.rows; row++) {
      for (let col = 0; col < block.cols; col++) {
        let x = block.startX + col * block.spacingX;

        if (
          typeof block.aisleAfterCol === "number" &&
          typeof block.aisleWidth === "number" &&
          col > block.aisleAfterCol
        ) {
          x += block.aisleWidth;
        }

        const z = block.startZ + row * block.spacingZ;

        result.push({
          id: crypto.randomUUID(),
          type: "chair",
          x,
          y: 0,
          z,
          rotationY: block.rotationY ?? 0,
          scale: chairAsset.defaultScale,
          assetUrl: chairAsset.modelUrl,
          label: block.label
            ? `${block.label} ${row + 1}-${col + 1}`
            : `Chair ${blockIndex + 1}-${row + 1}-${col + 1}`,
        });
      }
    }
  });

  return result;
}

function planItemsToSceneItems(items: LayoutPlanItem[]): SceneItem[] {
  return items.map((item) => {
    const asset = getAsset(item.type);

    return {
      id: crypto.randomUUID(),
      type: item.type,
      x: item.x,
      y: 0,
      z: item.z,
      rotationY: item.rotationY ?? 0,
      scale: asset.defaultScale,
      assetUrl: asset.modelUrl,
      label: item.label,
    };
  });
}

function dedupeSceneItems(items: SceneItem[]) {
  const result: SceneItem[] = [];

  for (const item of items) {
    const exists = result.some((existing) => {
      const sameType = existing.type === item.type;
      const dx = existing.x - item.x;
      const dz = existing.z - item.z;
      const near = Math.sqrt(dx * dx + dz * dz) < 0.2;
      return sameType && near;
    });

    if (!exists) result.push(item);
  }

  return result;
}

export function layoutPlanToProject(plan: LayoutPlan): Project {
  const chairItems = expandChairBlocks(plan.chairBlocks ?? []);
  const directItems = planItemsToSceneItems(plan.items ?? []);
  const items = dedupeSceneItems([...chairItems, ...directItems]);

  return {
    id: crypto.randomUUID(),
    name: plan.projectName || "Prompt Generated Project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room: {
      width: plan.room.width,
      depth: plan.room.depth,
      height: plan.room.height,
    },
    items,
  };
}
