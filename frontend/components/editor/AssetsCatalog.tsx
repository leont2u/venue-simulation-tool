"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  ListFilter,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Cable,
  Star,
} from "lucide-react";
import { fetchPolyPizzaAssets } from "@/lib/polyPizzaAssets";
import { useEditorStore } from "@/store/UseEditorStore";
import { AssetCategory, AssetDefinition } from "@/types/types";

const PAGE_SIZE = 32;

type CachedAssetPage = {
  results: AssetDefinition[];
  total: number;
};

const CATALOG_NAV = [
  { label: "Seating", category: "Seating", icon: "chair" },
  { label: "Tables", category: "Tables", icon: "table" },
  { label: "Decor", category: "Stage & Decor", icon: "stage" },
  { label: "Media", category: "Media Equipment", icon: "media" },
  { label: "AV Gear", category: "AV Gear", icon: "av" },
] as const;

function CatalogIcon({ type }: { type: string }) {
  if (type === "media") return <Camera className="h-4 w-4" />;
  if (type === "av") return <Cable className="h-4 w-4" />;
  if (type === "stage") return <Grid3X3 className="h-4 w-4" />;
  if (type === "table") return <ListFilter className="h-4 w-4" />;
  return <Star className="h-4 w-4" />;
}

export function AssetCatalog() {
  const addItemFromAsset = useEditorStore((s) => s.addItemFromAsset);
  const replaceSelectedFromAsset = useEditorStore((s) => s.replaceSelectedFromAsset);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const assetLibraryTab = useEditorStore((s) => s.assetLibraryTab);
  const setAssetLibraryTab = useEditorStore((s) => s.setAssetLibraryTab);
  const assetSearch = useEditorStore((s) => s.assetSearch);
  const setAssetSearch = useEditorStore((s) => s.setAssetSearch);
  const assetCatalog = useEditorStore((s) => s.assetCatalog);
  const setAssetCatalog = useEditorStore((s) => s.setAssetCatalog);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPolyLoading, setIsPolyLoading] = useState(false);
  const [polyError, setPolyError] = useState("");
  const [polyAssets, setPolyAssets] = useState<AssetDefinition[]>([]);
  const [polyPage, setPolyPage] = useState(0);
  const [polyTotal, setPolyTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<
    AssetCategory | "All"
  >("All");
  const pageCacheRef = useRef(new Map<string, CachedAssetPage>());
  const requestIdRef = useRef(0);

  const effectiveSearch = useMemo(() => {
    const query = assetSearch.trim();
    return query.length >= 3 ? query : "";
  }, [assetSearch]);

  const pageCount = Math.max(1, Math.ceil(polyTotal / PAGE_SIZE));

  const applyAssetPage = useCallback(
    (page: number, payload: CachedAssetPage) => {
      setPolyAssets(payload.results);
      setPolyPage(page);
      setPolyTotal(payload.total);
      setAssetCatalog(payload.results);
    },
    [setAssetCatalog],
  );

  const loadPolyPage = useCallback(
    async (page: number) => {
      const safePage = Math.max(0, page);
      const cacheKey = `${effectiveSearch || "__venue__"}:${safePage}`;
      const cached = pageCacheRef.current.get(cacheKey);

      setPolyError("");
      if (cached) {
        applyAssetPage(safePage, cached);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsPolyLoading(true);

      try {
        const payload = await fetchPolyPizzaAssets({
          q: effectiveSearch || undefined,
          preset: "venue",
          page: safePage,
          limit: PAGE_SIZE,
        });

        if (requestIdRef.current !== requestId) return;

        const nextPage = {
          results: payload.results,
          total: payload.total,
        };
        pageCacheRef.current.set(cacheKey, nextPage);
        applyAssetPage(safePage, nextPage);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        setPolyAssets([]);
        setPolyPage(0);
        setPolyTotal(0);
        setAssetCatalog([]);
        setPolyError(
          error instanceof Error
            ? error.message
            : "Poly Pizza assets unavailable.",
        );
      } finally {
        if (requestIdRef.current === requestId) setIsPolyLoading(false);
      }
    },
    [applyAssetPage, effectiveSearch, setAssetCatalog],
  );

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      await loadPolyPage(0);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadPolyPage]);

  const filteredAssets = useMemo(() => {
    return assetCatalog.filter((asset) => {
      if (asset.source !== "Poly Pizza") return false;
      if (assetLibraryTab !== "Assets") return false;
      if (selectedCategory !== "All" && asset.category !== selectedCategory) {
        return false;
      }
      if (activeLayer === "layout" && asset.category === "AV Gear")
        return false;
      if (
        activeLayer === "av" &&
        asset.category !== "AV Gear" &&
        asset.category !== "Media Equipment"
      ) {
        return false;
      }
      return true;
    });
  }, [activeLayer, assetCatalog, assetLibraryTab, selectedCategory]);

  if (isCollapsed) {
    return (
      <aside
        data-tour="editor-assets"
        className="flex w-[58px] shrink-0 flex-col items-center gap-3 border-r border-[#edf0ee] bg-white py-3"
      >
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand assets"
          className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#eef4f1] text-[#647b73] transition hover:bg-[#e5eeea]"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            setIsCollapsed(false);
            setAssetLibraryTab("Assets");
          }}
          title="Assets"
          className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[#555a61] transition hover:bg-[#f6f6f6]"
        >
          <Grid3X3 className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            setIsCollapsed(false);
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>(
                "[data-asset-search-input]",
              );
              input?.focus();
            }, 0);
          }}
          title="Search assets"
          className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[#555a61] transition hover:bg-[#f6f6f6]"
        >
          <Search className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      data-tour="editor-assets"
      className="flex w-[388px] shrink-0 flex-col border-r border-[#edf0ee] bg-white"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#edf0ee] px-3">
        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse assets"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#eef4f1] text-[#647b73] transition hover:bg-[#e5eeea]"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>

        <div className="relative h-10 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70807b]" />
          <input
            data-asset-search-input
            value={assetSearch}
            onChange={(event) => setAssetSearch(event.target.value)}
            placeholder="Search by entering key..."
            className="h-full w-full rounded-[12px] border border-[#e8ece9] bg-white py-2 pl-10 pr-3 text-[13px] text-[#333941] shadow-[0_1px_4px_rgba(15,23,42,0.05)] placeholder:text-[#778782] transition focus:border-[#d8d8d8]"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="sf-scroll w-[158px] shrink-0 overflow-y-auto border-r border-[#edf0ee] bg-white">
          <section className="px-2 py-3">
            <div className="mb-2 flex items-center justify-between">
              <SectionHeader>Catalog</SectionHeader>
              <Settings2 className="h-4 w-4 text-[#9b9da1]" />
            </div>
            <NavButton
              active={
                selectedCategory === "All" && assetLibraryTab === "Assets"
              }
              icon={<Grid3X3 className="h-4 w-4" />}
              label="All assets"
              onClick={() => {
                setAssetLibraryTab("Assets");
                setSelectedCategory("All");
              }}
            />
            {CATALOG_NAV.map((entry) => (
              <NavButton
                key={entry.category}
                active={
                  selectedCategory === entry.category &&
                  assetLibraryTab === "Assets"
                }
                icon={<CatalogIcon type={entry.icon} />}
                label={entry.label}
                onClick={() => {
                  setAssetLibraryTab("Assets");
                  setSelectedCategory(entry.category);
                }}
              />
            ))}
          </section>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#edf0ee] px-3 text-[11px] text-[#8a8d92]">
            <div className="min-w-0">
              <div className="truncate font-medium text-[#555a61]">
                {assetLibraryTab === "Assets"
                  ? selectedCategory === "All"
                    ? "Poly Pizza"
                    : selectedCategory
                  : assetLibraryTab}
              </div>
              <div>
                {isPolyLoading
                  ? "Loading"
                  : polyError
                    ? "Unavailable"
                    : `${filteredAssets.length}/${polyAssets.length} shown`}
              </div>
            </div>
            <button className="ml-auto flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e8ece9] text-[#62666c]">
              <ListFilter className="h-4 w-4" />
            </button>
          </div>

          <div className="sf-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
            {assetLibraryTab !== "Assets" ? (
              <div className="rounded-[8px] border border-dashed border-[#d6d6d6] bg-[#fafaf8] px-3 py-8 text-center text-[12px] text-[#707070]">
                {assetLibraryTab === "Uploads"
                  ? "Uploads are disabled while Poly Pizza is the active source."
                  : "Favorites will appear here once asset starring is enabled."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/asset-id", asset.id)
                    }
                    onClick={() => replaceSelectedFromAsset(asset.id)}
                    className="group relative aspect-[1/1] overflow-hidden rounded-[10px] border border-[#edf0ee] bg-[#fbfcfb] text-left transition hover:ring-2 hover:ring-[#d9e3de]"
                    title={
                      selectedIds.length > 0
                        ? `Replace selected with ${asset.name}`
                        : asset.attribution || asset.name
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-white/90 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                      <div className="truncate text-[10px] font-medium text-[#222831]">
                        {asset.name}
                      </div>
                      <div className="truncate text-[8px] uppercase text-[#8a8d92]">
                        {asset.creator || asset.category}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredAssets.length === 0 && !isPolyLoading ? (
                  <div className="col-span-2 rounded-[8px] border border-dashed border-[#d6d6d6] bg-[#fafaf8] px-3 py-8 text-center text-[12px] text-[#707070]">
                    No Poly Pizza assets on this page.
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex h-12 shrink-0 items-center justify-center gap-3 border-t border-[#edf0ee] text-[13px] text-[#61726d]">
            <button
              onClick={() => void loadPolyPage(polyPage - 1)}
              disabled={isPolyLoading || polyPage === 0}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#555a61] transition hover:bg-[#f6f6f6] disabled:opacity-35"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-16 text-center">
              {polyPage + 1} / {pageCount}
            </div>
            <button
              onClick={() => void loadPolyPage(polyPage + 1)}
              disabled={isPolyLoading || polyPage + 1 >= pageCount}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#555a61] transition hover:bg-[#f6f6f6] disabled:opacity-35"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase text-[#7b8985]">
      <ChevronRight className="h-3 w-3 rotate-90" />
      {children}
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
  dot,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] font-medium transition ${
        active
          ? "bg-[#eef4f1] text-[#526f65]"
          : "text-[#687773] hover:bg-[#f7f9f7]"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {dot ? (
        <span className="ml-auto h-2 w-2 rounded-full bg-[#ff2e1f]" />
      ) : null}
    </button>
  );
}
