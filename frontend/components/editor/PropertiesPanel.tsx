"use client";

import { useMemo } from "react";
import { clampToRoom } from "@/lib/editorPhysics";
import { exportProjectAsPdf, exportProjectAsPng } from "@/lib/floorplanExport";
import { getCableColor } from "@/lib/sceneConnections";
import { useEditorStore } from "@/store/UseEditorStore";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a9a9a]">
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  step = "0.1",
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[13px] text-[#4a4a4a]">{label}</div>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1a1a1a] outline-none"
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

  const item = useMemo(() => {
    if (!project || selectedIds.length !== 1) return null;
    return project.items.find((entry) => entry.id === selectedIds[0]) ?? null;
  }, [project, selectedIds]);

  const sceneLabels = useMemo(
    () =>
      (project?.items ?? [])
        .map((entry) => entry.label)
        .filter((label): label is string => Boolean(label))
        .slice(0, 8),
    [project],
  );

  if (!project) return null;

  return (
    <aside className="sf-scroll flex w-[292px] shrink-0 flex-col overflow-y-auto border-l border-[#ececec] bg-white px-5 py-5">
      {!item ? (
        <div className="space-y-7">
          <section className="space-y-3">
            <SectionTitle>Scene</SectionTitle>
            <div className="space-y-2 text-[14px] text-[#252525]">
              <div className="flex items-center justify-between">
                <span>Elements</span>
                <span className="font-medium">{project.items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Walls</span>
                <span className="font-medium">4</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rooms</span>
                <span className="font-medium">1</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle>Room Size</SectionTitle>
            <NumberField
              label="Width (m)"
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
              label="Depth (m)"
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
          </section>

          <section className="space-y-4">
            <SectionTitle>Wall Height</SectionTitle>
            <NumberField
              label="Height (m)"
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
              label="Thickness"
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

          <section className="space-y-4">
            <SectionTitle>Materials</SectionTitle>
            <div>
              <div className="mb-3 text-[13px] text-[#4a4a4a]">Wall color</div>
              <div className="flex flex-wrap gap-2">
                {WALL_SWATCHES.map((color) => {
                  const selected = (project.sceneSettings?.wallColor ?? "#F6F2EC") === color;
                  return (
                    <button
                      key={color}
                      onClick={() => updateSceneSettings({ wallColor: color })}
                      className={`h-8 w-8 rounded-[8px] border ${
                        selected ? "border-[#111111]" : "border-[#d9d9d9]"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            </div>

            <label className="block">
              <div className="mb-2 text-[13px] text-[#4a4a4a]">Floor</div>
              <select
                value={project.sceneSettings?.floorMaterial ?? "Wood"}
                onChange={(event) =>
                  updateSceneSettings({
                    floorMaterial: event.target.value as "Wood" | "Concrete" | "Stone",
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

          <section className="space-y-3">
            <SectionTitle>Labels</SectionTitle>
            <div className="space-y-2 text-[13px] leading-6 text-[#4a4a4a]">
              {sceneLabels.length > 0 ? (
                sceneLabels.map((label, index) => <div key={`${label}-${index}`}>• {label}</div>)
              ) : (
                <div>No labeled items yet.</div>
              )}
            </div>
          </section>

          {activeLayer !== "layout" ? (
            <section className="space-y-3">
              <SectionTitle>AV Layer</SectionTitle>
              <div className="space-y-2 text-[13px] text-[#4a4a4a]">
                <div className="flex items-center justify-between">
                  <span>AV items</span>
                  <span className="font-medium">
                    {
                      project.items.filter((entry) =>
                        ["camera", "speaker", "mixing_desk", "screen", "tv"].includes(
                          entry.type,
                        ),
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cable runs</span>
                  <span className="font-medium">{project.connections?.length ?? 0}</span>
                </div>
                {([
                  ["power", "Power"],
                  ["video", "Video"],
                  ["audio", "Audio"],
                  ["data", "Data"],
                  ["lighting", "Lighting"],
                ] as const).map(([type, label]) => (
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

          <section className="space-y-3">
            <SectionTitle>Export</SectionTitle>
            <div className="space-y-2">
              <button
                className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white text-[14px] font-medium text-[#1a1a1a]"
                disabled
              >
                Export GLB
              </button>
              <button
                onClick={() => exportProjectAsPng(project)}
                className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white text-[14px] font-medium text-[#1a1a1a]"
              >
                Export PNG
              </button>
              <button
                onClick={() => exportProjectAsPdf(project)}
                className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white text-[14px] font-medium text-[#1a1a1a]"
              >
                Export PDF
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-1">
            <SectionTitle>Selection</SectionTitle>
            <div className="text-[22px] font-semibold text-[#1a1a1a]">
              {item.label || item.type}
            </div>
            <div className="text-[12px] uppercase tracking-[0.12em] text-[#9a9a9a]">
              {item.type}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
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

          <section className="grid grid-cols-3 gap-3">
            {(["X", "Y", "Z"] as const).map((axis, index) => (
              <NumberField
                key={axis}
                label={`Scale ${axis}`}
                value={item.scale[index]}
                onChange={(value) => {
                  const nextScale = [...item.scale] as [number, number, number];
                  nextScale[index] = value;
                  updateItem(item.id, { scale: nextScale });
                }}
              />
            ))}
          </section>

          <section className="space-y-4">
            <SectionTitle>Appearance</SectionTitle>
            <label className="block">
              <div className="mb-2 text-[13px] text-[#4a4a4a]">Color</div>
              <input
                type="color"
                value={item.color || "#ffffff"}
                onChange={(event) => updateItem(item.id, { color: event.target.value })}
                className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white p-2"
              />
            </label>
          </section>
        </div>
      )}
    </aside>
  );
}
