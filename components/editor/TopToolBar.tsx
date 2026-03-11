"use client";

import { useEditorStore } from "@/store/UseEditorStore";

export function TopToolbar() {
  const saveProject = useEditorStore((s) => s.saveProject);
  const selectedId = useEditorStore((s) => s.selectedId);
  const duplicateItem = useEditorStore((s) => s.duplicateItem);
  const deleteItem = useEditorStore((s) => s.deleteItem);

  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
      <button
        onClick={saveProject}
        className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white"
      >
        Save project
      </button>

      <button
        disabled={!selectedId}
        onClick={() => selectedId && duplicateItem(selectedId)}
        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 disabled:opacity-40"
      >
        Duplicate
      </button>

      <button
        disabled={!selectedId}
        onClick={() => selectedId && deleteItem(selectedId)}
        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
