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
      x: -4 + index * 0.8,
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
    <aside className="w-45 border-r border-black/5 bg-[#FCFCFA] p-4">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#52796F]">
        Shapes
      </div>

      <div className="space-y-2">
        {ASSET_CATALOG.map((asset, index) => (
          <button
            key={asset.type}
            onClick={() => handleAdd(index)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-[#F1F4EF]"
          >
            <div className="h-5 w-5 rounded-full bg-[#CAD2C5]" />
            <span className="text-base font-medium text-[#2F3E46]">
              {asset.name}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
