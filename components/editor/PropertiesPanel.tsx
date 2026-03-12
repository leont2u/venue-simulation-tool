"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/UseEditorStore";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateItem = useEditorStore((s) => s.updateItem);

  const item = useMemo(() => {
    if (!project || !selectedId) return null;
    return project.items.find((i) => i.id === selectedId) ?? null;
  }, [project, selectedId]);

  if (!item) {
    return (
      <aside className="w-[320px] border-l border-white/10 bg-zinc-950/60 p-5">
        <div className="text-lg font-semibold text-white">Properties</div>
        <div className="mt-4 text-sm text-zinc-500">
          Select an asset to edit its details and label.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[320px] border-l border-white/10 bg-zinc-950/60 p-5">
      <div className="text-lg font-semibold text-white">Selected Asset</div>

      <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-500/10 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Asset Type
        </div>
        <div className="mt-2 text-xl font-medium text-white capitalize">
          {item.type}
        </div>

        <div className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">
          Current Label
        </div>
        <div className="mt-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-green-400">
          {item.label?.trim() || "No label assigned"}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm text-zinc-400">Asset Label</span>
          <input
            type="text"
            value={item.label || ""}
            onChange={(e) => updateItem(item.id, { label: e.target.value })}
            placeholder="e.g. Main Podium, Camera 1, VIP Desk"
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white placeholder:text-zinc-500"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-400">X Position</span>
          <input
            type="number"
            step="0.1"
            value={item.x}
            onChange={(e) => updateItem(item.id, { x: Number(e.target.value) })}
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-400">Z Position</span>
          <input
            type="number"
            step="0.1"
            value={item.z}
            onChange={(e) => updateItem(item.id, { z: Number(e.target.value) })}
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-400">Rotation Y</span>
          <input
            type="number"
            step="0.1"
            value={item.rotationY}
            onChange={(e) =>
              updateItem(item.id, { rotationY: Number(e.target.value) })
            }
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white"
          />
        </label>
      </div>
    </aside>
  );
}
