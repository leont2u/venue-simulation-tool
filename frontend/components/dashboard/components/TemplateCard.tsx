"use client";
import { ProjectTemplate } from "@/lib/projectTemplates";
import { useMemo } from "react";
import { templateToPreviewProject } from "../utils/templateToPreviewProject";
import estimateTemplateCapacity from "../utils/estimateTemplateCapacity";
import { ProjectThumbnail } from "../ProjectPreviewCard";
import cx from "../utils/cx";
import { Plus } from "lucide-react";

export default function TemplateCard({
  template,
  onUse,
  isCreating = false,
  disabled = false,
}: {
  template: ProjectTemplate;
  onUse: () => void;
  isCreating?: boolean;
  disabled?: boolean;
}) {
  const previewProject = useMemo(
    () => templateToPreviewProject(template),
    [template],
  );
  const capacity = estimateTemplateCapacity(template);
  const highlighted = template.category === "Church";

  return (
    <button
      onClick={onUse}
      disabled={disabled}
      className={cx(
        "group overflow-hidden rounded-[18px] border bg-white text-left transition hover:-translate-y-0.5 hover:border-[#c7d7d2] hover:shadow-[0_12px_30px_rgba(32,43,40,0.08)] disabled:cursor-wait disabled:opacity-70",
        highlighted
          ? "border-[#bcd3cd] shadow-[inset_0_0_0_1px_#bcd3cd]"
          : "border-[#e9eeee]",
      )}
    >
      <div className="relative h-54">
        <ProjectThumbnail project={previewProject} />
        {template.avReady ? (
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#24302d] shadow">
              Livestream
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#657872] shadow">
              PTZ
            </span>
          </div>
        ) : null}
        <span className="absolute bottom-3 right-3 hidden items-center gap-2 rounded-[10px] bg-[#5d7f73] px-4 py-2 text-[14px] font-bold text-white shadow group-hover:flex">
          <Plus size={18} />
          {isCreating ? "Opening" : "Use"}
        </span>
      </div>
      <div className="border-t border-[#edf1ef] p-4">
        <div className="flex items-center justify-between gap-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6e837d]">
          <span>{template.category}</span>
          <span className="font-semibold normal-case tracking-normal text-[#6e7e79]">
            {capacity.toLocaleString()} pax
          </span>
        </div>
        <div className="mt-3 truncate text-[16px] font-bold tracking-[-0.02em] text-[#24302d]">
          {template.name}
        </div>
      </div>
    </button>
  );
}
