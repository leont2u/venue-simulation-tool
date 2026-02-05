"use client";

import React from "react";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SliderWithInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  showInput?: boolean;
  inputWidth?: string;
}

export function SliderWithInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  showInput = true,
  inputWidth = "w-16",
}: SliderWithInputProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="flex-1 [&_[data-orientation=horizontal]]:h-1.5 [&_span[data-orientation=horizontal]>span]:bg-indigo-600 [&_span[role=slider]]:h-4 [&_span[role=slider]]:w-4 [&_span[role=slider]]:border-indigo-600"
      />
      {showInput && (
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          className={cn("h-9 text-center", inputWidth)}
        />
      )}
    </div>
  );
}
