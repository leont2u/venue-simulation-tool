"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/UseEditorStore";

export function EditorShortcuts() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const project = useEditorStore((s) => s.project);
  const updateItem = useEditorStore((s) => s.updateItem);
  const deleteItem = useEditorStore((s) => s.deleteItem);
  const duplicateItem = useEditorStore((s) => s.duplicateItem);
  const setToolMode = useEditorStore((s) => s.setToolMode);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!project) return;

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

      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setToolMode("transform");
        return;
      }

      if (!selectedId) return;

      const item = project.items.find((i) => i.id === selectedId);
      if (!item) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteItem(selectedId);
        return;
      }

      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateItem(selectedId);
        return;
      }

      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        updateItem(selectedId, {
          rotationY: item.rotationY + Math.PI / 8,
        });
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        updateItem(selectedId, { x: item.x - 0.25 });
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        updateItem(selectedId, { x: item.x + 0.25 });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        updateItem(selectedId, { z: item.z - 0.25 });
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        updateItem(selectedId, { z: item.z + 0.25 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, project, updateItem, deleteItem, duplicateItem, setToolMode]);

  return null;
}
