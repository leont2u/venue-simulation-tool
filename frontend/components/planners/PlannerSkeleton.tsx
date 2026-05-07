export default function PlannerSkeleton() {
  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <div className="mx-auto max-w-270 px-6 md:px-10 py-8">
        <div className="flex items-start gap-6 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-[#f0f4f2]" />
          <div className="flex-1 space-y-3">
            <div className="h-7 bg-[#f0f4f2] rounded w-48" />
            <div className="h-4 bg-[#f0f4f2] rounded w-24" />
            <div className="h-4 bg-[#f0f4f2] rounded w-80" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[14px] overflow-hidden border border-[#e9eeee] bg-white"
            >
              <div className="aspect-video bg-[#f0f4f2] animate-pulse" />
              <div className="p-3.5 space-y-2">
                <div className="h-3.5 bg-[#f0f4f2] rounded animate-pulse w-4/5" />
                <div className="h-8 bg-[#f0f4f2] rounded-lg animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
