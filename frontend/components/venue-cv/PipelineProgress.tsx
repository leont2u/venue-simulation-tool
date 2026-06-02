"use client";

import { CVJobStatus, PipelineStage } from "@/types/venue-cv";
import { CheckCircle2, XCircle, Loader2, Circle } from "lucide-react";

interface Props {
  status: CVJobStatus;
}

interface StageConfig {
  key: string;
  label: string;
  description: string;
}

const STAGE_ORDER: StageConfig[] = [
  { key: "preprocessing",    label: "Preprocessing",      description: "Normalising image format and resolution" },
  { key: "object_detection", label: "Object Detection",   description: "YOLO World — identifying furniture & fixtures" },
  { key: "segmentation",     label: "Segmentation",       description: "SAM 2 — isolating each detected object" },
  { key: "depth_estimation", label: "Depth Estimation",   description: "Depth Anything V2 — building metric depth map" },
  { key: "room_layout",      label: "Room Layout",        description: "Estimating walls, floor, ceiling, windows, doors" },
  { key: "sfm",              label: "Structure from Motion", description: "COLMAP — computing camera poses & point cloud" },
  { key: "gaussian_splat",   label: "Gaussian Splatting", description: "Training 3D Gaussian representation from video" },
  { key: "scene_graph",      label: "Scene Graph",        description: "Fusing all detections into a 3D scene graph" },
  { key: "llm_reasoning",    label: "LLM Reasoning",      description: "Gemma 3 — inferring venue type & correcting geometry" },
  { key: "asset_matching",   label: "Asset Matching",     description: "Mapping objects to 3D assets" },
  { key: "scene_generation", label: "Scene Generation",   description: "Building your editable Three.js scene" },
];

export default function PipelineProgress({ status }: Props) {
  const overall = status.overall_progress ?? 0;
  const isComplete = status.status === "success";
  const isFailed   = status.status === "failed";

  // Filter out SfM / Gaussian Splat for single-image mode
  const stages = STAGE_ORDER.filter((s) => {
    if (status.input_mode === "single_image" && (s.key === "sfm" || s.key === "gaussian_splat")) return false;
    if (status.input_mode === "multi_image"  && s.key === "gaussian_splat") return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-(--sf-text)">
            {isComplete ? "Complete!" : isFailed ? "Failed" : `Processing… ${overall}%`}
          </span>
          <span className="text-[11px] text-(--sf-text-muted)">
            {isComplete
              ? "Ready to open in editor"
              : isFailed
                ? status.error_message || "An error occurred"
                : `Stage: ${stageLabel(status.current_stage)}`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-(--sf-surface-soft)">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFailed ? "bg-red-500" : isComplete ? "bg-emerald-500" : "bg-(--sf-accent)"
            }`}
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      {/* Per-stage breakdown */}
      <div className="space-y-1">
        {stages.map((stage) => {
          const info = status.stages[stage.key] ?? { status: "queued", pct: 0 };
          return (
            <StageRow
              key={stage.key}
              label={stage.label}
              description={stage.description}
              stageStatus={info.status}
              pct={info.pct}
              error={info.error}
            />
          );
        })}
      </div>
    </div>
  );
}

function StageRow({
  label,
  description,
  stageStatus,
  pct,
  error,
}: {
  label: string;
  description: string;
  stageStatus: string;
  pct: number;
  error?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-(--sf-surface-soft)">
      {/* Icon */}
      <div className="flex-shrink-0">
        {stageStatus === "success" && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        {stageStatus === "processing" && (
          <Loader2 className="h-4 w-4 animate-spin text-(--sf-accent)" />
        )}
        {stageStatus === "failed" && (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        {stageStatus === "queued" && (
          <Circle className="h-4 w-4 text-(--sf-border-strong)" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[12px] font-medium ${
              stageStatus === "queued"
                ? "text-(--sf-text-muted)"
                : stageStatus === "failed"
                  ? "text-red-600"
                  : "text-(--sf-text)"
            }`}
          >
            {label}
          </span>
          {stageStatus === "processing" && (
            <span className="flex-shrink-0 text-[11px] text-(--sf-accent)">{pct}%</span>
          )}
        </div>

        {stageStatus === "processing" && (
          <p className="text-[11px] text-(--sf-text-muted)">{description}</p>
        )}
        {stageStatus === "failed" && error && (
          <p className="text-[11px] text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}

function stageLabel(stage: PipelineStage): string {
  const map: Partial<Record<PipelineStage, string>> = {
    preprocessing:    "Preprocessing",
    object_detection: "Object Detection",
    segmentation:     "Segmentation",
    depth_estimation: "Depth Estimation",
    room_layout:      "Room Layout",
    sfm:              "Structure from Motion",
    gaussian_splat:   "Gaussian Splatting",
    scene_graph:      "Scene Graph",
    llm_reasoning:    "LLM Reasoning",
    asset_matching:   "Asset Matching",
    scene_generation: "Scene Generation",
    complete:         "Complete",
    failed:           "Failed",
  };
  return map[stage] ?? stage;
}
