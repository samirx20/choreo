import React from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { MinimalSection } from "@/components/ui/minimal-section";
import { Film, Eye, Monitor } from "lucide-react";

export const ShotDynamicsCard: React.FC = () => {
  const { document: doc, activeScreenId, updateScreen, updateSettings } = useProjectStore();
  const screen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const settings = doc.settings;
  const safeZones = settings.safeZones || {
    actionSafe: false,
    titleSafe: false,
    ruleOfThirds: false,
    centerCrosshair: false,
    socialOverlay: "none",
  };

  const handleDurationChange = (val: number) => {
    if (!screen) return;
    const dur = Math.max(0.5, Math.round(val * 10) / 10);
    updateScreen(screen.id, { duration: dur });
    updateSettings({ duration: dur });
  };

  const handleFpsChange = (fps: number) => {
    updateSettings({ fps });
  };

  const handleToggleSafe = (key: "actionSafe" | "titleSafe" | "centerCrosshair") => {
    updateSettings({
      safeZones: {
        ...safeZones,
        [key]: !safeZones[key],
      },
    });
  };

  const handleSocialOverlayChange = (val: "none" | "tiktok" | "reels" | "shorts") => {
    updateSettings({
      safeZones: {
        ...safeZones,
        socialOverlay: val,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-xs select-none">
      {/* Header Info */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Film className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            Shot Dynamics
          </span>
          <span className="text-[10px] text-muted-foreground">
            Global shot timing & camera staging
          </span>
        </div>
      </div>

      {/* Shot Timing & Framerate */}
      <MinimalSection title="Shot Timing">
        <div className="grid grid-cols-2 gap-2">
          <ScrubbableInput
            label="Duration"
            unit="s"
            value={screen?.duration || settings.duration || 5.0}
            min={0.5}
            max={60.0}
            step={0.5}
            decimals={1}
            onChange={handleDurationChange}
          />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              Framerate
            </span>
            <div className="flex rounded-[8px] bg-muted p-0.5 border border-border">
              {[24, 30, 60].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFpsChange(f)}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-[6px] transition-all text-center ${
                    settings.fps === f
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}fps
                </button>
              ))}
            </div>
          </div>
        </div>
      </MinimalSection>

      {/* Screen Canvas Dimensions */}
      <MinimalSection title="Canvas Dimensions">
        <div className="grid grid-cols-2 gap-2">
          <ScrubbableInput
            label="Width"
            unit="px"
            value={settings.width}
            min={320}
            max={3840}
            step={10}
            onChange={(w) => updateSettings({ width: Math.round(w) })}
          />
          <ScrubbableInput
            label="Height"
            unit="px"
            value={settings.height}
            min={320}
            max={3840}
            step={10}
            onChange={(h) => updateSettings({ height: Math.round(h) })}
          />
        </div>

        {/* Aspect Ratio Shortcuts */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => updateSettings({ width: 1920, height: 1080 })}
            className={`flex-1 py-1 text-[10px] rounded-[6px] border font-medium transition-colors ${
              settings.width === 1920 && settings.height === 1080
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-input hover:border-border hover:text-foreground hover:bg-muted/70"
            }`}
          >
            16:9 Landscape
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ width: 1080, height: 1920 })}
            className={`flex-1 py-1 text-[10px] rounded-[6px] border font-medium transition-colors ${
              settings.width === 1080 && settings.height === 1920
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-input hover:border-border hover:text-foreground hover:bg-muted/70"
            }`}
          >
            9:16 Vertical
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ width: 1080, height: 1080 })}
            className={`flex-1 py-1 text-[10px] rounded-[6px] border font-medium transition-colors ${
              settings.width === 1080 && settings.height === 1080
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-input hover:border-border hover:text-foreground hover:bg-muted/70"
            }`}
          >
            1:1 Square
          </button>
        </div>
      </MinimalSection>

      {/* Broadcast & Social Safe Guides */}
      <MinimalSection title="Safe Framing Guides">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between py-1 px-1.5 rounded-[8px] hover:bg-muted/50">
            <span className="text-foreground">Action Safe (90%)</span>
            <input
              type="checkbox"
              checked={!!safeZones.actionSafe}
              onChange={() => handleToggleSafe("actionSafe")}
              className="rounded text-primary focus:ring-0 w-4 h-4 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between py-1 px-1.5 rounded-[8px] hover:bg-muted/50">
            <span className="text-foreground">Title Safe (80%)</span>
            <input
              type="checkbox"
              checked={!!safeZones.titleSafe}
              onChange={() => handleToggleSafe("titleSafe")}
              className="rounded text-primary focus:ring-0 w-4 h-4 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between py-1 px-1.5 rounded-[8px] hover:bg-muted/50">
            <span className="text-foreground">Center Crosshair</span>
            <input
              type="checkbox"
              checked={!!safeZones.centerCrosshair}
              onChange={() => handleToggleSafe("centerCrosshair")}
              className="rounded text-primary focus:ring-0 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">Social UI Overlay</span>
            <select
              value={safeZones.socialOverlay || "none"}
              onChange={(e) => handleSocialOverlayChange(e.target.value as any)}
              className="text-[11px] bg-muted border border-input rounded-[6px] px-2 py-1 text-foreground outline-none"
            >
              <option value="none">None</option>
              <option value="tiktok">TikTok Safe Zone</option>
              <option value="reels">Instagram Reels</option>
              <option value="shorts">YouTube Shorts</option>
            </select>
          </div>
        </div>
      </MinimalSection>
    </div>
  );
};
