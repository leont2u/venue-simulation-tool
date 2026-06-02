import { DiscoveryLayout, EVENT_TYPE_LABELS } from "@/types/types";
import { GitFork, Heart } from "lucide-react";
import Image from "next/image";

const EVENT_TYPE_COLORS: Record<string, string> = {
  wedding: "bg-[#f9ece9] text-[#c4736a]",
  conference: "bg-[#e8f0f7] text-[#4a7fa5]",
  funeral: "bg-[#f0f0f0] text-[#6b7280]",
  concert: "bg-[#f0ecf9] text-[#7c5cbf]",
  gala: "bg-[#f5eedf] text-[#b07d3a]",
  other: "bg-[#f0f4f2] text-[#657872]",
};

export default function PlannerLayoutCard({
  layout,
  onFork,
  isForkingThis,
}: {
  layout: DiscoveryLayout;
  onFork: (id: string) => void;
  isForkingThis: boolean;
}) {
  const color = EVENT_TYPE_COLORS[layout.eventType] ?? EVENT_TYPE_COLORS.other;
  const label = EVENT_TYPE_LABELS[layout.eventType] ?? layout.eventType;

  return (
    <div
      className="group rounded-[14px] overflow-hidden border border-[#e9eeee] bg-white
                    shadow-[0_1px_8px_rgba(32,43,40,0.05)] hover:-translate-y-0.5
                    hover:shadow-[0_8px_24px_rgba(32,43,40,0.11)] transition-all duration-200"
    >
      <div className="relative aspect-video overflow-hidden bg-[#f0f4f2]">
        {layout.coverImageUrl ? (
          <Image
            src={layout.coverImageUrl}
            alt={layout.title}
            fill
            loading="lazy"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#9ca8a3] text-xs">No preview</span>
          </div>
        )}

        <span
          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}
        >
          {label}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-2">
        <p className="text-[13.5px] font-semibold text-[#17211e] line-clamp-1">
          {layout.title}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {layout.forkCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
                <GitFork size={10} strokeWidth={2} /> {layout.forkCount}
              </span>
            )}
            {layout.likeCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#9ca8a3]">
                <Heart size={10} strokeWidth={2} /> {layout.likeCount}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onFork(layout.projectId)}
          disabled={isForkingThis}
          className="mt-1 w-full py-2 text-xs font-semibold text-[#5d7f73] border border-[#c8d8d2]
                     rounded-lg hover:bg-[#f0f4f2] disabled:opacity-50 transition-colors"
        >
          {isForkingThis ? "Duplicating…" : "Use this layout"}
        </button>
      </div>
    </div>
  );
}
