"use client";

import { useEditorStore } from "@/store/UseEditorStore";

export function AttributionBadge() {
  const project = useEditorStore((s) => s.project);

  if (!project?.attribution && !project?.forkedFromId) return null;

  const sourceTitle   = project.attribution?.sourceTitle   ?? "a community layout";
  const sourceCreator = project.attribution?.sourceCreator ?? "another planner";

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-400 px-2.5 py-1 border border-zinc-200 rounded-full bg-white/80 max-w-xs truncate">
      <span className="flex-shrink-0">Inspired by</span>
      <span className="text-zinc-600 font-medium truncate">{sourceTitle}</span>
      <span className="flex-shrink-0">by</span>
      <span className="text-zinc-600 font-medium flex-shrink-0">{sourceCreator}</span>
    </div>
  );
}
