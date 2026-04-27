"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleHelp,
  Lock,
  Trash2,
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
  const clearScene = useEditorStore((s) => s.clearScene);
  const historyPast = useEditorStore((s) => s.historyPast);
  const historyFuture = useEditorStore((s) => s.historyFuture);

  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <header
        data-tour="editor-toolbar"
        className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#ececec] bg-white px-4"
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            title="Back to dashboard"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[#677773] transition hover:bg-[#f4f6f4]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="hidden min-w-[172px] leading-none sm:block">
            <div className="truncate text-[13px] font-semibold text-[#242a28]">
              Leon Manhimamanzi
            </div>
            <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.26em] text-[#7b8a86]">
              Venue Simulation
            </div>
          </div>

          <div className="hidden h-8 w-px bg-[#ececec] lg:block" />

          <div className="min-w-0 text-[15px] font-semibold text-[#242a28]">
            <div className="truncate">{project?.name}</div>
          </div>

          <div className="hidden h-7 items-center gap-1 rounded-full bg-[#f8faf8] px-3 text-[11px] font-medium text-[#6d7b77] xl:flex">
            <Lock className="h-3.5 w-3.5" />
            {isProjectSaving ? "Saving..." : "Auto-saved 2m ago"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            <button
              onClick={() => void saveProject()}
              disabled={isProjectSaving}
              className="flex h-10 w-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#677773] transition hover:text-[#26302d] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={undo}
              disabled={historyPast.length === 0}
              className="flex h-10 w-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#677773] transition hover:text-[#26302d] disabled:opacity-35"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </button>
            <button
              onClick={redo}
              disabled={historyFuture.length === 0}
              className="flex h-10 w-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#677773] transition hover:text-[#26302d] disabled:opacity-35"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </button>
            <button
              onClick={clearScene}
              className="flex h-10 w-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#677773] transition hover:text-[#26302d]"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>

          <div className="hidden h-8 w-px bg-[#ececec] lg:block" />

          <div
            data-tour="editor-layer-toggle"
            className="hidden items-center rounded-[8px] border border-[#e6e9e7] bg-white p-0.5 2xl:flex"
          >
            {(
              [
                ["layout", "Layout"],
                ["av", "AV Layer"],
                ["combined", "Combined"],
              ] as const
            ).map(([layer, label]) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`rounded-[7px] px-3 py-1.5 text-[11px] font-semibold transition ${
                  activeLayer === layer
                    ? "bg-[#6f8f84] text-white"
                    : "text-[#62736f]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            title="Help"
            className="hidden h-9 w-9 items-center justify-center rounded-[9px] text-[#697a76] transition hover:bg-[#f4f6f4] sm:flex"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <button
            onClick={() => void saveProject()}
            disabled={isProjectSaving}
            className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#e2e6e3] bg-white px-3 text-[12px] font-semibold text-[#27312e] disabled:opacity-50 xl:hidden"
          >
            <Save className="h-4 w-4" />
            {isProjectSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setActiveView("3d")}
            className="hidden h-9 items-center gap-2 rounded-[9px] bg-[#6f8f84] px-3 text-[12px] font-semibold text-white shadow-sm lg:inline-flex"
          >
            <Share2 className="h-4 w-4" />
            3D
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
