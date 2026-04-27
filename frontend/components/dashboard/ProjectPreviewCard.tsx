"use client";

import Link from "next/link";
import formatDate from "@/lib/formatDate";
import { Project } from "@/types/types";

function inferCategory(project: Project) {
  const normalized = project.name.toLowerCase();
  if (normalized.includes("wedding") || normalized.includes("banquet"))
    return "WEDDING";
  if (normalized.includes("church") || normalized.includes("service"))
    return "CHURCH";
  if (normalized.includes("concert") || normalized.includes("festival"))
    return "CONCERT";
  if (normalized.includes("funeral") || normalized.includes("memorial"))
    return "FUNERAL";
  if (normalized.includes("live") || normalized.includes("stream"))
    return "LIVESTREAM";
  if (normalized.includes("conference") || normalized.includes("keynote"))
    return "CONFERENCE";
  return "PROJECT";
}

function estimateCapacity(project: Project) {
  const chairLike = project.items.filter((item) =>
    ["chair", "church_bench", "banquet_table", "desk"].includes(item.type),
  ).length;
  if (chairLike > 0) return Math.max(chairLike, Math.round(chairLike * 8));
  return Math.round((project.room.width * project.room.depth) / 2.8);
}

export function ProjectThumbnail({ project }: { project: Project }) {
  const roomWidth = Math.max(project.room.width, 1);
  const roomDepth = Math.max(project.room.depth, 1);
  const visibleItems = project.items.slice(0, 24);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-white via-white to-[#aeb2ae]">
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/28 to-transparent" />
      <div className="absolute inset-7 rounded-[7px] border border-[#dfe7e4] bg-white/78 shadow-inner">
        <div className="absolute inset-2 bg-[linear-gradient(rgba(93,118,110,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(93,118,110,0.08)_1px,transparent_1px)] bg-[size:18px_18px]" />
        {visibleItems.map((item) => {
          const left = 50 + (item.x / roomWidth) * 86;
          const top = 50 + (item.z / roomDepth) * 86;
          const isRound = [
            "camera",
            "speaker",
            "banquet_table",
            "chair",
          ].includes(item.type);
          const isAv = [
            "camera",
            "speaker",
            "mixing_desk",
            "screen",
            "tv",
          ].includes(item.type);
          return (
            <span
              key={item.id}
              className={`absolute block border border-white/70 shadow-sm ${
                isRound ? "rounded-full" : "rounded-[3px]"
              } ${isAv ? "bg-[#5f7f73]" : "bg-[#242b29]"}`}
              style={{
                left: `${Math.min(92, Math.max(8, left))}%`,
                top: `${Math.min(90, Math.max(10, top))}%`,
                width:
                  item.type === "screen" ? 26 : item.type === "stage" ? 34 : 12,
                height:
                  item.type === "screen" ? 5 : item.type === "stage" ? 18 : 12,
                transform: `translate(-50%, -50%) rotate(${item.rotationY}rad)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

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
      <div className={`${compact ? "h-[180px]" : "h-[176px]"} relative`}>
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
