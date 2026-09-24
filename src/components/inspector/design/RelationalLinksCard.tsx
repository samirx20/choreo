import React from "react";
import { Link2, Maximize2, MoveHorizontal, Pin, Unlink, Scissors } from "lucide-react";
import { Layer, ShapeLayer, ConstraintAnchor } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
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

const ANCHOR_OPTIONS: { label: string; value: ConstraintAnchor }[] = [
  { label: "Top Left", value: "top-left" },
  { label: "Top Center", value: "top-center" },
  { label: "Top Right", value: "top-right" },
  { label: "Middle Left", value: "middle-left" },
  { label: "Center", value: "center" },
  { label: "Middle Right", value: "middle-right" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Bottom Center", value: "bottom-center" },
  { label: "Bottom Right", value: "bottom-right" },
];

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

  // 1D Connector Endpoint Pinning (Line / Arrow)
  if (isConnector) {
    const bindings = selectedLayer.bindings || [];
    const startBinding = bindings.find((b) => b.drivenProp === "y") || bindings[0];
    const endBinding = bindings.find((b) => b.drivenProp === "x") || bindings[1];

    return (
      <div className="pt-2 pb-2.5 space-y-2.5 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-blue-400" />
            <h4 className="text-xs font-semibold text-foreground">Connector Pinning</h4>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
            1D Dynamic Link
          </span>
        </div>

        {/* Pin End Point */}
        <div className="space-y-2 p-2 rounded-md bg-zinc-900/40 border border-border/30 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px] font-medium">Pin Endpoint</span>
            <Select
              value={endBinding?.driverLayerId || "none"}
              onValueChange={(targetId) => {
                if (targetId === "none") {
                  if (endBinding) {
                    removeLayerBinding(selectedLayer.id, endBinding.id);
                  }
                } else {
                  if (endBinding) {
                    removeLayerBinding(selectedLayer.id, endBinding.id);
                  }
                  addLayerBinding(selectedLayer.id, {
                    id: `bind_end_${Date.now()}`,
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

          {endBinding && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">Target Anchor</span>
              <Select
                value={endBinding.targetAnchor || "center"}
                onValueChange={(val: any) => {
                  removeLayerBinding(selectedLayer.id, endBinding.id);
                  addLayerBinding(selectedLayer.id, {
                    ...endBinding,
                    id: `bind_end_${Date.now()}`,
                    targetAnchor: val,
                  });
                }}
              >
                <SelectTrigger className="w-32 h-6 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANCHOR_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Parent Container Multi-Relational Linking
  const containerLayout = selectedLayer.containerLayout;
  const isHugEnabled =
    containerLayout?.hug?.enabled ??
    (containerLayout?.mode === "hug" || containerLayout?.mode === undefined);
  const isStackEnabled =
    containerLayout?.stack?.enabled ??
    containerLayout?.mode === "stack";
  const isClipEnabled = Boolean(containerLayout?.clip?.enabled);

  const hugPaddingX = containerLayout?.hug?.paddingX ?? containerLayout?.paddingX ?? 20;
  const hugPaddingY = containerLayout?.hug?.paddingY ?? containerLayout?.paddingY ?? 14;
  const hugDimension = containerLayout?.hug?.dimension ?? "both";
  const hugPhysics = containerLayout?.hug?.physics ?? containerLayout?.physics ?? "spring";

  const stackAxis = containerLayout?.stack?.axis ?? containerLayout?.stackAxis ?? "vertical";
  const stackGap = containerLayout?.stack?.gap ?? containerLayout?.stackGap ?? 16;
  const stackAlign = containerLayout?.stack?.align ?? containerLayout?.stackAlign ?? "start";

  const toggleHug = (checked: boolean) => {
    updateLayerContainerLayout(selectedLayer.id, {
      hug: {
        enabled: checked,
        dimension: hugDimension,
        paddingX: hugPaddingX,
        paddingY: hugPaddingY,
        physics: hugPhysics,
      },
      mode: checked ? (isStackEnabled ? "stack" : "hug") : (isStackEnabled ? "stack" : "freeform"),
    });
  };

  const toggleStack = (checked: boolean) => {
    updateLayerContainerLayout(selectedLayer.id, {
      stack: {
        enabled: checked,
        axis: stackAxis,
        gap: stackGap,
        align: stackAlign,
      },
      mode: checked ? "stack" : (isHugEnabled ? "hug" : "freeform"),
    });
  };

  const toggleClip = (checked: boolean) => {
    updateLayerContainerLayout(selectedLayer.id, {
      clip: { enabled: checked },
    });
  };

  return (
    <div className="pt-2 pb-2.5 space-y-3 border-t border-border/50">
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

      {/* Link Ways List (Modular Multi-Link Controls) */}
      <div className="space-y-2">
        {/* Link Way 1: Hug Content Bounds */}
        <div
          className={cn(
            "p-2 rounded-md border transition-colors space-y-2",
            isHugEnabled
              ? "bg-purple-500/5 border-purple-500/30"
              : "bg-zinc-900/30 border-border/30"
          )}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`link-hug-${selectedLayer.id}`}
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium"
            >
              <Checkbox
                id={`link-hug-${selectedLayer.id}`}
                checked={isHugEnabled}
                onCheckedChange={(checked) => toggleHug(Boolean(checked))}
              />
              <div className="flex items-center gap-1.5">
                <Maximize2 className="w-3 h-3 text-purple-400" />
                <span>Hug Bounds</span>
              </div>
            </label>
            <span className="font-mono text-[9px] text-muted-foreground uppercase">
              Auto-Dilation
            </span>
          </div>

          {isHugEnabled && (
            <div className="pl-6 space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Dimension</span>
                <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded border border-border/30 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        hug: { ...containerLayout?.hug, enabled: true, dimension: "both" },
                      })
                    }
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-colors",
                      hugDimension === "both"
                        ? "bg-[#6d28d9] text-white font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        hug: { ...containerLayout?.hug, enabled: true, dimension: "width" },
                      })
                    }
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-colors",
                      hugDimension === "width"
                        ? "bg-[#6d28d9] text-white font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Width
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        hug: { ...containerLayout?.hug, enabled: true, dimension: "height" },
                      })
                    }
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-colors",
                      hugDimension === "height"
                        ? "bg-[#6d28d9] text-white font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Height
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ScrubbableInput
                  label="Pad X"
                  value={hugPaddingX}
                  min={0}
                  max={160}
                  step={2}
                  onChange={(val) =>
                    updateLayerContainerLayout(selectedLayer.id, {
                      paddingX: val,
                      hug: { ...containerLayout?.hug, enabled: true, paddingX: val },
                    })
                  }
                />
                <ScrubbableInput
                  label="Pad Y"
                  value={hugPaddingY}
                  min={0}
                  max={160}
                  step={2}
                  onChange={(val) =>
                    updateLayerContainerLayout(selectedLayer.id, {
                      paddingY: val,
                      hug: { ...containerLayout?.hug, enabled: true, paddingY: val },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-muted-foreground">Physics</span>
                <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded border border-border/30 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        physics: "spring",
                        hug: { ...containerLayout?.hug, enabled: true, physics: "spring" },
                      })
                    }
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      hugPhysics !== "instant"
                        ? "bg-[#6d28d9] text-white font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Spring
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        physics: "instant",
                        hug: { ...containerLayout?.hug, enabled: true, physics: "instant" },
                      })
                    }
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      hugPhysics === "instant"
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
        </div>

        {/* Link Way 2: Reflow Stack */}
        <div
          className={cn(
            "p-2 rounded-md border transition-colors space-y-2",
            isStackEnabled
              ? "bg-emerald-500/5 border-emerald-500/30"
              : "bg-zinc-900/30 border-border/30"
          )}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`link-stack-${selectedLayer.id}`}
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium"
            >
              <Checkbox
                id={`link-stack-${selectedLayer.id}`}
                checked={isStackEnabled}
                onCheckedChange={(checked) => toggleStack(Boolean(checked))}
              />
              <div className="flex items-center gap-1.5">
                <MoveHorizontal className="w-3 h-3 text-emerald-400" />
                <span>Reflow Stack</span>
              </div>
            </label>
            <span className="font-mono text-[9px] text-muted-foreground uppercase">
              Auto-Flow
            </span>
          </div>

          {isStackEnabled && (
            <div className="pl-6 space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Axis</span>
                <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded border border-border/30 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        stackAxis: "vertical",
                        stack: { ...containerLayout?.stack, enabled: true, axis: "vertical" },
                      })
                    }
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      stackAxis !== "horizontal"
                        ? "bg-[#6d28d9] text-white font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Vertical
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        stackAxis: "horizontal",
                        stack: { ...containerLayout?.stack, enabled: true, axis: "horizontal" },
                      })
                    }
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      stackAxis === "horizontal"
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
                  value={stackGap}
                  min={0}
                  max={120}
                  step={2}
                  onChange={(val) =>
                    updateLayerContainerLayout(selectedLayer.id, {
                      stackGap: val,
                      stack: { ...containerLayout?.stack, enabled: true, gap: val },
                    })
                  }
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground">Align</span>
                  <Select
                    value={stackAlign}
                    onValueChange={(val: any) =>
                      updateLayerContainerLayout(selectedLayer.id, {
                        stackAlign: val,
                        stack: { ...containerLayout?.stack, enabled: true, align: val },
                      })
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
        </div>

        {/* Link Way 3: Clip to Boundary */}
        <div
          className={cn(
            "p-2 rounded-md border transition-colors flex items-center justify-between",
            isClipEnabled
              ? "bg-amber-500/5 border-amber-500/30"
              : "bg-zinc-900/30 border-border/30"
          )}
        >
          <label
            htmlFor={`link-clip-${selectedLayer.id}`}
            className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium"
          >
            <Checkbox
              id={`link-clip-${selectedLayer.id}`}
              checked={isClipEnabled}
              onCheckedChange={(checked) => toggleClip(Boolean(checked))}
            />
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3 h-3 text-amber-400" />
              <span>Clip Content</span>
            </div>
          </label>
          <span className="font-mono text-[9px] text-muted-foreground uppercase">
            Stencil Boundary
          </span>
        </div>
      </div>

      {/* Linked Children List & Detach Action */}
      <div className="space-y-1.5 pt-1">
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
