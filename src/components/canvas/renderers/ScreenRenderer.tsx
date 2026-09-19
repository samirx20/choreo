import React from "react";
import { Screen, ProjectSettings, SafeZoneConfig } from "@/types/scene";
import { LayerRenderer } from "./LayerRenderer";
import { useProjectStore, isMotionMode } from "@/store/useProjectStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Monitor, Smartphone, Square, Film, Grid } from "lucide-react";
import { SafeZoneOverlay } from "../SafeZoneOverlay";

interface ScreenRendererProps {
  screen: Screen;
  settings: ProjectSettings;
  selectedLayerIds: string[];
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
  onCanvasClick?: () => void;
}

export const ScreenRenderer: React.FC<ScreenRendererProps> = ({
  screen,
  settings,
  selectedLayerIds,
  computedLayerStyles = {},
  onSelectLayer,
  onCanvasClick,
}) => {
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const uiMode = useProjectStore((s) => s.uiMode);
  const sendScreenToMotion = useProjectStore((s) => s.sendScreenToMotion);

  const safeZones: SafeZoneConfig = settings.safeZones || {
    actionSafe: false,
    titleSafe: false,
    ruleOfThirds: false,
    centerCrosshair: false,
    socialOverlay: "none",
    socialOverlayOpacity: 0.7,
  };

  const hasActiveGuides =
    safeZones.actionSafe ||
    safeZones.titleSafe ||
    safeZones.ruleOfThirds ||
    safeZones.centerCrosshair ||
    safeZones.socialOverlay !== "none";

  const toggleSafeZone = (key: keyof Omit<SafeZoneConfig, "socialOverlay" | "socialOverlayOpacity">) => {
    updateSettings({
      safeZones: {
        ...safeZones,
        [key]: !safeZones[key],
      },
    });
  };

  const setSocialOverlay = (platform: "none" | "tiktok" | "reels" | "shorts") => {
    updateSettings({
      safeZones: {
        ...safeZones,
        socialOverlay: platform,
      },
    });
  };

  const getFormatLabel = () => {
    if (settings.width === 1920 && settings.height === 1080) return "16:9 Landscape";
    if (settings.width === 1080 && settings.height === 1920) return "9:16 Portrait";
    if (settings.width === 1080 && settings.height === 1080) return "1:1 Square";
    if (settings.width === 1080 && settings.height === 1350) return "4:5 Portrait";
    return `${settings.width}×${settings.height}`;
  };

  return (
    <div className="relative select-none">
      {/* Figma-Style Artboard Header with 1-Click Screen Format Switcher & Guides & Send to Motion */}
      <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[11px] font-medium text-[#8a8a98] z-20">
        <div className="flex items-center gap-2">
          <span className="text-[#a1a1aa] font-medium">{screen.name}</span>
          <span className="text-[#3f3f46]">•</span>

          {/* Aspect Ratio Format Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181b]/80 hover:bg-[#27272a] text-[#d4d4d8] hover:text-white border border-[#27272a] text-[10px] font-mono transition-colors shadow-xs"
                title="Click to switch screen aspect ratio"
              >
                {settings.width > settings.height ? (
                  <Monitor className="h-3 w-3 text-primary" />
                ) : settings.width < settings.height ? (
                  <Smartphone className="h-3 w-3 text-amber-400" />
                ) : (
                  <Square className="h-3 w-3 text-cyan-400" />
                )}
                <span>{getFormatLabel()}</span>
                <span className="text-[#71717a]">({settings.width}×{settings.height})</span>
                <ChevronDown className="h-2.5 w-2.5 text-[#71717a]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-[#18181b] border-[#27272a] text-xs text-[#d4d4d8] shadow-2xl p-1 w-56">
              <DropdownMenuItem
                onClick={() => updateSettings({ width: 1920, height: 1080 })}
                className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium">16:9 Landscape</span>
                  <span className="text-[10px] text-[#71717a] font-mono">1920 × 1080 (YouTube, Desktop)</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => updateSettings({ width: 1080, height: 1920 })}
                className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                <div className="flex flex-col">
                  <span className="font-medium">9:16 Portrait</span>
                  <span className="text-[10px] text-[#71717a] font-mono">1080 × 1920 (TikTok, Reels, Shorts)</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => updateSettings({ width: 1080, height: 1080 })}
                className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <Square className="h-3.5 w-3.5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="font-medium">1:1 Square</span>
                  <span className="text-[10px] text-[#71717a] font-mono">1080 × 1080 (Post, Feed)</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => updateSettings({ width: 1080, height: 1350 })}
                className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <Smartphone className="h-3.5 w-3.5 text-pink-400" />
                <div className="flex flex-col">
                  <span className="font-medium">4:5 Social</span>
                  <span className="text-[10px] text-[#71717a] font-mono">1080 × 1350 (Instagram Feed)</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Safe-Zones & Video Guides Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-colors shadow-xs ${
                  hasActiveGuides
                    ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                    : "bg-[#18181b]/80 hover:bg-[#27272a] text-[#d4d4d8] hover:text-white border-[#27272a]"
                }`}
                title="Toggle Safe-Zone Overlays and Framing Guides"
              >
                <Grid className="h-3 w-3" />
                <span>Guides</span>
                <ChevronDown className="h-2.5 w-2.5 text-[#71717a]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#18181b] border-[#27272a] text-xs text-[#d4d4d8] shadow-2xl p-1.5 w-60">
              <div className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider px-2 py-1">
                Video Framing & Safe Zones
              </div>
              <DropdownMenuItem
                onClick={() => toggleSafeZone("actionSafe")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${safeZones.actionSafe ? "bg-green-500" : "bg-neutral-600"}`} />
                  <span>Action Safe (90%)</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">{safeZones.actionSafe ? "ON" : "OFF"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleSafeZone("titleSafe")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${safeZones.titleSafe ? "bg-amber-400" : "bg-neutral-600"}`} />
                  <span>Title Safe (80%)</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">{safeZones.titleSafe ? "ON" : "OFF"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleSafeZone("ruleOfThirds")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${safeZones.ruleOfThirds ? "bg-cyan-400" : "bg-neutral-600"}`} />
                  <span>Rule of Thirds</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">{safeZones.ruleOfThirds ? "ON" : "OFF"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleSafeZone("centerCrosshair")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${safeZones.centerCrosshair ? "bg-white" : "bg-neutral-600"}`} />
                  <span>Center Crosshair</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">{safeZones.centerCrosshair ? "ON" : "OFF"}</span>
              </DropdownMenuItem>

              <div className="border-t border-[#27272a] my-1" />
              <div className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider px-2 py-1">
                Social UI Exclusion (9:16)
              </div>
              <DropdownMenuItem
                onClick={() => setSocialOverlay(safeZones.socialOverlay === "tiktok" ? "none" : "tiktok")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <span>TikTok UI Guard</span>
                <span className="text-[10px] font-mono text-[#71717a]">
                  {safeZones.socialOverlay === "tiktok" ? "ACTIVE" : "OFF"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSocialOverlay(safeZones.socialOverlay === "reels" ? "none" : "reels")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <span>Instagram Reels Guard</span>
                <span className="text-[10px] font-mono text-[#71717a]">
                  {safeZones.socialOverlay === "reels" ? "ACTIVE" : "OFF"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSocialOverlay(safeZones.socialOverlay === "shorts" ? "none" : "shorts")}
                className="flex items-center justify-between py-1.5 px-2 cursor-pointer text-[#d4d4d8] hover:text-white"
              >
                <span>YouTube Shorts Guard</span>
                <span className="text-[10px] font-mono text-[#71717a]">
                  {safeZones.socialOverlay === "shorts" ? "ACTIVE" : "OFF"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Artboard Canvas Frame */}
      <div
        id={`screen-${screen.id}`}
        style={{
          width: `${settings.width}px`,
          height: `${settings.height}px`,
          backgroundColor: settings.backgroundColor || "#09090b",
          position: "relative",
          overflow: isMotionMode(uiMode) ? "hidden" : "visible",
          boxShadow: isMotionMode(uiMode)
            ? "0 0 0 9999px rgba(9, 9, 11, 0.75), 0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.2)"
            : "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && onCanvasClick) {
            onCanvasClick();
          }
        }}
        className="rounded-[2px]"
      >
        {screen.layers.map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            selectedLayerIds={selectedLayerIds}
            computedStyle={computedLayerStyles[layer.id]}
            computedLayerStyles={computedLayerStyles}
            onSelectLayer={onSelectLayer}
          />
        ))}

        {/* Video Safe-Zone & Framing Overlays */}
        {hasActiveGuides && (
          <SafeZoneOverlay
            width={settings.width}
            height={settings.height}
            config={safeZones}
          />
        )}
      </div>
    </div>
  );
};
