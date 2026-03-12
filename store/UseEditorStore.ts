"use client";

import { create } from "zustand";
import { Project, SceneItem } from "@/types/types";
import { getProjectById, upsertProject } from "@/lib/storage";

type ToolMode = "select" | "move" | "rotate" | "transform";

interface EditorState {
  project: Project | null;
  selectedId: string | null;
  toolMode: ToolMode;

  loadProject: (id: string) => void;
  setProject: (project: Project) => void;
  selectItem: (id: string | null) => void;
  setToolMode: (mode: ToolMode) => void;

  addItem: (item: SceneItem) => void;
  updateItem: (id: string, patch: Partial<SceneItem>) => void;
  deleteItem: (id: string) => void;
  duplicateItem: (id: string) => void;

  saveProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedId: null,
  toolMode: "select",

  loadProject: (id) => {
    const project = getProjectById(id);
    if (!project) {
      set({ project: null, selectedId: null });
      return;
    }

    set({
      project,
      selectedId: null,
    });
  },

  setProject: (project) => set({ project }),

  selectItem: (id) => set({ selectedId: id }),

  setToolMode: (mode) => set({ toolMode: mode }),

  addItem: (item) => {
    const project = get().project;
    if (!project) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: [...project.items, item],
    };

    set({ project: updated, selectedId: item.id });
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

  deleteItem: (id) => {
    const project = get().project;
    if (!project) return;

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: project.items.filter((item) => item.id !== id),
    };

    set({ project: updated, selectedId: null });
  },

  duplicateItem: (id) => {
    const project = get().project;
    if (!project) return;

    const item = project.items.find((x) => x.id === id);
    if (!item) return;

    const clone: SceneItem = {
      ...item,
      id: crypto.randomUUID(),
      x: item.x + 1,
      z: item.z + 1,
    };

    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
      items: [...project.items, clone],
    };

    set({ project: updated, selectedId: clone.id });
  },

  saveProject: () => {
    const project = get().project;
    if (!project) return;
    upsertProject(project);
  },
}));
