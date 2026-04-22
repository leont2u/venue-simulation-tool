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
import { BottomBar } from "@/components/editor/BottomBar";
import { FloorplanCanvas } from "@/components/editor/FloorplanCanvas";

export default function EditorPage() {
  const params = useParams();
  const id = params?.id as string;

  const loadProject = useEditorStore((s) => s.loadProject);
  const project = useEditorStore((s) => s.project);
  const activeView = useEditorStore((s) => s.activeView);
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
      <div className="flex h-screen flex-col bg-[#F7F8F5]">
        <TopToolbar />

        <div className="flex min-h-0 flex-1">
          <AssetCatalog />
          <div className="min-w-0 flex-1 bg-[#FCFCFA]">
            {activeView === "3d" ? <SceneCanvas /> : <FloorplanCanvas />}
          </div>
          <PropertiesPanel />
        </div>

        <BottomBar />
        <EditorShortcuts />
      </div>
    </ProtectedRoute>
  );
}
