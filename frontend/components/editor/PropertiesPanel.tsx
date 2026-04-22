"use client";

import { useMemo } from "react";
import { Settings2 } from "lucide-react";
import { useEditorStore } from "@/store/UseEditorStore";

function PropertyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#84A98C]">
        {label}
      </div>
      {children}
    </label>
  );
}

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateItem = useEditorStore((s) => s.updateItem);
  const updateSceneSettings = useEditorStore((s) => s.updateSceneSettings);

  const item = useMemo(() => {
    if (!project || selectedIds.length !== 1) return null;
    return project.items.find((entry) => entry.id === selectedIds[0]) ?? null;
  }, [project, selectedIds]);

  const settings = project?.sceneSettings;

  return (
    <aside className="flex w-[320px] flex-col border-l border-black/5 bg-white">
      <div className="border-b border-black/5 px-5 py-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#84A98C]">
          <Settings2 className="h-4 w-4" />
          Properties
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {!item ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-black/5 bg-[#FCFCFA] p-4">
              <div className="text-lg font-semibold text-[#2F3E46]">
                Scene Settings
              </div>
              <div className="mt-1 text-sm text-[#52796F]">
                Fine-tune grid visibility, lighting, snapping, and livestream analysis.
              </div>

              <div className="mt-5 space-y-4">
                <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm font-medium text-[#2F3E46]">Show Grid</span>
                  <input
                    type="checkbox"
                    checked={settings?.showGrid ?? true}
                    onChange={(event) =>
                      updateSceneSettings({ showGrid: event.target.checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm font-medium text-[#2F3E46]">HDRI Environment</span>
                  <input
                    type="checkbox"
                    checked={settings?.enableHdri ?? true}
                    onChange={(event) =>
                      updateSceneSettings({ enableHdri: event.target.checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm font-medium text-[#2F3E46]">Snap To Grid</span>
                  <input
                    type="checkbox"
                    checked={settings?.snapToGrid ?? true}
                    onChange={(event) =>
                      updateSceneSettings({ snapToGrid: event.target.checked })
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm font-medium text-[#2F3E46]">Livestream Mode</span>
                  <input
                    type="checkbox"
                    checked={settings?.livestreamMode ?? false}
                    onChange={(event) =>
                      updateSceneSettings({ livestreamMode: event.target.checked })
                    }
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-[#FCFCFA] p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#84A98C]">
                Lighting
              </div>
              <div className="mt-4 space-y-4">
                <PropertyField label="Ambient">
                  <input
                    type="range"
                    min="0.2"
                    max="2"
                    step="0.1"
                    value={settings?.ambientLightIntensity ?? 1.1}
                    onChange={(event) =>
                      updateSceneSettings({
                        ambientLightIntensity: Number(event.target.value),
                      })
                    }
                    className="w-full accent-[#84A98C]"
                  />
                </PropertyField>
                <PropertyField label="Directional">
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.1"
                    value={settings?.directionalLightIntensity ?? 2.1}
                    onChange={(event) =>
                      updateSceneSettings({
                        directionalLightIntensity: Number(event.target.value),
                      })
                    }
                    className="w-full accent-[#84A98C]"
                  />
                </PropertyField>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-black/5 bg-[#FCFCFA] p-4">
              <div className="text-lg font-semibold text-[#2F3E46]">
                {item.label || item.type}
              </div>
              <div className="mt-1 text-sm uppercase tracking-[0.14em] text-[#84A98C]">
                {item.type}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <PropertyField label="X">
                  <input
                    type="number"
                    step="0.1"
                    value={item.x}
                    onChange={(event) =>
                      updateItem(item.id, { x: Number(event.target.value) })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
                  />
                </PropertyField>
                <PropertyField label="Y">
                  <input
                    type="number"
                    step="0.1"
                    value={item.y}
                    onChange={(event) =>
                      updateItem(item.id, { y: Number(event.target.value) })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
                  />
                </PropertyField>
                <PropertyField label="Z">
                  <input
                    type="number"
                    step="0.1"
                    value={item.z}
                    onChange={(event) =>
                      updateItem(item.id, { z: Number(event.target.value) })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
                  />
                </PropertyField>
                <PropertyField label="Rotation">
                  <input
                    type="number"
                    step="0.1"
                    value={item.rotationY}
                    onChange={(event) =>
                      updateItem(item.id, {
                        rotationY: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
                  />
                </PropertyField>
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-[#FCFCFA] p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#84A98C]">
                Scale
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(["X", "Y", "Z"] as const).map((axis, index) => (
                  <PropertyField key={axis} label={axis}>
                    <input
                      type="number"
                      step="0.1"
                      value={item.scale[index]}
                      onChange={(event) => {
                        const nextScale = [...item.scale] as [
                          number,
                          number,
                          number,
                        ];
                        nextScale[index] = Number(event.target.value);
                        updateItem(item.id, { scale: nextScale });
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-[#2F3E46]"
                    />
                  </PropertyField>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-[#FCFCFA] p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#84A98C]">
                Material
              </div>
              <div className="mt-4 space-y-4">
                <PropertyField label="Color">
                  <input
                    type="color"
                    value={item.color || "#ffffff"}
                    onChange={(event) =>
                      updateItem(item.id, { color: event.target.value })
                    }
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white p-2"
                  />
                </PropertyField>
                <PropertyField label="Roughness">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={item.material?.roughness ?? 0.65}
                    onChange={(event) =>
                      updateItem(item.id, {
                        material: {
                          roughness: Number(event.target.value),
                          metalness: item.material?.metalness ?? 0.1,
                        },
                      })
                    }
                    className="w-full accent-[#84A98C]"
                  />
                </PropertyField>
                <PropertyField label="Metalness">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={item.material?.metalness ?? 0.1}
                    onChange={(event) =>
                      updateItem(item.id, {
                        material: {
                          roughness: item.material?.roughness ?? 0.65,
                          metalness: Number(event.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#84A98C]"
                  />
                </PropertyField>
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
