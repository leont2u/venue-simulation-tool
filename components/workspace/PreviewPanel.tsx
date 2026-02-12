"use client";

import React from "react";

import { useState } from "react";
import { Box, Grid3X3, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutBlueprint } from "@/lib/layout.types";
import { VenueCanvas } from "./VenueCanvas";

type ViewMode = "3d" | "topdown" | "layers";

interface ViewToggleOption {
  id: ViewMode;
  label: string;
  icon: React.ReactNode;
}

const viewOptions: ViewToggleOption[] = [
  { id: "3d", label: "3D View", icon: <Box className="h-4 w-4" /> },
  { id: "topdown", label: "Top-down", icon: <Grid3X3 className="h-4 w-4" /> },
  { id: "layers", label: "Layers", icon: <Layers className="h-4 w-4" /> },
];

interface PreviewPanelProps {
  className?: string;
  blueprint?: LayoutBlueprint | null;
}

export function PreviewPanel({
  className,
  blueprint = null,
}: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("3d");

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-base font-medium">3D Preview</h2>
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          {viewOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setViewMode(option.id)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === option.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        {!blueprint ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
              <svg
                className="h-10 w-10 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">No Preview Available</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Generate a layout or import a sketch to preview your venue in
                3D.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <VenueCanvas blueprint={blueprint} viewMode={viewMode} />
          </div>
        )}
      </div>
    </div>
  );
}
