"use client";

import { useEditorStore } from "@/store/UseEditorStore";

export function TopToolbar() {
  const saveProject = useEditorStore((s) => s.saveProject);
  const selectedId = useEditorStore((s) => s.selectedId);
  const duplicateItem = useEditorStore((s) => s.duplicateItem);
  const deleteItem = useEditorStore((s) => s.deleteItem);
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);

  const toolButton = (
    mode: "select" | "move" | "rotate" | "transform",
    label: string,
  ) => (
    <button
      onClick={() => setToolMode(mode)}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        toolMode === mode
          ? "bg-blue-500 text-white"
          : "text-zinc-300 hover:bg-zinc-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-12 items-center gap-2 border-b border-white/10 bg-zinc-950 px-3">
      <button
        onClick={saveProject}
        className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-400"
      >
        Save
      </button>

      <div className="mx-1 h-6 w-px bg-white/10" />

      {toolButton("select", "Select")}
      {toolButton("move", "Move")}
      {toolButton("rotate", "Rotate")}
      {toolButton("transform", "Gizmo")}

      <div className="mx-1 h-6 w-px bg-white/10" />

      <button
        disabled={!selectedId}
        onClick={() => selectedId && duplicateItem(selectedId)}
        className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
      >
        Duplicate
      </button>

      <button
        disabled={!selectedId}
        onClick={() => selectedId && deleteItem(selectedId)}
        className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
