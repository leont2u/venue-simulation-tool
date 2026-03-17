"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/UseEditorStore";
import { ShareExportModal } from "./ShareExportModal";
import { Settings } from "lucide-react";

export function TopToolbar() {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const saveProject = useEditorStore((s) => s.saveProject);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);

  const [shareOpen, setShareOpen] = useState(false);

  const toolButton = (
    mode: "select" | "move" | "rotate" | "transform",
    label: string,
  ) => (
    <button
      onClick={() => setToolMode(mode)}
      className={`rounded-xl px-3 py-2 text-sm transition ${
        toolMode === mode
          ? "bg-[#EEF2EC] text-[#2F3E46]"
          : "text-[#52796F] hover:bg-[#F7F8F5]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-black/5 bg-white px-4">
        <div className="text-xl font-semibold text-[#52796F]">
          {project?.name}
        </div>
        <div className="flex items-center gap-2">
          {toolButton("select", "Select")}
          {toolButton("move", "Move")}
          {toolButton("rotate", "Rotate")}

          <div className="mx-2 h-6 w-px bg-black/10" />

          <button
            onClick={saveProject}
            className="rounded-xl px-3 py-2 text-sm text-[#52796F] hover:bg-[#F7F8F5]"
          >
            Save
          </button>

          <button
            disabled={selectedIds.length === 0}
            onClick={duplicateSelected}
            className="rounded-xl px-3 py-2 text-sm text-[#52796F] hover:bg-[#F7F8F5] disabled:opacity-40"
          >
            Duplicate
          </button>

          <button
            disabled={selectedIds.length === 0}
            onClick={deleteSelected}
            className="rounded-xl px-3 py-2 text-sm text-[#52796F] hover:bg-[#F7F8F5] disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-xl p-2 text-[#52796F] hover:bg-[#F7F8F5]">
            <Settings />
          </button>

          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#84A98C] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#52796F]"
          >
            Share / Export
          </button>
        </div>
      </div>

      <ShareExportModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectName={project?.name || "Project"}
      />
    </>
  );
}
