"use client";

import { useMemo, useState } from "react";
import { Box, Wand2 } from "lucide-react";
import { clampToRoom } from "@/lib/editorPhysics";
import { generateProjectFromPrompt } from "@/lib/promptLayout";
import { getCableColor } from "@/lib/sceneConnections";
import { upsertProject } from "@/lib/storage";
import { useEditorStore } from "@/store/UseEditorStore";
import { FloorplanCanvas } from "./FloorplanCanvas";
import { SceneCanvas } from "../scene/SceneCanvas";
import OpacityRow from "./components/OpacityRow";
import roundScale from "./utils/roundScale";
import NumberField from "./components/NumberField";
import SectionTitle from "./components/SectionTitle";
import clampAssetScale from "./utils/clampAssetScale";

const WALL_SWATCHES = ["#F6F2EC", "#EAE4D8", "#E6ECF4", "#E4EEDA", "#D7D7D7"];
const SCALE_PRESETS = [25, 50, 100, 150];

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeLayer = useEditorStore((s) => s.activeLayer);
  const updateItem = useEditorStore((s) => s.updateItem);
  const updateSceneSettings = useEditorStore((s) => s.updateSceneSettings);
  const applyProjectMutation = useEditorStore((s) => s.applyProjectMutation);
  const setProject = useEditorStore((s) => s.setProject);
  const activeView = useEditorStore((s) => s.activeView);
  const setActiveView = useEditorStore((s) => s.setActiveView);
  const assetCatalog = useEditorStore((s) => s.assetCatalog);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const item = useMemo(() => {
    if (!project || selectedIds.length !== 1) return null;
    return project.items.find((entry) => entry.id === selectedIds[0]) ?? null;
  }, [project, selectedIds]);

  const selectedAsset = useMemo(() => {
    if (!item) return null;
    return (
      assetCatalog.find(
        (asset) =>
          asset.type === item.type ||
          asset.modelUrl === item.assetUrl ||
          asset.id === item.sourceId,
      ) ?? null
    );
  }, [assetCatalog, item]);

  if (!project) return null;

  const oppositeView = activeView === "3d" ? "2d" : "3d";
  const interiorArea = project.room.width * project.room.depth;
  const wallOpacity = Math.round(
    (project.sceneSettings?.wallColor ? 1 : 1) * 100,
  );
  const floorOpacity = 100;
  const defaultScale =
    selectedAsset?.defaultScale ?? ([1, 1, 1] as [number, number, number]);
  const uniformScalePercent = item
    ? Math.round(
        (item.scale.reduce((total, value, index) => {
          const base = defaultScale[index] || 1;
          return total + value / base;
        }, 0) /
          3) *
          100,
      )
    : 100;
  const setUniformScale = (percent: number) => {
    if (!item) return;
    const factor = Math.max(5, Math.min(300, percent)) / 100;
    updateItem(item.id, {
      scale: defaultScale.map((value) =>
        roundScale(clampAssetScale(value * factor)),
      ) as [number, number, number],
    });
  };
  const refineWithAi = async () => {
    if (!project || !aiPrompt.trim()) {
      setAiError("Enter what you want the AI to change.");
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      const refined = await generateProjectFromPrompt(
        [
          `Existing project: ${project.name}.`,
          `Current room is ${project.room.width}m wide, ${project.room.depth}m deep, ${project.room.height}m high.`,
          `Current venue type is ${project.sceneSettings?.venueEnvironment ?? "indoor"}.`,
          `Current scene has ${project.items.length} objects.`,
          `Revise the layout with this instruction: ${aiPrompt.trim()}`,
        ].join(" "),
      );
      const nextProject = {
        ...refined,
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: new Date().toISOString(),
      };

      setProject(nextProject);
      await upsertProject(nextProject);
      setAiPrompt("");
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "AI refinement failed.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <aside
      data-tour="editor-properties"
      className="flex w-97 shrink-0 flex-col overflow-hidden border-l border-[#ececec] bg-white"
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
          <div className="h-36.5 overflow-hidden rounded-xl border border-[#edf0ee] bg-[#fbfcfb]">
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
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[#5d7f73]" />
                <SectionTitle>AI Edit</SectionTitle>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder="Make this an outdoor wedding for 400 guests with banquet tables and livestream cameras"
                className="min-h-24 w-full resize-none rounded-[10px] border border-[#e1e7e4] bg-white px-3 py-2 text-[13px] leading-5 text-[#28312d] outline-none placeholder:text-[#9aa7a2]"
              />
              {aiError ? (
                <div className="rounded-lg border border-[#f0d6d6] bg-[#fff7f7] px-3 py-2 text-[12px] text-[#9b2f2f]">
                  {aiError}
                </div>
              ) : null}
              <button
                type="button"
                onClick={refineWithAi}
                disabled={aiLoading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#5d7f73] px-3 text-[13px] font-bold text-white transition hover:bg-[#4f7166] disabled:opacity-60"
              >
                <Wand2 className="h-4 w-4" />
                {aiLoading ? "Updating scene..." : "Update scene with AI"}
              </button>
            </section>

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
                        | "Carpet"
                        | "Wood"
                        | "Marble"
                        | "Concrete"
                        | "Tiles"
                        | "Banquet",
                      floorColor:
                        event.target.value === "Concrete"
                          ? "#D7D4CC"
                          : event.target.value === "Marble"
                            ? "#EDEAE4"
                            : event.target.value === "Carpet"
                              ? "#817268"
                              : event.target.value === "Tiles"
                                ? "#E2DED5"
                                : event.target.value === "Banquet"
                                  ? "#A88978"
                                  : "#D7B98E",
                    })
                  }
                  className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1a1a1a] outline-none"
                >
                  <option>Carpet</option>
                  <option>Wood</option>
                  <option>Marble</option>
                  <option>Concrete</option>
                  <option>Tiles</option>
                  <option>Banquet</option>
                </select>
              </label>

              <label className="block">
                <div className="mb-2 text-[12px] font-medium text-[#73817c]">
                  Venue type
                </div>
                <select
                  value={project.sceneSettings?.venueEnvironment ?? "indoor"}
                  onChange={(event) =>
                    updateSceneSettings({
                      venueEnvironment: event.target.value as
                        | "indoor"
                        | "outdoor"
                        | "tent",
                    })
                  }
                  className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1a1a1a] outline-none"
                >
                  <option value="indoor">Indoor</option>
                  <option value="tent">Wedding tent / marquee</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </label>

              <label className="block">
                <div className="mb-2 text-[12px] font-medium text-[#73817c]">
                  Lighting mood
                </div>
                <select
                  value={project.sceneSettings?.lightingMood ?? "presentation"}
                  onChange={(event) =>
                    updateSceneSettings({
                      lightingMood: event.target.value as
                        | "presentation"
                        | "wedding"
                        | "conference"
                        | "chapel"
                        | "concert"
                        | "daylight",
                    })
                  }
                  className="h-11 w-full rounded-[10px] border border-[#d8d8d8] bg-white px-3 text-[14px] text-[#1a1a1a] outline-none"
                >
                  <option value="presentation">Presentation</option>
                  <option value="wedding">Wedding uplighting</option>
                  <option value="conference">Conference</option>
                  <option value="chapel">Chapel</option>
                  <option value="concert">Concert</option>
                  <option value="daylight">Daylight</option>
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
                        className="h-0.75 w-8 rounded-full"
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
              <div className="rounded-xl border border-[#e8ece9] bg-[#fbfcfb] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-semibold text-[#303733]">
                      Asset size
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#73817c]">
                      Relative to the default {selectedAsset?.name ?? item.type}{" "}
                      size
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#dfe8e4] bg-white px-2 py-1 text-[12px] font-bold text-[#4f625c]">
                    {uniformScalePercent}%
                  </div>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={Math.max(5, Math.min(300, uniformScalePercent))}
                  onChange={(event) =>
                    setUniformScale(Number(event.target.value))
                  }
                  className="w-full accent-[#5d7f73]"
                />
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {SCALE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setUniformScale(preset)}
                      className="h-8 rounded-lg border border-[#dfe8e4] bg-white text-[11px] font-bold text-[#657872] transition hover:border-[#b9cbc5] hover:bg-[#eef5f2]"
                    >
                      {preset}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUniformScale(100)}
                    className="h-8 rounded-lg bg-[#5d7f73] text-[11px] font-bold text-white transition hover:bg-[#4e7165]"
                  >
                    Reset
                  </button>
                </div>
              </div>
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
                    nextScale[index] = roundScale(clampAssetScale(value));
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
