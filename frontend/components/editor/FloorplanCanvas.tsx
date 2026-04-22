"use client";

import { useMemo } from "react";
import { getItemFootprint } from "@/lib/editorPhysics";
import { Project } from "@/types/types";
import { useEditorStore } from "@/store/UseEditorStore";

function getColor(type: string) {
  switch (type) {
    case "chair":
      return "#84A98C";
    case "podium":
      return "#7F5539";
    case "screen":
      return "#355070";
    case "camera":
      return "#457B9D";
    case "banquet_table":
    case "desk":
      return "#D4A373";
    default:
      return "#9AA6B2";
  }
}

export function FloorplanCanvas({
  projectOverride,
}: {
  projectOverride?: Project | null;
}) {
  const storedProject = useEditorStore((s) => s.project);
  const project = projectOverride ?? storedProject;

  const viewBox = useMemo(() => {
    if (!project) return "0 0 100 100";
    return `${-project.room.width / 2 - 2} ${-project.room.depth / 2 - 2} ${project.room.width + 4} ${project.room.depth + 4}`;
  }, [project]);

  if (!project) return null;

  return (
    <div className="flex h-full w-full flex-col bg-[radial-gradient(circle_at_top,_rgba(132,169,140,0.14),_transparent_30%),linear-gradient(180deg,_#f9faf8_0%,_#f3f5f2_100%)] p-6">
      <div className="mb-4">
        <div className="text-xl font-semibold text-[#2F3E46]">
          2D Floorplan
        </div>
        <div className="mt-1 text-sm text-[#52796F]">
          Top-down synchronized layout view
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[32px] border border-black/5 bg-white p-4 shadow-[0_20px_60px_rgba(47,62,70,0.08)]">
        <svg viewBox={viewBox} className="h-full w-full">
          <defs>
            <pattern
              id="grid-pattern"
              width="1"
              height="1"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 1 0 L 0 0 0 1"
                fill="none"
                stroke="rgba(82,121,111,0.18)"
                strokeWidth="0.03"
              />
            </pattern>
          </defs>

          {project.sceneSettings?.showGrid ? (
            <rect
              x={-project.room.width / 2}
              y={-project.room.depth / 2}
              width={project.room.width}
              height={project.room.depth}
              fill="url(#grid-pattern)"
            />
          ) : null}

          <rect
            x={-project.room.width / 2}
            y={-project.room.depth / 2}
            width={project.room.width}
            height={project.room.depth}
            rx="0.6"
            fill="#FCFCFA"
            stroke="#354F52"
            strokeWidth="0.18"
          />

          {project.items.map((item) => {
            const footprint = getItemFootprint(item);
            return (
              <g
                key={item.id}
                transform={`translate(${item.x} ${item.z}) rotate(${(item.rotationY * 180) / Math.PI})`}
              >
                <rect
                  x={-footprint.halfWidth}
                  y={-footprint.halfDepth}
                  width={footprint.halfWidth * 2}
                  height={footprint.halfDepth * 2}
                  rx="0.18"
                  fill={item.color || getColor(item.type)}
                  stroke="#2F3E46"
                  strokeWidth="0.06"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
