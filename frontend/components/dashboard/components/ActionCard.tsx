import { LucideIcon } from "lucide-react";
import cx from "../utils/cx";

export default function ActionCard({
  icon: Icon,
  title,
  subtitle,
  active,
  tourId,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  active?: boolean;
  tourId?: string;
  onClick: () => void;
}) {
  return (
    <button
      data-tour={tourId}
      onClick={onClick}
      className={cx(
        "flex min-h-31.5 items-center gap-5 rounded-[18px] border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#c9d8d3] hover:shadow-[0_12px_30px_rgba(32,43,40,0.08)]",
        active
          ? "border-[#c5d8d3] shadow-[inset_0_0_0_1px_#c5d8d3]"
          : "border-[#e9eeee]",
      )}
    >
      <div
        className={cx(
          "flex h-12.5 w-12.5 shrink-0 items-center justify-center rounded-[13px] shadow-[0_4px_12px_rgba(32,43,40,0.12)]",
          active ? "bg-[#f1f6f4] text-[#22302c]" : "bg-[#5d7f73] text-white",
        )}
      >
        <Icon size={25} />
      </div>
      <div>
        <div className="text-[16px] font-bold text-[#24302d]">{title}</div>
        <div className="mt-2 text-[14px] leading-6 text-[#667873]">
          {subtitle}
        </div>
      </div>
    </button>
  );
}
