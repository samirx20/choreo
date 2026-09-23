import React, { useState, useEffect, useMemo } from "react";
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
import {
  canHaveBorderRadius,
  isVectorLine,
  isCircle,
  isStar,
  isPolygon,
  isMedia as isMediaLayer,
  canHaveTrimPath,
} from "@/utils/layerCapabilities";
import {
  generateStarPoints,
  generatePolygonPoints,
} from "@/components/canvas/renderers/ShapeRenderer";
import { useProjectStore } from "@/store/useProjectStore";

function getLayerIcon(layer: Layer) {
  if (layer.type === "text" || layer.type === "chunk") return Type;
  if (layer.type === "image" || layer.type === "video") return ImageIcon;
  if (layer.type === "line") return CornerUpRight;
  if (layer.type === "shape" || layer.type === "polygon") {
    const st = (layer as any).shapeType;
    if (st === "circle") return CircleDot;
    if (st === "star") return Sparkles;
    if (st === "polygon" || layer.type === "polygon") return Shapes;
    if (st === "arrow") return CornerUpRight;
    return Square;
  }
  return Square;
}

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
// PRESETS CATALOG: Specialized for Text vs Shapes vs Media vs Lines
// ---------------------------------------------------------------------------
export const TEXT_HEADLINE_PRESETS: AnimationCatalogPreset[] = [
  { id: "baselineRise", name: "Baseline Rise", duration: 0.8, easing: "snappy", type: "in", desc: "Unmasks upward from font baseline without clipping descenders" },
  { id: "blurFocusPop", name: "Blur Focus Pop", duration: 0.8, easing: "smooth", type: "in", desc: "Rack focus from optical blur into crisp sharpness", params: { blurRadius: 20 } },
  { id: "trackingExpansion", name: "Tracking Drift", duration: 0.9, easing: "smooth", type: "in", desc: "Cinematic typographic letter-spacing expansion" },
  { id: "elasticScalePop", name: "Elastic Pop", duration: 0.7, easing: "elastic", type: "in", desc: "Snappy spring pop with harmonic recoil" },
  { id: "textShimmer", name: "Specular Shimmer", duration: 1.0, easing: "smooth", type: "in", desc: "Luminous Keynote specular light sweep across glyphs" },
  { id: "slide", name: "Slide", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic directional entrance", params: { direction: "up", distance: 60 } },
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft optical alpha reveal" },
];

export const TEXT_PARAGRAPH_PRESETS: AnimationCatalogPreset[] = [
  { id: "wordCascade", name: "Word Cascade", duration: 1.0, easing: "snappy", type: "in", desc: "Rhythmic word-by-word spring stagger entrance", params: { splitBy: "word", staggerDelay: 0.08 } },
  { id: "lineReveal", name: "Line Reveal", duration: 1.0, easing: "snappy", type: "in", desc: "Editorial line-by-line unmasking from below", params: { splitBy: "line", staggerDelay: 0.14 } },
  { id: "typewriter", name: "Typewriter", duration: 1.2, easing: "linear", type: "in", desc: "Characters reveal sequentially with caret cursor", params: { splitBy: "character", staggerDelay: 0.04 } },
  { id: "highlightDraw", name: "Highlight Draw", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic marker accent drawing behind copy" },
  { id: "slide", name: "Slide", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic directional entrance", params: { direction: "up", distance: 60 } },
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft optical alpha reveal" },
];

export const TEXT_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  ...TEXT_HEADLINE_PRESETS,
  ...TEXT_PARAGRAPH_PRESETS.filter((p) => p.id !== "slide" && p.id !== "fade"),
];

export const SHAPE_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "cardSettlePop", name: "Card Settle", duration: 0.8, easing: "snappy", type: "in", desc: "Overshoot scale with physical spring settle" },
  { id: "elevationRise", name: "Elevation Rise", duration: 0.8, easing: "smooth", type: "in", desc: "Rises into frame with expanding physical elevation shadow" },
  { id: "glassIris", name: "Glass Iris", duration: 0.8, easing: "smooth", type: "in", desc: "Optical backdrop blur and frosted glass reveal" },
  { id: "drawOn", name: "Draw Path (Trim)", duration: 0.8, easing: "snappy", type: "in", desc: "Stroke reveals along perimeter contour" },
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Snappy overshoot scale" },
  { id: "slide", name: "Slide", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic directional entrance", params: { direction: "up", distance: 60 } },
  { id: "wipe", name: "Wipe Mask", duration: 0.8, easing: "smooth", type: "in", desc: "Directional clip mask wipe", params: { direction: "up" } },
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft optical alpha reveal" },
  { id: "grow", name: "Grow", duration: 0.8, easing: "bouncy", type: "in", desc: "Smooth scale expansion" },
  { id: "shrink", name: "Shrink", duration: 0.8, easing: "smooth", type: "in", desc: "Scale compression into frame" },
  { id: "spin", name: "Spin In", duration: 1.0, easing: "smooth", type: "in", desc: "360° axial entrance" },
  { id: "twist", name: "Twist", duration: 0.8, easing: "snappy", type: "in", desc: "Diagonal rotational snap" },
  { id: "circleIris", name: "Circle Iris", duration: 0.8, easing: "smooth", type: "in", desc: "Radial circular aperture" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Gravity descent from top" },
  { id: "blurIn", name: "Blur In", duration: 0.8, easing: "smooth", type: "in", desc: "Gaussian optical de-blur" },
];

export const MEDIA_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "kenBurns", name: "Ken Burns Drift", duration: 2.0, easing: "smooth", type: "in", desc: "Cinematic slow camera drift and telephoto pan" },
  { id: "focusPull", name: "Rack Focus Pull", duration: 1.0, easing: "smooth", type: "in", desc: "Starts in optical blur and pulls into crisp sharpness", params: { blurRadius: 16 } },
  { id: "fade", name: "Fade In", duration: 0.8, easing: "smooth", type: "in", desc: "Cinematic optical dissolve" },
  { id: "grow", name: "Zoom In", duration: 1.0, easing: "smooth", type: "in", desc: "Gentle telephoto zoom entrance" },
  { id: "shrink", name: "Zoom Out", duration: 1.0, easing: "smooth", type: "in", desc: "Wide scale settling into frame" },
  { id: "slide", name: "Pan / Slide", duration: 0.8, easing: "snappy", type: "in", desc: "Directional camera pan reveal", params: { direction: "up", distance: 60 } },
  { id: "wipe", name: "Wipe Reveal", duration: 0.8, easing: "smooth", type: "in", desc: "Directional edge wipe unmask", params: { direction: "left" } },
  { id: "blurIn", name: "Blur In", duration: 0.8, easing: "smooth", type: "in", desc: "Soft focus optical reveal" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Physical descent from top" },
];

export const ICON_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "iconPop", name: "Rotational Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Snappy overshoot scale pop with playful ±15° rotational kick" },
  { id: "stampSettle", name: "Stamp Settle", duration: 0.7, easing: "bouncy", type: "in", desc: "Descent from above with snappy elastic contact dampening" },
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Snappy overshoot spring pop" },
  { id: "bounce", name: "Bounce In", duration: 0.8, easing: "bouncy", type: "in", desc: "Elastic vertical bounce" },
  { id: "spin", name: "Spin In", duration: 0.8, easing: "smooth", type: "in", desc: "360° axial glyph spin" },
  { id: "wiggle", name: "Wiggle In", duration: 0.6, easing: "snappy", type: "in", desc: "Playful rotational snap" },
  { id: "pulse", name: "Pulse Accent", duration: 0.8, easing: "smooth", type: "in", desc: "Scale bloom and settle" },
  { id: "dropIn", name: "Drop In", duration: 0.8, easing: "bouncy", type: "in", desc: "Gravity descent from top" },
  { id: "fade", name: "Fade In", duration: 0.6, easing: "smooth", type: "in", desc: "Clean alpha reveal" },
  { id: "grow", name: "Scale Up", duration: 0.6, easing: "bouncy", type: "in", desc: "Scale expansion" },
];

export const LINE_ENTRANCE_PRESETS: AnimationCatalogPreset[] = [
  { id: "drawOn", name: "Draw Path (Trim)", duration: 0.8, easing: "snappy", type: "in", desc: "Vector path draws sequentially along stroke" },
  { id: "arrowShoot", name: "Arrow Shoot", duration: 0.8, easing: "snappy", type: "in", desc: "Kinetic directional shoot advancing along vector" },
  { id: "slide", name: "Slide / Extend", duration: 0.8, easing: "snappy", type: "in", desc: "Directional path extension", params: { direction: "right", distance: 60 } },
  { id: "wipe", name: "Wipe In", duration: 0.8, easing: "smooth", type: "in", desc: "Directional path unmask", params: { direction: "right" } },
  { id: "fade", name: "Fade In", duration: 0.6, easing: "smooth", type: "in", desc: "Clean alpha dissolve" },
  { id: "pop", name: "Pop", duration: 0.6, easing: "bouncy", type: "in", desc: "Elastic scale snap" },
  { id: "grow", name: "Expand", duration: 0.8, easing: "snappy", type: "in", desc: "Axis extension" },
];

export const EXIT_PRESETS: AnimationCatalogPreset[] = [
  { id: "morph", name: "Morph into...", duration: 0.8, easing: "smooth", type: "out", desc: "Dematerializes and reconstructs into another element" },
  { id: "fade", name: "Fade Out", duration: 0.8, easing: "smooth", type: "out", desc: "Smooth dissolve to transparent" },
  { id: "slide", name: "Slide Out", duration: 0.8, easing: "snappy", type: "out", desc: "Directional exit trajectory", params: { direction: "down", distance: 60 } },
  { id: "pop", name: "Pop Out", duration: 0.6, easing: "snappy", type: "out", desc: "Snappy shrink to zero" },
  { id: "blurIn", name: "Blur Out", duration: 0.8, easing: "smooth", type: "out", desc: "Gaussian dissolution" },
];

export const ACTION_PRESETS: AnimationCatalogPreset[] = [
  { id: "pulse", name: "Pulse Accent", duration: 0.8, easing: "smooth", type: "action", desc: "Snappy scale bloom and settle" },
  { id: "dashFlow", name: "Dash Flow", duration: 1.5, easing: "linear", type: "action", desc: "Continuous animated stroke dash offset flow" },
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
        id: "custom_stroke",
        name: "Stroke",
        icon: Square,
        preset: { id: "custom_stroke", name: "Stroke", type: "action", duration: 0.8, easing: "snappy", params: { strokeWidth: 4, strokeColor: "#6d28d9" } },
      },
      {
        id: "custom_trim",
        name: "Trim Path",
        icon: Square,
        preset: { id: "custom_trim", name: "Trim Path", type: "action", duration: 0.8, easing: "snappy", params: { trimStart: 0, trimEnd: 100 } },
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
// ADAPTIVE PREVIEW SHAPE (Option C: Dynamic Layer Echo)
// Renders the exact geometry of the active element with unified studio tile styling.
// ---------------------------------------------------------------------------
interface AdaptivePreviewShapeProps {
  preset: AnimationCatalogPreset;
  targetLayer?: Layer | null;
  layerType?: string;
  animStyle: React.CSSProperties;
}

const AdaptivePreviewShape: React.FC<AdaptivePreviewShapeProps> = ({
  preset,
  targetLayer,
  layerType,
  animStyle,
}) => {
  const isText =
    targetLayer?.type === "text" ||
    targetLayer?.type === "chunk" ||
    layerType === "text" ||
    layerType === "chunk";
  const isMedia =
    (targetLayer && isMediaLayer(targetLayer)) ||
    layerType === "image" ||
    layerType === "video";
  const isIcon = targetLayer?.type === "icon" || layerType === "icon";
  const isLine = targetLayer ? isVectorLine(targetLayer) : layerType === "line";
  const isCirc = targetLayer ? isCircle(targetLayer) : false;
  const isSt = targetLayer ? isStar(targetLayer) : false;
  const isPoly = targetLayer ? isPolygon(targetLayer) : false;

  // 1. Text Elements ("Ag" specimen)
  if (isText) {
    return (
      <div className="relative flex items-center justify-center">
        {preset.id === "highlightDraw" && (
          <div
            className="absolute inset-x-[-4px] bottom-0.5 h-[5px] bg-[#6d28d9]/25 rounded-full"
            style={{ animation: "anim-preview-highlightDraw 1.8s ease-in-out infinite" }}
          />
        )}
        <span
          style={animStyle}
          className={cn(
            "font-serif font-extrabold text-[19px] text-[#27272a] group-hover:text-[#6d28d9] transition-colors select-none tracking-tight",
            preset.id === "custom_radius" && "px-1.5 py-0.5 border border-current rounded-xs"
          )}
        >
          Ag
        </span>
      </div>
    );
  }

  // 2. Vector Lines & Arrows
  if (isLine) {
    if (preset.id === "arrowShoot") {
      return (
        <svg className="w-8 h-4 overflow-visible" viewBox="0 0 32 16">
          <line
            x1="2"
            y1="8"
            x2="24"
            y2="8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              strokeDasharray: 24,
              animation: "anim-preview-arrowStem 1.8s ease-in-out infinite",
            }}
          />
          <polyline
            points="18,3 25,8 18,13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              animation: "anim-preview-arrowHead 1.8s ease-in-out infinite",
            }}
          />
        </svg>
      );
    }

    if (preset.id === "dashFlow") {
      return (
        <svg className="w-8 h-3 overflow-visible" viewBox="0 0 32 8">
          <line
            x1="2"
            y1="4"
            x2="30"
            y2="4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 3"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              animation: "anim-preview-dashFlow 1.2s linear infinite",
            }}
          />
        </svg>
      );
    }

    if (preset.id === "drawOn" || preset.id === "custom_trim") {
      return (
        <svg className="w-8 h-3 overflow-visible" viewBox="0 0 32 8">
          <line
            x1="2"
            y1="4"
            x2="30"
            y2="4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.2"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          />
          <line
            x1="2"
            y1="4"
            x2="30"
            y2="4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength="100"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              strokeDasharray: 100,
              animation: "anim-preview-drawOn-stroke 1.8s ease-in-out infinite",
            }}
          />
        </svg>
      );
    }

    return (
      <div
        style={animStyle}
        className="w-7 h-1 rounded-full bg-[#71717a] group-hover:bg-[#6d28d9] transition-colors"
      />
    );
  }

  // 3. Icons
  if (isIcon) {
    return (
      <Sparkles
        style={animStyle}
        className="w-5 h-5 text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
      />
    );
  }

  // 4. Media (Image / Video)
  if (isMedia) {
    return (
      <div
        style={animStyle}
        className="w-7 h-5 rounded-[4px] bg-[#f4f4f7] border border-[#d4d4d8] group-hover:bg-[#ede9fe] group-hover:border-[#7c3aed] flex items-center justify-center transition-colors shadow-2xs"
      >
        <ImageIcon className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#6d28d9] transition-colors" />
      </div>
    );
  }

  // 5. Shapes: Circle, Star, Polygon, or Rectangle/Frame
  const isTrimPreset = preset.id === "drawOn" || preset.id === "custom_trim";
  const isGlass = preset.id === "glassIris" || preset.id === "custom_glass";

  // 5A. Circle
  if (isCirc) {
    if (isTrimPreset) {
      return (
        <svg className="w-6 h-6 overflow-visible -rotate-90 origin-center" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.2"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength="100"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              strokeDasharray: 100,
              animation: "anim-preview-drawOn-stroke 1.8s ease-in-out infinite",
            }}
          />
        </svg>
      );
    }

    return (
      <div
        style={animStyle}
        className={cn(
          "w-6 h-6 rounded-full transition-all",
          isGlass
            ? "backdrop-blur-md bg-white/60 border border-white/90 shadow-2xs"
            : "bg-[#f4f4f7] border border-[#d4d4d8] group-hover:bg-[#ede9fe] group-hover:border-[#7c3aed] group-hover:text-[#6d28d9]"
        )}
      />
    );
  }

  // 5B. Star
  if (isSt) {
    const starPts = generateStarPoints(5, 0.42);
    if (isTrimPreset) {
      return (
        <svg className="w-6 h-6 overflow-visible" viewBox="0 0 100 100">
          <polygon
            points={starPts}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeOpacity="0.2"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          />
          <polygon
            points={starPts}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="100"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              strokeDasharray: 100,
              animation: "anim-preview-drawOn-stroke 1.8s ease-in-out infinite",
            }}
          />
        </svg>
      );
    }

    return (
      <div style={animStyle} className="w-6 h-6 flex items-center justify-center">
        <svg className="w-6 h-6 overflow-visible" viewBox="0 0 100 100">
          <polygon
            points={starPts}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            className="text-[#a1a1aa] group-hover:text-[#7c3aed] transition-colors"
          />
        </svg>
      </div>
    );
  }

  // 5C. Polygon / Triangle
  if (isPoly) {
    const sides = (targetLayer as any)?.sides ?? ((targetLayer as any)?.shapeType === "triangle" ? 3 : 6);
    const polyPts = generatePolygonPoints(sides);
    if (isTrimPreset) {
      return (
        <svg className="w-6 h-6 overflow-visible" viewBox="0 0 100 100">
          <polygon
            points={polyPts}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeOpacity="0.2"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          />
          <polygon
            points={polyPts}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="100"
            className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
            style={{
              strokeDasharray: 100,
              animation: "anim-preview-drawOn-stroke 1.8s ease-in-out infinite",
            }}
          />
        </svg>
      );
    }

    return (
      <div style={animStyle} className="w-6 h-6 flex items-center justify-center">
        <svg className="w-6 h-6 overflow-visible" viewBox="0 0 100 100">
          <polygon
            points={polyPts}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            className="text-[#a1a1aa] group-hover:text-[#7c3aed] transition-colors"
          />
        </svg>
      </div>
    );
  }

  // 5D. Rectangle / Frame / General Shape Default
  if (isTrimPreset) {
    return (
      <svg className="w-6 h-6 overflow-visible" viewBox="0 0 24 24">
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.2"
          className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
        />
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength="100"
          className="text-[#71717a] group-hover:text-[#6d28d9] transition-colors"
          style={{
            strokeDasharray: 100,
            animation: "anim-preview-drawOn-stroke 1.8s ease-in-out infinite",
          }}
        />
      </svg>
    );
  }

  return (
    <div
      style={animStyle}
      className={cn(
        "w-6 h-6 transition-all",
        isGlass
          ? "rounded-[5px] backdrop-blur-md bg-white/60 border border-white/90 shadow-2xs"
          : "rounded-[5px] bg-[#f4f4f7] border border-[#d4d4d8] group-hover:bg-[#ede9fe] group-hover:border-[#7c3aed]",
        preset.id === "circleIris" && "rounded-full"
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// FULL PREVIEW WINDOW CARD (Animation plays all the time, smaller name outside)
// ---------------------------------------------------------------------------
const AnimationCard: React.FC<{
  preset: AnimationCatalogPreset;
  targetLayer?: Layer | null;
  layerType?: string;
  isSelected?: boolean;
  onApply: (preset: AnimationCatalogPreset) => void;
}> = ({ preset, targetLayer, layerType, isSelected = false, onApply }) => {
  const getAnimationName = (presetId: string) => {
    switch (presetId) {
      case "fade": return "anim-preview-fade";
      case "slide":
      case "slideUp": return "anim-preview-slideUp";
      case "slideDown": return "anim-preview-slideDown";
      case "slideLeft": return "anim-preview-slideLeft";
      case "slideRight": return "anim-preview-slideRight";
      case "wipe":
      case "maskWipe":
      case "mask_reveal": return "anim-preview-maskReveal";
      case "baselineRise":
      case "baselineReveal": return "anim-preview-baseline";
      case "blurFocusPop": return "anim-preview-blurFocusPop";
      case "trackingExpansion": return "anim-preview-tracking";
      case "elasticScalePop": return "anim-preview-pop";
      case "textShimmer": return "anim-preview-shimmer";
      case "wordCascade": return "anim-preview-cascade";
      case "lineReveal": return "anim-preview-lineReveal";
      case "highlightDraw": return "anim-preview-highlightDraw";
      case "cardSettlePop": return "anim-preview-cardSettle";
      case "elevationRise": return "anim-preview-elevation";
      case "glassIris": return "anim-preview-glass";
      case "kenBurns": return "anim-preview-kenBurns";
      case "focusPull": return "anim-preview-focusPull";
      case "arrowShoot": return "anim-preview-arrowShoot";
      case "dashFlow": return "anim-preview-dashFlow";
      case "iconPop": return "anim-preview-iconPop";
      case "stampSettle": return "anim-preview-stampSettle";
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
      case "circleIris": return "anim-preview-circleIris";
      case "drawOn":
      case "custom_trim": return "anim-preview-drawOn";
      case "custom_move": return "anim-preview-slideUp";
      case "custom_scale": return "anim-preview-grow";
      case "custom_rotate": return "anim-preview-spin";
      case "custom_opacity": return "anim-preview-fade";
      case "custom_color": return "anim-preview-color";
      case "custom_radius": return "anim-preview-radius";
      case "morph": return "anim-preview-morph";
      default: return "anim-preview-pop";
    }
  };

  // Preview plays continuously all the time
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

        {/* Ambient background glow for glassmorphism preview */}
        {(preset.id === "glassIris" || preset.id === "custom_glass") && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-[#8b5cf6]/35 to-[#ec4899]/35 blur-xs" />
          </div>
        )}

        {/* Option C: Dynamic Layer Echo adaptive preview shape */}
        <AdaptivePreviewShape
          preset={preset}
          targetLayer={targetLayer}
          layerType={layerType}
          animStyle={animStyle}
        />
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

export function getFilteredCustomCategories(
  targetLayer?: Layer | string | null
): CustomCategoryGroup[] {
  const layerObj = typeof targetLayer === "object" ? targetLayer : null;
  const layerType = layerObj ? layerObj.type : typeof targetLayer === "string" ? targetLayer : undefined;

  return CUSTOM_CATEGORIES.map((section) => {
    const items = section.items.filter((item) => {
      // 1. Corner radius only on true rectangular containers (Rectangle, Frame, Image, Video, Text Card)
      if (item.id === "custom_radius") {
        if (layerObj) {
          if (!canHaveBorderRadius(layerObj)) return false;
        } else if (layerType && ["line", "icon", "circle", "star", "polygon"].includes(layerType)) {
          return false;
        }
      }

      // 2. Vector line purity
      const isLine = layerObj ? isVectorLine(layerObj) : layerType === "line";
      if (isLine) {
        if ([
          "custom_radius",
          "custom_morph",
          "custom_backdrop_blur",
          "custom_glass",
          "custom_resize",
        ].includes(item.id)) {
          return false;
        }
      }

      // 3. Trim path only for elements with stroke/vector lines
      if (item.id === "custom_trim") {
        if (layerObj) {
          if (!canHaveTrimPath(layerObj)) return false;
        } else if (layerType && !["line", "shape"].includes(layerType)) {
          return false;
        }
      }

      // 4. Circles, Stars, Polygons have fixed radial/vertex geometry
      if (layerObj && (isCircle(layerObj) || isStar(layerObj) || isPolygon(layerObj))) {
        if (["custom_radius", "custom_morph"].includes(item.id)) return false;
      }

      // 5. Text elements
      if (layerType === "text" || layerType === "chunk") {
        if (["custom_morph", "custom_stroke", "custom_trim"].includes(item.id)) return false;
        if (item.id === "custom_radius" && (!layerObj || !canHaveBorderRadius(layerObj))) return false;
      }

      // 6. Icons
      if (layerType === "icon") {
        if ([
          "custom_radius",
          "custom_morph",
          "custom_backdrop_blur",
          "custom_glass",
          "custom_resize",
          "custom_trim",
        ].includes(item.id)) {
          return false;
        }
      }

      // 7. Media (Image/Video)
      if (layerType === "image" || layerType === "video") {
        if (["custom_morph", "custom_stroke", "custom_color", "custom_trim"].includes(item.id)) {
          return false;
        }
      }

      return true;
    });
    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}

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

  const [subScreen, setSubScreen] = useState<"catalog" | "select-morph-target">("catalog");
  const [morphSearch, setMorphSearch] = useState("");

  const doc = useProjectStore((s) => s.document);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const activeScreen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const candidateLayers = useMemo(() => {
    if (!activeScreen) return [];
    return activeScreen.layers.filter((l) => l.id !== targetLayer?.id);
  }, [activeScreen, targetLayer?.id]);

  const filteredCandidates = useMemo(() => {
    if (!morphSearch.trim()) return candidateLayers;
    const q = morphSearch.toLowerCase();
    return candidateLayers.filter((l) =>
      (l.name || l.type || "").toLowerCase().includes(q)
    );
  }, [candidateLayers, morphSearch]);

  const handleCardClick = (preset: AnimationCatalogPreset) => {
    if (preset.id === "morph") {
      setSubScreen("select-morph-target");
      return;
    }
    onApplyPreset(preset);
  };

  // Current clip lookup to support pre-selection & clean replacement
  const currentClip = targetLayer && selectedClipId
    ? getLayerClips(targetLayer).find((c) => c.id === selectedClipId)
    : null;

  // Auto-sync tab and category when opened to change an existing clip
  useEffect(() => {
    if (!isOpen) return;
    setSubScreen("catalog");
    setMorphSearch("");
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
      CUSTOM_CATEGORIES.some((cat) => cat.items.some((i) => i.id === currentClip.preset))
    ) {
      setActiveTab("CUSTOM");
    } else {
      setActiveTab("PRESETS");
      setFilterCategory(currentClip.type as any);
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
  const isLine = targetLayer ? isVectorLine(targetLayer) : layerType === "line";
  const entrancePresets =
    layerType === "text" || layerType === "chunk"
      ? TEXT_ENTRANCE_PRESETS
      : layerType === "image" || layerType === "video"
      ? MEDIA_ENTRANCE_PRESETS
      : layerType === "icon"
      ? ICON_ENTRANCE_PRESETS
      : isLine
      ? LINE_ENTRANCE_PRESETS
      : SHAPE_ENTRANCE_PRESETS;

  const filteredCustomCategories = useMemo(() => {
    return getFilteredCustomCategories(targetLayer);
  }, [targetLayer]);

  if (subScreen === "select-morph-target") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-40 bg-white flex flex-col select-none text-[#18181b] shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-2 duration-150"
      >
        {/* Header */}
        <div className="h-12 px-3 border-b border-[#e5e5e7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubScreen("catalog")}
              className="p-1 rounded-md text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f6] transition-colors cursor-pointer"
              title="Back to presets"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-[#18181b]">
              Morph Into...
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f6] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="text-[11px] text-[#71717a] pb-2">
            Select the destination element to transform into:
          </div>

          {candidateLayers.length > 5 && (
            <input
              type="text"
              placeholder="Search elements..."
              value={morphSearch}
              onChange={(e) => setMorphSearch(e.target.value)}
              className="mb-2 px-2.5 py-1.5 text-xs bg-[#f4f4f6] border border-[#e5e5e7] rounded-md outline-none focus:border-[#6d28d9]"
            />
          )}

          {filteredCandidates.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#71717a] bg-[#fafafc] rounded-xl border border-dashed border-[#e5e5e7] mt-2">
              {candidateLayers.length === 0
                ? "No other elements found in this scene. Create another element first to morph into."
                : "No matching elements found."}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCandidates.map((layer) => {
                const Icon = getLayerIcon(layer);
                const layerTitle =
                  layer.name ||
                  (layer.type === "text" && (layer as any).text
                    ? (layer as any).text.slice(0, 20)
                    : layer.type.charAt(0).toUpperCase() + layer.type.slice(1));
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      onApplyPreset({
                        id: "morph",
                        name: `Morph into ${layerTitle}`,
                        type: "out",
                        duration: 0.8,
                        easing: "smooth",
                        params: {
                          targetLayerId: layer.id,
                          morphStyle: "stardust",
                          particleCount: 80,
                          chaos: 30,
                          particleShape: "star",
                        },
                      });
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#e5e5e7] hover:border-[#6d28d9] hover:bg-[#ede9fe]/30 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-[#f4f4f6] group-hover:bg-[#6d28d9]/10 flex items-center justify-center text-[#71717a] group-hover:text-[#6d28d9] transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#18181b] truncate group-hover:text-[#6d28d9]">
                          {layerTitle}
                        </div>
                        <div className="text-[10px] text-[#71717a] capitalize truncate">
                          {layer.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-[#6d28d9] opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                      Select →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 bg-white flex flex-col select-none text-[#18181b] shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-2 duration-150"
    >
      {/* Scoped CSS Keyframes for live thumbnail previews */}
      <style>{`
        /* 1. Opacity / Alpha Reveal (Stationary, flat) */
        @keyframes anim-preview-fade { 0% { opacity: 0.08; } 45%, 80% { opacity: 1; } 100% { opacity: 0.08; } }

        /* 2. Vector Stroke Draw Path (Trim) - 100% steady perimeter draw with zero opacity blinking or rotation */
        @keyframes anim-preview-drawOn-stroke {
          0% { stroke-dashoffset: 100; }
          45%, 75% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 100; }
        }

        /* 3. Directional Slides (Pure Translation, 24px travel, zero scale, zero shadow) */
        @keyframes anim-preview-slideUp { 0% { transform: translateY(24px); opacity: 0; } 45%, 80% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(24px); opacity: 0; } }
        @keyframes anim-preview-slideDown { 0% { transform: translateY(-24px); opacity: 0; } 45%, 80% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-24px); opacity: 0; } }
        @keyframes anim-preview-slideLeft { 0% { transform: translateX(24px); opacity: 0; } 45%, 80% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(24px); opacity: 0; } }
        @keyframes anim-preview-slideRight { 0% { transform: translateX(-24px); opacity: 0; } 45%, 80% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(-24px); opacity: 0; } }

        /* 4. Card Settle (Snappy spring scale overshoot + recoil + settling impact shadow) */
        @keyframes anim-preview-cardSettle {
          0% { transform: scale(0.35); opacity: 0.2; box-shadow: 0 0 0 rgba(0,0,0,0); }
          38% { transform: scale(1.24); opacity: 1; box-shadow: 0 8px 16px -2px rgba(0,0,0,0.18); }
          58% { transform: scale(0.93); opacity: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          75%, 90% { transform: scale(1); opacity: 1; box-shadow: 0 3px 6px rgba(0,0,0,0.1); }
          100% { transform: scale(0.35); opacity: 0.2; }
        }

        /* 5. Elevation Rise (Z-axis lift-off + blooming deep soft purple-tinted elevation shadow, minimal Y travel) */
        @keyframes anim-preview-elevation {
          0% { transform: translateY(0) scale(0.95); box-shadow: 0 1px 2px rgba(0,0,0,0.04); opacity: 0.35; }
          45%, 75% { transform: translateY(-3px) scale(1.10); box-shadow: 0 16px 24px -2px rgba(109, 40, 217, 0.45), 0 6px 10px -2px rgba(0,0,0,0.15); opacity: 1; }
          100% { transform: translateY(0) scale(0.95); box-shadow: 0 1px 2px rgba(0,0,0,0.04); opacity: 0.35; }
        }

        /* 6. Frosted Glass Iris (Aperture expand + optical backdrop blur over ambient glow) */
        @keyframes anim-preview-glass {
          0% { transform: scale(0.3); opacity: 0; }
          45%, 75% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.3); opacity: 0; }
        }

        /* 7. Arrow Shoot (Shaft draws forward + head snaps in) */
        @keyframes anim-preview-arrowStem {
          0% { stroke-dashoffset: 24; opacity: 0.2; }
          20% { opacity: 1; }
          50%, 75% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 24; opacity: 0.2; }
        }
        @keyframes anim-preview-arrowHead {
          0%, 35% { transform: translateX(-12px); opacity: 0; }
          50%, 75% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-12px); opacity: 0; }
        }

        /* 8. Dash Flow (Continuous stroke offset marching) */
        @keyframes anim-preview-dashFlow { 0% { stroke-dashoffset: 18; } 100% { stroke-dashoffset: 0; } }

        /* 9. Media & Camera Keyframes */
        @keyframes anim-preview-kenBurns { 0% { transform: scale(1) translate(-2px, 2px); } 50% { transform: scale(1.22) translate(2px, -2px); } 100% { transform: scale(1) translate(-2px, 2px); } }
        @keyframes anim-preview-focusPull { 0% { filter: blur(7px); transform: scale(1.08); opacity: 0.3; } 45%, 80% { filter: blur(0px); transform: scale(1); opacity: 1; } 100% { filter: blur(7px); transform: scale(1.08); opacity: 0.3; } }

        /* 10. Icon Keyframes */
        @keyframes anim-preview-iconPop {
          0% { transform: scale(0.25) rotate(-22deg); opacity: 0.15; }
          45% { transform: scale(1.25) rotate(6deg); opacity: 1; }
          65% { transform: scale(0.96) rotate(-2deg); opacity: 1; }
          80%, 90% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.25) rotate(-22deg); opacity: 0.15; }
        }
        @keyframes anim-preview-stampSettle {
          0% { transform: translateY(-20px); opacity: 0.15; }
          40% { transform: translateY(0) scaleY(0.75) scaleX(1.25); opacity: 1; }
          55% { transform: translateY(-5px) scaleY(1.1) scaleX(0.95); opacity: 1; }
          70%, 90% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0.15; }
        }

        /* 11. Generic Transforms */
        @keyframes anim-preview-pop { 0%, 100% { transform: scale(0.35); opacity: 0.2; } 50% { transform: scale(1.22); opacity: 1; } 70% { transform: scale(0.96); opacity: 1; } 85% { transform: scale(1); opacity: 1; } }
        @keyframes anim-preview-grow { 0%, 100% { transform: scale(0.35); opacity: 0.3; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes anim-preview-shrink { 0%, 100% { transform: scale(1.4); opacity: 0.3; } 50% { transform: scale(0.7); opacity: 1; } }
        @keyframes anim-preview-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes anim-preview-twist { 0%, 100% { transform: rotate(-30deg) scale(0.6); opacity: 0.2; } 50% { transform: rotate(10deg) scale(1.1); opacity: 1; } 70% { transform: rotate(0deg) scale(1); opacity: 1; } }
        @keyframes anim-preview-blurIn { 0%, 100% { filter: blur(5px); opacity: 0.2; } 50% { filter: blur(0px); opacity: 1; } }
        @keyframes anim-preview-blurFocusPop { 0%, 100% { filter: blur(4px); transform: scale(0.92); opacity: 0.2; } 50% { filter: blur(0px); transform: scale(1); opacity: 1; } }
        @keyframes anim-preview-tracking { 0%, 100% { letter-spacing: -2px; opacity: 0.2; } 50% { letter-spacing: 2px; opacity: 1; } }
        @keyframes anim-preview-shimmer { 0%, 100% { opacity: 0.5; filter: brightness(1); } 50% { opacity: 1; filter: brightness(1.6); } }
        @keyframes anim-preview-cascade { 0%, 100% { transform: translateY(8px); opacity: 0.2; } 50% { transform: translateY(0); opacity: 1; } }
        @keyframes anim-preview-lineReveal { 0%, 100% { clip-path: inset(100% 0 0 0); } 50% { clip-path: inset(0 0 0 0); } }
        @keyframes anim-preview-highlightDraw { 0%, 100% { clip-path: inset(0 100% 0 0); } 50% { clip-path: inset(0 0 0 0); } }
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
        @keyframes anim-preview-morph {
          0% { transform: scale(1) rotate(0deg); opacity: 1; border-radius: 4px; }
          35% { transform: scale(0.65) rotate(15deg); opacity: 0.35; border-radius: 50%; filter: blur(2px); }
          65% { transform: scale(1.15) rotate(-10deg); opacity: 0.85; border-radius: 16px; filter: blur(0px); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; border-radius: 4px; }
        }
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
              isText ? (
                <>
                  {/* Headline & Display Subgroup */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      <Type className="h-3 w-3 text-purple-600" />
                      <span>Headline & Display (Single Word / Short)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {TEXT_HEADLINE_PRESETS.map((p) => (
                        <AnimationCard
                          key={`headline-${p.id}`}
                          preset={p}
                          targetLayer={targetLayer}
                          layerType={layerType}
                          isSelected={isPresetSelected(p)}
                          onApply={handleCardClick}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Paragraph & Reading Subgroup */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      <span>Paragraph & Reading (Multi-Word / Body)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {TEXT_PARAGRAPH_PRESETS.map((p) => (
                        <AnimationCard
                          key={`paragraph-${p.id}`}
                          preset={p}
                          targetLayer={targetLayer}
                          layerType={layerType}
                          isSelected={isPresetSelected(p)}
                          onApply={handleCardClick}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
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
                        targetLayer={targetLayer}
                        layerType={layerType}
                        isSelected={isPresetSelected(p)}
                        onApply={handleCardClick}
                      />
                    ))}
                  </div>
                </div>
              )
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
                      targetLayer={targetLayer}
                      layerType={layerType}
                      isSelected={isPresetSelected(p)}
                      onApply={handleCardClick}
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
                      targetLayer={targetLayer}
                      layerType={layerType}
                      isSelected={isPresetSelected(p)}
                      onApply={handleCardClick}
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
          {filteredCustomCategories.map((section, sIdx) => (
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
                      onClick={() => handleCardClick(item.preset)}
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
                targetLayer={targetLayer}
                layerType={layerType}
                isSelected={isPresetSelected(eff.preset)}
                onApply={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
