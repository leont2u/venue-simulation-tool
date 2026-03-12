"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/UseEditorStore";

export function EditorHeader({ name }: { name: string }) {
  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);

  const selectedItem = useMemo(() => {
    if (!project || !selectedId) return null;
    return project.items.find((item) => item.id === selectedId) ?? null;
  }, [project, selectedId]);

  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
      <div>
        <div className="text-xl font-semibold text-white">{name}</div>
        <div className="text-sm text-zinc-500">3D venue layout editor</div>
      </div>

      <div className="flex items-center gap-4">
        {selectedItem ? (
          <div className="rounded-2xl border border-green-400/20 bg-green-500/10 px-4 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              Selected
            </div>
            <div className="text-sm font-medium text-green-400">
              {selectedItem.label?.trim() || selectedItem.type}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
