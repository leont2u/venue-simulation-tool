"use client";

import { useEditorStore } from "@/store/UseEditorStore";
import type { LayoutPublishState } from "@/types/types";

const BADGE_CONFIG: Record<
  LayoutPublishState,
  { label: string; bg: string; text: string; dotClass: string }
> = {
  DRAFT_PRIVATE:   { label: "Private",           bg: "bg-zinc-100",    text: "text-zinc-600",    dotClass: "bg-zinc-400" },
  PUBLISHED_CLEAN: { label: "Public",            bg: "bg-emerald-50",  text: "text-emerald-700", dotClass: "bg-emerald-500" },
  PUBLISHED_DIRTY: { label: "Public · Unsynced", bg: "bg-amber-50",    text: "text-amber-700",   dotClass: "bg-amber-500 animate-pulse" },
  ARCHIVED:        { label: "Archived",          bg: "bg-zinc-100",    text: "text-zinc-400",    dotClass: "bg-zinc-300" },
};

export function VisibilityBadge() {
  const project      = useEditorStore((s) => s.project);
  const openDrawer   = useEditorStore((s) => s.setPublishDrawerOpen);
  const publishState = (project?.publishState ?? "DRAFT_PRIVATE") as LayoutPublishState;
  const cfg          = BADGE_CONFIG[publishState];

  return (
    <button
      onClick={() => openDrawer(true)}
      title="Manage visibility"
      className={`
        flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
        transition-all cursor-pointer hover:opacity-80 select-none
        ${cfg.bg} ${cfg.text}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
      {cfg.label}
    </button>
  );
}
