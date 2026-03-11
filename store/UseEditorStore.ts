"use client";

import { create } from "zustand";

import { upsertProject } from "@/lib/storage";
import { Project, SceneItem } from "@/types/types";

interface EditorState {
  project: Project | null;
  selectedId: string | null;
  setProject: (project: Project) => void;
  selectItem: (id: string | null) => void;
  addItem: (item: SceneItem) => void;
  updateItem: (id: string, patch: Partial<SceneItem>) => void;
  deleteItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  saveProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedId: null,
  setProject: (project) => set({ project }),
  selectItem: (id) => set({ selectedId: id }),
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
    const source = project.items.find((item) => item.id === id);
    if (!source) return;
    const clone: SceneItem = {
      ...source,
      id: crypto.randomUUID(),
      x: source.x + 1,
      z: source.z + 1,
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
