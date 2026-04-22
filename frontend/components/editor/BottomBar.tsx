"use client";

import { Minus, Plus, Square, Box } from "lucide-react";
import { useEditorStore } from "@/store/UseEditorStore";

export function BottomBar() {
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);
  const viewportZoom = useEditorStore((s) => s.viewportZoom);
  const setViewportZoom = useEditorStore((s) => s.setViewportZoom);

  return (
    <footer className="flex h-16 items-center justify-between border-t border-black/5 bg-white px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveView("2d")}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
            activeView === "2d"
              ? "bg-[#2F3E46] text-white"
              : "bg-[#F3F6F1] text-[#52796F]"
          }`}
        >
          <Square className="h-4 w-4" />
          2D View
        </button>
        <button
          onClick={() => setActiveView("3d")}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
            activeView === "3d"
              ? "bg-[#2F3E46] text-white"
              : "bg-[#F3F6F1] text-[#52796F]"
          }`}
        >
          <Box className="h-4 w-4" />
          3D View
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewportZoom(viewportZoom - 0.1)}
          className="rounded-2xl bg-[#F3F6F1] p-2.5 text-[#52796F]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="min-w-18 text-center text-sm font-medium text-[#2F3E46]">
          {Math.round(viewportZoom * 100)}%
        </div>
        <button
          onClick={() => setViewportZoom(viewportZoom + 0.1)}
          className="rounded-2xl bg-[#F3F6F1] p-2.5 text-[#52796F]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </footer>
  );
}
