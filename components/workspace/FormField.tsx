import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  inline?: boolean;
  optional?: boolean;
  rightElement?: React.ReactNode;
}

export function FormField({
  label,
  children,
  className,
  labelClassName,
  inline = false,
  optional = false,
  rightElement,
}: FormFieldProps) {
  if (inline) {
    return (
      <div className={cn("flex items-center justify-between gap-4", className)}>
        <Label className={cn("text-sm font-medium", labelClassName)}>
          {label}
          {optional && (
            <span className="ml-1 text-muted-foreground">(Optional)</span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          {rightElement}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className={cn("text-sm font-medium", labelClassName)}>
          {label}
          {optional && (
            <span className="ml-1 text-muted-foreground">(Optional)</span>
          )}
        </Label>
        {rightElement}
      </div>
      {children}
    </div>
  );
}
