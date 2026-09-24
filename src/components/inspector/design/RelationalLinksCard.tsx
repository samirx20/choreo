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
            <Pin className="w-3.5 h-3.5 text-foreground" />
            <h4 className="text-xs font-semibold text-foreground">Connector Pinning</h4>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 font-mono font-medium">
            1D Dynamic Link
          </span>
        </div>

        {/* Pin End Point */}
        <div className="space-y-2 p-2.5 rounded-md bg-muted/30 border border-border/60 text-xs">
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
          <Link2 className="w-3.5 h-3.5 text-foreground" />
          <h4 className="text-xs font-semibold text-foreground">Relational Linking</h4>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 font-mono font-medium">
          {children?.length} {children?.length === 1 ? "child" : "children"}
        </span>
      </div>

      {/* Link Modes (Modular Multi-Link Controls) */}
      <div className="space-y-2">
        {/* Link Mode 1: Hug Content Bounds */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all space-y-2.5",
            isHugEnabled
              ? "bg-card border-border shadow-xs"
              : "bg-muted/20 border-border/50 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`link-hug-${selectedLayer.id}`}
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-foreground"
            >
              <Checkbox
                id={`link-hug-${selectedLayer.id}`}
                checked={isHugEnabled}
                onCheckedChange={(checked) => toggleHug(Boolean(checked))}
              />
              <div className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Hug Bounds</span>
              </div>
            </label>
          </div>

          {isHugEnabled && (
            <div className="pl-6 space-y-2.5 text-xs pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">Dimension</span>
                <div className="flex items-center bg-muted p-0.5 rounded border border-border/40 text-[10px]">
                  {(["both", "width", "height"] as const).map((dim) => (
                    <button
                      key={dim}
                      type="button"
                      onClick={() =>
                        updateLayerContainerLayout(selectedLayer.id, {
                          hug: { ...containerLayout?.hug, enabled: true, dimension: dim },
                        })
                      }
                      className={cn(
                        "px-2 py-0.5 rounded transition-all capitalize cursor-pointer",
                        hugDimension === dim
                          ? "bg-card text-foreground font-medium shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {dim}
                    </button>
                  ))}
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
                <span className="text-[10px] text-muted-foreground font-medium">Physics</span>
                <div className="flex items-center bg-muted p-0.5 rounded border border-border/40 text-[10px]">
                  {(["spring", "instant"] as const).map((phys) => (
                    <button
                      key={phys}
                      type="button"
                      onClick={() =>
                        updateLayerContainerLayout(selectedLayer.id, {
                          physics: phys,
                          hug: { ...containerLayout?.hug, enabled: true, physics: phys },
                        })
                      }
                      className={cn(
                        "px-2.5 py-0.5 rounded transition-all capitalize cursor-pointer",
                        hugPhysics === phys
                          ? "bg-card text-foreground font-medium shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {phys}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Link Mode 2: Reflow Stack */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all space-y-2.5",
            isStackEnabled
              ? "bg-card border-border shadow-xs"
              : "bg-muted/20 border-border/50 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`link-stack-${selectedLayer.id}`}
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-foreground"
            >
              <Checkbox
                id={`link-stack-${selectedLayer.id}`}
                checked={isStackEnabled}
                onCheckedChange={(checked) => toggleStack(Boolean(checked))}
              />
              <div className="flex items-center gap-1.5">
                <MoveHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Reflow Stack</span>
              </div>
            </label>
          </div>

          {isStackEnabled && (
            <div className="pl-6 space-y-2.5 text-xs pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">Axis</span>
                <div className="flex items-center bg-muted p-0.5 rounded border border-border/40 text-[10px]">
                  {(["vertical", "horizontal"] as const).map((ax) => (
                    <button
                      key={ax}
                      type="button"
                      onClick={() =>
                        updateLayerContainerLayout(selectedLayer.id, {
                          stackAxis: ax,
                          stack: { ...containerLayout?.stack, enabled: true, axis: ax },
                        })
                      }
                      className={cn(
                        "px-2.5 py-0.5 rounded transition-all capitalize cursor-pointer",
                        stackAxis === ax
                          ? "bg-card text-foreground font-medium shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ax}
                    </button>
                  ))}
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
                  <span className="text-[10px] text-muted-foreground font-medium">Align</span>
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

        {/* Link Mode 3: Clip Content */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all flex items-center justify-between",
            isClipEnabled
              ? "bg-card border-border shadow-xs"
              : "bg-muted/20 border-border/50 hover:bg-muted/30"
          )}
        >
          <label
            htmlFor={`link-clip-${selectedLayer.id}`}
            className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-foreground"
          >
            <Checkbox
              id={`link-clip-${selectedLayer.id}`}
              checked={isClipEnabled}
              onCheckedChange={(checked) => toggleClip(Boolean(checked))}
            />
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Clip Content</span>
            </div>
          </label>
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
              className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/60 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-card border border-border/60 text-muted-foreground font-semibold">
                  {child.type}
                </span>
                <span className="truncate text-foreground font-medium text-xs">
                  {child.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => detachChildFromParent(child.id)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
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
