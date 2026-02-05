"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface BudgetRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  formatValue?: (value: number) => string;
}

export function BudgetRangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1000,
  className,
}: BudgetRangeSliderProps) {
  const handleChange = (values: number[]) => {
    onChange([values[0], values[1]]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Slider
        value={value}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="[&_[data-orientation=horizontal]]:h-1.5 [&_span[data-orientation=horizontal]>span]:bg-indigo-600 [&_span[role=slider]]:h-4 [&_span[role=slider]]:w-4 [&_span[role=slider]]:border-indigo-600"
      />
    </div>
  );
}
