"use client";

import { cn } from "@/lib/utils";

interface EnvironmentToggleProps {
  value: "indoor" | "outdoor";
  onChange: (value: "indoor" | "outdoor") => void;
  className?: string;
}

export function EnvironmentToggle({
  value,
  onChange,
  className,
}: EnvironmentToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-muted p-0.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange("indoor")}
        className={cn(
          "rounded px-3 py-1 text-sm font-medium transition-colors",
          value === "indoor"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Indoor
      </button>
      <button
        type="button"
        onClick={() => onChange("outdoor")}
        className={cn(
          "rounded px-3 py-1 text-sm font-medium transition-colors",
          value === "outdoor"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Outdoor
      </button>
    </div>
  );
}
