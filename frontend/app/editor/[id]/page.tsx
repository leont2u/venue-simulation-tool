"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useEditorStore } from "@/store/UseEditorStore";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorShortcuts } from "@/components/editor/EditorShortcuts";
import { TopToolbar } from "@/components/editor/TopToolBar";
import { AssetCatalog } from "@/components/editor/AssetsCatalog";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { FloorplanCanvas } from "@/components/editor/FloorplanCanvas";

export default function EditorPage() {
  const params = useParams();
  const id = params?.id as string;

  const loadProject = useEditorStore((s) => s.loadProject);
  const project = useEditorStore((s) => s.project);
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);
  const isProjectLoading = useEditorStore((s) => s.isProjectLoading);
  const projectError = useEditorStore((s) => s.projectError);

  useEffect(() => {
    if (id) {
      void loadProject(id);
    }
  }, [id, loadProject]);

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
          <div className="relative min-w-0 flex-1 bg-[#f3f3f0]">
            <div className="absolute right-8 top-4 z-20 flex items-center rounded-[12px] border border-[#dcdcdc] bg-white p-1 shadow-sm">
              {(["2d", "3d"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`rounded-[10px] px-5 py-2 text-[15px] font-medium transition ${
                    activeView === view
                      ? "bg-[#111111] text-white"
                      : "text-[#4a4a4a]"
                  }`}
                >
                  {view.toUpperCase()}
                </button>
              ))}
            </div>

            {activeView === "3d" ? <SceneCanvas /> : <FloorplanCanvas />}
          </div>
          <PropertiesPanel />
        </div>

        <EditorShortcuts />
      </div>
    </ProtectedRoute>
  );
}
