"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useEditorStore } from "@/store/UseEditorStore";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorShortcuts } from "@/components/editor/EditorShortcuts";
import { TopToolbar } from "@/components/editor/TopToolBar";
import { AssetCatalog } from "@/components/editor/AssetsCatalog";
import { SceneCanvas } from "@/components/scene/SceneCanvas";

export default function EditorPage() {
  const params = useParams();
  const id = params?.id as string;

  const loadProject = useEditorStore((s) => s.loadProject);
  const project = useEditorStore((s) => s.project);

  useEffect(() => {
    if (id) loadProject(id);
  }, [id, loadProject]);

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F5] text-[#52796F]">
        Missing project id
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F5] text-[#52796F]">
        Loading project...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#F7F8F5]">
      <TopToolbar />

      <div className="flex min-h-0 flex-1">
        <AssetCatalog />
        <div className="min-w-0 flex-1 bg-[#FCFCFA]">
          <SceneCanvas />
        </div>
        <PropertiesPanel />
      </div>

      <EditorShortcuts />
    </div>
  );
}
