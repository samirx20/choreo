import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Zap,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  RotateCw,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  X,
  Maximize2,
  Move,
  SunMedium,
  Palette,
  BoxSelect,
  Flame,
  CircleDot,
  Shield,
  EyeOff,
  ArrowLeftRight,
  Shapes,
  CornerUpRight,
  Square,
  Sparkles,
  Check,
  Type,
  Image as ImageIcon,
} from "lucide-react";
import { Layer, AnimationClip } from "@/types/scene";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { MorphStyle, MorphParticleShape } from "@/types/animation";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { JitterEasingPopover } from "../motion/JitterEasingPopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ClipDetailViewProps {
  clipLayer: Layer;
  selectedClip: AnimationClip;
}

export const ClipDetailView: React.FC<ClipDetailViewProps> = ({
  clipLayer,
  selectedClip,
}) => {
  const {
    setSelectedClips,
    removeAnimationClip,
    updateAnimationClip,
    duplicateAnimationClip,
    openAnimationCatalog,
  } = useProjectStore();

  const [showEasingPopover, setShowEasingPopover] = useState(false);
  const easingButtonRef = useRef<HTMLButtonElement>(null);

  const [isEditingClipName, setIsEditingClipName] = useState(false);
  const [clipNameInput, setClipNameInput] = useState(selectedClip.name || selectedClip.preset);

  const isTextLayer = clipLayer.type === "text" || clipLayer.type === "chunk";

  const doc = useProjectStore((s) => s.document);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const activeScreen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const candidateLayers = (activeScreen?.layers || []).filter((l) => l.id !== clipLayer.id);

  const targetLayer = selectedClip.params?.targetLayerId
    ? findLayerInTree(activeScreen?.layers || [], selectedClip.params.targetLayerId)
    : null;

  const currentMorphStyle: MorphStyle = selectedClip.params?.morphStyle || "stardust";
  const currentParticleCount: number = selectedClip.params?.particleCount ?? 80;
  const currentChaos: number = selectedClip.params?.chaos ?? 30;
  const currentParticleShape: MorphParticleShape = selectedClip.params?.particleShape || "star";

  // Helpers for Initial value (From) and To value bindings
  const hasInitialValue = (key: string): boolean => {
    if (selectedClip.from?.[key] !== undefined) return true;
    const paramKey = `from${key.charAt(0).toUpperCase() + key.slice(1)}`;
    return selectedClip.params?.[paramKey] !== undefined;
  };

  const getInitialValue = <T,>(key: string, defaultVal: T): T => {
    if (selectedClip.from?.[key] !== undefined) return selectedClip.from[key];
    const paramKey = `from${key.charAt(0).toUpperCase() + key.slice(1)}`;
    if (selectedClip.params?.[paramKey] !== undefined) return selectedClip.params[paramKey];
    return defaultVal;
  };

  const setInitialValue = (key: string, val: any) => {
    const paramKey = `from${key.charAt(0).toUpperCase() + key.slice(1)}`;
    updateAnimationClip(clipLayer.id, selectedClip.id, {
      from: { ...selectedClip.from, [key]: val },
      params: { ...selectedClip.params, [paramKey]: val },
    });
  };

  const clearInitialValue = (key: string) => {
    const newFrom = { ...(selectedClip.from || {}) };
    delete newFrom[key];
    const newParams = { ...(selectedClip.params || {}) };
    const paramKey = `from${key.charAt(0).toUpperCase() + key.slice(1)}`;
    delete newParams[paramKey];
    updateAnimationClip(clipLayer.id, selectedClip.id, {
      from: Object.keys(newFrom).length > 0 ? newFrom : undefined,
      params: newParams,
    });
  };

  // Property detection
  const isCustom = selectedClip.preset.startsWith("custom_");

  const isDirectional =
    selectedClip.preset.toLowerCase().includes("slide") ||
    selectedClip.preset.toLowerCase().includes("move") ||
    selectedClip.preset.toLowerCase().includes("drop") ||
    selectedClip.preset.toLowerCase().includes("wipe") ||
    selectedClip.preset === "mask_reveal" ||
    selectedClip.preset === "maskWipe" ||
    selectedClip.direction !== undefined;

  const isScaleBased =
    selectedClip.preset.toLowerCase().includes("pop") ||
    selectedClip.preset.toLowerCase().includes("grow") ||
    selectedClip.preset.toLowerCase().includes("shrink") ||
    selectedClip.preset.toLowerCase().includes("scale") ||
    selectedClip.preset === "elasticScalePop" ||
    selectedClip.preset === "cardSettlePop" ||
    selectedClip.preset === "kenBurns" ||
    selectedClip.scaleAmount !== undefined;

  const isRotationBased =
    selectedClip.preset.toLowerCase().includes("spin") ||
    selectedClip.preset.toLowerCase().includes("twist") ||
    selectedClip.preset.toLowerCase().includes("wiggle") ||
    selectedClip.preset.toLowerCase().includes("rotate") ||
    selectedClip.preset === "iconPop" ||
    selectedClip.rotationDegrees !== undefined;

  const isOpacityBased =
    selectedClip.preset.toLowerCase().includes("opacity") ||
    selectedClip.preset.toLowerCase().includes("fade") ||
    selectedClip.params?.opacity !== undefined;

  const isRadiusBased =
    selectedClip.preset.toLowerCase().includes("radius") ||
    selectedClip.params?.radius !== undefined;

  const isColorBased =
    selectedClip.preset.toLowerCase().includes("color") ||
    selectedClip.params?.color !== undefined;

  const isShadowBased =
    selectedClip.preset.toLowerCase().includes("shadow") ||
    selectedClip.preset === "elevationRise" ||
    selectedClip.params?.shadowBlur !== undefined ||
    selectedClip.params?.shadowDistance !== undefined;

  const isBlurBased =
    selectedClip.preset === "custom_blur" ||
    selectedClip.preset === "blurIn" ||
    selectedClip.preset === "blurFocusPop" ||
    selectedClip.preset === "focusPull" ||
    selectedClip.preset === "glassIris" ||
    (selectedClip.params?.blur !== undefined && !selectedClip.preset.includes("backdrop"));

  const isBackdropBlurBased =
    selectedClip.preset === "custom_backdrop_blur" ||
    (selectedClip.params?.backdropBlur !== undefined && selectedClip.preset !== "custom_glass");

  const isGlassBased = selectedClip.preset === "custom_glass";

  const isVisibilityBased =
    selectedClip.preset === "custom_visibility" ||
    selectedClip.params?.visibility !== undefined;

  const isResizeBased =
    selectedClip.preset === "custom_resize" ||
    selectedClip.params?.widthDelta !== undefined ||
    selectedClip.params?.heightDelta !== undefined;

  const isMorphBased =
    selectedClip.preset === "custom_morph" ||
    selectedClip.preset === "morph" ||
    selectedClip.preset === "morphIn" ||
    selectedClip.params?.morphAmount !== undefined;

  const isCrossMorph = selectedClip.preset === "morph" || selectedClip.preset === "morphIn";

  const isStrokeBased =
    selectedClip.preset === "custom_stroke" ||
    selectedClip.params?.strokeWidth !== undefined;

  const isLoopingOrEmphasis =
    selectedClip.type === "emphasis" ||
    ["pulse", "float", "wiggle", "spin", "heartbeat", "breathe", "shake"].includes(selectedClip.preset);

  const isOpticalOnly =
    isOpacityBased ||
    isColorBased ||
    isBlurBased ||
    isBackdropBlurBased ||
    selectedClip.type === "out";

  const handleModeChange = (newType: "in" | "action" | "out") => {
    const updates: Partial<AnimationClip> = { type: newType };

    if (newType === "in") {
      if (selectedClip.preset === "custom_scale") {
        updates.from = { ...(selectedClip.from || {}), scale: selectedClip.from?.scale ?? 0 };
        updates.params = { ...(selectedClip.params || {}), scaleAmount: selectedClip.params?.scaleAmount ?? 1 };
      } else if (selectedClip.preset === "custom_opacity") {
        updates.from = { ...(selectedClip.from || {}), opacity: selectedClip.from?.opacity ?? 0 };
        updates.params = { ...(selectedClip.params || {}), opacity: selectedClip.params?.opacity ?? 1 };
      }
    } else if (newType === "out") {
      if (selectedClip.preset === "custom_scale") {
        updates.from = { ...(selectedClip.from || {}), scale: selectedClip.from?.scale ?? 1 };
        updates.params = { ...(selectedClip.params || {}), scaleAmount: 0 };
      } else if (selectedClip.preset === "custom_opacity") {
        updates.from = { ...(selectedClip.from || {}), opacity: selectedClip.from?.opacity ?? 1 };
        updates.params = { ...(selectedClip.params || {}), opacity: 0 };
      }
    } else if (newType === "action") {
      if (selectedClip.preset === "custom_scale") {
        updates.from = { ...(selectedClip.from || {}), scale: selectedClip.from?.scale ?? 1 };
        updates.params = { ...(selectedClip.params || {}), scaleAmount: selectedClip.params?.scaleAmount ?? 1.2 };
      } else if (selectedClip.preset === "custom_opacity") {
        updates.from = { ...(selectedClip.from || {}), opacity: selectedClip.from?.opacity ?? 1 };
        updates.params = { ...(selectedClip.params || {}), opacity: selectedClip.params?.opacity ?? 0.5 };
      }
    }

    updateAnimationClip(clipLayer.id, selectedClip.id, updates);
  };

  // Pick appropriate header icon
  const getHeaderIcon = () => {
    if (isBlurBased) return <Flame className="h-4 w-4 text-[#7c3aed]" />;
    if (isBackdropBlurBased) return <CircleDot className="h-4 w-4 text-[#7c3aed]" />;
    if (isGlassBased) return <Shield className="h-4 w-4 text-[#7c3aed]" />;
    if (isColorBased) return <Palette className="h-4 w-4 text-[#7c3aed]" />;
    if (isShadowBased) return <BoxSelect className="h-4 w-4 text-[#7c3aed]" />;
    if (isOpacityBased) return <SunMedium className="h-4 w-4 text-[#7c3aed]" />;
    if (isRadiusBased) return <CornerUpRight className="h-4 w-4 text-[#7c3aed]" />;
    if (isStrokeBased) return <Square className="h-4 w-4 text-[#7c3aed]" />;
    if (isResizeBased) return <ArrowLeftRight className="h-4 w-4 text-[#7c3aed]" />;
    if (isMorphBased) return <Shapes className="h-4 w-4 text-[#7c3aed]" />;
    if (isVisibilityBased) return <EyeOff className="h-4 w-4 text-[#7c3aed]" />;
    if (isDirectional) return <Move className="h-4 w-4 text-[#7c3aed]" />;
    if (isScaleBased) return <Maximize2 className="h-4 w-4 text-[#7c3aed]" />;
    if (isRotationBased) return <RotateCw className="h-4 w-4 text-[#7c3aed]" />;
    return <Zap className="h-4 w-4 text-[#7c3aed]" />;
  };

  return (
    <div className="p-4 space-y-0 text-foreground select-none relative min-h-full">
      {/* Navigation Breadcrumb back to Element view */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <button
          type="button"
          onClick={() => setSelectedClips([])}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Element</span>
        </button>
      </div>

      {/* Row 1: Header with Icon + Preset Name | [ Change ] | ··· */}
      <div className="py-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          {getHeaderIcon()}
          {isEditingClipName ? (
            <input
              type="text"
              value={clipNameInput}
              autoFocus
              onChange={(e) => setClipNameInput(e.target.value)}
              onBlur={() => {
                if (clipNameInput.trim()) {
                  updateAnimationClip(clipLayer.id, selectedClip.id, { name: clipNameInput.trim() });
                } else {
                  setClipNameInput(selectedClip.name || selectedClip.preset);
                }
                setIsEditingClipName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (clipNameInput.trim()) {
                    updateAnimationClip(clipLayer.id, selectedClip.id, { name: clipNameInput.trim() });
                  } else {
                    setClipNameInput(selectedClip.name || selectedClip.preset);
                  }
                  setIsEditingClipName(false);
                } else if (e.key === "Escape") {
                  setClipNameInput(selectedClip.name || selectedClip.preset);
                  setIsEditingClipName(false);
                }
              }}
              className="w-full text-sm font-bold text-foreground px-1.5 py-0.5 border border-primary rounded outline-none bg-card"
            />
          ) : (
            <span
              onDoubleClick={() => {
                setClipNameInput(selectedClip.name || selectedClip.preset);
                setIsEditingClipName(true);
              }}
              className="text-sm font-bold text-foreground capitalize truncate cursor-pointer hover:underline"
              title="Double-click to rename animation"
            >
              {selectedClip.name || selectedClip.preset.replace("custom_", "")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openAnimationCatalog(selectedClip.id)}
            className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-semibold transition-colors cursor-pointer"
            title="Change animation preset"
          >
            Change
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border text-xs text-foreground">
              <DropdownMenuItem
                onClick={() => {
                  setClipNameInput(selectedClip.name || selectedClip.preset);
                  setIsEditingClipName(true);
                }}
                className="hover:bg-muted cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const newId = duplicateAnimationClip(clipLayer.id, selectedClip.id);
                  if (newId) setSelectedClips([newId]);
                }}
                className="hover:bg-muted cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  removeAnimationClip(clipLayer.id, selectedClip.id);
                  setSelectedClips([]);
                }}
                className="text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Universal Mode [ In | Action | Out ] for all animations */}
      {!selectedClip.loop && (
        <div className="py-3 flex items-center justify-between border-b border-border/60">
          <span className="text-[13px] text-muted-foreground font-medium">Mode</span>
          <div className="flex items-center bg-muted p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => handleModeChange("in")}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors font-medium cursor-pointer",
                selectedClip.type === "in"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("action")}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors font-medium cursor-pointer",
                selectedClip.type === "action"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Action
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("out")}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors font-medium cursor-pointer",
                selectedClip.type === "out"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Out
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          FROM -> TO PROPERTY CONTROLS (Jitter Symmetric Rhythm)
         ========================================================================= */}

      {/* Layer Blur */}
      {isBlurBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("blur") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("blur", 0)}
                    min={0}
                    max={100}
                    step={1}
                    decimals={0}
                    onChange={(val) => setInitialValue("blur", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("blur")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Remove initial value"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("blur", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Add initial value"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.blur ?? 10}
                min={0}
                max={100}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, blur: val, toBlur: val },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Background Blur */}
      {isBackdropBlurBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("backdropBlur") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("backdropBlur", 0)}
                    min={0}
                    max={100}
                    step={1}
                    decimals={0}
                    onChange={(val) => setInitialValue("backdropBlur", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("backdropBlur")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Remove initial value"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("backdropBlur", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Add initial value"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.backdropBlur ?? 16}
                min={0}
                max={100}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, backdropBlur: val, toBackdropBlur: val },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Glass */}
      {isGlassBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial Blur</span>
            {hasInitialValue("backdropBlur") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("backdropBlur", 0)}
                    min={0}
                    max={100}
                    step={1}
                    decimals={0}
                    onChange={(val) => setInitialValue("backdropBlur", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("backdropBlur")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("backdropBlur", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To Blur</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.backdropBlur ?? 20}
                min={0}
                max={100}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, backdropBlur: val },
                  })
                }
              />
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To Opacity</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="%"
                value={Math.round((selectedClip.params?.opacity ?? 0.8) * 100)}
                min={0}
                max={100}
                step={5}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, opacity: val / 100 },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Scale */}
      {isScaleBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("scale") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="x"
                    value={getInitialValue("scale", 1)}
                    min={0}
                    max={5}
                    step={0.05}
                    decimals={2}
                    onChange={(val) => setInitialValue("scale", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("scale")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("scale", 0.5)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="x"
                value={selectedClip.scaleAmount ?? selectedClip.params?.scaleAmount ?? 1.2}
                min={0}
                max={5}
                step={0.05}
                decimals={2}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    scaleAmount: val,
                    params: { ...selectedClip.params, scaleAmount: val, toScale: val },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Rotate */}
      {isRotationBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("rotate") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="°"
                    value={getInitialValue("rotate", 0)}
                    min={-720}
                    max={720}
                    step={15}
                    decimals={0}
                    onChange={(val) => setInitialValue("rotate", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("rotate")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("rotate", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="°"
                value={selectedClip.rotationDegrees ?? selectedClip.params?.rotationDegrees ?? 90}
                min={-720}
                max={720}
                step={15}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    rotationDegrees: val,
                    params: { ...selectedClip.params, rotationDegrees: val, toRotate: val },
                  })
                }
              />
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Direction</span>
            <div className="flex items-center bg-muted p-0.5 rounded-md">
              <button
                type="button"
                onClick={() =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    direction: "cw" as any,
                    rotationDegrees: Math.abs(selectedClip.rotationDegrees ?? 90),
                  })
                }
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  selectedClip.direction !== "ccw" && (selectedClip.rotationDegrees ?? 90) >= 0
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    direction: "ccw" as any,
                    rotationDegrees: -Math.abs(selectedClip.rotationDegrees ?? 90),
                  })
                }
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  selectedClip.direction === "ccw" || (selectedClip.rotationDegrees ?? 90) < 0
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Counter-Clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Move / Directional */}
      {isDirectional && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial Distance</span>
            {hasInitialValue("distance") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("distance", 0)}
                    min={0}
                    max={2000}
                    step={10}
                    decimals={0}
                    onChange={(val) => setInitialValue("distance", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("distance")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("distance", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Distance</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.distance ?? selectedClip.params?.distance ?? 60}
                min={0}
                max={2000}
                step={10}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    distance: val,
                    params: { ...selectedClip.params, distance: val },
                  })
                }
              />
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Direction</span>
            <div className="flex items-center bg-muted p-0.5 rounded-md gap-0.5">
              {[
                { id: "up", icon: ArrowUp, label: "Up" },
                { id: "down", icon: ArrowDown, label: "Down" },
                { id: "left", icon: ArrowLeft, label: "Left" },
                { id: "right", icon: ArrowRight, label: "Right" },
              ].map((d) => {
                const isActive = (selectedClip.direction || selectedClip.params?.direction || "up") === d.id;
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      updateAnimationClip(clipLayer.id, selectedClip.id, {
                        direction: d.id as any,
                        params: { ...selectedClip.params, direction: d.id },
                      })
                    }
                    className={cn(
                      "p-1.5 rounded transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={d.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Opacity */}
      {isOpacityBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("opacity") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="%"
                    value={Math.round(getInitialValue("opacity", 1) * 100)}
                    min={0}
                    max={100}
                    step={5}
                    decimals={0}
                    onChange={(val) => setInitialValue("opacity", val / 100)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("opacity")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("opacity", 1)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="%"
                value={Math.round((selectedClip.params?.opacity ?? 0) * 100)}
                min={0}
                max={100}
                step={5}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, opacity: val / 100, toOpacity: val / 100 },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Color */}
      {isColorBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("color") ? (
              <div className="flex items-center gap-2">
                <ColorPicker
                  value={getInitialValue("color", clipLayer.style.backgroundColor || "#3b82f6")}
                  onChange={(c) => setInitialValue("color", c)}
                  className="w-6 h-6"
                />
                <input
                  type="text"
                  value={getInitialValue("color", clipLayer.style.backgroundColor || "#3b82f6")}
                  onChange={(e) => setInitialValue("color", e.target.value)}
                  className="w-20 text-xs px-2 py-1 rounded bg-muted text-foreground border border-border font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => clearInitialValue("color")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("color", clipLayer.style.backgroundColor || "#3b82f6")}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={selectedClip.params?.color || "#6d28d9"}
                onChange={(c) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, color: c, toColor: c },
                  })
                }
                className="w-6 h-6"
              />
              <input
                type="text"
                value={selectedClip.params?.color || "#6d28d9"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, color: e.target.value, toColor: e.target.value },
                  })
                }
                className="w-20 text-xs px-2 py-1 rounded bg-muted text-foreground border border-border font-mono uppercase"
              />
            </div>
          </div>
        </>
      )}

      {/* Shadow */}
      {isShadowBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial Blur</span>
            {hasInitialValue("shadowBlur") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("shadowBlur", 0)}
                    min={0}
                    max={100}
                    step={1}
                    decimals={0}
                    onChange={(val) => setInitialValue("shadowBlur", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("shadowBlur")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("shadowBlur", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To Blur</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.shadowBlur ?? 16}
                min={0}
                max={100}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, shadowBlur: val },
                  })
                }
              />
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Distance</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.shadowDistance ?? 8}
                min={0}
                max={100}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, shadowDistance: val },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Corner Radius */}
      {isRadiusBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial value</span>
            {hasInitialValue("radius") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("radius", 0)}
                    min={0}
                    max={200}
                    step={2}
                    decimals={0}
                    onChange={(val) => setInitialValue("radius", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("radius")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("radius", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.radius ?? 16}
                min={0}
                max={200}
                step={2}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, radius: val, toRadius: val },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Stroke */}
      {isStrokeBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Initial Width</span>
            {hasInitialValue("strokeWidth") ? (
              <div className="flex items-center gap-1.5">
                <div className="w-24">
                  <ScrubbableInput
                    label=""
                    unit="px"
                    value={getInitialValue("strokeWidth", 0)}
                    min={0}
                    max={50}
                    step={1}
                    decimals={0}
                    onChange={(val) => setInitialValue("strokeWidth", val)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearInitialValue("strokeWidth")}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInitialValue("strokeWidth", 0)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">To Width</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.strokeWidth ?? 4}
                min={0}
                max={50}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, strokeWidth: val },
                  })
                }
              />
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Color</span>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={selectedClip.params?.strokeColor || "#6d28d9"}
                onChange={(c) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, strokeColor: c },
                  })
                }
                className="w-6 h-6"
              />
              <input
                type="text"
                value={selectedClip.params?.strokeColor || "#6d28d9"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, strokeColor: e.target.value },
                  })
                }
                className="w-20 text-xs px-2 py-1 rounded bg-muted text-foreground border border-border font-mono uppercase"
              />
            </div>
          </div>
        </>
      )}

      {/* Resize */}
      {isResizeBased && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Width Delta</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.widthDelta ?? 50}
                min={-1000}
                max={1000}
                step={10}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, widthDelta: val },
                  })
                }
              />
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Height Delta</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.heightDelta ?? 50}
                min={-1000}
                max={1000}
                step={10}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, heightDelta: val },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Visibility */}
      {isVisibilityBased && (
        <div className="py-3 flex items-center justify-between border-b border-border/60">
          <span className="text-[13px] text-muted-foreground font-medium">Visibility</span>
          <div className="flex items-center bg-muted p-0.5 rounded-md">
            <button
              type="button"
              onClick={() =>
                updateAnimationClip(clipLayer.id, selectedClip.id, {
                  params: { ...selectedClip.params, visibility: "hide" },
                })
              }
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors font-medium cursor-pointer",
                (selectedClip.params?.visibility ?? "hide") === "hide"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hide
            </button>
            <button
              type="button"
              onClick={() =>
                updateAnimationClip(clipLayer.id, selectedClip.id, {
                  params: { ...selectedClip.params, visibility: "show" },
                })
              }
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors font-medium cursor-pointer",
                selectedClip.params?.visibility === "show"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Show
            </button>
          </div>
        </div>
      )}

      {/* Cross-Element Morph Transition Properties */}
      {isCrossMorph && (
        <div className="space-y-3 py-3 border-b border-border/60">
          {/* Target Element */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground font-medium">Target Element</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-[#6d28d9] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {candidateLayers.map((l) => {
                    const lTitle =
                      l.name ||
                      (l.type === "text" && (l as any).text
                        ? (l as any).text.slice(0, 18)
                        : l.type.charAt(0).toUpperCase() + l.type.slice(1));
                    const isCurrent = l.id === selectedClip.params?.targetLayerId;
                    return (
                      <DropdownMenuItem
                        key={l.id}
                        onClick={() =>
                          updateAnimationClip(clipLayer.id, selectedClip.id, {
                            params: { ...selectedClip.params, targetLayerId: l.id },
                          })
                        }
                        className="flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="truncate">{lTitle}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#6d28d9]" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="p-2 rounded-lg bg-[#f8f8fa] border border-[#e5e5e7] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-white shadow-2xs flex items-center justify-center text-[#7c3aed] shrink-0">
                  <Shapes className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[#18181b] truncate">
                  {targetLayer
                    ? targetLayer.name ||
                      (targetLayer.type === "text" && (targetLayer as any).text
                        ? (targetLayer as any).text.slice(0, 20)
                        : targetLayer.type.charAt(0).toUpperCase() + targetLayer.type.slice(1))
                    : "No target selected"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                {targetLayer?.type || "none"}
              </span>
            </div>
          </div>

          {/* Morph Effect Style */}
          <div className="space-y-1.5">
            <span className="text-[13px] text-muted-foreground font-medium">Effect Style</span>
            <div className="grid grid-cols-3 gap-1 bg-[#ebebef] p-1 rounded-lg">
              {(
                [
                  { id: "stardust", label: "✦ Stardust" },
                  { id: "liquid", label: "💧 Liquid" },
                  { id: "voronoi", label: "💎 Voronoi" },
                  { id: "laser", label: "⚡ Laser" },
                  { id: "singularity", label: "🌀 Singularity" },
                  { id: "spline", label: "〰️ Spline" },
                ] as const
              ).map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() =>
                    updateAnimationClip(clipLayer.id, selectedClip.id, {
                      params: { ...selectedClip.params, morphStyle: style.id },
                    })
                  }
                  className={cn(
                    "py-1.5 text-[10px] font-bold rounded-md transition-all text-center flex items-center justify-center cursor-pointer",
                    currentMorphStyle === style.id
                      ? "bg-white text-[#18181b] shadow-xs"
                      : "text-[#71717a] hover:text-[#18181b]"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Particle Density */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground font-medium">Particle Count</span>
              <span className="text-xs font-mono font-medium text-foreground">{currentParticleCount}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[#ebebef] p-1 rounded-lg">
              {[
                { count: 40, label: "Light (40)" },
                { count: 80, label: "Medium (80)" },
                { count: 160, label: "Dense (160)" },
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() =>
                    updateAnimationClip(clipLayer.id, selectedClip.id, {
                      params: { ...selectedClip.params, particleCount: opt.count },
                    })
                  }
                  className={cn(
                    "py-1 text-[10px] font-bold rounded-md transition-all text-center flex items-center justify-center cursor-pointer",
                    currentParticleCount === opt.count
                      ? "bg-white text-[#18181b] shadow-xs"
                      : "text-[#71717a] hover:text-[#18181b]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Turbulence / Chaos */}
          <div className="py-1 flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground font-medium">Turbulence</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="%"
                value={currentChaos}
                min={0}
                max={100}
                step={5}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, chaos: val },
                  })
                }
              />
            </div>
          </div>

          {/* Particle Shape */}
          <div className="space-y-1.5">
            <span className="text-[13px] text-muted-foreground font-medium">Particle Shape</span>
            <div className="grid grid-cols-3 gap-1 bg-[#ebebef] p-1 rounded-lg">
              {(
                [
                  { id: "star", label: "Stars" },
                  { id: "dot", label: "Dots" },
                  { id: "square", label: "Squares" },
                ] as const
              ).map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() =>
                    updateAnimationClip(clipLayer.id, selectedClip.id, {
                      params: { ...selectedClip.params, particleShape: shape.id },
                    })
                  }
                  className={cn(
                    "py-1 text-[10px] font-bold rounded-md transition-all text-center flex items-center justify-center cursor-pointer",
                    currentParticleShape === shape.id
                      ? "bg-white text-[#18181b] shadow-xs"
                      : "text-[#71717a] hover:text-[#18181b]"
                  )}
                >
                  {shape.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Morph (Custom Property) */}
      {!isCrossMorph && isMorphBased && (
        <div className="py-3 flex items-center justify-between border-b border-border/60">
          <span className="text-[13px] text-muted-foreground font-medium">Morph Amount</span>
          <div className="w-24">
            <ScrubbableInput
              label=""
              unit="%"
              value={Math.round((selectedClip.params?.morphAmount ?? 1) * 100)}
              min={0}
              max={100}
              step={5}
              decimals={0}
              onChange={(val) =>
                updateAnimationClip(clipLayer.id, selectedClip.id, {
                  params: { ...selectedClip.params, morphAmount: val / 100 },
                })
              }
            />
          </div>
        </div>
      )}

      {/* Text Animation Parameters */}
      {isTextLayer && (
        <>
          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Apply effect to</span>
            <div className="w-28">
              <Select
                value={
                  selectedClip.splitBy === "character"
                    ? "Letters"
                    : selectedClip.splitBy === "word"
                    ? "Words"
                    : selectedClip.splitBy === "line"
                    ? "Lines"
                    : "All"
                }
                onValueChange={(val) => {
                  const splitBy =
                    val === "Letters"
                      ? "character"
                      : val === "Words"
                      ? "word"
                      : val === "Lines"
                      ? "line"
                      : "all";
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    splitBy: splitBy as any,
                  });
                }}
              >
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="Letters">Letters</SelectItem>
                  <SelectItem value="Words">Words</SelectItem>
                  <SelectItem value="Lines">Lines</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Order</span>
            <div className="w-28">
              <Select
                value={selectedClip.params?.order || "Forward"}
                onValueChange={(val) => {
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, order: val },
                  });
                }}
              >
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="Forward">Forward</SelectItem>
                  <SelectItem value="Backward">Backward</SelectItem>
                  <SelectItem value="Random">Random</SelectItem>
                  <SelectItem value="From center">From center</SelectItem>
                  <SelectItem value="To center">To center</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="py-3 flex items-center justify-between border-b border-border/60">
            <span className="text-[13px] text-muted-foreground font-medium">Delay</span>
            <div className="w-24">
              <ScrubbableInput
                label=""
                unit="ms"
                value={Math.round((selectedClip.staggerDelay ?? 0.15) * 1000)}
                min={0}
                max={2000}
                step={10}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    staggerDelay: val / 1000,
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Looping / Ambient Emphasis parameters */}
      {isLoopingOrEmphasis && (
        <div className="py-3 flex items-center justify-between border-b border-border/60">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
            <Checkbox
              checked={!!selectedClip.loop}
              onCheckedChange={(checked) =>
                updateAnimationClip(clipLayer.id, selectedClip.id, {
                  loop: Boolean(checked),
                })
              }
            />
            <span>Loop continuously</span>
          </label>

          <div className="w-20">
            <ScrubbableInput
              label="x"
              value={selectedClip.intensity ?? 1}
              min={0.1}
              max={3.0}
              step={0.1}
              decimals={1}
              onChange={(val) =>
                updateAnimationClip(clipLayer.id, selectedClip.id, { intensity: val })
              }
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          ANIMATION SECTION: Duration & Easing (Jitter Layout Rhythm)
         ========================================================================= */}
      <div className="py-2.5 flex items-center justify-between border-b border-border/60">
        <span className="text-[13px] font-bold text-foreground">Animation</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border text-xs text-foreground">
            <DropdownMenuItem
              onClick={() => {
                updateAnimationClip(clipLayer.id, selectedClip.id, {
                  duration: 0.8,
                  easing: "smooth",
                });
              }}
              className="hover:bg-muted cursor-pointer"
            >
              Reset to default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Duration */}
      <div className="py-2.5 flex items-center justify-between border-b border-border/60">
        <span className="text-[13px] text-muted-foreground font-medium">Duration</span>
        <div className="w-24">
          <ScrubbableInput
            label=""
            unit="s"
            value={selectedClip.duration}
            min={0.05}
            max={20}
            step={0.05}
            decimals={2}
            onChange={(val) =>
              updateAnimationClip(clipLayer.id, selectedClip.id, { duration: val })
            }
          />
        </div>
      </div>

      {/* Easing */}
      <div className="py-2.5 flex items-center justify-between border-b border-border/60 relative">
        <span className="text-[13px] text-muted-foreground font-medium">Easing</span>
        <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowEasingPopover(!showEasingPopover)}
              className="h-7 px-2.5 bg-muted hover:bg-muted/80 rounded text-xs text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {selectedClip.easing === "linear" || selectedClip.easing === "none"
                  ? "Linear"
                  : selectedClip.easing === "slowDown"
                  ? "Slow down"
                  : selectedClip.easing === "accelerate"
                  ? "Accelerate"
                  : selectedClip.easing === "elastic" || selectedClip.easing === "bouncy"
                  ? "Elastic"
                  : selectedClip.easing === "bounce"
                  ? "Bounce"
                  : selectedClip.easing === "overshoot" || selectedClip.easing === "snappy"
                  ? "Overshoot"
                  : selectedClip.easing === "natural"
                  ? "Natural"
                  : selectedClip.easing === "custom"
                  ? "Custom"
                  : "Smooth"}
              </span>
            </button>

            <button
              ref={easingButtonRef}
              type="button"
              onClick={() => setShowEasingPopover(!showEasingPopover)}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded transition-colors cursor-pointer",
                showEasingPopover
                  ? "bg-primary/10 text-primary"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              )}
              title="Easing settings"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Jitter Easing Popover Portal */}
          {showEasingPopover && easingButtonRef.current && createPortal(
            (() => {
              const sidebarEl = document.getElementById("right-inspector-panel");
              const sidebarRect = sidebarEl?.getBoundingClientRect();
              const rect = easingButtonRef.current.getBoundingClientRect();

              const popoverWidth = 268;
              const gap = 8;
              const leftPos = Math.max(
                gap,
                (sidebarRect ? sidebarRect.left : rect.left) - popoverWidth - gap
              );

              const topLimit = (sidebarRect ? sidebarRect.top : 48) + 6;
              const timelineEl = document.querySelector('[data-testid="timeline-panel"]');
              const timelineTop = timelineEl
                ? timelineEl.getBoundingClientRect().top
                : window.innerHeight;
              const bottomLimit = Math.min(window.innerHeight, timelineTop) - gap;

              const popoverHeight = 420;
              // Hugged directly below the top header (Rule 9 high precision alignment)
              let topPos = topLimit;
              if (topPos + popoverHeight > bottomLimit) {
                topPos = Math.max(topLimit, bottomLimit - popoverHeight);
              }

              return (
                <>
                  <div
                    className="fixed inset-0 z-[99998]"
                    onClick={() => setShowEasingPopover(false)}
                  />
                  <div
                    style={{
                      position: "fixed",
                      top: `${Math.round(topPos)}px`,
                      left: `${Math.round(leftPos)}px`,
                      zIndex: 99999,
                    }}
                  >
                    <JitterEasingPopover
                      currentEasing={selectedClip.easing || "smooth"}
                      bezierPoints={selectedClip.bezierPoints}
                      springStiffness={selectedClip.springStiffness}
                      springDamping={selectedClip.springDamping}
                      springMass={selectedClip.springMass}
                      isOpticalOnly={isOpticalOnly}
                      onSelectEasing={(easingId, bezier, spring) => {
                        updateAnimationClip(clipLayer.id, selectedClip.id, {
                          easing: easingId as any,
                          bezierPoints: bezier || undefined,
                          ...(spring
                            ? {
                                springStiffness: spring.stiffness,
                                springDamping: spring.damping,
                                springMass: spring.mass,
                              }
                            : {
                                springStiffness: undefined,
                                springDamping: undefined,
                                springMass: undefined,
                              }),
                        });
                      }}
                      onClose={() => setShowEasingPopover(false)}
                    />
                  </div>
                </>
              );
            })(),
            document.body
          )}
        </div>

      {/* =========================================================================
          BOTTOM: Add Animation Button (Jitter Style)
         ========================================================================= */}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => openAnimationCatalog()}
          className="w-full py-2.5 px-3 rounded-lg bg-[#6d28d9]/10 hover:bg-[#6d28d9]/15 text-[#6d28d9] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Add animation</span>
        </button>
      </div>
    </div>
  );
};
