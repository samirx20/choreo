import React, { useState } from "react";
import { Link2, Trash2, Plus, Maximize2, Pin, MoveHorizontal, ArrowRight, Sparkles } from "lucide-react";
import { Layer, ElementLinkBinding, LinkMode, ConstraintAnchor } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Button } from "@/components/ui/button";
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

const ANCHOR_OPTIONS: ConstraintAnchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const RelationalLinksCard: React.FC<RelationalLinksCardProps> = ({ selectedLayer }) => {
  const { document: doc, activeScreenId, addLayerBinding, removeLayerBinding } = useProjectStore();
  const [isAdding, setIsAdding] = useState(false);

  // Form state for creating a link
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [linkMode, setLinkMode] = useState<LinkMode>("hug");
  const [padX, setPadX] = useState<number>(16);
  const [padY, setPadY] = useState<number>(12);
  const [driverAnchor, setDriverAnchor] = useState<ConstraintAnchor>("top-right");
  const [targetAnchor, setTargetAnchor] = useState<ConstraintAnchor>("top-left");
  const [offsetDX, setOffsetDX] = useState<number>(0);
  const [offsetDY, setOffsetDY] = useState<number>(0);
  const [reflowAxis, setReflowAxis] = useState<"horizontal" | "vertical">("horizontal");
  const [reflowGap, setReflowGap] = useState<number>(16);
  const [reflowAlignment, setReflowAlignment] = useState<"start" | "center" | "end">("center");
  const [useSpring, setUseSpring] = useState<boolean>(true);

  const activeScreen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const allLayers = activeScreen ? activeScreen.layers : [];

  // Filter available driver layers (cannot link to self)
  const candidateDrivers: Layer[] = [];
  function collect(items: Layer[]) {
    for (const l of items) {
      if (l.id !== selectedLayer.id) {
        candidateDrivers.push(l);
      }
      if (l.type === "group" && (l as any).children) {
        collect((l as any).children);
      }
    }
  }
  collect(allLayers);

  const bindings = selectedLayer.bindings || [];

  const handleCreateLink = () => {
    if (!selectedDriverId) return;

    const newBinding: ElementLinkBinding = {
      id: `bind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      driverLayerId: selectedDriverId,
      driverProp: linkMode === "pin" ? "x" : linkMode === "reflow" ? (reflowAxis === "vertical" ? "y" : "x") : "width",
      drivenProp: linkMode === "pin" ? "x" : linkMode === "reflow" ? (reflowAxis === "vertical" ? "y" : "x") : "width",
      mode: linkMode,
      padding: linkMode === "hug" ? [padX, padY] : undefined,
      driverAnchor: linkMode === "pin" ? driverAnchor : "center",
      targetAnchor: linkMode === "pin" ? targetAnchor : "center",
      offset2D: linkMode === "pin" ? [offsetDX, offsetDY] : undefined,
      reflowAxis: linkMode === "reflow" ? reflowAxis : undefined,
      reflowGap: linkMode === "reflow" ? reflowGap : undefined,
      reflowAlignment: linkMode === "reflow" ? reflowAlignment : undefined,
      expansionPhysics: useSpring ? "spring" : "instant",
      stiffness: 260,
      damping: 24,
    };

    addLayerBinding(selectedLayer.id, newBinding);
    setIsAdding(false);
    setSelectedDriverId("");
  };

  const getDriverName = (driverId: string) => {
    const driver = candidateDrivers.find((l) => l.id === driverId);
    return driver ? driver.name : driverId;
  };

  const getModeIcon = (mode: LinkMode) => {
    switch (mode) {
      case "hug":
        return <Maximize2 className="w-3 h-3 text-purple-400" />;
      case "pin":
        return <Pin className="w-3 h-3 text-blue-400" />;
      case "reflow":
        return <MoveHorizontal className="w-3 h-3 text-emerald-400" />;
      case "connect":
      case "leader-line":
        return <Link2 className="w-3 h-3 text-amber-400" />;
      default:
        return <Link2 className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getModeBadgeClass = (mode: LinkMode) => {
    switch (mode) {
      case "hug":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "pin":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "reflow":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "connect":
      case "leader-line":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="pt-2 pb-2.5 space-y-2 border-t border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-foreground/80" />
          <h4 className="text-xs font-semibold text-foreground">Relational Links</h4>
        </div>
        {!isAdding && candidateDrivers.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(true);
              if (!selectedDriverId && candidateDrivers.length > 0) {
                setSelectedDriverId(candidateDrivers[0].id);
              }
            }}
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Link</span>
          </Button>
        )}
      </div>

      {/* Existing Bindings List */}
      {bindings.length > 0 ? (
        <div className="space-y-1.5">
          {bindings.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-2 py-1.5 rounded-md bg-zinc-900/60 border border-border/40 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {getModeIcon(b.mode)}
                <span
                  className={cn(
                    "text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border",
                    getModeBadgeClass(b.mode)
                  )}
                >
                  {b.mode === "leader-line" ? "connect" : b.mode}
                </span>
                <span className="truncate text-foreground font-medium text-[11px]" title={getDriverName(b.driverLayerId)}>
                  {getDriverName(b.driverLayerId)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {b.mode === "hug" && `${(b.padding as number[])?.[0] ?? 16}px`}
                  {b.mode === "pin" && `${b.driverAnchor ?? "pt"}`}
                  {b.mode === "reflow" && `${b.reflowGap ?? 16}px`}
                  {(b.mode === "connect" || b.mode === "leader-line") && `wire`}
                </span>
                <button
                  type="button"
                  onClick={() => removeLayerBinding(selectedLayer.id, b.id)}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove link"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <p className="text-[11px] text-muted-foreground/70 italic">
            No active relational links. Link with content to hug bounds, pin anchors, or reflow.
          </p>
        )
      )}

      {/* Add New Link Form */}
      {isAdding && (
        <div className="p-2.5 rounded-md bg-zinc-900/80 border border-purple-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              New Relational Link
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">Type</span>
            <Select value={linkMode} onValueChange={(val: any) => setLinkMode(val)}>
              <SelectTrigger className="w-36 h-7 text-[11px]">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hug">Hug Bounds</SelectItem>
                <SelectItem value="pin">Pin Anchor</SelectItem>
                <SelectItem value="reflow">Reflow Gap</SelectItem>
                <SelectItem value="connect">Connect Line</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Element Selector */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">Target</span>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="w-36 h-7 text-[11px]">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {candidateDrivers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode Specific Settings */}
          {linkMode === "hug" && (
            <div className="space-y-1.5 pt-1 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Padding</span>
                <div className="flex items-center gap-1.5 w-36">
                  <ScrubbableInput
                    label="X"
                    value={padX}
                    step={1}
                    onChange={setPadX}
                    className="w-full"
                  />
                  <ScrubbableInput
                    label="Y"
                    value={padY}
                    step={1}
                    onChange={setPadY}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {linkMode === "pin" && (
            <div className="space-y-1.5 pt-1 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Target Pt</span>
                <Select value={driverAnchor} onValueChange={(v: any) => setDriverAnchor(v)}>
                  <SelectTrigger className="w-36 h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANCHOR_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">This Pt</span>
                <Select value={targetAnchor} onValueChange={(v: any) => setTargetAnchor(v)}>
                  <SelectTrigger className="w-36 h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANCHOR_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Offset</span>
                <div className="flex items-center gap-1.5 w-36">
                  <ScrubbableInput
                    label="dX"
                    value={offsetDX}
                    step={1}
                    onChange={setOffsetDX}
                    className="w-full"
                  />
                  <ScrubbableInput
                    label="dY"
                    value={offsetDY}
                    step={1}
                    onChange={setOffsetDY}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {linkMode === "reflow" && (
            <div className="space-y-1.5 pt-1 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Axis</span>
                <Select value={reflowAxis} onValueChange={(v: any) => setReflowAxis(v)}>
                  <SelectTrigger className="w-36 h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal (X)</SelectItem>
                    <SelectItem value="vertical">Vertical (Y)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Gap</span>
                <div className="w-36">
                  <ScrubbableInput
                    label="px"
                    value={reflowGap}
                    step={1}
                    onChange={setReflowGap}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Align</span>
                <Select value={reflowAlignment} onValueChange={(v: any) => setReflowAlignment(v)}>
                  <SelectTrigger className="w-36 h-7 text-[11px]">
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
          )}

          <div className="pt-2 flex justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
              className="h-6 px-2 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLink}
              disabled={!selectedDriverId}
              className="h-6 px-2.5 text-[11px] bg-purple-600 hover:bg-purple-500 text-white"
            >
              Create Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
