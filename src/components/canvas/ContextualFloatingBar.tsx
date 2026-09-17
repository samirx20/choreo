import React, { useState } from "react";
import {
  Type,
  Bold,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Split,
  Copy,
  Trash2,
  Folder,
  Sliders,
  ChevronDown,
  Sparkles,
  Scissors,
  Check,
} from "lucide-react";
import { Layer, TextLayer, ShapeLayer, GroupLayer, LayerStyle } from "@/types/scene";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { THEME_TOKENS } from "@/theme/tokens";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContextualFloatingBarProps {
  layer: Layer;
  computedStyle: LayerStyle;
  canvasScale: number;
}

const COLOR_SWATCHES = [
  "#eee8d5", // Paper Cream
  "#e8c547", // Stamp Gold
  "#f5f0e8", // Soft Linen
  "#ef4444", // Crimson
  "#34d399", // Emerald
  "#60a5fa", // Sky Blue
  "#a855f7", // Violet
  "#111111", // Deep Black
];

const FONT_PRESETS = [
  { label: "Tiny", size: 16 },
  { label: "Small", size: 24 },
  { label: "Medium", size: 36 },
  { label: "Large", size: 54 },
  { label: "Title", size: 72 },
  { label: "Hero", size: 96 },
];

export const ContextualFloatingBar: React.FC<ContextualFloatingBarProps> = ({
  layer,
  computedStyle,
  canvasScale,
}) => {
  const {
    updateLayer,
    updateLayerStyle,
    updateLayerAnimation,
    duplicateLayer,
    removeLayer,
    groupSelection,
    selectedLayerIds,
    splitTextRange,
    activeTextSelection,
  } = useProjectStore();

  const [colorOpen, setColorOpen] = useState(false);

  const style = layer.style;
  const isText = layer.type === "text" || layer.type === "chunk";
  const isShape = layer.type === "shape";
  const isGroup = layer.type === "group";
  const isMulti = selectedLayerIds.length > 1;

  // Active highlighted text range
  const hasHighlightedSpan =
    activeTextSelection &&
    activeTextSelection.layerId === layer.id &&
    activeTextSelection.text.length > 0;

  const currentColor =
    style.color || style.backgroundColor || THEME_TOKENS.typography.headingColor;

  const currentFontSize =
    typeof style.fontSize === "number" ? style.fontSize : 36;
  const matchedPreset = FONT_PRESETS.find((p) => p.size === currentFontSize);
  const sizeLabel = matchedPreset ? matchedPreset.label : `${currentFontSize}px`;

  const isBold =
    style.fontWeight === 700 ||
    style.fontWeight === 800 ||
    style.fontWeight === 900 ||
    style.fontWeight === "bold";

  const isStrikethrough =
    (style as any).textDecoration === "line-through";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 bg-[#111111]/95 backdrop-blur-md border border-[#222222] shadow-2xl shadow-black/80 rounded-full px-2.5 py-1 text-xs text-[#eee8d5] select-none pointer-events-auto transition-all animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {/* MULTI-SELECTION HUD */}
      {isMulti ? (
        <>
          <button
            onClick={() => groupSelection()}
            title="Group Selected (Ctrl+G)"
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-medium transition-colors"
          >
            <Folder className="h-3.5 w-3.5" />
            <span>Group ({selectedLayerIds.length})</span>
          </button>

          <div className="w-[1px] h-4 bg-[#222222] mx-0.5" />

          <button
            onClick={() => {
              selectedLayerIds.forEach((id) => removeLayer(id));
            }}
            title="Delete Selected"
            className="p-1 text-zinc-400 hover:text-red-400 rounded-full transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          {/* COLOR SWATCH & POPOVER */}
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <button
                title="Color"
                className="flex items-center gap-1 p-1 hover:bg-[#1f1f1f] rounded-full transition-colors"
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: currentColor }}
                />
                <ChevronDown className="h-2.5 w-2.5 text-zinc-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-44 p-2 bg-[#171717] border border-[#262626] shadow-xl rounded-xl"
            >
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    onClick={() => {
                      if (isText) {
                        updateLayerStyle(layer.id, { color: swatch });
                      } else {
                        updateLayerStyle(layer.id, { backgroundColor: swatch });
                      }
                      setColorOpen(false);
                    }}
                    style={{ backgroundColor: swatch }}
                    className="w-8 h-8 rounded-md border border-white/10 hover:scale-105 transition-transform flex items-center justify-center"
                  >
                    {currentColor.toLowerCase() === swatch.toLowerCase() && (
                      <Check className="h-3.5 w-3.5 text-black" />
                    )}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={currentColor}
                onChange={(e) => {
                  if (isText) {
                    updateLayerStyle(layer.id, { color: e.target.value });
                  } else {
                    updateLayerStyle(layer.id, { backgroundColor: e.target.value });
                  }
                }}
                className="w-full h-6 px-2 bg-[#111111] border border-[#262626] rounded text-[10px] text-zinc-200 font-mono focus:outline-none focus:border-primary"
              />
            </PopoverContent>
          </Popover>

          {/* TEXT CONTROLS */}
          {isText && (
            <>
              {/* Font Family Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Font Family"
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#1f1f1f] rounded text-[11px] font-medium text-zinc-300 transition-colors"
                  >
                    <span>{style.fontFamily || "Inter"}</span>
                    <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#171717] border-[#262626] text-xs">
                  {["Inter", "Plus Jakarta Sans", "Playfair Display", "Fira Code", "Space Grotesk"].map(
                    (font) => (
                      <DropdownMenuItem
                        key={font}
                        onClick={() => updateLayerStyle(layer.id, { fontFamily: font })}
                        className="text-zinc-200 hover:text-white"
                      >
                        {font}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Font Size Preset Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Font Size"
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#1f1f1f] rounded text-[11px] text-zinc-300 font-mono transition-colors"
                  >
                    <span>{sizeLabel}</span>
                    <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#171717] border-[#262626] text-xs">
                  {FONT_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.label}
                      onClick={() => updateLayerStyle(layer.id, { fontSize: preset.size })}
                      className="justify-between text-zinc-200 hover:text-white"
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{preset.size}px</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-[1px] h-4 bg-[#222222] mx-0.5" />

              {/* Bold Toggle */}
              <button
                onClick={() => {
                  updateLayerStyle(layer.id, { fontWeight: isBold ? 400 : 800 });
                }}
                title="Bold (Ctrl+B)"
                className={cn(
                  "p-1 rounded transition-colors",
                  isBold
                    ? "bg-primary/20 text-primary font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]"
                )}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>

              {/* Strikethrough Toggle */}
              <button
                onClick={() => {
                  updateLayerStyle(layer.id, {
                    textDecoration: isStrikethrough ? "none" : "line-through",
                  } as any);
                }}
                title="Strikethrough"
                className={cn(
                  "p-1 rounded transition-colors",
                  isStrikethrough
                    ? "bg-primary/20 text-primary"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]"
                )}
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </button>

              {/* HIGHLIGHT-TO-SPLIT OR KINETIC CHUNKS BUTTON */}
              {hasHighlightedSpan ? (
                <button
                  onClick={() => {
                    splitTextRange(
                      activeTextSelection.layerId,
                      activeTextSelection.start,
                      activeTextSelection.end
                    );
                  }}
                  title="Split highlighted text into its own chunk layer"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-black font-semibold text-[11px] shadow-sm hover:bg-primary/90 transition-all"
                >
                  <Scissors className="h-3 w-3" />
                  <span>Split Selection</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const content = (layer as any).content || "";
                    const words = content.split(" ");
                    if (words.length > 1) {
                      const mid = Math.floor(words.length / 2);
                      const splitIdx = words.slice(0, mid).join(" ").length;
                      splitTextRange(layer.id, 0, splitIdx);
                    }
                  }}
                  title="Split into kinetic chunks with staggered pop-in entrance"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-primary hover:bg-primary/10 transition-colors font-medium"
                >
                  <Split className="h-3 w-3" />
                  <span>⚡ Chunks</span>
                </button>
              )}

              <div className="w-[1px] h-4 bg-[#222222] mx-0.5" />

              {/* Text Alignment Cycle */}
              <button
                onClick={() => {
                  const currentAlign = style.textAlign || "left";
                  const nextAlign =
                    currentAlign === "left"
                      ? "center"
                      : currentAlign === "center"
                      ? "right"
                      : "left";
                  updateLayerStyle(layer.id, { textAlign: nextAlign });
                }}
                title="Cycle Text Alignment (Left, Center, Right)"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f] rounded transition-colors"
              >
                {style.textAlign === "center" ? (
                  <AlignCenter className="h-3.5 w-3.5" />
                ) : style.textAlign === "right" ? (
                  <AlignRight className="h-3.5 w-3.5" />
                ) : (
                  <AlignLeft className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}

          {/* SHAPE CONTROLS */}
          {isShape && (
            <>
              {/* Corner Radius cycle */}
              <button
                onClick={() => {
                  const current = typeof style.borderRadius === "number" ? style.borderRadius : 0;
                  const next = current === 0 ? 12 : current === 12 ? 24 : current === 24 ? 999 : 0;
                  updateLayerStyle(layer.id, { borderRadius: next });
                }}
                title="Corner Radius"
                className="px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f] rounded font-mono"
              >
                R: {style.borderRadius || 0}px
              </button>
            </>
          )}

          {/* QUICK MOTION PRESET */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Entrance Animation"
                className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#1f1f1f] rounded text-[11px] text-zinc-300 font-medium transition-colors"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>
                  {layer.animation?.in?.preset ? String(layer.animation.in.preset) : "Pop In"}
                </span>
                <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#171717] border-[#262626] text-xs">
              {[
                { name: "pop", label: "Pop In (Bouncy)" },
                { name: "slideUp", label: "Slide Up (Smooth)" },
                { name: "fadeIn", label: "Fade In (Clean)" },
                { name: "blurIn", label: "Blur In (Cinematic)" },
                { name: "dropIn", label: "Drop In (Playful)" },
              ].map((p) => (
                <DropdownMenuItem
                  key={p.name}
                  onClick={() => {
                    updateLayerAnimation(layer.id, {
                      in: {
                        preset: p.name,
                        start: 0,
                        duration: 0.6,
                        easing: p.name === "pop" || p.name === "dropIn" ? "bouncy" : "smooth",
                      },
                    });
                  }}
                  className="text-zinc-200 hover:text-white"
                >
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-[1px] h-4 bg-[#222222] mx-0.5" />

          {/* DUPLICATE & DELETE */}
          <button
            onClick={() => duplicateLayer(layer.id)}
            title="Duplicate (Ctrl+D)"
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#1f1f1f] rounded transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => removeLayer(layer.id)}
            title="Delete (Del)"
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-[#1f1f1f] rounded transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
