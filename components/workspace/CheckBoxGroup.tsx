"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxOption {
  id: string;
  label: string;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  columns?: number;
  className?: string;
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  columns = 2,
  className,
}: CheckboxGroupProps) {
  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...value, id]);
    } else {
      onChange(value.filter((v) => v !== id));
    }
  };

  return (
    <div
      className={cn("grid gap-3", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {options.map((option) => (
        <div key={option.id} className="flex items-center gap-2">
          <Checkbox
            id={option.id}
            checked={value.includes(option.id)}
            onCheckedChange={(checked) =>
              handleCheckboxChange(option.id, checked as boolean)
            }
          />
          <Label
            htmlFor={option.id}
            className="text-sm font-normal cursor-pointer"
          >
            {option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
