"use client";

import { useState } from "react";
import {
  Eraser,
  Move3D,
  MousePointer2,
  Redo2,
  RotateCw,
  Save,
  Scale3D,
  Share2,
  Undo2,
} from "lucide-react";
import { useEditorStore } from "@/store/UseEditorStore";
import { ShareExportModal } from "./ShareExportModal";

export function TopToolbar() {
  const project = useEditorStore((s) => s.project);
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const saveProject = useEditorStore((s) => s.saveProject);
  const clearScene = useEditorStore((s) => s.clearScene);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyPast = useEditorStore((s) => s.historyPast);
  const historyFuture = useEditorStore((s) => s.historyFuture);

  const [shareOpen, setShareOpen] = useState(false);

  const toolButton = (
    mode: "select" | "move" | "rotate" | "scale",
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      onClick={() => setToolMode(mode)}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
        toolMode === mode
          ? "bg-[#2F3E46] text-white shadow-[0_10px_24px_rgba(47,62,70,0.18)]"
          : "bg-[#F3F6F1] text-[#52796F] hover:bg-[#E8EEE7]"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      <header className="flex h-18 items-center justify-between border-b border-black/5 bg-white px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#84A98C]">
            Venue Planner Pro
          </div>
          <div className="mt-1 text-xl font-semibold text-[#2F3E46]">
            {project?.name}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {toolButton("select", "Select", <MousePointer2 className="h-4 w-4" />)}
          {toolButton("move", "Move", <Move3D className="h-4 w-4" />)}
          {toolButton("rotate", "Rotate", <RotateCw className="h-4 w-4" />)}
          {toolButton("scale", "Scale", <Scale3D className="h-4 w-4" />)}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyPast.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#F3F6F1] px-4 py-2.5 text-sm font-medium text-[#52796F] hover:bg-[#E8EEE7] disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={historyFuture.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#F3F6F1] px-4 py-2.5 text-sm font-medium text-[#52796F] hover:bg-[#E8EEE7] disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
            Redo
          </button>
          <button
            onClick={saveProject}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#EDF6EF] px-4 py-2.5 text-sm font-medium text-[#2F3E46] hover:bg-[#E1EEE3]"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={clearScene}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FFF4F1] px-4 py-2.5 text-sm font-medium text-[#B25A4B] hover:bg-[#FFE8E1]"
          >
            <Eraser className="h-4 w-4" />
            Clear Scene
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#84A98C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#52796F]"
          >
            <Share2 className="h-4 w-4" />
            Share / Export
          </button>
        </div>
      </header>

      <ShareExportModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        project={project ?? null}
      />
    </>
  );
}
