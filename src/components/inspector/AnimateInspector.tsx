import React, { useState } from "react";
import {
  Zap,
  ArrowUpRight,
  Sun,
  Maximize2,
  Minimize2,
  RotateCw,
  Sliders,
  Sparkles,
  Layers,
  Box,
  Trash2,
  Copy,
  ChevronDown,
  Repeat,
  Compass,
} from "lucide-react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import {
  Layer,
  GroupLayer,
  AnimationPreset,
  EasingType,
  AnimationConfig,
} from "@/types/scene";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export const AnimateInspector: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    updateLayerAnimation,
    updateLayer,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState("presets");

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const selectedLayerId = selectedLayerIds[0];
  const selectedLayer = selectedLayerId
    ? findLayerInTree(activeScreen.layers, selectedLayerId)
    : null;

  if (!selectedLayer) {
    return (
      <aside className="w-80 h-full bg-zinc-950 border-l border-zinc-800/80 p-6 flex flex-col items-center justify-center text-center text-zinc-500 select-none">
        <Zap className="h-8 w-8 text-zinc-700 mb-2" />
        <span className="text-xs font-medium text-zinc-400">No Layer Selected</span>
        <span className="text-[11px] text-zinc-600 mt-1 max-w-[200px]">
          Select an element to add entrance, exit, or looping motion presets.
        </span>
      </aside>
    );
  }

  const animation = selectedLayer.animation || {};
  const activeAnim: AnimationConfig | undefined = animation.in || animation.out;
  const currentMode: "in" | "out" = animation.out ? "out" : "in";

  const handleApplyPreset = (preset: AnimationPreset) => {
    const newConfig: AnimationConfig = {
      preset,
      start: 0,
      duration: 0.6,
      easing:
        preset === "pop"
          ? "bouncy"
          : preset === "twist" || preset === "spin"
          ? "overshoot"
          : "smooth",
      params: {
        distance: 60,
        fade: true,
      },
    };

    updateLayerAnimation(selectedLayer.id, {
      [currentMode]: newConfig,
    });
  };

  const handleUpdateActiveAnim = (updates: Partial<AnimationConfig>) => {
    if (!activeAnim) return;
    updateLayerAnimation(selectedLayer.id, {
      [currentMode]: {
        ...activeAnim,
        ...updates,
      },
    });
  };

  const handleDeleteAnimation = () => {
    updateLayerAnimation(selectedLayer.id, {
      in: undefined,
      out: undefined,
    });
  };

  const isGroup = selectedLayer.type === "group";

  return (
    <aside className="w-80 h-full bg-background border-l border-border flex flex-col text-xs text-foreground select-none overflow-y-auto">
      {/* 1. Top Segmented Navigation Tabs */}
      <div className="p-2 border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full h-7 bg-muted border border-border">
            <TabsTrigger value="presets" className="text-[11px] py-0.5">
              Presets
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-[11px] py-0.5">
              Custom
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-[11px] py-0.5">
              Effects
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 2. Active Animation Card (Prominently pinned when layer has animation) */}
      {activeAnim && (
        <div className="p-3 border-b border-border bg-card space-y-3">
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-primary/15 text-primary border border-primary/30">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-xs text-foreground capitalize">
                {activeAnim.preset}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={handleDeleteAnimation}
                title="Remove Animation"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Mode Segmented Toggle [ In | Out ] */}
          <div className="grid grid-cols-2 gap-1 bg-muted p-0.5 rounded border border-border">
            <button
              onClick={() => {
                if (currentMode !== "in") {
                  updateLayerAnimation(selectedLayer.id, {
                    in: activeAnim,
                    out: undefined,
                  });
                }
              }}
              className={`py-1 text-[11px] font-medium rounded transition-all ${
                currentMode === "in"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              In (Entrance)
            </button>
            <button
              onClick={() => {
                if (currentMode !== "out") {
                  updateLayerAnimation(selectedLayer.id, {
                    out: activeAnim,
                    in: undefined,
                  });
                }
              }}
              className={`py-1 text-[11px] font-medium rounded transition-all ${
                currentMode === "out"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Out (Exit)
            </button>
          </div>

          {/* Duration & Start Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 px-2 py-1">
              <span className="text-[10px] text-zinc-500 w-12">Duration</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={activeAnim.duration}
                onChange={(e) =>
                  handleUpdateActiveAnim({ duration: Number(e.target.value) })
                }
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500">s</span>
            </div>

            <div className="flex items-center bg-zinc-900 rounded border border-zinc-800 px-2 py-1">
              <span className="text-[10px] text-zinc-500 w-10">Start</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={activeAnim.start}
                onChange={(e) =>
                  handleUpdateActiveAnim({ start: Number(e.target.value) })
                }
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500">s</span>
            </div>
          </div>

          {/* Easing Curve Selector */}
          <div className="flex items-center justify-between bg-zinc-900 rounded border border-zinc-800 px-2 py-1">
            <span className="text-[10px] text-zinc-500">Easing</span>
            <select
              value={activeAnim.easing}
              onChange={(e) =>
                handleUpdateActiveAnim({ easing: e.target.value as EasingType })
              }
              className="bg-zinc-800 text-xs text-zinc-200 rounded px-1.5 py-0.5 focus:outline-none"
            >
              <option value="smooth">Smooth (Cubic Ease-Out)</option>
              <option value="bouncy">Bouncy / Elastic</option>
              <option value="overshoot">Overshoot</option>
              <option value="snappy">Snappy</option>
              <option value="linear">Linear</option>
            </select>
          </div>

          {/* Group Cascade Stagger Delay */}
          {isGroup && (
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Cascade Stagger</span>
                <span className="font-mono text-primary">
                  {((selectedLayer as GroupLayer).staggerDelay ?? 0.15).toFixed(2)}s
                </span>
              </div>
              <Slider
                value={[((selectedLayer as GroupLayer).staggerDelay ?? 0.15) * 100]}
                min={2}
                max={50}
                step={1}
                onValueChange={(vals: number[]) =>
                  updateLayer(selectedLayer.id, { staggerDelay: (vals[0] || 15) / 100 })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 1: PRESETS CATALOG (Matching Screenshot 1) */}
      {activeTab === "presets" && (
        <div className="p-3 space-y-4">
          {/* Fade Category */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Fade
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleApplyPreset("fadeIn")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Sun className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Fade</span>
              </button>

              <button
                onClick={() => handleApplyPreset("slideUp")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <ArrowUpRight className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Slide Up</span>
              </button>
            </div>
          </div>

          {/* Scale Category */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Scale
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleApplyPreset("pop")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Zap className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Pop In</span>
              </button>

              <button
                onClick={() => handleApplyPreset("grow")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Maximize2 className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Grow</span>
              </button>

              <button
                onClick={() => handleApplyPreset("shrink")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Minimize2 className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Shrink</span>
              </button>

              <button
                onClick={() => handleApplyPreset("spin")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <RotateCw className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Spin</span>
              </button>
            </div>
          </div>

          {/* 3D Motion */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              3D & Cinematic
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleApplyPreset("flipX")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Box className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">3D Flip X</span>
              </button>

              <button
                onClick={() => handleApplyPreset("dropIn")}
                className="h-16 p-2 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-all group"
              >
                <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground">Drop In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: CUSTOM (Matching Screenshot 2) */}
      {activeTab === "custom" && (
        <div className="p-3 space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Transform
            </span>
            <div className="space-y-1">
              {["Scale", "Rotate", "Move"].map((prop) => (
                <button
                  key={prop}
                  onClick={() => handleApplyPreset("grow")}
                  className="w-full p-2 rounded-lg bg-secondary/60 hover:bg-muted border border-border flex items-center justify-between text-foreground/80 transition-colors"
                >
                  <span>{prop}</span>
                  <Sliders className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Style
            </span>
            <div className="space-y-1">
              {["Opacity", "Color", "Shadow"].map((prop) => (
                <button
                  key={prop}
                  onClick={() => handleApplyPreset("fadeIn")}
                  className="w-full p-2 rounded-lg bg-secondary/60 hover:bg-muted border border-border flex items-center justify-between text-foreground/80 transition-colors"
                >
                  <span>{prop}</span>
                  <Sliders className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: EFFECTS */}
      {activeTab === "effects" && (
        <div className="p-3 space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Procedural Effects
          </span>
          {[
            { name: "Neon Pulse Glow", icon: Sparkles },
            { name: "Chromatic Glitch", icon: Zap },
            { name: "Floating Wave Loop", icon: Repeat },
          ].map((eff) => (
            <button
              key={eff.name}
              onClick={() => handleApplyPreset("pop")}
              className="w-full p-2.5 rounded-lg border border-border bg-card hover:bg-secondary hover:border-primary/40 flex items-center gap-2 text-foreground transition-colors"
            >
              <eff.icon className="h-4 w-4 text-primary" />
              <span>{eff.name}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
