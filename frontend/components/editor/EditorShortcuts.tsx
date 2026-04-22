"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/UseEditorStore";

export function EditorShortcuts() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const project = useEditorStore((s) => s.project);
  const updateItem = useEditorStore((s) => s.updateItem);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const moveSelectedBy = useEditorStore((s) => s.moveSelectedBy);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!project) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
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

      if (selectedIds.length === 0) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveSelectedBy(-0.25, 0);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveSelectedBy(0.25, 0);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelectedBy(0, -0.25);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelectedBy(0, 0.25);
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
    moveSelectedBy,
    redo,
    setToolMode,
    undo,
  ]);

  return null;
}
