import React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

export const AlignmentBar: React.FC = () => {
  const { alignSelectedLayers, distributeSpacing } = useProjectStore();

  return (
    <div className="flex items-center justify-between px-1 py-1 bg-muted rounded border border-border/40">
      <button
        onClick={() => alignSelectedLayers("left")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => alignSelectedLayers("center")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Align Horizontal Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => alignSelectedLayers("right")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => alignSelectedLayers("top")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Align Top"
      >
        <AlignStartVertical className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => alignSelectedLayers("middle")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Align Vertical Center"
      >
        <AlignCenterVertical className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => alignSelectedLayers("bottom")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Align Bottom"
      >
        <AlignEndVertical className="h-3.5 w-3.5" />
      </button>
      <div className="w-[1px] h-3.5 bg-border mx-0.5" />
      <button
        onClick={() => distributeSpacing("horizontal")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Distribute Horizontally"
      >
        <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => distributeSpacing("vertical")}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors"
        title="Distribute Vertically"
      >
        <AlignVerticalDistributeCenter className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
