"use client";

import { create } from "zustand";
import { getProjectById, upsertProject } from "@/lib/storage";
import {
  AssetDefinition,
  CableType,
  EditorLayerMode,
  EditorViewMode,
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
  wallThickness: 0.15,
  wallColor: "#F6F2EC",
  floorColor: "#F4F1EA",
  floorMaterial: "Wood",
};

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

  loadProject: (id: string) => Promise<void>;
  setProject: (project: Project) => void;

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
  return {
    ...project,
    connections: project.connections ?? [],
    room: {
      ...project.room,
      wallThickness:
        project.room.wallThickness ?? project.sceneSettings?.wallThickness ?? 0.15,
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
    sourceId: asset.polyPizzaId,
    sourceUrl: asset.polyPizzaUrl,
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

  loadProject: async (id) => {
    set({ isProjectLoading: true, projectError: "" });

    try {
      const project = await getProjectById(id);
      set({
        project: project ? withSceneSettings(project) : null,
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
    set({
      project: withSceneSettings(project),
      selectedIds: [],
      historyPast: [],
      historyFuture: [],
      projectError: "",
    }),

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
}));
