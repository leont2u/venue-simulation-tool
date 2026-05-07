export function LayoutCardSkeleton() {
  return (
    <div className="rounded-[14px] overflow-hidden bg-white border border-[#e9eeee] shadow-[0_1px_8px_rgba(32,43,40,0.05)]">
      <div className="aspect-video bg-[#f0f4f2] animate-pulse" />
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-[#f0f4f2] rounded-full animate-pulse" />
        </div>
        <div className="h-3.5 bg-[#f0f4f2] rounded animate-pulse w-4/5" />
        <div className="h-3 bg-[#f0f4f2] rounded animate-pulse w-3/5" />
        <div className="mt-1 pt-2.5 border-t border-[#f0f4f2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#f0f4f2] animate-pulse" />
            <div className="h-2.5 w-20 bg-[#f0f4f2] rounded animate-pulse" />
          </div>
          <div className="h-2.5 w-12 bg-[#f0f4f2] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
