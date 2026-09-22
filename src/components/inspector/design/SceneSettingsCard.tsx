import React, { useState, useEffect } from "react";
import { Square, MoreHorizontal, Pencil, Copy, Maximize2, Trash2, Lock } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/color-picker";

export const SceneSettingsCard: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    updateSettings,
    updateScreen,
    deleteScreen,
    duplicateScreen,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const [isEditingSceneName, setIsEditingSceneName] = useState(false);
  const [sceneNameInput, setSceneNameInput] = useState(activeScreen.name);
  const [applyToAllScenes, setApplyToAllScenes] = useState(false);

  useEffect(() => {
    setSceneNameInput(activeScreen.name);
    setIsEditingSceneName(false);
  }, [activeScreen.id, activeScreen.name]);

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

  const currentBg = activeScreen.backgroundColor ?? settings.backgroundColor ?? "#ffffff";
  const hasSceneFill = activeScreen.backgroundColor !== "transparent" && Boolean(currentBg);

  return (
    <div className="p-4 space-y-4 text-foreground text-xs select-none">
      {/* Scene Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {isEditingSceneName ? (
            <Input
              type="text"
              value={sceneNameInput}
              onChange={(e) => setSceneNameInput(e.target.value)}
              onBlur={() => {
                if (sceneNameInput.trim()) {
                  updateScreen(activeScreen.id, { name: sceneNameInput.trim() });
                } else {
                  setSceneNameInput(activeScreen.name);
                }
                setIsEditingSceneName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (sceneNameInput.trim()) {
                    updateScreen(activeScreen.id, { name: sceneNameInput.trim() });
                  }
                  setIsEditingSceneName(false);
                } else if (e.key === "Escape") {
                  setSceneNameInput(activeScreen.name);
                  setIsEditingSceneName(false);
                }
              }}
              autoFocus
              className="h-6 px-1.5 text-xs font-semibold text-foreground bg-card border border-primary rounded outline-none w-full"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingSceneName(true)}
              className="text-xs font-semibold truncate cursor-text hover:text-primary transition-colors"
              title="Double-click to rename scene"
            >
              {activeScreen.name}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
              title="Scene options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-xs">
            <DropdownMenuItem
              onClick={() => setIsEditingSceneName(true)}
              className="gap-2 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Rename Scene</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => duplicateScreen(activeScreen.id)}
              className="gap-2 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Duplicate Scene</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("motion-focus-screen", { detail: { screenId: activeScreen.id } })
                );
              }}
              className="gap-2 cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Fit in Viewport</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteScreen(activeScreen.id)}
              disabled={doc.screens.length <= 1}
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Scene</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Layout Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-foreground">Canvas Format</h4>
            {!isFirstScene && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded font-medium">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                <span>Project (Scene 1)</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Scene {sceneIndex + 1} of {doc.screens.length}
          </span>
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

      {/* Fill Section (Per-Scene Background Color) */}
      <div className="pt-3 border-t border-border space-y-2.5">
        <div
          onClick={() => {
            const nextFill = hasSceneFill ? "transparent" : (settings.backgroundColor || "#ffffff");
            if (applyToAllScenes) {
              doc.screens.forEach((s) => updateScreen(s.id, { backgroundColor: nextFill }));
              updateSettings({ backgroundColor: nextFill });
            } else {
              updateScreen(activeScreen.id, { backgroundColor: nextFill });
            }
          }}
          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
        >
          <span className="text-xs font-semibold text-foreground">Fill</span>
          <Checkbox
            checked={hasSceneFill}
            onCheckedChange={() => {
              const nextFill = hasSceneFill ? "transparent" : (settings.backgroundColor || "#ffffff");
              if (applyToAllScenes) {
                doc.screens.forEach((s) => updateScreen(s.id, { backgroundColor: nextFill }));
                updateSettings({ backgroundColor: nextFill });
              } else {
                updateScreen(activeScreen.id, { backgroundColor: nextFill });
              }
            }}
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
                  value={currentBg.replace("#", "").toUpperCase()}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                    if (clean.length === 6 || clean.length === 3) {
                      const newColor = `#${clean}`;
                      if (applyToAllScenes) {
                        doc.screens.forEach((s) => updateScreen(s.id, { backgroundColor: newColor }));
                        updateSettings({ backgroundColor: newColor });
                      } else {
                        updateScreen(activeScreen.id, { backgroundColor: newColor });
                      }
                    }
                  }}
                  className="h-7 w-20 bg-muted rounded px-2 text-center text-xs font-mono uppercase text-foreground outline-none border-border"
                />
                <ColorPicker
                  value={currentBg.startsWith("#") ? currentBg : "#ffffff"}
                  onChange={(newColor) => {
                    if (applyToAllScenes) {
                      doc.screens.forEach((s) => updateScreen(s.id, { backgroundColor: newColor }));
                      updateSettings({ backgroundColor: newColor });
                    } else {
                      updateScreen(activeScreen.id, { backgroundColor: newColor });
                    }
                  }}
                />
              </div>
            </div>

            {doc.screens.length > 1 && (
              <div className="flex items-center justify-end gap-2 pt-1">
                <Checkbox
                  id="apply-to-all-scenes"
                  checked={applyToAllScenes}
                  onCheckedChange={(checked) => {
                    const isChecked = Boolean(checked);
                    setApplyToAllScenes(isChecked);
                    if (isChecked) {
                      doc.screens.forEach((s) => updateScreen(s.id, { backgroundColor: currentBg }));
                      updateSettings({ backgroundColor: currentBg });
                    }
                  }}
                />
                <label
                  htmlFor="apply-to-all-scenes"
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none"
                >
                  Apply to all scenes
                </label>
              </div>
            )}
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
