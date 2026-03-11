"use client";

import { useEditorStore } from "@/store/UseEditorStore";
import { useMemo } from "react";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateItem = useEditorStore((s) => s.updateItem);

  const item = useMemo(() => {
    return project?.items.find((i) => i.id === selectedId) ?? null;
  }, [project, selectedId]);

  if (!item) {
    return (
      <aside className="border-l border-white/10 bg-zinc-950/60 p-5">
        <div className="text-lg font-semibold text-white">Properties</div>
        <div className="mt-4 text-sm text-zinc-500">
          Select an object to edit position and rotation.
        </div>
      </aside>
    );
  }

  return (
    <aside className="border-l border-white/10 bg-zinc-950/60 p-5">
      <div className="text-lg font-semibold text-white">Properties</div>
      <div className="mt-1 text-sm text-zinc-500">
        {item.label || item.type}
      </div>

      <div className="mt-6 grid gap-4">
        {[
          { key: "x", label: "X", value: item.x },
          { key: "z", label: "Z", value: item.z },
          { key: "rotationY", label: "Rotation Y", value: item.rotationY },
        ].map((field) => (
          <label key={field.key} className="grid gap-2">
            <span className="text-sm text-zinc-400">{field.label}</span>
            <input
              type="number"
              step="0.1"
              value={field.value}
              onChange={(e) =>
                updateItem(item.id, { [field.key]: Number(e.target.value) })
              }
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white"
            />
          </label>
        ))}
      </div>
    </aside>
  );
}
