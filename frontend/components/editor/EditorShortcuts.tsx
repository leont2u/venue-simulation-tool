"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/UseEditorStore";

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return Boolean(
    element.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']",
    ),
  );
}

export function EditorShortcuts() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const project = useEditorStore((s) => s.project);
  const updateItem = useEditorStore((s) => s.updateItem);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const moveSelectedBy = useEditorStore((s) => s.moveSelectedBy);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (!project) return;
      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const primaryModifier = isMac ? e.metaKey : e.metaKey || e.ctrlKey;

      if (primaryModifier && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (primaryModifier && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (primaryModifier && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(project.items.map((item) => item.id));
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        setToolMode("select");
        return;
      }

      if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        setToolMode("move");
        return;
      }

      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        setToolMode("rotate");
        return;
      }

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        setToolMode("scale");
        return;
      }

      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setToolMode("connect");
        return;
      }

      if (selectedIds.length === 0) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveSelectedBy(e.shiftKey ? -1 : -0.25, 0);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveSelectedBy(e.shiftKey ? 1 : 0.25, 0);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelectedBy(0, e.shiftKey ? -1 : -0.25);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelectedBy(0, e.shiftKey ? 1 : 0.25);
        return;
      }

      if (e.key === "]" && selectedIds.length === 1) {
        const item = project.items.find((entry) => entry.id === selectedIds[0]);
        if (!item) return;

        e.preventDefault();
        updateItem(item.id, { rotationY: item.rotationY + Math.PI / 12 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedIds,
    project,
    updateItem,
    deleteSelected,
    duplicateSelected,
    clearSelection,
    moveSelectedBy,
    redo,
    setSelectedIds,
    setToolMode,
    undo,
  ]);

  return null;
}
