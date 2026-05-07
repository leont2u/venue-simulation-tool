"use client";

import { useEditorStore } from "@/store/UseEditorStore";

export function RepublishBanner() {
  const publishState = useEditorStore((s) => s.project?.publishState);
  const openDrawer   = useEditorStore((s) => s.setPublishDrawerOpen);

  if (publishState !== "PUBLISHED_DIRTY") return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
      <span className="text-amber-800 text-xs">
        Community sees an older version of this layout.
      </span>
      <button
        onClick={() => openDrawer(true)}
        className="ml-auto text-amber-900 text-xs font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap"
      >
        Update public listing →
      </button>
    </div>
  );
}
