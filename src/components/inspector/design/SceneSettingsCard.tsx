import React from "react";
import { Lock } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SceneHeaderCard } from "@/components/inspector/design/SceneHeaderCard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/color-picker";
import { DEFAULT_BACKGROUND_STYLE } from "@/types/scene";

export const SceneSettingsCard: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    updateSettings,
    updateScreen,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const sceneIndex = doc.screens.findIndex((s) => s.id === activeScreen.id);
  const isFirstScene = sceneIndex <= 0;

  const settings = doc.settings;
  const is16_9 = settings.width === 1920 && settings.height === 1080;
  const is9_16 = settings.width === 1080 && settings.height === 1920;
  const is1_1 = settings.width === 1080 && settings.height === 1080;
  const is4_5 = settings.width === 1080 && settings.height === 1350;

  const currentFormat = is16_9
    ? "16:9 Landscape"
    : is9_16
    ? "9:16 Portrait"
    : is1_1
    ? "1:1 Square"
    : is4_5
    ? "4:5 Portrait"
    : "Custom";

  const screenBg = activeScreen.backgroundColor ?? settings.backgroundColor;
  const hasSceneFill = screenBg !== "transparent" && Boolean(screenBg);
  const currentBg = hasSceneFill ? screenBg! : "#ffffff";

  return (
    <div className="p-4 space-y-4 text-foreground text-xs select-none">
      <SceneHeaderCard activeScreen={activeScreen} icon="square" showDelete={true} />

      {/* Layout Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between h-5">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-foreground">Canvas Format</h4>
            {!isFirstScene && (
              <span title="Locked to Project Canvas Format">
                <Lock className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
          </div>
        </div>

        {/* Format dropdown */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Format</span>
          <div className="w-36">
            <Select
              disabled={!isFirstScene}
              value={currentFormat}
              onValueChange={(val) => {
                if (val === "16:9 Landscape") updateSettings({ width: 1920, height: 1080 });
                else if (val === "9:16 Portrait") updateSettings({ width: 1080, height: 1920 });
                else if (val === "1:1 Square") updateSettings({ width: 1080, height: 1080 });
                else if (val === "4:5 Portrait") updateSettings({ width: 1080, height: 1350 });
              }}
            >
              <SelectTrigger className="w-36 h-7 disabled:opacity-60 disabled:cursor-not-allowed">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="16:9 Landscape">16:9 (1920 × 1080)</SelectItem>
                <SelectItem value="9:16 Portrait">9:16 (1080 × 1920)</SelectItem>
                <SelectItem value="1:1 Square">1:1 (1080 × 1080)</SelectItem>
                <SelectItem value="4:5 Portrait">4:5 (1080 × 1350)</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Size */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Size</span>
          <div className="flex items-center gap-1.5 w-36">
            <ScrubbableInput
              label="W"
              disabled={!isFirstScene}
              value={settings.width}
              min={100}
              step={10}
              onChange={(val) => updateSettings({ width: val })}
              className="w-full disabled:opacity-60"
            />
            <ScrubbableInput
              label="H"
              disabled={!isFirstScene}
              value={settings.height}
              min={100}
              step={10}
              onChange={(val) => updateSettings({ height: val })}
              className="w-full disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Fill Section (Per-Scene Background Element) */}
      <div className="pt-3 border-t border-border space-y-2.5">
        <div
          onClick={() => {
            if (hasSceneFill) {
              updateScreen(activeScreen.id, {
                background: null,
                backgroundColor: "transparent",
              });
            } else {
              const restoreColor =
                activeScreen.background?.fill ||
                (activeScreen.backgroundColor && activeScreen.backgroundColor !== "transparent"
                  ? activeScreen.backgroundColor
                  : settings.backgroundColor && settings.backgroundColor !== "transparent"
                  ? settings.backgroundColor
                  : "#09090b");
              updateScreen(activeScreen.id, {
                background: {
                  id: activeScreen.background?.id || `bg_${activeScreen.id}`,
                  name: "Background",
                  type: "background",
                  fill: restoreColor,
                  fillType: restoreColor.includes("gradient") ? "linear-gradient" : "solid",
                  style: activeScreen.background?.style || { ...DEFAULT_BACKGROUND_STYLE },
                },
                backgroundColor: restoreColor,
              });
            }
          }}
          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
        >
          <span className="text-xs font-semibold text-foreground">Fill</span>
          <Checkbox
            checked={hasSceneFill}
            className="pointer-events-none"
          />
        </div>

        {hasSceneFill && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Color</span>
              <div className="flex items-center gap-1.5 w-36 justify-end">
                <Input
                  type="text"
                  value={currentBg.includes("gradient") ? "Gradient" : currentBg.replace("#", "").toUpperCase()}
                  readOnly={currentBg.includes("gradient")}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                    if (clean.length === 6 || clean.length === 3) {
                      const newColor = `#${clean}`;
                      updateScreen(activeScreen.id, {
                        background: {
                          id: activeScreen.background?.id || `bg_${activeScreen.id}`,
                          name: "Background",
                          type: "background",
                          fill: newColor,
                          fillType: "solid",
                          style: activeScreen.background?.style || { ...DEFAULT_BACKGROUND_STYLE },
                          animation: activeScreen.background?.animation,
                        },
                        backgroundColor: newColor,
                      });
                    }
                  }}
                  className="h-7 w-20 bg-muted rounded px-2 text-center text-xs font-mono uppercase text-foreground outline-none border-border"
                />
                <ColorPicker
                  value={currentBg || "#ffffff"}
                  onChange={(newColor) => {
                    updateScreen(activeScreen.id, {
                      background: {
                        id: activeScreen.background?.id || `bg_${activeScreen.id}`,
                        name: "Background",
                        type: "background",
                        fill: newColor,
                        fillType: newColor.includes("gradient") ? "linear-gradient" : "solid",
                        style: activeScreen.background?.style || { ...DEFAULT_BACKGROUND_STYLE },
                        animation: activeScreen.background?.animation,
                      },
                      backgroundColor: newColor,
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Duration Section */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Duration</span>
        <div className="w-36 flex justify-end">
          <ScrubbableInput
            value={activeScreen.duration}
            step={0.5}
            min={0.5}
            suffix="s"
            onChange={(val) =>
              useProjectStore.getState().updateScreen(activeScreen.id, { duration: Math.max(0.5, val) })
            }
            className="w-20"
          />
        </div>
      </div>

      {/* Frame Rate Section (Single Row, Numbers Only) */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Frame rate</span>
        <div className="w-36 flex justify-end">
          <Select
            value={activeScreen.stepFps ? String(activeScreen.stepFps) : "60"}
            onValueChange={(val) => {
              const stepVal = val === "60" ? undefined : Number(val);
              updateScreen(activeScreen.id, { stepFps: stepVal as any });
            }}
          >
            <SelectTrigger className="w-20 h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="60">60</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="6">6</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
