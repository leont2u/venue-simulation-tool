"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useEditorStore } from "@/store/UseEditorStore";
import { EditorHeader } from "@/components/editor/EditorHeader";

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
    if (id) {
      loadProject(id);
    }
  }, [id, loadProject]);

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400">
        Missing project id
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400">
        Loading project...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-black">
      <EditorHeader name={project.name} />
      <TopToolbar />

      <div className="flex min-h-0 flex-1">
        <AssetCatalog />
        <div className="min-w-0 flex-1">
          <SceneCanvas />
        </div>
        <PropertiesPanel />
      </div>

      <EditorShortcuts />
    </div>
  );
}
