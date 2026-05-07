import { Project } from "@/types/types";

export function ProjectThumbnail({ project }: { project: Project }) {
  const roomWidth = Math.max(project.room.width, 1);
  const roomDepth = Math.max(project.room.depth, 1);
  const visibleItems = project.items.slice(0, 24);

  return (
    <div className="relative h-full w-full overflow-hidden bg-linear-to-b from-white via-white to-[#aeb2ae]">
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-linear-to-t from-black/28 to-transparent" />
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
