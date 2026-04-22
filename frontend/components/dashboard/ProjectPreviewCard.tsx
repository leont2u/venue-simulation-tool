"use client";
import formatDate from "@/lib/formatDate";
import { Project } from "@/types/types";
import Link from "next/link";

export default function ProjectPreviewCard({ project }: { project: Project }) {
  const assetCount = project.items.length;

  return (
    <Link
      href={`/editor/${project.id}`}
      className="group overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(47,62,70,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(47,62,70,0.08)]"
    >
      <div className="border-b border-black/5 bg-[#F7F8F5] p-3">
        <div className="flex h-44 items-center justify-center rounded-3xl border border-black/5 bg-[#EEF2EC]">
          <div className="w-55 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="mx-auto mb-4 h-6 w-20 rounded-md bg-[#84A98C]" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-6 rounded bg-[#CAD2C5]" />
              <div className="h-6 rounded bg-[#CAD2C5]" />
              <div className="h-6 rounded bg-[#CAD2C5]" />
            </div>
            <div className="mt-4 h-6 w-14 rounded bg-[#CAD2C5]" />
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight text-[#2F3E46]">
            {project.name}
          </div>

          <div className="rounded-full border border-black/5 bg-[#EEF2EC] px-3 py-1 text-xs font-medium text-[#354F52]">
            {assetCount === 0 ? "Draft" : `${assetCount} Assets`}
          </div>
        </div>

        <div className="mt-3 text-base leading-7 text-[#52796F]">
          Room size: {project.room.width}m × {project.room.depth}m ×{" "}
          {project.room.height}m
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-[#52796F]">
          <span>◔</span>
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
