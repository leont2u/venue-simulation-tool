"use client";

import { ASSET_CATALOG } from "@/lib/DemoAssets";
import { useEditorStore } from "@/store/UseEditorStore";
import { SceneItem } from "@/types/types";

export function AssetCatalog() {
  const addItem = useEditorStore((s) => s.addItem);

  const handleAdd = (index: number) => {
    const asset = ASSET_CATALOG[index];
    const item: SceneItem = {
      id: crypto.randomUUID(),
      type: asset.type,
      x: -6 + index * 1.5,
      y: 0,
      z: 0,
      rotationY: 0,
      scale: asset.defaultScale,
      assetUrl: asset.modelUrl,
      label: asset.name,
    };

    addItem(item);
  };

  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-zinc-950/60">
      <div className="border-b border-white/10 px-5 py-4 text-lg font-semibold text-white">
        Assets
      </div>
      <div className="grid gap-3 p-4">
        {ASSET_CATALOG.map((asset, index) => (
          <button
            key={asset.type}
            onClick={() => handleAdd(index)}
            className="rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-4 text-left transition hover:border-green-400/40 hover:bg-zinc-900"
          >
            <div className="font-medium text-white">{asset.name}</div>
            <div className="mt-1 text-sm text-zinc-500">
              Click to place in room
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
