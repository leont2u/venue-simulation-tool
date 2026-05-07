"use client";

import Link from "next/link";
import formatDate from "@/lib/formatDate";
import { Project } from "@/types/types";
import estimateCapacity from "./utils/estimateCapacity";
import { ProjectThumbnail } from "./ProjectThumbnail";
import inferCategory from "./utils/inferCategory";

export default function ProjectPreviewCard({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const category = inferCategory(project);
  const capacity = estimateCapacity(project);

  return (
    <Link
      href={`/editor/${project.id}`}
      className="group overflow-hidden rounded-[18px] border border-[#e9eeee] bg-white transition hover:-translate-y-0.5 hover:border-[#c7d7d2] hover:shadow-[0_12px_30px_rgba(32,43,40,0.08)]"
    >
      <div className={`${compact ? "h-45" : "h-44"} relative`}>
        <ProjectThumbnail project={project} />
      </div>

      <div className="border-t border-[#edf1ef] p-4">
        <div className="flex items-center justify-between gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6e837d]">
          <span>{category}</span>
          <span className="font-semibold normal-case tracking-normal text-[#6e7e79]">
            {capacity.toLocaleString()} pax
          </span>
        </div>
        <h4 className="mt-3 truncate text-[16px] font-bold tracking-[-0.02em] text-[#24302d]">
          {project.name}
        </h4>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-[#6c7d78]">
          <span>◷</span>
          <span>{formatDate(project.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
