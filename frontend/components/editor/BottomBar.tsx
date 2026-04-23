"use client";

import { Minus, Plus } from "lucide-react";
import { useEditorStore } from "@/store/UseEditorStore";

export function BottomBar() {
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);
  const viewportZoom = useEditorStore((s) => s.viewportZoom);
  const setViewportZoom = useEditorStore((s) => s.setViewportZoom);

  return (
    <footer className="flex h-11 items-center justify-between border-t border-[var(--sf-border)] bg-white px-4">
      <div className="flex items-center gap-1 rounded-[6px] border border-[var(--sf-border)] bg-[var(--sf-surface-soft)] p-1">
        {(["2d", "3d"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`rounded-[4px] px-3 py-1 text-[12px] font-medium transition ${
              activeView === view
                ? "bg-[var(--sf-text)] text-white"
                : "text-[var(--sf-text-muted)]"
            }`}
          >
            {view.toUpperCase()} View
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewportZoom(viewportZoom - 0.1)}
          className="rounded-[6px] border border-[var(--sf-border)] p-1.5 text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-soft)]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="min-w-[56px] text-center text-[12px] font-medium text-[var(--sf-text)]">
          {Math.round(viewportZoom * 100)}%
        </div>
        <button
          onClick={() => setViewportZoom(viewportZoom + 0.1)}
          className="rounded-[6px] border border-[var(--sf-border)] p-1.5 text-[var(--sf-text-muted)] transition hover:bg-[var(--sf-surface-soft)]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </footer>
  );
}
