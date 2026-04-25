"use client";

import { useMemo } from "react";
import { Box, ChevronDown, Expand, Layers3, Plus } from "lucide-react";
import { clampToRoom } from "@/lib/editorPhysics";
import { getCableColor } from "@/lib/sceneConnections";
import { useEditorStore } from "@/store/UseEditorStore";
import { FloorplanCanvas } from "./FloorplanCanvas";
import { SceneCanvas } from "../scene/SceneCanvas";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase text-[#303733]">
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  step = "0.1",
  readOnly = false,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  readOnly?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_96px] items-center gap-3">
      <div className="text-[12px] font-medium text-[#73817c]">{label}</div>
      <input
        type="number"
        step={step}
        readOnly={readOnly}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full rounded-[10px] border border-[#e8ece9] bg-white px-3 text-[13px] font-medium text-[#333936] outline-none read-only:bg-[#fbfcfb] read-only:text-[#67736f]"
      />
    </label>
  );
}

const WALL_SWATCHES = ["#F6F2EC", "#EAE4D8", "#E6ECF4", "#E4EEDA", "#D7D7D7"];

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const updateItem = useEditorStore((s) => s.updateItem);
  const updateSceneSettings = useEditorStore((s) => s.updateSceneSettings);
  const applyProjectMutation = useEditorStore((s) => s.applyProjectMutation);
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);

  const item = useMemo(() => {
    if (!project || selectedIds.length !== 1) return null;
    return project.items.find((entry) => entry.id === selectedIds[0]) ?? null;
  }, [project, selectedIds]);

  if (!project) return null;

  const oppositeView = activeView === "3d" ? "2d" : "3d";
  const interiorArea = project.room.width * project.room.depth;
  const wallOpacity = Math.round(
    (project.sceneSettings?.wallColor ? 1 : 1) * 100,
  );
  const floorOpacity = 100;

  return (
    <aside
      data-tour="editor-properties"
      className="flex w-[388px] shrink-0 flex-col overflow-hidden border-l border-[#ececec] bg-white"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#eef1ee] px-4">
        <div className="flex items-center gap-4 text-[13px] font-semibold text-[#72817d]">
          {(["3d", "2d"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={activeView === view ? "text-[#242a28]" : ""}
            >
              {view.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="sf-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[#eef1ee] px-4 py-4">
          <div className="h-[146px] overflow-hidden rounded-[12px] border border-[#edf0ee] bg-[#fbfcfb]">
            <div className="pointer-events-none h-full w-full">
              {oppositeView === "3d" ? (
                <SceneCanvas projectOverride={project} readOnly />
              ) : (
                <FloorplanCanvas projectOverride={project} readOnly />
              )}
            </div>
          </div>
        </div>

        {!item ? (
          <div>
            <section className="space-y-3 border-b border-[#eef1ee] px-4 py-4">
              <SectionTitle>Basic</SectionTitle>
              <NumberField
                label="Interior area"
                step="0.5"
                value={Number(interiorArea.toFixed(2))}
                readOnly
                onChange={() => undefined}
              />
              <NumberField
                label="Room width"
                step="0.5"
                value={project.room.width}
                onChange={(value) => {
                  const nextWidth = Math.max(6, value);
                  applyProjectMutation((currentProject) => {
                    const nextRoom = {
                      ...currentProject.room,
                      width: nextWidth,
                    };

                    return {
                      ...currentProject,
                      room: nextRoom,
                      items: currentProject.items.map((entry) => ({
                        ...entry,
                        ...clampToRoom(entry, nextRoom),
                      })),
                    };
                  });
                }}
              />
              <NumberField
                label="Room depth"
                step="0.5"
                value={project.room.depth}
                onChange={(value) => {
                  const nextDepth = Math.max(6, value);
                  applyProjectMutation((currentProject) => {
                    const nextRoom = {
                      ...currentProject.room,
                      depth: nextDepth,
                    };

                    return {
                      ...currentProject,
                      room: nextRoom,
                      items: currentProject.items.map((entry) => ({
                        ...entry,
                        ...clampToRoom(entry, nextRoom),
                      })),
                    };
                  });
                }}
              />
              <NumberField
                label="Room height"
                step="0.1"
                value={project.room.height}
                onChange={(value) =>
                  applyProjectMutation((currentProject) => ({
                    ...currentProject,
                    room: {
                      ...currentProject.room,
                      height: Math.max(2.2, value),
                    },
                  }))
                }
              />
              <NumberField
                label="Slab thickness"
                step="0.01"
                value={project.sceneSettings?.wallThickness ?? 0.15}
                onChange={(value) => {
                  updateSceneSettings({ wallThickness: Math.max(0.08, value) });
                  applyProjectMutation((currentProject) => ({
                    ...currentProject,
                    room: {
                      ...currentProject.room,
                      wallThickness: Math.max(0.08, value),
                    },
                  }));
                }}
              />
            </section>

            <section className="space-y-3 border-b border-[#eef1ee] px-4 py-4">
              <SectionTitle>Materials</SectionTitle>
              <div>
                <div className="mb-2 text-[12px] font-medium text-[#73817c]">
                  Wall color
                </div>
                <div className="flex flex-wrap gap-2">
                  {WALL_SWATCHES.map((color) => {
                    const selected =
                      (project.sceneSettings?.wallColor ?? "#F6F2EC") === color;
                    return (
                      <button
                        key={color}
                        onClick={() =>
                          updateSceneSettings({ wallColor: color })
                        }
                        className={`h-7 w-7 rounded-full border ${
                          selected
                            ? "border-[#6f8f84] ring-2 ring-[#6f8f84]/20"
                            : "border-[#d9d9d9]"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <div className="mb-2 text-[12px] font-medium text-[#73817c]">
                  Floor
                </div>
                <select
                  value={project.sceneSettings?.floorMaterial ?? "Wood"}
                  onChange={(event) =>
                    updateSceneSettings({
                      floorMaterial: event.target.value as
                        | "Wood"
                        | "Concrete"
                        | "Stone",
                      floorColor:
                        event.target.value === "Concrete"
                          ? "#E8E5E0"
                          : event.target.value === "Stone"
                            ? "#EDEAE4"
                            : "#F4F1EA",
                    })
                  }
                  className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1a1a1a] outline-none"
                >
                  <option>Wood</option>
                  <option>Concrete</option>
                  <option>Stone</option>
                </select>
              </label>
            </section>

            {activeLayer !== "layout" ? (
              <section className="space-y-3 border-b border-[#eef1ee] px-4 py-4">
                <SectionTitle>AV Layer</SectionTitle>
                <div className="space-y-2 text-[12px] text-[#73817c]">
                  <div className="flex items-center justify-between">
                    <span>AV items</span>
                    <span className="font-medium">
                      {
                        project.items.filter((entry) =>
                          [
                            "camera",
                            "speaker",
                            "mixing_desk",
                            "screen",
                            "tv",
                          ].includes(entry.type),
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cable runs</span>
                    <span className="font-medium">
                      {project.connections?.length ?? 0}
                    </span>
                  </div>
                  {(
                    [
                      ["power", "Power"],
                      ["video", "Video"],
                      ["audio", "Audio"],
                      ["data", "Data"],
                      ["lighting", "Lighting"],
                    ] as const
                  ).map(([type, label]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span
                        className="h-[3px] w-8 rounded-full"
                        style={{ backgroundColor: getCableColor(type) }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3 px-4 py-4">
              <SectionTitle>Opacity</SectionTitle>
              <OpacityRow label="Wall" value={wallOpacity} />
              <OpacityRow label="Floor" value={floorOpacity} />
            </section>
          </div>
        ) : (
          <div className="space-y-5 px-4 py-4">
            <section className="space-y-1 border-b border-[#eef1ee] pb-4">
              <SectionTitle>Selection</SectionTitle>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eef4f1] text-[#6f8f84]">
                  <Box className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold text-[#303733]">
                    {item.label || item.type}
                  </div>
                  <div className="text-[11px] uppercase text-[#7d8b87]">
                    {item.type}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle>Position</SectionTitle>
              <NumberField
                label="X"
                value={item.x}
                onChange={(value) => updateItem(item.id, { x: value })}
              />
              <NumberField
                label="Y"
                value={item.y}
                onChange={(value) => updateItem(item.id, { y: value })}
              />
              <NumberField
                label="Z"
                value={item.z}
                onChange={(value) => updateItem(item.id, { z: value })}
              />
              <NumberField
                label="Rotation"
                value={item.rotationY}
                onChange={(value) => updateItem(item.id, { rotationY: value })}
              />
            </section>

            <section className="space-y-3">
              <SectionTitle>Scale</SectionTitle>
              {(["X", "Y", "Z"] as const).map((axis, index) => (
                <NumberField
                  key={axis}
                  label={`Scale ${axis}`}
                  value={item.scale[index]}
                  onChange={(value) => {
                    const nextScale = [...item.scale] as [
                      number,
                      number,
                      number,
                    ];
                    nextScale[index] = value;
                    updateItem(item.id, { scale: nextScale });
                  }}
                />
              ))}
            </section>

            {item.attribution ? (
              <section className="space-y-3">
                <SectionTitle>Source</SectionTitle>
                <div className="text-[12px] leading-5 text-[#73817c]">
                  {item.attribution}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

function OpacityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[58px_1fr_52px] items-center gap-3 text-[12px] font-medium text-[#73817c]">
      <span>{label}</span>
      <div className="relative h-2 rounded-full bg-[#dfe7e3]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#6f8f84]"
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-[#cdd8d2] bg-white shadow-sm"
          style={{ left: `calc(${value}% - 10px)` }}
        />
      </div>
      <span className="text-right text-[#3e4642]">{value} %</span>
    </div>
  );
}
