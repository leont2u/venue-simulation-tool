"use client";

import { useMemo, useState } from "react";
import { ASSET_CATALOG } from "@/lib/DemoAssets";
import { useEditorStore } from "@/store/UseEditorStore";
import { SceneItem } from "@/types/types";

export function AssetCatalog() {
  const addItem = useEditorStore((s) => s.addItem);
  const [query, setQuery] = useState("");

  const filteredAssets = useMemo(() => {
    return ASSET_CATALOG.filter((asset) =>
      asset.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query]);

  const handleAdd = (asset: (typeof ASSET_CATALOG)[number]) => {
    const item: SceneItem = {
      id: crypto.randomUUID(),
      type: asset.type,
      x: 0,
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
    <aside className="flex h-full min-h-0 w-72 flex-col border-r border-white/10 bg-zinc-950">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold text-white">Assets</div>
      </div>

      <div className="border-b border-white/10 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search"
          className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid gap-2">
          {filteredAssets.map((asset) => (
            <button
              key={asset.type}
              onClick={() => handleAdd(asset)}
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-3 text-left transition hover:border-blue-400/40 hover:bg-zinc-800"
            >
              <div className="text-sm font-medium text-white">{asset.name}</div>
              <div className="mt-1 text-xs text-zinc-500">Click to place</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
