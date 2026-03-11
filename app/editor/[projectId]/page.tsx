"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getProjectById } from "@/lib/storage";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { useEditorStore } from "@/store/UseEditorStore";
import { TopToolbar } from "@/components/editor/TopToolBar";
import { AssetCatalog } from "@/components/editor/AssetsCatalog";
import { SceneCanvas } from "@/components/scene/SceneCanvas";

export default function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const setProject = useEditorStore((s) => s.setProject);
  const project = useEditorStore((s) => s.project);

  useEffect(() => {
    if (!params?.projectId) return;
    const found = getProjectById(params.projectId);
    if (found) setProject(found);
  }, [params?.projectId, setProject]);

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-400">
        Loading editor...
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#111113] text-white">
      <EditorHeader name={project.name} />
      <TopToolbar />

      <div className="grid h-[calc(100vh-121px)] grid-cols-[280px_1fr_300px]">
        <AssetCatalog />
        <div className="bg-[#111113]">
          <SceneCanvas />
        </div>
        <PropertiesPanel />
      </div>
    </main>
  );
}
