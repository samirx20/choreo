import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MinimalSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const MinimalSection: React.FC<MinimalSectionProps> = ({
  title,
  icon: Icon,
  defaultOpen = true,
  badge,
  headerAction,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border-b border-border pb-3 mb-2 select-none", className)}>
      {/* Header Row */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-1 flex items-center justify-between text-muted-foreground hover:text-foreground cursor-pointer group transition-colors rounded-[8px] hover:bg-muted/50"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-150 shrink-0 text-muted-foreground group-hover:text-foreground",
              isOpen && "rotate-90 text-foreground"
            )}
          />
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />}
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground group-hover:text-foreground truncate">
            {title}
          </span>
          {badge}
        </div>

        {headerAction && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 shrink-0"
          >
            {headerAction}
          </div>
        )}
      </div>

      {/* Collapsible Content */}
      {isOpen && <div className="mt-1.5 space-y-2 px-1">{children}</div>}
    </div>
  );
};
