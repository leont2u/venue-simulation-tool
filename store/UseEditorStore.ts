"use client";

import { create } from "zustand";
import { Project, SceneItem } from "@/types/types";
import { getProjectById, upsertProject } from "@/lib/storage";

type ToolMode = "select" | "move" | "rotate" | "transform";

type EditorState = {
  project: Project | null;
  selectedId: string | null;
  toolMode: ToolMode;
  projectLoaded: boolean;

  loadProject: (id: string) => void;
  saveProject: () => void;

  selectItem: (id: string | null) => void;
  setToolMode: (mode: ToolMode) => void;

  addItem: (item: SceneItem) => void;
  updateItem: (id: string, updates: Partial<SceneItem>) => void;
  duplicateItem: (id: string) => void;
  deleteItem: (id: string) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedId: null,
  toolMode: "move",
  projectLoaded: false,

  loadProject: (id) => {
    const project = getProjectById(id);

    set({
      project: project ?? null,
      selectedId: null,
      projectLoaded: true,
    });
  },

  saveProject: () => {
    const { project } = get();
    if (!project) return;

    upsertProject({
      ...project,
      updatedAt: new Date().toISOString(),
    });
  },

  selectItem: (id) => set({ selectedId: id }),
  setToolMode: (mode) => set({ toolMode: mode }),

  addItem: (item) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          items: [...state.project.items, item],
        },
        selectedId: item.id,
      };
    }),

  updateItem: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          items: state.project.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        },
      };
    }),

  duplicateItem: (id) =>
    set((state) => {
      if (!state.project) return state;
      const item = state.project.items.find((i) => i.id === id);
      if (!item) return state;

      const duplicate: SceneItem = {
        ...item,
        id: crypto.randomUUID(),
        x: item.x + 1,
        z: item.z + 1,
        label: `${item.label} Copy`,
      };

      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          items: [...state.project.items, duplicate],
        },
        selectedId: duplicate.id,
      };
    }),

  deleteItem: (id) =>
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          updatedAt: new Date().toISOString(),
          items: state.project.items.filter((item) => item.id !== id),
        },
        selectedId: state.selectedId === id ? null : state.selectedId,
      };
    }),
}));
