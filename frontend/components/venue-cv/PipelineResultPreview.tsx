"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  LayoutGrid,
  Sofa,
  Lightbulb,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { SceneGraphResponse } from "@/types/venue-cv";

interface Props {
  sceneGraph: SceneGraphResponse;
  onAccept: () => Promise<void>;
  onDiscard: () => void;
  accepting: boolean;
}

export default function PipelineResultPreview({
  sceneGraph,
  onAccept,
  onDiscard,
  accepting,
}: Props) {
  const sg = sceneGraph.graph_json;
  const semantic = sg?.semantic ?? sceneGraph.llm_reasoning_json ?? {};

  const venueType   = semantic.venue_type   ?? sceneGraph.venue_type   ?? "Unknown";
  const layoutType  = semantic.event_setup_style ?? sceneGraph.layout_type ?? "Unknown";
  const capacity    = semantic.capacity_estimate ?? sceneGraph.capacity_est ?? "—";
  const confidence  = sceneGraph.confidence;

  const room        = sg?.room ?? {
    width: sceneGraph.room_width, depth: sceneGraph.room_depth, height: sceneGraph.room_height,
  };
  const objects     = sg?.objects ?? [];
  const corrections = semantic.llm_corrections ?? [];
  const features    = semantic.detected_features ?? [];

  // Tally object types
  const counts: Record<string, number> = {};
  for (const obj of objects) {
    counts[obj.type] = (counts[obj.type] ?? 0) + 1;
  }
  const topObjects = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-(--sf-accent)/10">
          <Building2 className="h-5 w-5 text-(--sf-accent)" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-(--sf-text)">
            {formatLabel(venueType)}
          </h3>
          <p className="text-[12px] text-(--sf-text-muted)">
            {formatLabel(layoutType)} setup
            {confidence !== null && confidence !== undefined && (
              <span className="ml-2 rounded-full bg-(--sf-surface-soft) px-1.5 py-0.5 text-[10px]">
                {Math.round(confidence * 100)}% confidence
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Room"
          value={`${room.width}×${room.depth}m`}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Capacity"
          value={String(capacity)}
        />
        <StatCard
          icon={<Sofa className="h-4 w-4" />}
          label="Objects"
          value={String(objects.length)}
        />
      </div>

      {/* Detected objects */}
      {topObjects.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--sf-text-muted)">
            Detected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topObjects.map(([type, count]) => (
              <span
                key={type}
                className="rounded-full bg-(--sf-surface-soft) px-2.5 py-1 text-[11px] font-medium text-(--sf-text)"
              >
                {count}× {formatLabel(type)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detected features */}
      {features.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--sf-text-muted)">
            Features
          </p>
          <div className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <span
                key={f}
                className="flex items-center gap-1 rounded-full border border-(--sf-accent)/30 bg-(--sf-accent)/5
                  px-2 py-0.5 text-[11px] text-(--sf-accent)"
              >
                <Lightbulb className="h-2.5 w-2.5" />
                {formatLabel(f)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* LLM corrections */}
      {corrections.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold text-amber-700">
            Auto-corrected geometry
          </p>
          <ul className="space-y-0.5">
            {corrections.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence note */}
      {semantic.confidence_notes && (
        <p className="text-[11px] italic text-(--sf-text-muted)">{semantic.confidence_notes}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onDiscard}
          disabled={accepting}
          className="flex-1 rounded-lg border border-(--sf-border) px-4 py-2.5 text-[13px] font-medium
            text-(--sf-text-muted) transition hover:border-(--sf-border-strong) hover:text-(--sf-text)
            disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Discard
          </span>
        </button>
        <button
          onClick={onAccept}
          disabled={accepting}
          className="flex-[2] rounded-lg bg-(--sf-accent) px-4 py-2.5 text-[13px] font-semibold text-white
            transition hover:bg-(--sf-accent)/90 disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {accepting ? "Opening editor…" : "Open in Editor"}
          </span>
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-(--sf-surface-soft) p-3 text-center">
      <div className="text-(--sf-text-muted)">{icon}</div>
      <span className="text-[16px] font-bold text-(--sf-text)">{value}</span>
      <span className="text-[10px] text-(--sf-text-muted)">{label}</span>
    </div>
  );
}

function formatLabel(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
