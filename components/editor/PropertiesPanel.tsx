"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/UseEditorStore";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateItem = useEditorStore((s) => s.updateItem);

  const item = useMemo(() => {
    if (!project || selectedIds.length !== 1) return null;
    return project.items.find((i) => i.id === selectedIds[0]) ?? null;
  }, [project, selectedIds]);

  return (
    <aside className="w-60 border-l border-black/5 bg-[#FCFCFA] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52796F]">
        Properties
      </div>

      {selectedIds.length === 0 ? (
        <div className="mt-4 text-base leading-7 text-[#52796F]">
          Select a shape to edit properties.
        </div>
      ) : selectedIds.length > 1 ? (
        <div className="mt-4">
          <div className="text-lg font-semibold text-[#2F3E46]">
            {selectedIds.length} items selected
          </div>
          <div className="mt-2 text-sm text-[#52796F]">
            Drag to move all selected items together or use arrow keys.
          </div>
        </div>
      ) : item ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-lg font-semibold text-[#2F3E46]">
              {item.label || item.type}
            </div>
            <div className="text-sm text-[#52796F] capitalize">{item.type}</div>
          </div>

          <label className="block">
            <div className="mb-2 text-sm text-[#52796F]">Label</div>
            <input
              value={item.label || ""}
              onChange={(e) => updateItem(item.id, { label: e.target.value })}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-[#52796F]">X</div>
            <input
              type="number"
              value={item.x}
              onChange={(e) =>
                updateItem(item.id, { x: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-[#52796F]">Z</div>
            <input
              type="number"
              value={item.z}
              onChange={(e) =>
                updateItem(item.id, { z: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-[#52796F]">Rotation Y</div>
            <input
              type="number"
              value={item.rotationY}
              onChange={(e) =>
                updateItem(item.id, { rotationY: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
            />
          </label>
        </div>
      ) : null}
    </aside>
  );
}
