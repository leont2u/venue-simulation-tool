"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Redo2,
  Save,
  Share2,
  Undo2,
} from "lucide-react";
import { useEditorStore } from "@/store/UseEditorStore";
import { ShareExportModal } from "./ShareExportModal";

export function TopToolbar() {
  const router = useRouter();
  const project = useEditorStore((s) => s.project);
  const saveProject = useEditorStore((s) => s.saveProject);
  const isProjectSaving = useEditorStore((s) => s.isProjectSaving);
  const projectError = useEditorStore((s) => s.projectError);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setActiveView = useEditorStore((s) => s.setActiveView);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const historyPast = useEditorStore((s) => s.historyPast);
  const historyFuture = useEditorStore((s) => s.historyFuture);

  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <header className="flex h-[68px] items-center justify-between border-b border-[#ececec] bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="hidden h-8 w-px bg-[#ececec] sm:block" />

          <div className="min-w-0 text-[16px] font-semibold text-[#1a1a1a]">
            <div className="truncate">{project?.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center rounded-[12px] border border-[#d8d8d8] bg-white p-1 xl:flex">
            {([
              ["layout", "Layout"],
              ["av", "AV Layer"],
              ["combined", "Combined"],
            ] as const).map(([layer, label]) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`rounded-[10px] px-3 py-2 text-[13px] font-medium transition ${
                  activeLayer === layer
                    ? "bg-[#111111] text-white"
                    : "text-[#4a4a4a]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={undo}
            disabled={historyPast.length === 0}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-[#1a1a1a] disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={historyFuture.length === 0}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-[#1a1a1a] disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
            Redo
          </button>
          <button
            onClick={() => void saveProject()}
            disabled={isProjectSaving}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-[#1a1a1a] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isProjectSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-[#d8d8d8] bg-white px-4 text-[15px] font-medium text-[#1a1a1a]"
          >
            <Share2 className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setActiveView("3d")}
            className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#111111] px-4 text-[15px] font-medium text-white"
          >
            Generate 3D
          </button>
        </div>
      </header>

      <ShareExportModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        project={project ?? null}
      />
      {projectError ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600 shadow-lg">
          {projectError}
        </div>
      ) : null}
    </>
  );
}
