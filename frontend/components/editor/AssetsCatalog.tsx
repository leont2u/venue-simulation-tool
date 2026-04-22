"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, Heart, Search, UploadCloud } from "lucide-react";
import { ASSET_CATALOG } from "@/lib/DemoAssets";
import { useEditorStore } from "@/store/UseEditorStore";
import { AssetCategory } from "@/types/types";

const CATEGORIES: AssetCategory[] = [
  "Seating",
  "Tables",
  "Stage & Decor",
  "Media Equipment",
];

export function AssetCatalog() {
  const addItemFromAsset = useEditorStore((s) => s.addItemFromAsset);
  const assetLibraryTab = useEditorStore((s) => s.assetLibraryTab);
  const setAssetLibraryTab = useEditorStore((s) => s.setAssetLibraryTab);
  const assetSearch = useEditorStore((s) => s.assetSearch);
  const setAssetSearch = useEditorStore((s) => s.setAssetSearch);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return ASSET_CATALOG.filter((asset) => {
      if (assetLibraryTab === "Favorites") return false;
      if (assetLibraryTab === "Uploads") return false;
      if (!query) return true;
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
    });
  }, [assetLibraryTab, assetSearch]);

  const toggleCategory = (category: AssetCategory) =>
    setCollapsed((current) => ({
      ...current,
      [category]: !current[category],
    }));

  return (
    <aside className="flex w-[320px] flex-col border-r border-black/5 bg-white">
      <div className="border-b border-black/5 px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84A98C]" />
          <input
            value={assetSearch}
            onChange={(event) => setAssetSearch(event.target.value)}
            placeholder="Search assets"
            className="w-full rounded-2xl border border-black/10 bg-[#F8FAF7] py-3 pl-11 pr-4 text-sm text-[#2F3E46]"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["Assets", "Uploads", "Favorites"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAssetLibraryTab(tab)}
              className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                assetLibraryTab === tab
                  ? "bg-[#2F3E46] text-white"
                  : "bg-[#F3F6F1] text-[#52796F] hover:bg-[#E8EEE7]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {tab === "Assets" ? null : tab === "Uploads" ? (
                  <UploadCloud className="h-4 w-4" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
                {tab}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {assetLibraryTab !== "Assets" ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-[#F8FAF7] px-5 py-8 text-center text-sm text-[#52796F]">
            {assetLibraryTab === "Uploads"
              ? "Uploads workspace is ready for custom models."
              : "Favorites will appear here once asset starring is added."}
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
                  className="rounded-3xl border border-black/5 bg-[#FCFCFA]"
                >
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left"
                  >
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#52796F]">
                        {category}
                      </div>
                      <div className="mt-1 text-sm text-[#84A98C]">
                        {categoryAssets.length} items
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-[#52796F] transition ${
                        collapsed[category] ? "-rotate-90" : ""
                      }`}
                    />
                  </button>

                  {!collapsed[category] ? (
                    <div className="grid gap-3 px-4 pb-4">
                      {categoryAssets.map((asset) => (
                        <button
                          key={asset.id}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData("text/asset-id", asset.id)
                          }
                          onClick={() => addItemFromAsset(asset.id)}
                          className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(47,62,70,0.08)]"
                        >
                          <div className="relative h-16 w-20 overflow-hidden rounded-2xl border border-black/5 bg-[#EEF3EC]">
                            <Image
                              src={asset.thumbnail}
                              alt={asset.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[#2F3E46]">
                              {asset.name}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#84A98C]">
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
    </aside>
  );
}
