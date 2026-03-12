"use client";

import { useEditorStore } from "@/store/UseEditorStore";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateItem = useEditorStore((s) => s.updateItem);
  const toolMode = useEditorStore((s) => s.toolMode);

  const item = project?.items.find((i) => i.id === selectedId);

  const setNumber = (field: "x" | "z" | "rotationY", value: string) => {
    if (!item) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    updateItem(item.id, { [field]: parsed });
  };

  return (
    <aside className="flex h-full min-h-0 w-72 flex-col border-l border-white/10 bg-zinc-950">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold text-white">Properties</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!item ? (
          <div className="text-sm text-zinc-500">
            Select an object to inspect it.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="mt-1 text-xs text-zinc-500">
                Active tool: {toolMode}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-zinc-900 p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Quick actions
              </div>
              <div className="mt-2 space-y-1 text-sm text-zinc-300">
                <div>Drag object to move</div>
                <div>Press R to rotate</div>
                <div>Press Delete to remove</div>
              </div>
            </div>

            <label className="block">
              <div className="mb-1 text-xs text-zinc-500">X</div>
              <input
                value={item.x}
                onChange={(e) => setNumber("x", e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs text-zinc-500">Z</div>
              <input
                value={item.z}
                onChange={(e) => setNumber("z", e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs text-zinc-500">Rotation Y</div>
              <input
                value={item.rotationY}
                onChange={(e) => setNumber("rotationY", e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none"
              />
            </label>
          </div>
        )}
      </div>
    </aside>
  );
}
