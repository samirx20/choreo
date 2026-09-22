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
} from "lucide-react";
import { Layer, AnimationClip } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const isDirectional =
    selectedClip.preset.toLowerCase().includes("slide") ||
    selectedClip.preset.toLowerCase().includes("move") ||
    selectedClip.preset.toLowerCase().includes("drop") ||
    selectedClip.direction !== undefined;

  const isScaleBased =
    selectedClip.preset.toLowerCase().includes("pop") ||
    selectedClip.preset.toLowerCase().includes("grow") ||
    selectedClip.preset.toLowerCase().includes("shrink") ||
    selectedClip.preset.toLowerCase().includes("scale") ||
    selectedClip.preset.toLowerCase().includes("pulse") ||
    selectedClip.scaleAmount !== undefined;

  const isRotationBased =
    selectedClip.preset.toLowerCase().includes("spin") ||
    selectedClip.preset.toLowerCase().includes("twist") ||
    selectedClip.preset.toLowerCase().includes("wiggle") ||
    selectedClip.preset.toLowerCase().includes("rotate") ||
    selectedClip.rotationDegrees !== undefined;

  const isOpacityBased =
    selectedClip.preset.toLowerCase().includes("opacity") ||
    selectedClip.params?.opacity !== undefined;

  const isRadiusBased =
    selectedClip.preset.toLowerCase().includes("radius") ||
    selectedClip.params?.radius !== undefined;

  const isColorBased =
    selectedClip.preset.toLowerCase().includes("color") ||
    selectedClip.params?.color !== undefined;

  const isShadowBased =
    selectedClip.preset.toLowerCase().includes("shadow") ||
    selectedClip.params?.shadowBlur !== undefined ||
    selectedClip.params?.shadowDistance !== undefined;

  const isBlurBased =
    selectedClip.preset === "custom_blur" ||
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
    selectedClip.params?.morphAmount !== undefined;

  const isStrokeBased =
    selectedClip.preset === "custom_stroke" ||
    selectedClip.params?.strokeWidth !== undefined;

  return (
    <div className="p-4 space-y-3.5 text-foreground select-none relative min-h-full">
      {/* Navigation Breadcrumb back to Element view */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <button
          type="button"
          onClick={() => setSelectedClips([])}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Element</span>
        </button>
      </div>

      {/* Row 1: Header with ⚡ Preset Name | [ Change ] | ··· */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <Zap className="h-4 w-4 fill-current text-foreground shrink-0" />
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
              {selectedClip.name || selectedClip.preset}
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

      {/* Row 2: Mode [ In | Out ] */}
      <div className="flex items-center justify-between py-1 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">Mode</span>
        <div className="flex items-center bg-muted p-0.5 rounded-md">
          <button
            type="button"
            onClick={() =>
              updateAnimationClip(clipLayer.id, selectedClip.id, { type: "in" })
            }
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
            onClick={() =>
              updateAnimationClip(clipLayer.id, selectedClip.id, { type: "out" })
            }
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

      {/* Preset Parameters */}
      {isRotationBased && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Rotate by</span>
            <div className="w-28">
              <ScrubbableInput
                label=""
                unit="°"
                value={selectedClip.rotationDegrees ?? 45}
                min={-720}
                max={720}
                step={15}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, { rotationDegrees: val })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Direction</span>
            <div className="flex items-center bg-muted p-0.5 rounded-md">
              <button
                type="button"
                onClick={() =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    direction: "cw" as any,
                    rotationDegrees: Math.abs(selectedClip.rotationDegrees ?? 45),
                  })
                }
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  selectedClip.direction !== "ccw" && (selectedClip.rotationDegrees ?? 45) >= 0
                    ? "bg-primary/10 text-primary"
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
                    rotationDegrees: -Math.abs(selectedClip.rotationDegrees ?? 45),
                  })
                }
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  selectedClip.direction === "ccw" || (selectedClip.rotationDegrees ?? 45) < 0
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Counter-Clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isScaleBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Scale</span>
            <div className="w-28">
              <ScrubbableInput
                label=""
                unit="x"
                value={selectedClip.scaleAmount ?? 1.2}
                min={0}
                max={5}
                step={0.05}
                decimals={2}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, { scaleAmount: val })
                }
              />
            </div>
          </div>
        </div>
      )}

      {isDirectional && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Distance</span>
            <div className="w-28">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.distance ?? 100}
                min={0}
                max={2000}
                step={10}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, { distance: val })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Direction</span>
            <div className="flex items-center bg-muted p-0.5 rounded-md gap-0.5">
              {[
                { id: "up", icon: ArrowUp, label: "Up" },
                { id: "down", icon: ArrowDown, label: "Down" },
                { id: "left", icon: ArrowLeft, label: "Left" },
                { id: "right", icon: ArrowRight, label: "Right" },
              ].map((d) => {
                const isActive = selectedClip.direction === d.id;
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      updateAnimationClip(clipLayer.id, selectedClip.id, {
                        direction: d.id as any,
                      })
                    }
                    className={cn(
                      "p-1.5 rounded transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
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
        </div>
      )}

      {isOpacityBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Target Opacity</span>
            <div className="w-28">
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
                    params: { ...selectedClip.params, opacity: val / 100 },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {isRadiusBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Corner Radius</span>
            <div className="w-28">
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
                    params: { ...selectedClip.params, radius: val },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Color Parameter */}
      {isColorBased && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Target Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedClip.params?.color || "#6d28d9"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, color: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
              />
              <input
                type="text"
                value={selectedClip.params?.color || "#6d28d9"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, color: e.target.value },
                  })
                }
                className="w-20 text-xs px-2 py-1 rounded bg-muted text-foreground border border-border font-mono uppercase"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Shadow Parameters */}
      {isShadowBased && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Blur</span>
            <div className="w-28">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Distance</span>
            <div className="w-28">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedClip.params?.shadowColor || "#000000"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, shadowColor: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
              />
              <input
                type="text"
                value={selectedClip.params?.shadowColor || "#000000"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, shadowColor: e.target.value },
                  })
                }
                className="w-20 text-xs px-2 py-1 rounded bg-muted text-foreground border border-border font-mono uppercase"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Layer Blur Parameter */}
      {isBlurBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Blur</span>
            <div className="w-28">
              <ScrubbableInput
                label=""
                unit="px"
                value={selectedClip.params?.blur ?? 12}
                min={0}
                max={100}
                step={1}
                decimals={0}
                onChange={(val) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, blur: val },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Background Blur Parameter */}
      {isBackdropBlurBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Backdrop Blur</span>
            <div className="w-28">
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
                    params: { ...selectedClip.params, backdropBlur: val },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Glass Parameters */}
      {isGlassBased && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Glass Blur</span>
            <div className="w-28">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Glass Opacity</span>
            <div className="w-28">
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
        </div>
      )}

      {/* Custom Stroke Parameters */}
      {isStrokeBased && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Stroke Width</span>
            <div className="w-28">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Stroke Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedClip.params?.strokeColor || "#6d28d9"}
                onChange={(e) =>
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, strokeColor: e.target.value },
                  })
                }
                className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
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
        </div>
      )}

      {/* Custom Resize Parameters */}
      {isResizeBased && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Width Delta</span>
            <div className="w-28">
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Height Delta</span>
            <div className="w-28">
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
        </div>
      )}

      {/* Custom Visibility Parameter */}
      {isVisibilityBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Visibility</span>
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
        </div>
      )}

      {/* Custom Morph Parameter */}
      {isMorphBased && (
        <div className="py-1 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Morph Amount</span>
            <div className="w-28">
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
        </div>
      )}

      {/* Text Animation Parameters */}
      {isTextLayer && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Apply effect to</span>
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
                <SelectTrigger className="w-28 h-7">
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

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Order</span>
            <div className="w-28">
              <Select
                value={selectedClip.params?.order || "Forward"}
                onValueChange={(val) => {
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    params: { ...selectedClip.params, order: val },
                  });
                }}
              >
                <SelectTrigger className="w-28 h-7">
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

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Delay</span>
            <div className="w-28">
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
        </div>
      )}

      {/* Action / Emphasis parameters */}
      {(selectedClip.type === "action" || selectedClip.type === "emphasis") && (
        <div className="py-1 space-y-2 border-b border-border">
          <div className="flex items-center justify-between">
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

            <div className="w-24">
              <ScrubbableInput
                label="Intensity"
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
        </div>
      )}

      {/* Animation Section: Duration & Easing */}
      <div className="py-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Animation</span>
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
                  updateAnimationClip(clipLayer.id, selectedClip.id, {
                    duration: 1.5,
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Duration</span>
          <div className="w-28">
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
        <div className="flex items-center justify-between relative">
          <span className="text-xs text-muted-foreground font-medium">Easing</span>
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

              const topLimit = (sidebarRect ? sidebarRect.top : 48) + gap;
              const timelineEl = document.querySelector('[data-testid="timeline-panel"]');
              const timelineTop = timelineEl
                ? timelineEl.getBoundingClientRect().top
                : window.innerHeight;
              const bottomLimit = Math.min(window.innerHeight, timelineTop) - gap;

              const popoverHeight = 420;
              const buttonCenterY = rect.top + rect.height / 2;
              let topPos = buttonCenterY - popoverHeight / 2;

              if (topPos + popoverHeight > bottomLimit) {
                topPos = bottomLimit - popoverHeight;
              }
              if (topPos < topLimit) {
                topPos = topLimit;
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
      </div>
    </div>
  );
};
