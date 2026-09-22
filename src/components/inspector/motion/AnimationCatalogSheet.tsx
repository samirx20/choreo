import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  X,
  Sparkles,
  Move,
  Maximize2,
  RotateCw,
  Palette,
  Square,
  Repeat,
  Type,
  Zap,
  Check,
  SunMedium,
  BoxSelect,
  Flame,
  CircleDot,
  Shield,
  EyeOff,
  ArrowLeftRight,
  Shapes,
  CornerUpRight,
  Image as ImageIcon,
} from "lucide-react";
import { Layer, AnimationClipType, getLayerClips } from "@/types/scene";
import { cn } from "@/lib/utils";

export interface AnimationCatalogPreset {
  id: string;
  name: string;
  type: AnimationClipType;
  duration: number;
  easing: string;
  desc?: string;
  params?: Record<string, any>;
}

interface AnimationCatalogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetLayer: Layer | null;
  selectedClipId?: string | null;
  onApplyPreset: (preset: AnimationCatalogPreset) => void;
}

// ---------------------------------------------------------------------------
// PRESETS CATALOG: Specialized for Text vs Shapes
// ---------------------------------------------------------------------------
const TEXT_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "typewriter", name: "Typewriter", duration: 1.2, easing: "linear", type: "in", desc: "Characters reveal sequentially" },
  { id: "baselineReveal", name: "Baseline Reveal", duration: 0.8, easing: "snappy", type: "in", desc: "Rises up from behind baseline" },
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft optical alpha reveal" },
  { id: "slideUp", name: "Slide Up", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic upward rise" },
  { id: "slideDown", name: "Slide Down", duration: 0.8, easing: "snappy", type: "in", desc: "Downward entrance trajectory" },
  { id: "slideLeft", name: "Slide Left", duration: 0.8, easing: "snappy", type: "in", desc: "Horizontal slide from right" },
  { id: "slideRight", name: "Slide Right", duration: 0.8, easing: "snappy", type: "in", desc: "Horizontal slide from left" },
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Overshoot spring pop" },
  { id: "blurIn", name: "Blur In", duration: 0.8, easing: "smooth", type: "in", desc: "Gaussian optical de-blur" },
  { id: "grow", name: "Grow", duration: 0.8, easing: "bouncy", type: "in", desc: "Smooth scale expansion" },
  { id: "shrink", name: "Shrink", duration: 0.8, easing: "smooth", type: "in", desc: "Scale compression into frame" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Gravity descent from top" },
];

const SHAPE_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Snappy overshoot scale" },
  { id: "slideUp", name: "Slide Up", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic upward rise" },
  { id: "slideDown", name: "Slide Down", duration: 0.8, easing: "snappy", type: "in", desc: "Downward entrance trajectory" },
  { id: "slideLeft", name: "Slide Left", duration: 0.8, easing: "snappy", type: "in", desc: "Horizontal slide from right" },
  { id: "slideRight", name: "Slide Right", duration: 0.8, easing: "snappy", type: "in", desc: "Horizontal slide from left" },
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft optical alpha reveal" },
  { id: "grow", name: "Grow", duration: 0.8, easing: "bouncy", type: "in", desc: "Smooth scale expansion" },
  { id: "shrink", name: "Shrink", duration: 0.8, easing: "smooth", type: "in", desc: "Scale compression into frame" },
  { id: "spin", name: "Spin In", duration: 1.0, easing: "smooth", type: "in", desc: "360° axial entrance" },
  { id: "twist", name: "Twist", duration: 0.8, easing: "snappy", type: "in", desc: "Diagonal rotational snap" },
  { id: "mask_reveal", name: "Mask Reveal", duration: 0.8, easing: "smooth", type: "in", desc: "Directional clip mask wipe" },
  { id: "circleIris", name: "Circle Iris", duration: 0.8, easing: "smooth", type: "in", desc: "Radial circular aperture" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Gravity descent from top" },
  { id: "blurIn", name: "Blur In", duration: 0.8, easing: "smooth", type: "in", desc: "Gaussian optical de-blur" },
];

const MEDIA_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Cinematic optical dissolve" },
  { id: "grow", name: "Zoom In", duration: 1.0, easing: "smooth", type: "in", desc: "Gentle telephoto zoom entrance" },
  { id: "shrink", name: "Zoom Out", duration: 1.0, easing: "smooth", type: "in", desc: "Wide scale settling into frame" },
  { id: "slideUp", name: "Pan Up", duration: 0.8, easing: "snappy", type: "in", desc: "Upward camera pan reveal" },
  { id: "slideDown", name: "Pan Down", duration: 0.8, easing: "snappy", type: "in", desc: "Downward camera pan reveal" },
  { id: "slideLeft", name: "Pan Left", duration: 0.8, easing: "snappy", type: "in", desc: "Horizontal slide from right" },
  { id: "slideRight", name: "Pan Right", duration: 0.8, easing: "snappy", type: "in", desc: "Horizontal slide from left" },
  { id: "blurIn", name: "Blur In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft focus optical reveal" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Physical descent from top" },
];

const ICON_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Snappy overshoot spring pop" },
  { id: "bounce", name: "Bounce In", duration: 0.8, easing: "bouncy", type: "in", desc: "Elastic vertical bounce" },
  { id: "spin", name: "Spin In", duration: 0.8, easing: "smooth", type: "in", desc: "360° axial glyph spin" },
  { id: "wiggle", name: "Wiggle In", duration: 0.6, easing: "snappy", type: "in", desc: "Playful rotational snap" },
  { id: "pulse", name: "Pulse Accent", duration: 0.8, easing: "smooth", type: "in", desc: "Scale bloom and settle" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Gravity descent from top" },
  { id: "fade", name: "Fade In", duration: 0.6, easing: "smooth", type: "in", desc: "Clean alpha reveal" },
  { id: "grow", name: "Scale Up", duration: 0.6, easing: "bouncy", type: "in", desc: "Scale expansion" },
];

const LINE_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "slideRight", name: "Draw / Slide Right", duration: 0.8, easing: "snappy", type: "in", desc: "Path extension from left" },
  { id: "slideLeft", name: "Slide Left", duration: 0.8, easing: "snappy", type: "in", desc: "Path extension from right" },
  { id: "mask_reveal", name: "Wipe In", duration: 0.8, easing: "smooth", type: "in", desc: "Directional path wipe" },
  { id: "fade", name: "Fade In", duration: 0.6, easing: "smooth", type: "in", desc: "Clean alpha dissolve" },
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Elastic scale snap" },
  { id: "grow", name: "Expand", duration: 0.8, easing: "snappy", type: "in", desc: "Axis extension" },
];

const EXIT_PRESETS: AnimationCatalogPreset[] = [
  { id: "fade", name: "Fade Out", duration: 0.8, easing: "smooth", type: "out", desc: "Smooth dissolve to transparent" },
  { id: "slideDown", name: "Slide Down", duration: 0.8, easing: "snappy", type: "out", desc: "Downward exit trajectory" },
  { id: "slideUp", name: "Slide Up", duration: 0.8, easing: "snappy", type: "out", desc: "Upward ascent out of view" },
  { id: "slideLeft", name: "Slide Left", duration: 0.8, easing: "snappy", type: "out", desc: "Slide out towards left" },
  { id: "slideRight", name: "Slide Right", duration: 0.8, easing: "snappy", type: "out", desc: "Slide out towards right" },
  { id: "pop", name: "Pop Out", duration: 0.6, easing: "snappy", type: "out", desc: "Snappy shrink to zero" },
  { id: "blurIn", name: "Blur Out", duration: 0.8, easing: "smooth", type: "out", desc: "Gaussian dissolution" },
];

const ACTION_PRESETS: AnimationCatalogPreset[] = [
  { id: "pulse", name: "Pulse Accent", duration: 0.8, easing: "smooth", type: "action", desc: "Snappy scale bloom and settle" },
  { id: "bounce", name: "Bounce", duration: 0.8, easing: "bouncy", type: "action", desc: "Vertical hop with elastic damping" },
  { id: "wiggle", name: "Wiggle", duration: 0.6, easing: "snappy", type: "action", desc: "Rotational rocking accent" },
  { id: "shake", name: "Shake", duration: 0.5, easing: "snappy", type: "action", desc: "Rapid horizontal disturbance" },
  { id: "spin", name: "Spin", duration: 1.2, easing: "linear", type: "action", desc: "Axial 360° rotation" },
  { id: "heartbeat", name: "Heartbeat", duration: 1.0, easing: "smooth", type: "action", desc: "Double systolic pump impulse" },
];

// ---------------------------------------------------------------------------
// CUSTOM CATEGORIES: Categorized Property List (Jitter-Style, Zero Preview Boxes)
// ---------------------------------------------------------------------------
export interface CustomCategoryItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  preset: AnimationCatalogPreset;
}

export interface CustomCategoryGroup {
  category: string;
  items: CustomCategoryItem[];
}

export const CUSTOM_CATEGORIES: CustomCategoryGroup[] = [
  {
    category: "Transform",
    items: [
      {
        id: "custom_scale",
        name: "Scale",
        icon: Maximize2,
        preset: { id: "custom_scale", name: "Scale", type: "action", duration: 0.8, easing: "bouncy", params: { scaleAmount: 1.3 } },
      },
      {
        id: "custom_rotate",
        name: "Rotate",
        icon: RotateCw,
        preset: { id: "custom_rotate", name: "Rotate", type: "action", duration: 0.8, easing: "snappy", params: { rotationDegrees: 90 } },
      },
      {
        id: "custom_move",
        name: "Move",
        icon: Move,
        preset: { id: "custom_move", name: "Move", type: "action", duration: 0.8, easing: "snappy", params: { distance: 60, direction: "up" } },
      },
    ],
  },
  {
    category: "Style",
    items: [
      {
        id: "custom_opacity",
        name: "Opacity",
        icon: SunMedium,
        preset: { id: "custom_opacity", name: "Opacity", type: "action", duration: 0.8, easing: "smooth", params: { opacity: 0 } },
      },
      {
        id: "custom_color",
        name: "Color",
        icon: Palette,
        preset: { id: "custom_color", name: "Color", type: "action", duration: 0.8, easing: "smooth", params: { color: "#6d28d9" } },
      },
      {
        id: "custom_shadow",
        name: "Shadow",
        icon: BoxSelect,
        preset: { id: "custom_shadow", name: "Shadow", type: "action", duration: 0.8, easing: "smooth", params: { shadowBlur: 16, shadowDistance: 8, shadowColor: "#000000" } },
      },
    ],
  },
  {
    category: "Effects",
    items: [
      {
        id: "custom_blur",
        name: "Layer Blur",
        icon: Flame,
        preset: { id: "custom_blur", name: "Layer Blur", type: "action", duration: 0.8, easing: "smooth", params: { blur: 12 } },
      },
      {
        id: "custom_backdrop_blur",
        name: "Background Blur",
        icon: CircleDot,
        preset: { id: "custom_backdrop_blur", name: "Background Blur", type: "action", duration: 0.8, easing: "smooth", params: { backdropBlur: 16 } },
      },
      {
        id: "custom_glass",
        name: "Glass",
        icon: Shield,
        preset: { id: "custom_glass", name: "Glass", type: "action", duration: 0.8, easing: "smooth", params: { backdropBlur: 20, opacity: 0.8 } },
      },
    ],
  },
  {
    category: "Other",
    items: [
      {
        id: "custom_visibility",
        name: "Hide / Show",
        icon: EyeOff,
        preset: { id: "custom_visibility", name: "Hide / Show", type: "action", duration: 0.4, easing: "linear", params: { visibility: "hide" } },
      },
      {
        id: "custom_resize",
        name: "Resize",
        icon: ArrowLeftRight,
        preset: { id: "custom_resize", name: "Resize", type: "action", duration: 0.8, easing: "snappy", params: { widthDelta: 50, heightDelta: 50 } },
      },
      {
        id: "custom_morph",
        name: "Morph",
        icon: Shapes,
        preset: { id: "custom_morph", name: "Morph", type: "action", duration: 0.8, easing: "smooth", params: { morphAmount: 1 } },
      },
      {
        id: "custom_radius",
        name: "Corner Radius",
        icon: CornerUpRight,
        preset: { id: "custom_radius", name: "Corner Radius", type: "action", duration: 0.8, easing: "snappy", params: { radius: 24 } },
      },
      {
        id: "custom_stroke",
        name: "Stroke",
        icon: Square,
        preset: { id: "custom_stroke", name: "Stroke", type: "action", duration: 0.8, easing: "snappy", params: { strokeWidth: 4, strokeColor: "#6d28d9" } },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// CONTINUOUS EFFECTS (Looping Ambient Motions)
// ---------------------------------------------------------------------------
const EFFECTS_PRESETS: { id: string; name: string; desc: string; preset: AnimationCatalogPreset }[] = [
  {
    id: "pulse",
    name: "Pulse",
    desc: "Continuous scale heartbeat loop",
    preset: { id: "pulse", name: "Pulse Loop", type: "emphasis", duration: 1.2, easing: "smooth", params: { loop: true } },
  },
  {
    id: "float",
    name: "Floating",
    desc: "Smooth sinusoidal hover loop",
    preset: { id: "float", name: "Floating Loop", type: "emphasis", duration: 2.0, easing: "smooth", params: { loop: true, distance: 20 } },
  },
  {
    id: "wiggle",
    name: "Wiggle",
    desc: "Playful pendulum oscillation loop",
    preset: { id: "wiggle", name: "Wiggle Loop", type: "emphasis", duration: 0.8, easing: "snappy", params: { loop: true } },
  },
  {
    id: "spin",
    name: "Continuous Spin",
    desc: "Infinite 360° axial rotation loop",
    preset: { id: "spin", name: "Spin Loop", type: "emphasis", duration: 2.5, easing: "linear", params: { loop: true } },
  },
  {
    id: "heartbeat",
    name: "Heartbeat",
    desc: "Double systolic pump impulse",
    preset: { id: "heartbeat", name: "Heartbeat Loop", type: "emphasis", duration: 1.0, easing: "smooth", params: { loop: true } },
  },
  {
    id: "breathe",
    name: "Breathing",
    desc: "Slow hypnotic scale & opacity rhythm",
    preset: { id: "breathe", name: "Breathing Loop", type: "emphasis", duration: 3.0, easing: "smooth", params: { loop: true } },
  },
  {
    id: "shake",
    name: "Shake",
    desc: "High-frequency vibration tremor",
    preset: { id: "shake", name: "Shake Loop", type: "emphasis", duration: 0.4, easing: "snappy", params: { loop: true } },
  },
];

// ---------------------------------------------------------------------------
// FULL PREVIEW WINDOW CARD (Animation plays all the time, smaller name outside)
// ---------------------------------------------------------------------------
const AnimationCard: React.FC<{
  preset: AnimationCatalogPreset;
  layerType?: string;
  isSelected?: boolean;
  onApply: (preset: AnimationCatalogPreset) => void;
}> = ({ preset, layerType, isSelected = false, onApply }) => {
  const isText = layerType === "text" || layerType === "chunk";
  const isMedia = layerType === "image" || layerType === "video";
  const isIcon = layerType === "icon";
  const isLine = layerType === "line";

  const getAnimationName = (presetId: string) => {
    switch (presetId) {
      case "fade": return "anim-preview-fade";
      case "slideUp": return "anim-preview-slideUp";
      case "slideDown": return "anim-preview-slideDown";
      case "slideLeft": return "anim-preview-slideLeft";
      case "slideRight": return "anim-preview-slideRight";
      case "pop": return "anim-preview-pop";
      case "grow": return "anim-preview-grow";
      case "shrink": return "anim-preview-shrink";
      case "spin": return "anim-preview-spin";
      case "twist": return "anim-preview-twist";
      case "blurIn": return "anim-preview-blurIn";
      case "dropIn": return "anim-preview-dropIn";
      case "pulse": return "anim-preview-pulse";
      case "bounce": return "anim-preview-bounce";
      case "wiggle": return "anim-preview-wiggle";
      case "float": return "anim-preview-float";
      case "heartbeat": return "anim-preview-heartbeat";
      case "shake": return "anim-preview-shake";
      case "breathe": return "anim-preview-breathe";
      case "typewriter": return "anim-preview-typewriter";
      case "baselineReveal": return "anim-preview-baseline";
      case "mask_reveal": return "anim-preview-maskReveal";
      case "circleIris": return "anim-preview-circleIris";
      case "custom_move": return "anim-preview-slideUp";
      case "custom_scale": return "anim-preview-grow";
      case "custom_rotate": return "anim-preview-spin";
      case "custom_opacity": return "anim-preview-fade";
      case "custom_color": return "anim-preview-color";
      case "custom_radius": return "anim-preview-radius";
      default: return "anim-preview-pop";
    }
  };

  // Preview plays continuously all the time!
  const animStyle: React.CSSProperties = {
    animation: `${getAnimationName(preset.id)} 1.5s ease-in-out infinite`,
  };

  return (
    <div
      onClick={() => onApply(preset)}
      className="flex flex-col items-center group cursor-pointer select-none"
      title={preset.desc || preset.name}
    >
      {/* The full preview window box */}
      <div
        className={cn(
          "w-full h-[76px] rounded-xl flex items-center justify-center relative overflow-hidden transition-all shadow-2xs",
          isSelected
            ? "bg-[#ede9fe]/40 border-2 border-[#6d28d9] ring-2 ring-[#6d28d9]/25"
            : "bg-[#f8f8fa] group-hover:bg-[#f0f0f4] border border-[#e5e5e7] group-hover:border-[#6d28d9]"
        )}
      >
        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#6d28d9] text-white flex items-center justify-center shadow-xs z-10 animate-in zoom-in-50 duration-150">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}

        {isText ? (
          <span
            style={animStyle}
            className={cn(
              "font-serif font-extrabold text-[18px] text-[#18181b] group-hover:text-[#6d28d9] transition-colors select-none",
              preset.id === "custom_radius" && "px-1.5 py-0.5 border border-current"
            )}
          >
            Ag
          </span>
        ) : isIcon ? (
          <Sparkles
            style={animStyle}
            className="w-5 h-5 text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          />
        ) : isMedia ? (
          <ImageIcon
            style={animStyle}
            className="w-5 h-5 text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          />
        ) : isLine ? (
          <div
            style={animStyle}
            className="w-7 h-1 rounded-full bg-[#71717a] group-hover:bg-[#6d28d9] transition-colors"
          />
        ) : (
          <div
            style={animStyle}
            className="h-5 w-5 rounded-[4px] bg-[#71717a] group-hover:bg-[#6d28d9] transition-colors"
          />
        )}
      </div>

      {/* Smaller name outside the box */}
      <span
        className={cn(
          "mt-1.5 text-[11px] font-medium transition-colors text-center truncate max-w-full px-0.5",
          isSelected
            ? "text-[#6d28d9] font-bold"
            : "text-[#71717a] group-hover:text-[#18181b]"
        )}
      >
        {preset.name}
      </span>
    </div>
  );
};

export const AnimationCatalogSheet: React.FC<AnimationCatalogSheetProps> = ({
  isOpen,
  onClose,
  targetLayer,
  selectedClipId,
  onApplyPreset,
}) => {
  const [activeTab, setActiveTab] = useState<"PRESETS" | "CUSTOM" | "EFFECTS">("PRESETS");
  const [filterCategory, setFilterCategory] = useState<"all" | "in" | "action" | "out">("all");

  const isText = targetLayer?.type === "text" || targetLayer?.type === "chunk";

  // Current clip lookup to support pre-selection & clean replacement
  const currentClip = targetLayer && selectedClipId
    ? getLayerClips(targetLayer).find((c) => c.id === selectedClipId)
    : null;

  // Auto-sync tab and category when opened to change an existing clip
  useEffect(() => {
    if (!isOpen) return;
    if (!currentClip) {
      setActiveTab("PRESETS");
      setFilterCategory("all");
      return;
    }

    if (
      currentClip.loop ||
      currentClip.type === "emphasis" ||
      ["float", "breathe"].includes(currentClip.preset)
    ) {
      setActiveTab("EFFECTS");
    } else if (
      currentClip.preset.startsWith("custom_") ||
      CUSTOM_CATEGORIES.some((g) => g.items.some((i) => i.id === currentClip.preset))
    ) {
      setActiveTab("CUSTOM");
    } else {
      setActiveTab("PRESETS");
      if (currentClip.type === "in") setFilterCategory("in");
      else if (currentClip.type === "out") setFilterCategory("out");
      else if (currentClip.type === "action") setFilterCategory("action");
      else setFilterCategory("all");
    }
  }, [isOpen, selectedClipId, currentClip?.id]);

  // Helper to determine if a preset card matches the currently selected clip
  const isPresetSelected = (p: AnimationCatalogPreset) => {
    if (!currentClip) return false;
    if (currentClip.preset === p.id) {
      if (p.type && currentClip.type && p.type !== currentClip.type) {
        return false;
      }
      return true;
    }
    return false;
  };

  // Escape hotkey closes sheet
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const layerType = targetLayer?.type;
  const entrancePresets =
    layerType === "text" || layerType === "chunk"
      ? TEXT_ENTRANCE_PRESETS
      : layerType === "image" || layerType === "video"
      ? MEDIA_ENTRANCE_PRESETS
      : layerType === "icon"
      ? ICON_ENTRANCE_PRESETS
      : layerType === "line"
      ? LINE_ENTRANCE_PRESETS
      : SHAPE_ENTRANCE_PRESETS;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 bg-white flex flex-col select-none text-[#18181b] shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-2 duration-150"
    >
      {/* Scoped CSS Keyframes for live thumbnail previews */}
      <style>{`
        @keyframes anim-preview-fade { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
        @keyframes anim-preview-slideUp { 0%, 100% { transform: translateY(12px); opacity: 0.15; } 50% { transform: translateY(0); opacity: 1; } }
        @keyframes anim-preview-slideDown { 0%, 100% { transform: translateY(-12px); opacity: 0.15; } 50% { transform: translateY(0); opacity: 1; } }
        @keyframes anim-preview-slideLeft { 0%, 100% { transform: translateX(12px); opacity: 0.15; } 50% { transform: translateX(0); opacity: 1; } }
        @keyframes anim-preview-slideRight { 0%, 100% { transform: translateX(-12px); opacity: 0.15; } 50% { transform: translateX(0); opacity: 1; } }
        @keyframes anim-preview-pop { 0%, 100% { transform: scale(0.35); opacity: 0.2; } 50% { transform: scale(1.22); opacity: 1; } 70% { transform: scale(0.96); opacity: 1; } 85% { transform: scale(1); opacity: 1; } }
        @keyframes anim-preview-grow { 0%, 100% { transform: scale(0.35); opacity: 0.3; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes anim-preview-shrink { 0%, 100% { transform: scale(1.4); opacity: 0.3; } 50% { transform: scale(0.7); opacity: 1; } }
        @keyframes anim-preview-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes anim-preview-twist { 0%, 100% { transform: rotate(-30deg) scale(0.6); opacity: 0.2; } 50% { transform: rotate(10deg) scale(1.1); opacity: 1; } 70% { transform: rotate(0deg) scale(1); opacity: 1; } }
        @keyframes anim-preview-blurIn { 0%, 100% { filter: blur(5px); opacity: 0.2; } 50% { filter: blur(0px); opacity: 1; } }
        @keyframes anim-preview-dropIn { 0%, 100% { transform: translateY(-22px); opacity: 0; } 50% { transform: translateY(0); opacity: 1; } 65% { transform: translateY(-5px); } 80% { transform: translateY(0); } }
        @keyframes anim-preview-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
        @keyframes anim-preview-bounce { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-16px); } 60% { transform: translateY(0); } 75% { transform: translateY(-6px); } 90% { transform: translateY(0); } }
        @keyframes anim-preview-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-16deg); } 75% { transform: rotate(16deg); } }
        @keyframes anim-preview-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes anim-preview-heartbeat { 0%, 100% { transform: scale(1); } 15% { transform: scale(1.28); } 30% { transform: scale(1.05); } 45% { transform: scale(1.2); } }
        @keyframes anim-preview-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
        @keyframes anim-preview-breathe { 0%, 100% { transform: scale(0.88); opacity: 0.55; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes anim-preview-typewriter { 0% { clip-path: inset(0 100% 0 0); } 50% { clip-path: inset(0 0% 0 0); } 80% { clip-path: inset(0 0% 0 0); } 100% { clip-path: inset(0 100% 0 0); } }
        @keyframes anim-preview-baseline { 0%, 100% { transform: translateY(100%); opacity: 0; } 50% { transform: translateY(0); opacity: 1; } }
        @keyframes anim-preview-maskReveal { 0%, 100% { clip-path: inset(100% 0 0 0); } 50% { clip-path: inset(0 0 0 0); } }
        @keyframes anim-preview-circleIris { 0%, 100% { clip-path: circle(0% at 50% 50%); } 50% { clip-path: circle(75% at 50% 50%); } }
        @keyframes anim-preview-color { 0%, 100% { color: #18181b; background-color: #71717a; } 50% { color: #6d28d9; background-color: #6d28d9; } }
        @keyframes anim-preview-radius { 0%, 100% { border-radius: 2px; } 50% { border-radius: 12px; } }
      `}</style>

      {/* ROW 1: Dedicated Header with Back button, Title & Close */}
      <div className="h-12 px-3 border-b border-[#e5e5e7] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f6] transition-colors cursor-pointer"
            title="Back to inspector"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-[#18181b]">
            {selectedClipId ? "Change Animation" : "New Animation"}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f6] transition-colors cursor-pointer"
          title="Close sheet"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ROW 2: Dedicated Segmented Switcher [ Presets | Custom | Effects ] spanning full width */}
      <div className="p-2.5 border-b border-[#e5e5e7] shrink-0 bg-[#fafafc]">
        <div className="grid grid-cols-3 gap-1 bg-[#ebebef] p-1 rounded-lg">
          {(["PRESETS", "CUSTOM", "EFFECTS"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-1.5 text-[11px] font-bold rounded-md transition-all text-center flex items-center justify-center cursor-pointer",
                activeTab === tab
                  ? "bg-white text-[#18181b] shadow-xs"
                  : "text-[#71717a] hover:text-[#18181b]"
              )}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: PRESETS */}
      {activeTab === "PRESETS" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-Filter Pills (All, In, Action, Out) */}
          <div className="px-3 py-2 border-b border-[#e5e5e7] flex items-center gap-1 shrink-0 bg-white overflow-x-auto">
            {(
              [
                { id: "all", label: "All" },
                { id: "in", label: "In" },
                { id: "action", label: "Action" },
                { id: "out", label: "Out" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterCategory(f.id)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors cursor-pointer shrink-0",
                  filterCategory === f.id
                    ? "bg-[#6d28d9] text-white"
                    : "bg-[#f4f4f6] text-[#71717a] hover:text-[#18181b]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Entrance Group */}
            {(filterCategory === "all" || filterCategory === "in") && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>Entrance (In)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {entrancePresets.map((p) => (
                    <AnimationCard
                      key={`in-${p.id}`}
                      preset={p}
                      layerType={layerType}
                      isSelected={isPresetSelected(p)}
                      onApply={onApplyPreset}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Group */}
            {(filterCategory === "all" || filterCategory === "action") && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                  <Zap className="h-3 w-3 text-amber-600" />
                  <span>Action / Loop</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACTION_PRESETS.map((p) => (
                    <AnimationCard
                      key={`action-${p.id}`}
                      preset={p}
                      layerType={layerType}
                      isSelected={isPresetSelected(p)}
                      onApply={onApplyPreset}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Exit Group */}
            {(filterCategory === "all" || filterCategory === "out") && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                  <ArrowLeft className="h-3 w-3 text-rose-600 rotate-180" />
                  <span>Exit (Out)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {EXIT_PRESETS.map((p) => (
                    <AnimationCard
                      key={`out-${p.id}`}
                      preset={p}
                      layerType={layerType}
                      isSelected={isPresetSelected(p)}
                      onApply={onApplyPreset}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM CHANNELS (Clean Jitter Categorized List, ZERO Preview Cards) */}
      {activeTab === "CUSTOM" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {CUSTOM_CATEGORIES.map((section, sIdx) => (
            <div key={section.category} className={cn(sIdx > 0 && "border-t border-[#e5e5e7] pt-3")}>
              <h3 className="text-[13px] font-bold text-[#18181b] tracking-tight px-2 pb-1.5">
                {section.category}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = isPresetSelected(item.preset);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onApplyPreset(item.preset)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group",
                        isSelected
                          ? "bg-[#ede9fe]/60 text-[#6d28d9]"
                          : "hover:bg-[#f4f4f6] text-[#18181b]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 text-[#7c3aed] shrink-0" />
                        <span
                          className={cn(
                            "text-[13px] truncate",
                            isSelected ? "font-bold text-[#6d28d9]" : "font-medium text-[#18181b]"
                          )}
                        >
                          {item.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#6d28d9] shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: EFFECTS (Continuous Loops) */}
      {activeTab === "EFFECTS" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="text-[11px] text-[#71717a] pb-0.5 leading-snug">
            Continuous ambient loops and physical oscillations:
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {EFFECTS_PRESETS.map((eff) => (
              <AnimationCard
                key={eff.id}
                preset={eff.preset}
                layerType={layerType}
                isSelected={isPresetSelected(eff.preset)}
                onApply={onApplyPreset}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
