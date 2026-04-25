"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlignmentGuide,
  clampToRoom,
  collidesWithOthers,
  getItemFootprint,
  snapPositionToNeighbors,
} from "@/lib/editorPhysics";
import {
  getCableColor,
  getCablePathPoints,
  inferCableType,
  isAvItem,
  resolveConnectionItems,
} from "@/lib/sceneConnections";
import { Project, SceneItem } from "@/types/types";
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
    case "speaker":
      return "#BA7517";
    case "mixing_desk":
      return "#534AB7";
    case "banquet_table":
    case "desk":
      return "#D4A373";
    default:
      return "#9AA6B2";
  }
}

function applySnap(value: number, enabled: boolean) {
  return enabled ? Math.round(value * 4) / 4 : value;
}

export function FloorplanCanvas({
  projectOverride,
  readOnly = false,
}: {
  projectOverride?: Project | null;
  readOnly?: boolean;
}) {
  const storedProject = useEditorStore((s) => s.project);
  const project = projectOverride ?? storedProject;
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const toolMode = useEditorStore((s) => s.toolMode);
  const selectItem = useEditorStore((s) => s.selectItem);
  const updateItem = useEditorStore((s) => s.updateItem);
  const applyProjectMutation = useEditorStore((s) => s.applyProjectMutation);
  const addConnection = useEditorStore((s) => s.addConnection);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [interactionMode, setInteractionMode] = useState<"drag" | "resize" | null>(
    null,
  );
  const interactionRef = useRef<{
    itemId?: string;
    pointerOffsetX?: number;
    pointerOffsetZ?: number;
    initialRoomWidth?: number;
    initialRoomDepth?: number;
  } | null>(null);

  const snapToGrid = project?.sceneSettings?.snapToGrid ?? true;
  const visibleItems = useMemo(() => {
    if (!project) return [];
    return project.items.filter((item) => {
      if (activeLayer === "layout") return !isAvItem(item);
      if (activeLayer === "av") return isAvItem(item);
      return true;
    });
  }, [activeLayer, project]);

  const visibleConnections = useMemo(() => {
    if (!project || activeLayer === "layout") return [];
    return (project.connections ?? []).filter((connection) =>
      Boolean(resolveConnectionItems(project, connection)),
    );
  }, [activeLayer, project]);

  const viewBox = useMemo(() => {
    if (!project) return "0 0 100 100";
    return `${-project.room.width / 2 - 2} ${-project.room.depth / 2 - 2} ${
      project.room.width + 4
    } ${project.room.depth + 4}`;
  }, [project]);

  const toCanvasPoint = useCallback(
    (event: PointerEvent | ReactPointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const screenMatrix = svg.getScreenCTM();
      if (!screenMatrix) return null;

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const transformed = point.matrixTransform(screenMatrix.inverse());

      return {
        x: transformed.x,
        z: transformed.y,
      };
    },
    [],
  );

  useEffect(() => {
    if (!project || !interactionMode) return;

    const onPointerMove = (event: PointerEvent) => {
      const pointer = toCanvasPoint(event);
      if (!pointer) return;

      if (interactionMode === "drag" && interactionRef.current?.itemId) {
        const item = project.items.find(
          (entry) => entry.id === interactionRef.current?.itemId,
        );
        if (!item) return;

        const candidateBase: SceneItem = {
          ...item,
          x: pointer.x - (interactionRef.current.pointerOffsetX ?? 0),
          z: pointer.z - (interactionRef.current.pointerOffsetZ ?? 0),
        };

        const snapped = snapPositionToNeighbors(
          candidateBase,
          project.items.filter((entry) => entry.id !== item.id),
        );

        const clamped = clampToRoom(
          {
            ...candidateBase,
            x: applySnap(snapped.x, snapToGrid),
            z: applySnap(snapped.z, snapToGrid),
          },
          project.room,
        );

        const candidate = {
          ...candidateBase,
          x: clamped.x,
          z: clamped.z,
        };

        if (
          !collidesWithOthers(
            candidate,
            project.items.filter((entry) => entry.id !== item.id),
          )
        ) {
          setGuides(snapped.guides);
          updateItem(item.id, {
            x: candidate.x,
            z: candidate.z,
          });
        }
      }

      if (interactionMode === "resize") {
        const nextWidth = Math.max(6, applySnap(pointer.x * 2, false));
        const nextDepth = Math.max(6, applySnap(pointer.z * 2, false));

        applyProjectMutation((currentProject) => {
          const nextRoom = {
            ...currentProject.room,
            width: Math.round(Math.abs(nextWidth) * 2) / 2,
            depth: Math.round(Math.abs(nextDepth) * 2) / 2,
          };

          return {
            ...currentProject,
            room: nextRoom,
            items: currentProject.items.map((item) => {
              const clamped = clampToRoom(item, nextRoom);
              return {
                ...item,
                x: clamped.x,
                z: clamped.z,
              };
            }),
          };
        });
      }
    };

    const onPointerUp = () => {
      interactionRef.current = null;
      setInteractionMode(null);
      setGuides([]);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [applyProjectMutation, interactionMode, project, snapToGrid, toCanvasPoint, updateItem]);

  if (!project) return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f8f9f8]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(85,105,98,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(85,105,98,0.035)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="relative h-full w-full"
        onPointerDown={() => {
          if (!readOnly) selectItem(null);
        }}
      >
        <rect
          x={-project.room.width / 2}
          y={-project.room.depth / 2}
          width={project.room.width}
          height={project.room.depth}
          fill={project.sceneSettings?.floorColor || "#F4F1EA"}
          stroke="#111111"
          strokeWidth="0.18"
        />

        <rect
          x={-project.room.width / 2}
          y={-project.room.depth / 2}
          width={project.room.width}
          height={project.room.depth}
          fill="none"
          stroke="#111111"
          strokeWidth="0.08"
        />

        {guides.map((guide, index) =>
          guide.orientation === "vertical" ? (
            <line
              key={`guide-v-${index}`}
              x1={guide.value}
              x2={guide.value}
              y1={-project.room.depth / 2}
              y2={project.room.depth / 2}
              stroke="#111111"
              strokeDasharray="0.2 0.16"
              strokeWidth="0.05"
              opacity="0.5"
            />
          ) : (
            <line
              key={`guide-h-${index}`}
              x1={-project.room.width / 2}
              x2={project.room.width / 2}
              y1={guide.value}
              y2={guide.value}
              stroke="#111111"
              strokeDasharray="0.2 0.16"
              strokeWidth="0.05"
              opacity="0.5"
            />
          ),
        )}

        {visibleConnections.map((connection) => {
          const resolved = resolveConnectionItems(project, connection);
          if (!resolved) return null;

          const cablePoints = getCablePathPoints(
            resolved.fromItem,
            resolved.toItem,
          );
          const path = cablePoints
            .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.z}`)
            .join(" ");

          return (
            <path
              key={connection.id}
              d={path}
              fill="none"
              stroke={getCableColor(connection.cableType)}
              strokeWidth="0.12"
              strokeDasharray={connection.cableType === "power" ? "0.28 0.18" : undefined}
              opacity="0.95"
            />
          );
        })}

        {visibleItems.map((item) => {
          const footprint = getItemFootprint(item);
          const isSelected = selectedIds.includes(item.id);

          return (
            <g
              key={item.id}
              transform={`translate(${item.x} ${item.z}) rotate(${
                (item.rotationY * 180) / Math.PI
              })`}
              onPointerDown={(event) => {
                if (readOnly) return;
                event.stopPropagation();
                const pointer = toCanvasPoint(event);
                if (!pointer) return;
                if (toolMode === "connect") {
                  if (selectedIds.length === 1 && selectedIds[0] !== item.id) {
                    const source = project.items.find(
                      (entry) => entry.id === selectedIds[0],
                    );
                    if (source) {
                      addConnection(
                        source.id,
                        item.id,
                        inferCableType(source, item),
                      );
                    }
                  } else {
                    selectItem(item.id);
                  }
                  return;
                }

                selectItem(item.id, event.shiftKey);
                interactionRef.current = {
                  itemId: item.id,
                  pointerOffsetX: pointer.x - item.x,
                  pointerOffsetZ: pointer.z - item.z,
                };
                setInteractionMode("drag");
              }}
            >
              <rect
                x={-footprint.halfWidth}
                y={-footprint.halfDepth}
                width={footprint.halfWidth * 2}
                height={footprint.halfDepth * 2}
                rx="0.18"
                fill={item.color || getColor(item.type)}
                fillOpacity={0.9}
                stroke={isSelected ? "#111111" : "#3d3d3d"}
                strokeWidth={isSelected ? "0.12" : "0.05"}
              />
              <text
                x="0"
                y="0.08"
                textAnchor="middle"
                fontSize="0.24"
                fill="#252525"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {item.label || item.type}
              </text>
            </g>
          );
        })}

        <g
          transform={`translate(${project.room.width / 2} ${project.room.depth / 2})`}
          onPointerDown={(event) => {
            if (readOnly) return;
            event.stopPropagation();
            interactionRef.current = {
              initialRoomWidth: project.room.width,
              initialRoomDepth: project.room.depth,
            };
            setInteractionMode("resize");
          }}
        >
          <rect
            x={-0.28}
            y={-0.28}
            width={0.56}
            height={0.56}
            rx="0.08"
            fill="#111111"
          />
          <path
            d="M -0.1 0.14 L 0.14 -0.1"
            stroke="#ffffff"
            strokeWidth="0.06"
            strokeLinecap="round"
          />
          <path
            d="M 0.02 -0.1 L 0.14 -0.1 L 0.14 0.02"
            stroke="#ffffff"
            strokeWidth="0.05"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {!readOnly ? (
      <div className="pointer-events-none absolute bottom-16 left-6 rounded-[10px] bg-white/92 px-3 py-2 text-[11px] font-medium text-[#687773] shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
        {toolMode === "connect"
          ? "Connect mode: click one AV item, then another to create a cable run."
          : "Drag furniture in 2D. Drag the corner handle to resize the room."}
      </div>
      ) : null}
    </div>
  );
}
