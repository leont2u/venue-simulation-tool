import { ChevronRight } from "lucide-react";

export default function SectionHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase text-[#7b8985]">
      <ChevronRight className="h-3 w-3 rotate-90" />
      {children}
    </div>
  );
}
