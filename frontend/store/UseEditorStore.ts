"use client";

import { create } from "zustand";
import { fetchPolyPizzaAssets } from "@/lib/polyPizzaAssets";
import { apiClient } from "@/lib/apiClient";
import { getProjectById, upsertProject } from "@/lib/storage";
import {
  AssetDefinition,
  CableType,
  EditorLayerMode,
  EditorViewMode,
  LayoutVisibility,
  Project,
  SceneItem,
  SceneSettings,
} from "@/types/types";

type ToolMode = "select" | "move" | "rotate" | "scale" | "connect";

type HistoryState = {
  project: Project;
};

const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  showGrid: true,
  enableHdri: true,
  ambientLightIntensity: 1.1,
  directionalLightIntensity: 2.1,
  snapToGrid: true,
  livestreamMode: false,
  cameraMode: "orbit",
  presentationMode: false,
  wallThickness: 0.15,
  wallColor: "#F6F2EC",
  floorColor: "#F4F1EA",
  floorMaterial: "Wood",
  wallMaterial: "Painted",
  venueEnvironment: "indoor",
  lightingMood: "presentation",
};

// PolyPizza fallback queries for types not covered by pinned Sketchfab models
const POLYPIZZA_FALLBACK_QUERIES: Record<string, string> = {
  banquet_table:     "banquet table",
  rectangular_table: "rectangular table",
  desk:              "desk",
  mixing_desk:       "mixing desk",
};

// Cache for pinned assets fetched from the backend (type → AssetDefinition)
let _pinnedAssetsCache: Record<string, AssetDefinition> | null = null;

async function fetchPinnedAssets(): Promise<Record<string, AssetDefinition>> {
  if (_pinnedAssetsCache) return _pinnedAssetsCache;
  try {
    const r = await apiClient.get<{ results: Array<AssetDefinition & { pinnedType: string }> }>(
      "/api/assets/sketchfab/pinned/"
    );
    const map: Record<string, AssetDefinition> = {};
    for (const asset of r.data.results ?? []) {
      if (asset.pinnedType) map[asset.pinnedType] = asset;
    }
    _pinnedAssetsCache = map;
    return map;
  } catch {
    return {};
  }
}

function requiredAssetType(assetUrl: string) {
  if (!assetUrl.startsWith("poly-pizza://required/")) return "";
  return assetUrl.replace("poly-pizza://required/", "").split("?")[0];
}

function needsRequiredAssetResolution(item: SceneItem) {
  return item.assetUrl.startsWith("poly-pizza://required/");
}

function applyResolvedAsset(item: SceneItem, asset: AssetDefinition): SceneItem {
  return {
    ...item,
    assetUrl: asset.modelUrl,
    source: asset.source,
    sourceId: asset.sourceId || asset.polyPizzaId || asset.sketchfabUid || asset.id,
    sourceUrl: asset.sourceUrl || asset.polyPizzaUrl || asset.sketchfabUrl,
    attribution: asset.attribution,
    license: asset.license,
    creator: asset.creator,
  };
}

async function resolveRequiredSceneAssets(project: Project): Promise<Project> {
  const requiredItems = project.items.filter(needsRequiredAssetResolution);
  if (!requiredItems.length) return project;

  // Load pinned Sketchfab assets once (cached after first call)
  const pinnedAssets = await fetchPinnedAssets();

  const polyPizzaCache = new Map<string, AssetDefinition | null>();
  const nextItems = [...project.items];

  for (const item of requiredItems) {
    const assetType = requiredAssetType(item.assetUrl) || item.type;

    // 1. Use exact pinned Sketchfab model if we have one for this type
    let asset: AssetDefinition | null | undefined = pinnedAssets[assetType] ?? null;

    // 2. Fall back to PolyPizza search for types not in the pinned list
    if (!asset) {
      const fallbackQuery =
        item.assetSearch ||
        POLYPIZZA_FALLBACK_QUERIES[assetType] ||
        assetType.replace(/_/g, " ");
      const cacheKey = `poly-pizza:${fallbackQuery.toLowerCase()}`;
      if (!polyPizzaCache.has(cacheKey)) {
        try {
          const payload = await fetchPolyPizzaAssets({
            q: fallbackQuery,
            preset: "venue",
            page: 0,
            limit: 8,
          });
          polyPizzaCache.set(cacheKey, payload.results[0] ?? null);
        } catch {
          polyPizzaCache.set(cacheKey, null);
        }
      }
      asset = polyPizzaCache.get(cacheKey);
    }

    if (!asset) continue;

    const index = nextItems.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      nextItems[index] = applyResolvedAsset(nextItems[index], asset);
    }
  }

  return { ...project, items: nextItems };
}

interface EditorState {
  project: Project | null;
  selectedIds: string[];
  toolMode: ToolMode;
  activeView: EditorViewMode;
  activeLayer: EditorLayerMode;
  assetLibraryTab: "Assets" | "Uploads" | "Favorites";
  assetSearch: string;
  assetCatalog: AssetDefinition[];
  viewportZoom: number;
  historyPast: HistoryState[];
  historyFuture: HistoryState[];
  isProjectLoading: boolean;
  isProjectSaving: boolean;
  projectError: string;

  // Publishing state
  publishDrawerOpen: boolean;
  isPublishing: boolean;
  publishError: string;

  loadProject: (id: string) => Promise<void>;
  setProject: (project: Project) => void;

  // Publishing actions
  setPublishDrawerOpen: (open: boolean) => void;
  setLayoutVisibility: (visibility: LayoutVisibility) => Promise<void>;
  updatePublishedListing: (listing: Project["publishedListing"]) => void;
  clearPublishError: () => void;

  selectItem: (id: string | null, append?: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;

  setToolMode: (mode: ToolMode) => void;
  setActiveView: (view: EditorViewMode) => void;
  setActiveLayer: (layer: EditorLayerMode) => void;
  setAssetLibraryTab: (tab: "Assets" | "Uploads" | "Favorites") => void;
  setAssetSearch: (value: string) => void;
  setAssetCatalog: (assets: AssetDefinition[]) => void;
  setViewportZoom: (value: number) => void;

  addItem: (item: SceneItem) => void;
  addItemFromAsset: (assetId: string) => void;
  replaceSelectedFromAsset: (assetId: string) => void;
  clearScene: () => void;
  updateItem: (id: string, patch: Partial<SceneItem>) => void;
  updateItems: (ids: string[], updater: (item: SceneItem) => SceneItem) => void;
  updateItemsTransient: (ids: string[], updater: (item: SceneItem) => SceneItem) => void;
  applyProjectMutation: (updater: (project: Project) => Project) => void;
  commitProjectSnapshot: (beforeProject: Project) => void;
  renameProject: (name: string) => void;
  addConnection: (fromItemId: string, toItemId: string, cableType?: CableType) => void;
  removeConnectionsForItem: (itemId: string) => void;

  deleteSelected: () => void;
  duplicateSelected: () => void;
  moveSelectedBy: (dx: number, dz: number) => void;
  updateSceneSettings: (patch: Partial<SceneSettings>) => void;

  undo: () => void;
  redo: () => void;
  saveProject: () => Promise<void>;
}

function withSceneSettings(project: Project): Project {
  const hasUsableArchitecture =
    project.architecture &&
    Array.isArray(project.architecture.doors) &&
    Array.isArray(project.architecture.windows) &&
    Array.isArray(project.architecture.columns) &&
    Array.isArray(project.architecture.entrances) &&
    Array.isArray(project.architecture.exits) &&
    Array.isArray(project.architecture.stageAccessRoutes);
  const venueEnvironment = project.sceneSettings?.venueEnvironment ?? "indoor";
  const isOutdoor = venueEnvironment === "outdoor";

  return {
    ...project,
    connections: project.connections ?? [],
    items: project.items.map((item) =>
      item.assetUrl.startsWith("/models/")
        ? {
            ...item,
            assetUrl: `poly-pizza://required/${item.type}`,
            assetSearch:
              item.assetSearch ||
              POLYPIZZA_FALLBACK_QUERIES[item.type] ||
              item.type.replace(/_/g, " "),
            source: "Poly Pizza",
            sourceId: undefined,
            sourceUrl: undefined,
            attribution: "Choose a matching Poly Pizza model from the asset catalog.",
          }
        : item,
    ),
    room: {
      ...project.room,
      wallThickness:
        project.room.wallThickness ?? project.sceneSettings?.wallThickness ?? 0.15,
    },
    architecture: hasUsableArchitecture ? project.architecture : {
      shape: "rectangular",
      doors: isOutdoor ? [] : [
        {
          id: "door-main",
          wall: "south",
          offset: 0,
          width: Math.min(3.2, Math.max(1.6, project.room.width * 0.14)),
          height: 2.35,
          label: "Main entrance",
        },
      ],
      windows: isOutdoor ? [] : [
        {
          id: "window-west-1",
          wall: "west",
          offset: -project.room.depth * 0.22,
          width: 2.6,
          height: 1.4,
          sillHeight: 1.15,
        },
        {
          id: "window-east-1",
          wall: "east",
          offset: project.room.depth * 0.22,
          width: 2.6,
          height: 1.4,
          sillHeight: 1.15,
        },
      ],
      columns: [],
      entrances: [],
      exits: isOutdoor ? [] : [
        {
          id: "exit-north-east",
          wall: "north",
          offset: project.room.width * 0.34,
          width: 1.4,
          height: 2.2,
          label: "Exit",
        },
      ],
      stageAccessRoutes: [
        {
          id: "route-center-aisle",
          label: "Stage access",
          width: 1.4,
          points: [
            { x: 0, z: project.room.depth / 2 - 1.5 },
            { x: 0, z: -project.room.depth / 2 + 3.5 },
          ],
        },
      ],
      hasCeiling: !isOutdoor,
      ceilingHeight: project.room.height,
      decorativeLighting: !isOutdoor,
      stageBackdrop: "draping",
    },
    sceneSettings: {
      ...DEFAULT_SCENE_SETTINGS,
      ...project.sceneSettings,
    },
  };
}

function snapshot(project: Project): HistoryState {
  return {
    project: {
      ...project,
      room: { ...project.room },
      connections: (project.connections ?? []).map((connection) => ({ ...connection })),
      sceneSettings: project.sceneSettings
        ? { ...project.sceneSettings }
        : { ...DEFAULT_SCENE_SETTINGS },
      architecture: project.architecture
        ? {
            ...project.architecture,
            boundary: project.architecture.boundary?.map((point) => ({ ...point })),
            doors: project.architecture.doors.map((entry) => ({ ...entry })),
            windows: project.architecture.windows.map((entry) => ({ ...entry })),
            columns: project.architecture.columns.map((entry) => ({ ...entry })),
            entrances: project.architecture.entrances.map((entry) => ({ ...entry })),
            exits: project.architecture.exits.map((entry) => ({ ...entry })),
            stageAccessRoutes: project.architecture.stageAccessRoutes.map((route) => ({
              ...route,
              points: route.points.map((point) => ({ ...point })),
            })),
          }
        : undefined,
      items: project.items.map((item) => ({
        ...item,
        scale: [...item.scale] as [number, number, number],
        material: item.material ? { ...item.material } : undefined,
      })),
    },
  };
}

function applySnap(value: number, enabled: boolean) {
  return enabled ? Math.round(value * 4) / 4 : value;
}

function createItemFromAsset(
  assetId: string,
  existingCount: number,
  assetCatalog: AssetDefinition[],
): SceneItem {
  const asset = assetCatalog.find((entry) => entry.id === assetId);
  if (!asset) {
    throw new Error(`Asset "${assetId}" not found.`);
  }

  return {
    id: crypto.randomUUID(),
    type: asset.type,
    x: -3 + (existingCount % 6) * 1.4,
    y: 0,
    z: -2 + Math.floor(existingCount / 6) * 1.4,
    rotationY: 0,
    scale: asset.defaultScale,
    assetUrl: asset.modelUrl,
    label: asset.name,
    source: asset.source,
    sourceId: asset.sourceId || asset.polyPizzaId || asset.sketchfabUid || asset.id,
    sourceUrl: asset.sourceUrl || asset.polyPizzaUrl || asset.sketchfabUrl,
    attribution: asset.attribution,
    license: asset.license,
    creator: asset.creator,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedIds: [],
  toolMode: "select",
  activeView: "3d",
  activeLayer: "combined",
  assetLibraryTab: "Assets",
  assetSearch: "",
  assetCatalog: [],
  viewportZoom: 1,
  historyPast: [],
  historyFuture: [],
  isProjectLoading: false,
  isProjectSaving: false,
  projectError: "",

  // Publishing state
  publishDrawerOpen: false,
  isPublishing: false,
  publishError: "",

  loadProject: async (id) => {
    set({ isProjectLoading: true, projectError: "" });

    try {
      const project = await getProjectById(id);
      const hydratedProject = project
        ? withSceneSettings(await resolveRequiredSceneAssets(withSceneSettings(project)))
        : null;
      set({
        project: hydratedProject,
        selectedIds: [],
        historyPast: [],
        historyFuture: [],
        isProjectLoading: false,
        projectError: project ? "" : "Project not found.",
      });
    } catch (error) {
      set({
        project: null,
        selectedIds: [],
        historyPast: [],
        historyFuture: [],
        isProjectLoading: false,
        projectError:
          error instanceof Error ? error.message : "Failed to load project.",
      });
    }
  },

  setProject: (project) =>
    {
      const baseProject = withSceneSettings(project);
      set({
        project: baseProject,
        selectedIds: [],
        historyPast: [],
        historyFuture: [],
        projectError: "",
      });

      void resolveRequiredSceneAssets(baseProject).then((resolvedProject) => {
        set((state) => {
          if (state.project?.id !== baseProject.id) return state;
          return { project: withSceneSettings(resolvedProject) };
        });
      });
    },

  selectItem: (id, append = false) => {
    if (!id) {
      set({ selectedIds: [] });
      return;
    }

    const current = get().selectedIds;

    if (append) {
      if (current.includes(id)) {
        set({ selectedIds: current.filter((x) => x !== id) });
      } else {
        set({ selectedIds: [...current, id] });
      }
    } else {
      set({ selectedIds: [id] });
    }
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setToolMode: (mode) => set({ toolMode: mode }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setAssetLibraryTab: (tab) => set({ assetLibraryTab: tab }),
  setAssetSearch: (value) => set({ assetSearch: value }),
  setAssetCatalog: (assets) => set({ assetCatalog: assets }),
  setViewportZoom: (value) => set({ viewportZoom: Math.min(2.5, Math.max(0.5, value)) }),

  applyProjectMutation: (updater) => {
    const project = get().project;
    if (!project) return;

    const currentSnapshot = snapshot(project);
    const nextProject = withSceneSettings({
      ...updater(snapshot(project).project),
      updatedAt: new Date().toISOString(),
    });

    set((state) => ({
      project: nextProject,
      historyPast: [...state.historyPast.slice(-49), currentSnapshot],
      historyFuture: [],
    }));
  },

  commitProjectSnapshot: (beforeProject) => {
    const project = get().project;
    if (!project) return;

    set((state) => ({
      project: {
        ...project,
        updatedAt: new Date().toISOString(),
      },
      historyPast: [...state.historyPast.slice(-49), snapshot(beforeProject)],
      historyFuture: [],
    }));
  },

  renameProject: (name) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    get().applyProjectMutation((project) =>
      project.name === cleanName ? project : { ...project, name: cleanName },
    );
  },

  addItem: (item) => {
    get().applyProjectMutation((project) => ({
      ...project,
      items: [...project.items, item],
    }));

    set({ selectedIds: [item.id] });
  },

  addItemFromAsset: (assetId) => {
    const project = get().project;
    if (!project) return;

    const item = createItemFromAsset(assetId, project.items.length, get().assetCatalog);
    get().addItem(item);
  },

  replaceSelectedFromAsset: (assetId) => {
    const project = get().project;
    const selectedIds = get().selectedIds;
    const asset = get().assetCatalog.find((entry) => entry.id === assetId);
    if (!project || !asset) return;

    if (selectedIds.length === 0) {
      get().addItemFromAsset(assetId);
      return;
    }

    get().applyProjectMutation((currentProject) => ({
      ...currentProject,
      items: currentProject.items.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              type: asset.type,
              scale: asset.defaultScale,
              assetUrl: asset.modelUrl,
              label: asset.name,
              source: asset.source,
              sourceId: asset.sourceId || asset.polyPizzaId || asset.sketchfabUid || asset.id,
              sourceUrl: asset.sourceUrl || asset.polyPizzaUrl || asset.sketchfabUrl,
              attribution: asset.attribution,
              license: asset.license,
              creator: asset.creator,
              color: undefined,
              material: undefined,
            }
          : item,
      ),
    }));

    set({ selectedIds });
  },

  addConnection: (fromItemId, toItemId, cableType = "video") => {
    if (fromItemId === toItemId) return;

    get().applyProjectMutation((project) => {
      const existing = project.connections ?? [];
      const duplicate = existing.some(
        (connection) =>
          (connection.fromItemId === fromItemId &&
            connection.toItemId === toItemId) ||
          (connection.fromItemId === toItemId &&
            connection.toItemId === fromItemId),
      );

      if (duplicate) return project;

      return {
        ...project,
        connections: [
          ...existing,
          {
            id: crypto.randomUUID(),
            fromItemId,
            toItemId,
            cableType,
          },
        ],
      };
    });
  },

  removeConnectionsForItem: (itemId) => {
    get().applyProjectMutation((project) => ({
      ...project,
      connections: (project.connections ?? []).filter(
        (connection) =>
          connection.fromItemId !== itemId && connection.toItemId !== itemId,
      ),
    }));
  },

  clearScene: () => {
    get().applyProjectMutation((project) => ({
      ...project,
      items: [],
    }));
    set({ selectedIds: [] });
  },

  updateItem: (id, patch) => {
    get().applyProjectMutation((project) => ({
      ...project,
      items: project.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  },

  updateItems: (ids, updater) => {
    get().applyProjectMutation((project) => ({
      ...project,
      items: project.items.map((item) =>
        ids.includes(item.id) ? updater(item) : item,
      ),
    }));
  },

  updateItemsTransient: (ids, updater) => {
    const project = get().project;
    if (!project) return;

    set({
      project: withSceneSettings({
        ...project,
        items: project.items.map((item) =>
          ids.includes(item.id) ? updater(item) : item,
        ),
      }),
    });
  },

  deleteSelected: () => {
    const selectedIds = get().selectedIds;
    if (selectedIds.length === 0) return;

    get().applyProjectMutation((project) => ({
      ...project,
      items: project.items.filter((item) => !selectedIds.includes(item.id)),
      connections: (project.connections ?? []).filter(
        (connection) =>
          !selectedIds.includes(connection.fromItemId) &&
          !selectedIds.includes(connection.toItemId),
      ),
    }));
    set({ selectedIds: [] });
  },

  duplicateSelected: () => {
    const project = get().project;
    const selectedIds = get().selectedIds;
    if (!project || selectedIds.length === 0) return;

    const selectedItems = project.items.filter((item) =>
      selectedIds.includes(item.id),
    );

    const clones = selectedItems.map((item, index) => ({
      ...item,
      id: crypto.randomUUID(),
      x: item.x + 1 + index * 0.2,
      z: item.z + 1 + index * 0.2,
    }));

    get().applyProjectMutation((currentProject) => ({
      ...currentProject,
      items: [...currentProject.items, ...clones],
    }));

    set({
      selectedIds: clones.map((item) => item.id),
    });
  },

  moveSelectedBy: (dx, dz) => {
    const project = get().project;
    const selectedIds = get().selectedIds;
    if (!project || selectedIds.length === 0) return;

    const snapToGrid = project.sceneSettings?.snapToGrid ?? true;

    get().applyProjectMutation((currentProject) => ({
      ...currentProject,
      items: currentProject.items.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              x: applySnap(item.x + dx, snapToGrid),
              z: applySnap(item.z + dz, snapToGrid),
            }
          : item,
      ),
    }));
  },

  updateSceneSettings: (patch) => {
    get().applyProjectMutation((project) => ({
      ...project,
      architecture: patch.venueEnvironment
        ? {
            ...(project.architecture ?? {
              shape: "rectangular",
              doors: [],
              windows: [],
              columns: [],
              entrances: [],
              exits: [],
              stageAccessRoutes: [],
            }),
            hasCeiling: patch.venueEnvironment !== "outdoor",
            decorativeLighting: patch.venueEnvironment !== "outdoor",
          }
        : project.architecture,
      sceneSettings: {
        ...DEFAULT_SCENE_SETTINGS,
        ...project.sceneSettings,
        ...patch,
      },
    }));
  },

  undo: () => {
    const { project, historyPast, historyFuture } = get();
    if (!project || historyPast.length === 0) return;

    const previous = historyPast[historyPast.length - 1];
    set({
      project: withSceneSettings(previous.project),
      historyPast: historyPast.slice(0, -1),
      historyFuture: [snapshot(project), ...historyFuture].slice(0, 50),
      selectedIds: [],
    });
  },

  redo: () => {
    const { project, historyPast, historyFuture } = get();
    if (!project || historyFuture.length === 0) return;

    const next = historyFuture[0];
    set({
      project: withSceneSettings(next.project),
      historyPast: [...historyPast, snapshot(project)].slice(-50),
      historyFuture: historyFuture.slice(1),
      selectedIds: [],
    });
  },

  saveProject: async () => {
    const project = get().project;
    if (!project) return;

    set({ isProjectSaving: true, projectError: "" });

    try {
      const savedProject = await upsertProject(project);
      set({
        project: withSceneSettings(savedProject),
        isProjectSaving: false,
      });
    } catch (error) {
      set({
        isProjectSaving: false,
        projectError:
          error instanceof Error ? error.message : "Failed to save project.",
      });
      throw error;
    }
  },

  // ─── Publishing actions ────────────────────────────────────────────────────

  setPublishDrawerOpen: (open) => set({ publishDrawerOpen: open, publishError: "" }),

  clearPublishError: () => set({ publishError: "" }),

  updatePublishedListing: (listing) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        publishedListing: listing,
        visibility:       listing ? "PUBLIC" : "PRIVATE",
        publishState:     listing ? "PUBLISHED_CLEAN" : "DRAFT_PRIVATE",
      },
    });
  },

  setLayoutVisibility: async (visibility) => {
    const project = get().project;
    if (!project) return;

    const previous = project.visibility;

    // Optimistic update
    set({ project: { ...project, visibility } });

    try {
      const { apiClient } = await import("@/lib/apiClient");
      await apiClient.patch(`/api/projects/${project.id}/`, { visibility });
    } catch {
      // Roll back on failure
      set({ project: { ...project, visibility: previous } });
    }
  },
}));
