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
    <div className="space-y-4 pt-1" data-testid="multi-selection-card">
      {/* 1. MASKING SECTION */}
      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CircleDashed className="w-3.5 h-3.5 text-purple-400" />
            Masking
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Ctrl+Alt+M
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          The bottom-most layer acts as a stencil, clipping the layers above it.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => maskSelection()}
            className="flex-1 h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Create Mask Group (Ctrl+Alt+M)"
          >
            <CircleDashed className="w-3.5 h-3.5" />
            <span>Mask Selection</span>
          </button>

          {maskGroup && (
            <button
              type="button"
              onClick={() => unmaskGroup(maskGroup.id)}
              className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-medium text-xs transition-colors cursor-pointer"
              title="Release Mask Group"
            >
              Release
            </button>
          )}
        </div>
      </div>

      {/* 2. BOOLEAN OPERATIONS SECTION */}
      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Combine className="w-3.5 h-3.5 text-blue-400" />
            Boolean Operations
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Shapes & Paths
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 border border-border/50 rounded-lg">
          <button
            type="button"
            onClick={() => applyBooleanOperation("union")}
            className="h-7 rounded flex flex-col items-center justify-center gap-0.5 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Union Selection (Ctrl+Alt+U)"
          >
            <Combine className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium">Union</span>
          </button>

          <button
            type="button"
            onClick={() => applyBooleanOperation("subtract")}
            className="h-7 rounded flex flex-col items-center justify-center gap-0.5 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Subtract Selection (Ctrl+Alt+S)"
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium">Subtract</span>
          </button>

          <button
            type="button"
            onClick={() => applyBooleanOperation("intersect")}
            className="h-7 rounded flex flex-col items-center justify-center gap-0.5 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Intersect Selection (Ctrl+Alt+I)"
          >
            <Blend className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium">Intersect</span>
          </button>

          <button
            type="button"
            onClick={() => applyBooleanOperation("exclude")}
            className="h-7 rounded flex flex-col items-center justify-center gap-0.5 hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Exclude Selection (Ctrl+Alt+X)"
          >
            <Split className="w-3.5 h-3.5" />
            <span className="text-[9px] font-medium">Exclude</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => flattenSelection()}
          className="w-full h-7 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          title="Flatten to Vector Path (Ctrl+E)"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span>Flatten to Vector Path</span>
          <span className="text-[10px] text-muted-foreground font-mono ml-auto mr-1">Ctrl+E</span>
        </button>
      </div>

      {/* 3. GROUPING SECTION */}
      <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-zinc-400" />
            Grouping
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Ctrl+G
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => groupSelection()}
            className="flex-1 h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Group Elements (Ctrl+G)"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Group ({selectedLayers.length})</span>
          </button>

          {regularGroup && (
            <button
              type="button"
              onClick={() => ungroup(regularGroup.id)}
              className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Ungroup (Ctrl+Shift+G)"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Ungroup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
