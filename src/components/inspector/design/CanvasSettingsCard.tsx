import React from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { PopoverColorPicker } from "@/components/ui/popover-color-picker";
import { Monitor, Shield, Grid, Smartphone, Tv, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const ASPECT_PRESETS = [
  { label: "16:9", w: 1920, h: 1080, icon: Tv, tooltip: "YouTube / Broadcast (1920×1080)" },
  { label: "9:16", w: 1080, h: 1920, icon: Smartphone, tooltip: "Reels / TikTok / Shorts (1080×1920)" },
  { label: "1:1", w: 1080, h: 1080, icon: Square, tooltip: "Square Feed (1080×1080)" },
  { label: "4:5", w: 1080, h: 1350, icon: Monitor, tooltip: "Instagram Portrait (1080×1350)" },
];

const MONOCHROME_PRESETS = [
  "#ffffff",
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
  "#1e293b",
  "#0f172a",
  "#000000",
];

export const CanvasSettingsCard: React.FC = () => {
  const {
    document: doc,
    updateSettings,
  } = useProjectStore();

  const settings = doc.settings;
  const safeZones = settings.safeZones || {
    actionSafe: false,
    titleSafe: false,
    ruleOfThirds: false,
    centerCrosshair: false,
    socialOverlay: "none" as const,
  };

  const toggleSafeZone = (key: keyof Omit<typeof safeZones, "socialOverlay" | "socialOverlayOpacity">) => {
    updateSettings({
      safeZones: {
        ...safeZones,
        [key]: !safeZones[key],
      },
    });
  };

  const currentBg = settings.palette?.[0] || "#ffffff";

  return (
    <div className="p-3 space-y-4 text-xs select-none">
      {/* 1. Canvas Dimensions & Format Presets */}
      <MinimalSection title="Canvas Format" icon={Monitor} defaultOpen={true}>
        {/* Preset Selector Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {ASPECT_PRESETS.map((p) => {
            const isActive = settings.width === p.w && settings.height === p.h;
            return (
              <button
                key={p.label}
                onClick={() => updateSettings({ width: p.w, height: p.h })}
                title={p.tooltip}
                className={cn(
                  "h-7 rounded-[8px] border flex flex-col items-center justify-center transition-all text-[11px] font-medium",
                  isActive
                    ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                    : "bg-muted/40 text-muted-foreground border-input hover:border-border hover:text-foreground hover:bg-muted/70"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom W & H Scrubbable Inputs */}
        <div className="grid grid-cols-2 gap-1.5">
          <ScrubbableInput
            label="W"
            value={settings.width}
            onChange={(val) => updateSettings({ width: val })}
            suffix="px"
            min={320}
            max={7680}
            step={10}
          />
          <ScrubbableInput
            label="H"
            value={settings.height}
            onChange={(val) => updateSettings({ height: val })}
            suffix="px"
            min={320}
            max={7680}
            step={10}
          />
        </div>
      </MinimalSection>

      {/* 2. Canvas Background Color */}
      <MinimalSection title="Background" defaultOpen={true}>
        <PopoverColorPicker
          color={currentBg}
          onChangeColor={(c) => {
            const nextPalette = [...(settings.palette || [])];
            nextPalette[0] = c;
            updateSettings({ palette: nextPalette });
          }}
          showOpacity={false}
        />

        {/* Quick Palette Chips */}
        <div className="flex items-center gap-1.5 mt-2">
          {MONOCHROME_PRESETS.map((swatch) => (
            <button
              key={swatch}
              onClick={() => {
                const nextPalette = [...(settings.palette || [])];
                nextPalette[0] = swatch;
                updateSettings({ palette: nextPalette });
              }}
              className={cn(
                "h-4 w-4 rounded-full border transition-transform shadow-xs",
                currentBg.toLowerCase() === swatch.toLowerCase()
                  ? "border-primary scale-110 ring-2 ring-primary/30"
                  : "border-border hover:scale-105"
              )}
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
        </div>
      </MinimalSection>

      {/* 3. Video Safe Guides */}
      <MinimalSection title="Safe Guides & Overlays" icon={Shield} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => toggleSafeZone("actionSafe")}
            className={cn(
              "h-6 px-2 rounded-[8px] border text-[10px] font-medium transition-colors flex items-center justify-between",
              safeZones.actionSafe
                ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                : "bg-muted/40 border-input text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            <span>Action Safe</span>
            <span className="font-mono text-[9px] text-muted-foreground">90%</span>
          </button>

          <button
            onClick={() => toggleSafeZone("titleSafe")}
            className={cn(
              "h-6 px-2 rounded-[8px] border text-[10px] font-medium transition-colors flex items-center justify-between",
              safeZones.titleSafe
                ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                : "bg-muted/40 border-input text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            <span>Title Safe</span>
            <span className="font-mono text-[9px] text-muted-foreground">80%</span>
          </button>

          <button
            onClick={() => toggleSafeZone("ruleOfThirds")}
            className={cn(
              "h-6 px-2 rounded-[8px] border text-[10px] font-medium transition-colors flex items-center justify-between",
              safeZones.ruleOfThirds
                ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                : "bg-muted/40 border-input text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            <span>Thirds Grid</span>
            <Grid className="h-2.5 w-2.5" />
          </button>

          <button
            onClick={() => toggleSafeZone("centerCrosshair")}
            className={cn(
              "h-6 px-2 rounded-[8px] border text-[10px] font-medium transition-colors flex items-center justify-between",
              safeZones.centerCrosshair
                ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                : "bg-muted/40 border-input text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            <span>Center Cross</span>
            <span className="font-mono text-[9px] text-muted-foreground">+</span>
          </button>
        </div>
      </MinimalSection>
    </div>
  );
};
