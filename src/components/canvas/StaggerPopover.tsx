import React, { useState, useMemo } from "react";
import {
  ListOrdered,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Maximize2,
  Minimize2,
  Shuffle,
  Sparkles,
  Check,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import {
  StaggerOrder,
  StaggerConfig,
  getEarliestStartTime,
} from "@/engine/choreography/staggerEngine";
import { findLayerInTree } from "@/store/helpers/treeHelpers";
import { cn } from "@/lib/utils";

interface StaggerPopoverProps {
  onClose?: () => void;
}

const ORDER_OPTIONS: { id: StaggerOrder; label: string; icon: React.ReactNode }[] = [
  { id: "left-to-right", label: "Left → Right", icon: <ArrowRight className="h-3.5 w-3.5" /> },
  { id: "right-to-left", label: "Right → Left", icon: <ArrowLeft className="h-3.5 w-3.5" /> },
  { id: "top-to-bottom", label: "Top → Bottom", icon: <ArrowDown className="h-3.5 w-3.5" /> },
  { id: "bottom-to-top", label: "Bottom → Top", icon: <ArrowUp className="h-3.5 w-3.5" /> },
  { id: "center-out", label: "Center Out", icon: <Maximize2 className="h-3.5 w-3.5" /> },
  { id: "edges-in", label: "Edges In", icon: <Minimize2 className="h-3.5 w-3.5" /> },
  { id: "layer-order", label: "Layer Order", icon: <ListOrdered className="h-3.5 w-3.5" /> },
  { id: "random", label: "Shuffle", icon: <Shuffle className="h-3.5 w-3.5" /> },
];

const PRESET_OPTIONS = [
  { id: "", label: "Keep Current Animation" },
  { id: "slideUp", label: "Slide Up" },
  { id: "pop", label: "Pop / Spring Scale" },
  { id: "fadeIn", label: "Fade In" },
  { id: "grow", label: "Grow" },
  { id: "blurIn", label: "Blur In" },
  { id: "baselineRise", label: "Baseline Rise" },
];

const QUICK_INTERVALS = [
  { val: 0.04, label: "0.04s Rapid" },
  { val: 0.06, label: "0.06s Smooth" },
  { val: 0.08, label: "0.08s Brisk" },
  { val: 0.12, label: "0.12s Spaced" },
];

export const StaggerPopover: React.FC<StaggerPopoverProps> = ({ onClose }) => {
  const { document: doc, activeScreenId, selectedLayerIds, staggerSelectedLayers } = useProjectStore();

  const [interval, setInterval] = useState<number>(0.06);
  const [order, setOrder] = useState<StaggerOrder>("left-to-right");
  const [syncPreset, setSyncPreset] = useState<string>("");
  const [justApplied, setJustApplied] = useState(false);

  // Extract selected layers
  const activeScreen = useMemo(() => {
    return doc.screens.find((s) => s.id === activeScreenId);
  }, [doc.screens, activeScreenId]);

  const selectedLayers = useMemo(() => {
    if (!activeScreen || !selectedLayerIds) return [];
    return selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter(Boolean) as any[];
  }, [activeScreen, selectedLayerIds]);

  const count = selectedLayers.length;
  const baseStart = useMemo(() => getEarliestStartTime(selectedLayers), [selectedLayers]);
  const totalCascadeDuration = useMemo(() => {
    if (count <= 1) return 0;
    return Math.round((count - 1) * interval * 100) / 100;
  }, [count, interval]);

  const handleApply = () => {
    if (count < 2) return;
    const config: StaggerConfig = {
      interval,
      order,
      baseStartTime: baseStart,
      ...(syncPreset ? { syncPreset } : {}),
    };
    staggerSelectedLayers(config);
    setJustApplied(true);
    setTimeout(() => {
      setJustApplied(false);
      onClose?.();
    }, 600);
  };

  return (
    <div
      className="w-80 p-3.5 bg-popover border border-border text-popover-foreground rounded-xl shadow-2xl flex flex-col gap-3.5 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-muted text-foreground flex items-center justify-center">
            <ListOrdered className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground tracking-tight">Stagger Cascade</h4>
            <p className="text-[10px] text-muted-foreground">
              {count} layers selected • Start at {baseStart.toFixed(2)}s
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Interval / Delay Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Stagger Interval</span>
          <span className="text-foreground font-mono font-medium">{interval.toFixed(2)}s</span>
        </div>

        {/* Quick pills */}
        <div className="grid grid-cols-4 gap-1">
          {QUICK_INTERVALS.map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setInterval(item.val)}
              className={cn(
                "py-1 px-1 text-[10px] rounded border text-center transition-all",
                Math.abs(interval - item.val) < 0.005
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.val}s
            </button>
          ))}
        </div>

        {/* Fine slider */}
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min={0.01}
            max={0.3}
            step={0.01}
            value={interval}
            onChange={(e) => setInterval(parseFloat(e.target.value))}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
          />
        </div>
      </div>

      {/* Direction & Spatial Order */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground font-medium">Cascade Direction</span>
        <div className="grid grid-cols-2 gap-1.5">
          {ORDER_OPTIONS.map((item) => {
            const isActive = order === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOrder(item.id)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animation Sync Dropdown */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium">Entrance Animation</span>
          {syncPreset && (
            <span className="text-[10px] text-foreground font-medium">Uniform Override</span>
          )}
        </div>
        <select
          value={syncPreset}
          onChange={(e) => setSyncPreset(e.target.value)}
          className="w-full h-8 px-2.5 bg-muted/60 border border-border rounded-lg text-xs text-foreground outline-none focus:border-ring transition-colors"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Cascade Span</span>
          <span className="font-mono text-foreground">
            {baseStart.toFixed(2)}s → {(baseStart + totalCascadeDuration).toFixed(2)}s (+
            {totalCascadeDuration.toFixed(2)}s)
          </span>
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={count < 2}
          className={cn(
            "w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shadow-sm",
            justApplied
              ? "bg-emerald-600 text-white"
              : count >= 2
              ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {justApplied ? (
            <>
              <Check className="h-4 w-4" />
              <span>Cascade Applied!</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Apply Stagger to {count} Layers</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
