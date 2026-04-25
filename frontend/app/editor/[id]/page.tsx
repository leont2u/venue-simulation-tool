"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Eye,
  Expand,
  Layers3,
  Minus,
  Plus,
  Lock,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EditorOnboardingTour } from "@/components/editor/EditorOnboardingTour";
import { useEditorStore } from "@/store/UseEditorStore";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorShortcuts } from "@/components/editor/EditorShortcuts";
import { TopToolbar } from "@/components/editor/TopToolBar";
import { AssetCatalog } from "@/components/editor/AssetsCatalog";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { FloorplanCanvas } from "@/components/editor/FloorplanCanvas";
import { clearQueuedEditorTour, hasQueuedEditorTour } from "@/lib/onboardingTour";

export default function EditorPage() {
  const params = useParams();
  const id = params?.id as string;

  const loadProject = useEditorStore((s) => s.loadProject);
  const project = useEditorStore((s) => s.project);
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const viewportZoom = useEditorStore((s) => s.viewportZoom);
  const setViewportZoom = useEditorStore((s) => s.setViewportZoom);
  const isProjectLoading = useEditorStore((s) => s.isProjectLoading);
  const projectError = useEditorStore((s) => s.projectError);
  const [showEditorTour, setShowEditorTour] = useState(false);

  useEffect(() => {
    if (id) {
      void loadProject(id);
    }
  }, [id, loadProject]);

  useEffect(() => {
    if (!project || !hasQueuedEditorTour()) return;

    clearQueuedEditorTour();
    setActiveView("2d");

    const frameId = window.requestAnimationFrame(() => {
      setShowEditorTour(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [project, setActiveView]);

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F5] text-[#52796F]">
        Missing project id
      </div>
    );
  }

  if (isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F5] text-[#52796F]">
        Loading project...
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F5] px-6 text-center text-[#52796F]">
        {projectError}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F5] text-[#52796F]">
        Project not found.
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-[var(--sf-bg)]">
        <TopToolbar />

        <div className="flex min-h-0 flex-1">
          <AssetCatalog />
          <div
            data-tour="editor-canvas"
            className="relative min-w-0 flex-1 overflow-hidden bg-[#f4f5f4]"
          >
            <div className="absolute right-5 top-4 z-20 rounded-[12px] border border-[#e8ece9] bg-white px-4 py-2 text-[12px] font-semibold text-[#70807b] shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
              Conference · {Math.max(0, project.items.length * 8)} pax
            </div>

            {activeView === "3d" ? <SceneCanvas /> : <FloorplanCanvas />}

            <div
              data-tour="editor-view-toggle"
              className="absolute bottom-4 left-6 z-20 flex items-center gap-2"
            >
              <button className="flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e9e6] bg-white px-3 text-[13px] font-bold text-[#33403c] shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                <Layers3 className="h-4 w-4 text-[#6f8f84]" />
                1F
              </button>
              <div className="flex h-10 items-center rounded-[10px] border border-[#e5e9e6] bg-white p-0.5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                {(["2d", "3d"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`h-9 rounded-[8px] px-4 text-[13px] font-bold transition ${
                      activeView === view
                        ? "bg-[#6f8f84] text-white"
                        : "text-[#64736f]"
                    }`}
                  >
                    {view.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setActiveLayer(activeLayer === "combined" ? "layout" : "combined")
                }
                title="Toggle layer visibility"
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e5e9e6] bg-white text-[#64736f] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute bottom-4 right-5 z-20 flex items-center gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e5e9e6] bg-white text-[#64736f] shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                <Lock className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e5e9e6] bg-white text-[#64736f] shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                <Expand className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setActiveLayer(activeLayer === "av" ? "combined" : "av")
                }
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e5e9e6] bg-white text-[#64736f] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
              >
                <Layers3 className="h-4 w-4" />
              </button>
              <div className="flex h-10 items-center rounded-[10px] border border-[#e5e9e6] bg-white px-2 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                <button
                  onClick={() => setViewportZoom(viewportZoom - 0.1)}
                  className="flex h-8 w-8 items-center justify-center text-[#64736f]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="min-w-14 text-center text-[13px] font-bold text-[#3b4440]">
                  {Math.round(viewportZoom * 100)}%
                </div>
                <button
                  onClick={() => setViewportZoom(viewportZoom + 0.1)}
                  className="flex h-8 w-8 items-center justify-center text-[#64736f]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <PropertiesPanel />
        </div>

        <EditorShortcuts />
        <EditorOnboardingTour
          key={showEditorTour ? "open" : "closed"}
          open={showEditorTour}
          onClose={() => setShowEditorTour(false)}
          onFinish={() => setShowEditorTour(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
