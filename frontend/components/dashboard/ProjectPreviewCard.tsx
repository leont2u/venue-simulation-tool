"use client";

import Link from "next/link";
import formatDate from "@/lib/formatDate";
import { Project } from "@/types/types";

function inferTag(project: Project) {
  const normalized = project.name.toLowerCase();
  if (normalized.includes("wedding") || normalized.includes("prompt")) {
    return { label: "AI", className: "bg-[#dcfce7] text-[#15803d]" };
  }
  if (normalized.includes("drawio") || normalized.includes("import")) {
    return { label: "IMPORT", className: "bg-[#dbeafe] text-[#1d4ed8]" };
  }
  return { label: "MANUAL", className: "bg-[#fef9c3] text-[#854d0e]" };
}

export default function ProjectPreviewCard({ project }: { project: Project }) {
  const assetCount = project.items.length;
  const tag = inferTag(project);

  return (
    <Link
      href={`/editor/${project.id}`}
      className="overflow-hidden rounded-[8px] border border-[var(--sf-border)] bg-white transition hover:-translate-y-0.5 hover:border-[var(--sf-border-strong)] hover:shadow-[var(--sf-shadow-md)]"
    >
      <div className="flex h-[132px] items-center justify-center bg-[#f5f5f5]">
        <div className="relative w-[180px] rounded-[8px] border border-[var(--sf-border)] bg-white p-4 shadow-[var(--sf-shadow)]">
          <div className="mx-auto mb-3 h-3 w-20 rounded-full bg-[#111111]" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-6 rounded bg-[#efefef]" />
            <div className="h-6 rounded bg-[#efefef]" />
            <div className="h-6 rounded bg-[#efefef]" />
          </div>
          <div className="mt-3 h-4 w-14 rounded bg-[#efefef]" />
        </div>
      </div>

      <div className="border-t border-[var(--sf-border)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-[13px] font-semibold text-[var(--sf-text)]">
              {project.name}
            </h4>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--sf-text-faint)]">
              <span>{formatDate(project.updatedAt)}</span>
              <span>•</span>
              <span>{project.room.width}m × {project.room.depth}m</span>
            </div>
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${tag.className}`}>
            {tag.label}
          </span>
        </div>

        <div className="mt-3 text-[12px] text-[var(--sf-text-muted)]">
          {assetCount} objects in scene
        </div>
      </div>
    </Link>
  );
}
