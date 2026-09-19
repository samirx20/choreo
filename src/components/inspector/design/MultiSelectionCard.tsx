import React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Folder,
  Trash2,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";

interface MultiSelectionCardProps {
  selectedLayers: Layer[];
}

export const MultiSelectionCard: React.FC<MultiSelectionCardProps> = ({
  selectedLayers,
}) => {
  const { alignSelectedLayers, groupSelection, removeLayer } = useProjectStore();

  return (
    <div className="p-3 space-y-3 text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <span className="text-[11px] font-mono text-muted-foreground">
          {selectedLayers.length} layers selected
        </span>
        <button
          onClick={() => selectedLayers.forEach((l) => removeLayer(l.id))}
          className="p-1 text-muted-foreground hover:text-destructive rounded-[6px] transition-colors"
          title="Delete selected layers"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Alignment Bar */}
      <MinimalSection title="Alignment" defaultOpen={true}>
        <div className="grid grid-cols-6 gap-1 bg-muted/40 p-1 rounded-[10px] border border-input">
          <button
            onClick={() => alignSelectedLayers("left")}
            className="h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
            title="Align Left (Alt+A)"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => alignSelectedLayers("center")}
            className="h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
            title="Align Center (Alt+H)"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => alignSelectedLayers("right")}
            className="h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
            title="Align Right (Alt+D)"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => alignSelectedLayers("top")}
            className="h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
            title="Align Top (Alt+W)"
          >
            <AlignStartVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => alignSelectedLayers("middle")}
            className="h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
            title="Align Middle (Alt+V)"
          >
            <AlignCenterVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => alignSelectedLayers("bottom")}
            className="h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
            title="Align Bottom (Alt+S)"
          >
            <AlignEndVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </MinimalSection>

      {/* Group Action */}
      <button
        onClick={() => groupSelection()}
        className="w-full h-7 rounded-[8px] bg-muted hover:bg-accent text-foreground border border-border flex items-center justify-center gap-1.5 text-xs font-medium transition-colors shadow-xs"
      >
        <Folder className="h-3.5 w-3.5" />
        <span>Group Selection (Cmd+G)</span>
      </button>
    </div>
  );
};
