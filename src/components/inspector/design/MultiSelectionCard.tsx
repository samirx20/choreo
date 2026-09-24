import React from "react";
import {
  CircleDashed,
  Combine,
  MinusCircle,
  Blend,
  Split,
  Layers,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";

interface MultiSelectionCardProps {
  selectedLayers: Layer[];
}

export const MultiSelectionCard: React.FC<MultiSelectionCardProps> = ({
  selectedLayers,
}) => {
  const {
    maskSelection,
    unmaskGroup,
    applyBooleanOperation,
    flattenSelection,
    groupSelection,
    ungroup,
  } = useProjectStore();

  const maskGroup = selectedLayers.find(
    (l) => l.type === "group" && (l as any).isMaskGroup
  );
  const regularGroup = selectedLayers.find(
    (l) => l.type === "group" && !(l as any).isMaskGroup
  );

  return (
    <div className="border-t border-border divide-y divide-border/50" data-testid="multi-selection-card">
      {/* 1. BOOLEAN OPERATIONS */}
      <div className="py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Boolean</span>
          <span className="text-[10px] text-muted-foreground font-mono">Shapes</span>
        </div>

        <div className="flex items-center justify-between px-1 py-1 bg-muted rounded border border-border/40">
          <button
            type="button"
            onClick={() => applyBooleanOperation("union")}
            className="flex-1 py-1 flex items-center justify-center text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors cursor-pointer"
            title="Union Selection (Ctrl+Alt+U)"
          >
            <Combine className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyBooleanOperation("subtract")}
            className="flex-1 py-1 flex items-center justify-center text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors cursor-pointer"
            title="Subtract Selection (Ctrl+Alt+S)"
          >
            <MinusCircle className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyBooleanOperation("intersect")}
            className="flex-1 py-1 flex items-center justify-center text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors cursor-pointer"
            title="Intersect Selection (Ctrl+Alt+I)"
          >
            <Blend className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyBooleanOperation("exclude")}
            className="flex-1 py-1 flex items-center justify-center text-muted-foreground hover:text-foreground rounded hover:bg-card transition-colors cursor-pointer"
            title="Exclude Selection (Ctrl+Alt+X)"
          >
            <Split className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => flattenSelection()}
          className="w-full h-7 px-2 flex items-center justify-between bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border transition-colors cursor-pointer"
          title="Flatten to Vector Path (Ctrl+E)"
        >
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Flatten</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Ctrl+E</span>
        </button>
      </div>

      {/* 2. MASKING */}
      <div className="py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Mask</span>
          <span className="text-[10px] text-muted-foreground font-mono">Ctrl+Alt+M</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => maskSelection()}
            className="flex-1 h-7 px-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Create Mask Group (Ctrl+Alt+M)"
          >
            <CircleDashed className="h-3.5 w-3.5 text-purple-400" />
            <span>Mask Selection</span>
          </button>

          {maskGroup && (
            <button
              type="button"
              onClick={() => unmaskGroup(maskGroup.id)}
              className="h-7 px-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border transition-colors cursor-pointer"
              title="Release Mask Group"
            >
              Release
            </button>
          )}
        </div>
      </div>

      {/* 3. GROUPING */}
      <div className="py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Group</span>
          <span className="text-[10px] text-muted-foreground font-mono">Ctrl+G</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => groupSelection()}
            className="flex-1 h-7 px-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Group Elements (Ctrl+G)"
          >
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Group ({selectedLayers.length})</span>
          </button>

          {regularGroup && (
            <button
              type="button"
              onClick={() => ungroup(regularGroup.id)}
              className="h-7 px-2.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Ungroup (Ctrl+Shift+G)"
            >
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Ungroup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
