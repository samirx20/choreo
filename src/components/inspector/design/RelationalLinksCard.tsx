import React from "react";
import { Link2, Maximize2, MoveHorizontal, Pin, Unlink, Layers } from "lucide-react";
import { Layer, ContainerLayoutMode, ShapeLayer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RelationalLinksCardProps {
  selectedLayer: Layer;
}

export const RelationalLinksCard: React.FC<RelationalLinksCardProps> = ({ selectedLayer }) => {
  const {
    document: doc,
    activeScreenId,
    updateLayerContainerLayout,
    detachChildFromParent,
    addLayerBinding,
    removeLayerBinding,
  } = useProjectStore();

  const children = (selectedLayer as any).children as Layer[] | undefined;
  const hasChildren = Array.isArray(children) && children.length > 0;

  const isConnector =
    selectedLayer.type === "line" ||
    (selectedLayer.type === "shape" &&
      ((selectedLayer as ShapeLayer).shapeType === "line" ||
        (selectedLayer as ShapeLayer).shapeType === "arrow"));

  // Rule 9: If layer has no children and is not a connector, render NOTHING. Absolute zero clutter.
  if (!hasChildren && !isConnector) {
    return null;
  }

  const containerLayout = selectedLayer.containerLayout || {
    mode: (children && children.some((c) => c.type === "text" || c.type === "counter" || c.type === "chunk")) ? "hug" : "stack",
    paddingX: 20,
    paddingY: 14,
    physics: "spring",
    stackAxis: "vertical",
    stackGap: 16,
    stackAlign: "start",
  };

  const activeScreen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const allLayers = activeScreen ? activeScreen.layers : [];

  // Candidate target layers for connector line
  const candidateTargets: Layer[] = [];
  function collect(items: Layer[]) {
    for (const l of items) {
      if (l.id !== selectedLayer.id) {
        candidateTargets.push(l);
      }
      if (Array.isArray((l as any).children)) {
        collect((l as any).children);
      }
    }
  }
  collect(allLayers);

  // If layer is a connector (Line / Arrow)
  if (isConnector) {
    const existingBinding = selectedLayer.bindings?.[0];

    return (
      <div className="pt-2 pb-2.5 space-y-2.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-blue-400" />
            <h4 className="text-xs font-semibold text-foreground">Connector Pinning</h4>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
            Dynamic Pin
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">Pin End to</span>
            <Select
              value={existingBinding?.driverLayerId || "none"}
              onValueChange={(targetId) => {
                if (targetId === "none") {
                  if (existingBinding) {
                    removeLayerBinding(selectedLayer.id, existingBinding.id);
                  }
                } else {
                  if (existingBinding) {
                    removeLayerBinding(selectedLayer.id, existingBinding.id);
                  }
                  addLayerBinding(selectedLayer.id, {
                    id: `bind_${Date.now()}`,
                    driverLayerId: targetId,
                    driverProp: "x",
                    drivenProp: "x",
                    mode: "leader-line",
                    targetAnchor: "middle-left",
                    expansionPhysics: "spring",
                  });
                }
              }}
            >
              <SelectTrigger className="w-36 h-7 text-[11px]">
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Freeform)</SelectItem>
                {candidateTargets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // Parent Container Relational Linking
  const currentMode: ContainerLayoutMode = containerLayout.mode || "hug";

  const handleModeChange = (mode: ContainerLayoutMode) => {
    updateLayerContainerLayout(selectedLayer.id, { mode });
  };

  return (
    <div className="pt-2 pb-2.5 space-y-2.5 border-t border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-purple-400" />
          <h4 className="text-xs font-semibold text-foreground">Relational Linking</h4>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-medium">
          {children?.length} {children?.length === 1 ? "child" : "children"}
        </span>
      </div>

      {/* Mode Segmented Controls */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 p-0.5 rounded-md border border-border/40 text-[11px]">
        <button
          type="button"
          onClick={() => handleModeChange("hug")}
          className={cn(
            "flex items-center justify-center gap-1 py-1 rounded transition-colors font-medium",
            currentMode === "hug"
              ? "bg-[#6d28d9] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Maximize2 className="w-3 h-3" />
          <span>Hug</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("stack")}
          className={cn(
            "flex items-center justify-center gap-1 py-1 rounded transition-colors font-medium",
            currentMode === "stack"
              ? "bg-[#6d28d9] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MoveHorizontal className="w-3 h-3" />
          <span>Stack</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("freeform")}
          className={cn(
            "flex items-center justify-center gap-1 py-1 rounded transition-colors font-medium",
            currentMode === "freeform"
              ? "bg-[#6d28d9] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="w-3 h-3" />
          <span>Free</span>
        </button>
      </div>

      {/* Mode 1: Hug Content Controls */}
      {currentMode === "hug" && (
        <div className="space-y-2 bg-zinc-900/40 p-2 rounded-md border border-border/30 text-xs">
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Dynamic Hug Padding</span>
            <span className="font-mono text-[10px] text-purple-400">Auto-Dilation</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ScrubbableInput
              label="Pad X"
              value={containerLayout.paddingX ?? 20}
              min={0}
              max={120}
              step={2}
              onChange={(val) =>
                updateLayerContainerLayout(selectedLayer.id, { paddingX: val })
              }
            />
            <ScrubbableInput
              label="Pad Y"
              value={containerLayout.paddingY ?? 14}
              min={0}
              max={120}
              step={2}
              onChange={(val) =>
                updateLayerContainerLayout(selectedLayer.id, { paddingY: val })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">Physics</span>
            <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded border border-border/30 text-[10px]">
              <button
                type="button"
                onClick={() =>
                  updateLayerContainerLayout(selectedLayer.id, { physics: "spring" })
                }
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  containerLayout.physics !== "instant"
                    ? "bg-[#6d28d9] text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Spring
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLayerContainerLayout(selectedLayer.id, { physics: "instant" })
                }
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  containerLayout.physics === "instant"
                    ? "bg-[#6d28d9] text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Instant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Reflow Stack Controls */}
      {currentMode === "stack" && (
        <div className="space-y-2 bg-zinc-900/40 p-2 rounded-md border border-border/30 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Stack Axis</span>
            <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded border border-border/30 text-[10px]">
              <button
                type="button"
                onClick={() =>
                  updateLayerContainerLayout(selectedLayer.id, { stackAxis: "vertical" })
                }
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  containerLayout.stackAxis !== "horizontal"
                    ? "bg-[#6d28d9] text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Vertical
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLayerContainerLayout(selectedLayer.id, { stackAxis: "horizontal" })
                }
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  containerLayout.stackAxis === "horizontal"
                    ? "bg-[#6d28d9] text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Horizontal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ScrubbableInput
              label="Gap"
              value={containerLayout.stackGap ?? 16}
              min={0}
              max={120}
              step={2}
              onChange={(val) =>
                updateLayerContainerLayout(selectedLayer.id, { stackGap: val })
              }
            />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Align</span>
              <Select
                value={containerLayout.stackAlign || "start"}
                onValueChange={(val: any) =>
                  updateLayerContainerLayout(selectedLayer.id, { stackAlign: val })
                }
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Freeform Description */}
      {currentMode === "freeform" && (
        <div className="p-2 rounded bg-zinc-900/30 border border-border/20 text-[11px] text-muted-foreground/80 leading-relaxed">
          Children move with parent coordinate frame with freeform local offsets.
        </div>
      )}

      {/* Linked Children List & Detach Action */}
      <div className="space-y-1 pt-1">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Linked Elements ({children?.length})
        </span>
        <div className="space-y-1">
          {children?.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-900/60 border border-border/30 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
                  {child.type}
                </span>
                <span className="truncate text-foreground font-medium text-[11px]">
                  {child.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => detachChildFromParent(child.id)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 px-1.5 py-0.5 rounded transition-colors"
                title="Detach and return to root space (0.0000px layout shift)"
              >
                <Unlink className="w-3 h-3" />
                <span>Detach</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
