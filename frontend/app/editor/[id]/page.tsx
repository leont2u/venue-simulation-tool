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

function EditorLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#ede9df] text-[#28312d]">
      <div className="relative h-[320px] w-[520px] max-w-[90vw] overflow-hidden rounded-[8px] border border-[#d9d2c5] bg-[#f7f3ea] shadow-[0_24px_80px_rgba(62,52,39,0.18)]">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#ded6ca_1px,transparent_1px),linear-gradient(90deg,#ded6ca_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute left-12 top-12 h-44 w-72 border-[6px] border-[#3b332b] bg-[#f5efe4]/70" />
        <div className="absolute left-[76px] top-[88px] grid grid-cols-7 gap-3">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="h-3.5 w-3.5 rounded-[4px] border border-[#65786f] bg-[#95b39f] shadow-sm"
              style={{ animation: `venue-loader-pop 1.45s ${index * 0.025}s infinite ease-in-out` }}
            />
          ))}
        </div>
        <div className="absolute right-16 top-20 h-16 w-24 rounded-[6px] border border-[#39424a] bg-[#aab4bd]" />
        <div className="absolute bottom-14 left-16 h-8 w-36 rounded-[4px] bg-[#916c4b]" />
        <div className="absolute bottom-16 right-20 h-5 w-5 rounded-full bg-[#2f6d88] shadow-[0_0_0_8px_rgba(47,109,136,0.14)]" />
        <div className="absolute inset-x-0 bottom-0 border-t border-[#ded6ca] bg-white/72 px-5 py-4 backdrop-blur">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ddd5c8]">
            <div className="h-full w-1/2 rounded-full bg-[#5d7f73] shadow-[0_0_18px_rgba(93,127,115,0.4)] [animation:venue-loader-scan_1.4s_infinite_ease-in-out]" />
          </div>
          <div className="mt-3 text-[12px] font-bold uppercase text-[#61736c]">
            Building venue scene
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const updateSceneSettings = useEditorStore((s) => s.updateSceneSettings);
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
    return <EditorLoadingScreen />;
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

  const presentationMode = project.sceneSettings?.presentationMode === true;
  const cameraMode = project.sceneSettings?.cameraMode ?? "orbit";

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-[var(--sf-bg)]">
        {presentationMode ? null : <TopToolbar />}

        <div className="flex min-h-0 flex-1">
          {presentationMode ? null : <AssetCatalog />}
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
              className={`absolute bottom-4 left-6 z-20 flex items-center gap-2 ${presentationMode ? "hidden" : ""}`}
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

            <div className="absolute right-5 top-16 z-20 flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveView("3d");
                  updateSceneSettings({
                    cameraMode: cameraMode === "walkthrough" ? "orbit" : "walkthrough",
                  });
                }}
                className={`flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[12px] font-bold shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${
                  cameraMode === "walkthrough"
                    ? "border-[#5d7f73] bg-[#5d7f73] text-white"
                    : "border-[#e5e9e6] bg-white text-[#64736f]"
                }`}
              >
                <Eye className="h-4 w-4" />
                Walk
              </button>
              <button
                onClick={() => {
                  setActiveView("3d");
                  updateSceneSettings({
                    presentationMode: !presentationMode,
                    cameraMode: !presentationMode ? "walkthrough" : "orbit",
                    showGrid: presentationMode,
                  });
                }}
                className={`flex h-10 items-center gap-2 rounded-[10px] border px-3 text-[12px] font-bold shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${
                  presentationMode
                    ? "border-[#242a28] bg-[#242a28] text-white"
                    : "border-[#e5e9e6] bg-white text-[#64736f]"
                }`}
              >
                <Expand className="h-4 w-4" />
                {presentationMode ? "Exit" : "Present"}
              </button>
            </div>

            <div className={`absolute bottom-4 right-5 z-20 flex items-center gap-2 ${presentationMode ? "hidden" : ""}`}>
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
          {presentationMode ? null : <PropertiesPanel />}
        </div>

        {presentationMode ? null : <EditorShortcuts />}
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
