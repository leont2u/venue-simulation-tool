"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Heart,
  MousePointer2,
  Move3D,
  RotateCw,
  Scale3D,
  Search,
  Shapes,
  UploadCloud,
  Cable,
} from "lucide-react";
import { ASSET_CATALOG } from "@/lib/DemoAssets";
import { useEditorStore } from "@/store/UseEditorStore";
import { AssetCategory } from "@/types/types";

const CATEGORIES: AssetCategory[] = [
  "Seating",
  "Tables",
  "Stage & Decor",
  "Media Equipment",
  "AV Gear",
];

export function AssetCatalog() {
  const addItemFromAsset = useEditorStore((s) => s.addItemFromAsset);
  const assetLibraryTab = useEditorStore((s) => s.assetLibraryTab);
  const setAssetLibraryTab = useEditorStore((s) => s.setAssetLibraryTab);
  const assetSearch = useEditorStore((s) => s.assetSearch);
  const setAssetSearch = useEditorStore((s) => s.setAssetSearch);
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return ASSET_CATALOG.filter((asset) => {
      if (assetLibraryTab === "Favorites") return false;
      if (assetLibraryTab === "Uploads") return false;
      if (activeLayer === "layout" && asset.category === "AV Gear") return false;
      if (
        activeLayer === "av" &&
        asset.category !== "AV Gear" &&
        asset.category !== "Media Equipment"
      ) {
        return false;
      }
      if (!query) return true;
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
    });
  }, [activeLayer, assetLibraryTab, assetSearch]);

  const toggleCategory = (category: AssetCategory) =>
    setCollapsed((current) => ({
      ...current,
      [category]: !current[category],
    }));

  return (
    <aside className="flex shrink-0 border-r border-[#ececec] bg-white">
      <div className="flex w-[72px] flex-col items-center gap-4 border-r border-[#ececec] py-6">
        {[
          { mode: "select" as const, icon: MousePointer2 },
          { mode: "move" as const, icon: Move3D },
          { mode: "rotate" as const, icon: RotateCw },
          { mode: "scale" as const, icon: Scale3D },
          { mode: "connect" as const, icon: Cable },
        ].map((entry) => {
          const Icon = entry.icon;
          const active = toolMode === entry.mode;
          return (
            <button
              key={entry.mode}
              onClick={() => setToolMode(entry.mode)}
              className={`flex h-12 w-12 items-center justify-center rounded-[14px] border transition ${
                active
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-transparent text-[#555555] hover:bg-[#f6f6f4]"
              }`}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}

        <div className="mt-2 h-px w-8 bg-[#ececec]" />

        <button className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#d9d9d9] bg-[#f8f8f6] text-[#555555]">
          <Shapes className="h-5 w-5" />
        </button>
      </div>

      <div className="flex w-[220px] flex-col">
        <div className="border-b border-[#ececec] px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#989898]" />
            <input
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-[12px] border border-[#e1e1e1] bg-[#fafaf8] py-2 pl-10 pr-3 text-[13px] text-[#111111] outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1">
            {(["Assets", "Uploads", "Favorites"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAssetLibraryTab(tab)}
                className={`rounded-[10px] px-2 py-2 text-[11px] font-medium transition ${
                  assetLibraryTab === tab
                    ? "bg-[#111111] text-white"
                    : "text-[#666666] hover:bg-[#f6f6f4]"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab === "Assets" ? null : tab === "Uploads" ? (
                    <UploadCloud className="h-3.5 w-3.5" />
                  ) : (
                    <Heart className="h-3.5 w-3.5" />
                  )}
                  {tab}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="sf-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {assetLibraryTab !== "Assets" ? (
            <div className="rounded-[14px] border border-dashed border-[#d6d6d6] bg-[#fafaf8] px-4 py-8 text-center text-[13px] text-[#707070]">
              {assetLibraryTab === "Uploads"
                ? "Uploads will appear here when custom asset ingestion is added."
                : "Favorites will appear here once asset starring is enabled."}
            </div>
          ) : (
            <div className="space-y-4">
              {CATEGORIES.map((category) => {
                const categoryAssets = filteredAssets.filter(
                  (asset) => asset.category === category,
                );

                if (categoryAssets.length === 0) return null;

                return (
                  <section
                    key={category}
                    className="rounded-[14px] border border-[#ececec] bg-[#fcfcfb]"
                  >
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
                          {category}
                        </div>
                        <div className="mt-1 text-[12px] text-[#6d6d6d]">
                          {categoryAssets.length} items
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[#7b7b7b] transition ${
                          collapsed[category] ? "-rotate-90" : ""
                        }`}
                      />
                    </button>

                    {!collapsed[category] ? (
                      <div className="grid gap-2 px-3 pb-3">
                        {categoryAssets.map((asset) => (
                          <button
                            key={asset.id}
                            draggable
                            onDragStart={(event) =>
                              event.dataTransfer.setData("text/asset-id", asset.id)
                            }
                            onClick={() => addItemFromAsset(asset.id)}
                            className="flex items-center gap-3 rounded-[12px] border border-[#e6e6e6] bg-white p-2.5 text-left transition hover:border-[#cfcfcf] hover:shadow-sm"
                          >
                            <div className="relative h-12 w-14 overflow-hidden rounded-[10px] border border-[#ececec] bg-[#f6f6f4]">
                              <Image
                                src={asset.thumbnail}
                                alt={asset.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-medium text-[#111111]">
                                {asset.name}
                              </div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#9a9a9a]">
                                {asset.category}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
