"use client";

import { create } from "zustand";
import { getProjectById, upsertProject } from "@/lib/storage";
import { Project, SceneItem } from "@/types/types";

type ToolMode = "select" | "move" | "rotate" | "transform";

interface EditorState {
  project: Project | null;
  selectedIds: string[];
  toolMode: ToolMode;

  loadProject: (id: string) => void;
  setProject: (project: Project) => void;

  selectItem: (id: string | null, append?: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;

  setToolMode: (mode: ToolMode) => void;

  addItem: (item: SceneItem) => void;
  updateItem: (id: string, patch: Partial<SceneItem>) => void;
  updateItems: (ids: string[], updater: (item: SceneItem) => SceneItem) => void;

  deleteSelected: () => void;
  duplicateSelected: () => void;
  moveSelectedBy: (dx: number, dz: number) => void;

  saveProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedIds: [],
  toolMode: "select",

  loadProject: (id) => {
    const project = getProjectById(id);
    set({
      project: project ?? null,
      selectedIds: [],
    });
  },

  setProject: (project) =>
    set({
      project,
      selectedIds: [],
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

  addItem: (item) => {
    const project = get().project;
    if (!project) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: [...project.items, item],
    };

    set({ project: updated, selectedIds: [item.id] });
  },

  updateItem: (id, patch) => {
    const project = get().project;
    if (!project) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: project.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    };

    set({ project: updated });
  },

  updateItems: (ids, updater) => {
    const project = get().project;
    if (!project) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: project.items.map((item) =>
        ids.includes(item.id) ? updater(item) : item,
      ),
    };

    set({ project: updated });
  },

  deleteSelected: () => {
    const project = get().project;
    const selectedIds = get().selectedIds;
    if (!project || selectedIds.length === 0) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: project.items.filter((item) => !selectedIds.includes(item.id)),
    };

    set({ project: updated, selectedIds: [] });
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
      x: item.x + 1 + index * 0.1,
      z: item.z + 1 + index * 0.1,
    }));

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: [...project.items, ...clones],
    };

    set({
      project: updated,
      selectedIds: clones.map((item) => item.id),
    });
  },

  moveSelectedBy: (dx, dz) => {
    const project = get().project;
    const selectedIds = get().selectedIds;
    if (!project || selectedIds.length === 0) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: project.items.map((item) =>
        selectedIds.includes(item.id)
          ? { ...item, x: item.x + dx, z: item.z + dz }
          : item,
      ),
    };

    set({ project: updated });
  },

  saveProject: () => {
    const project = get().project;
    if (!project) return;
    upsertProject(project);
  },
}));
