import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-primary border border-primary/30 font-medium",
        secondary:
          "border-transparent bg-secondary text-foreground",
        destructive:
          "border-transparent bg-destructive/15 text-destructive border border-destructive/30",
        outline: "text-muted-foreground border border-border",
        success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
