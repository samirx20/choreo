import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}

export interface CompactSegmentedControlProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  size?: "sm" | "md";
}

export function CompactSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
}: CompactSegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center bg-muted p-0.5 rounded-[10px] border border-border select-none",
        size === "sm" ? "h-6" : "h-7",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.tooltip || opt.label}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 h-full px-2 text-[11px] font-medium rounded-[8px] transition-all",
              isActive
                ? "bg-card text-foreground shadow-xs font-semibold border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            {opt.label && <span className="truncate">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
