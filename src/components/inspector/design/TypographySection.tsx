import React from "react";
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Italic,
  Underline,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { CompactSegmentedControl } from "@/components/ui/compact-segmented-control";
import { cn } from "@/lib/utils";

interface TypographySectionProps {
  layer: Layer;
}

const POPULAR_FONTS = [
  "Inter",
  "Roboto",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Montserrat",
  "Poppins",
  "Outfit",
  "Cinzel",
  "Impact",
];

const FONT_WEIGHTS = [
  { label: "Regular", value: "400" },
  { label: "Medium", value: "500" },
  { label: "SemiBold", value: "600" },
  { label: "Bold", value: "700" },
  { label: "Black", value: "900" },
];

export const TypographySection: React.FC<TypographySectionProps> = ({ layer }) => {
  const { updateLayerStyle } = useProjectStore();
  const style = layer.style;

  const boxMode = style.boxMode ?? "point";
  const passOrder = style.passOrder ?? "fillOverStroke";
  const align = style.textAlign || "left";

  return (
    <MinimalSection title="Typography" icon={Type} defaultOpen={true}>
      {/* 1. Point Text vs Area Box */}
      <div className="mb-2">
        <CompactSegmentedControl
          value={boxMode}
          onChange={(val) => updateLayerStyle(layer.id, { boxMode: val as "point" | "area" })}
          options={[
            { value: "point", label: "Point Text", tooltip: "Unconstrained text anchored at pivot" },
            { value: "area", label: "Area Box", tooltip: "Fixed width boundary box with wrapping" },
          ]}
        />
      </div>

      {/* 2. Font Family & Weight */}
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <select
          value={style.fontFamily || "Inter"}
          onChange={(e) => updateLayerStyle(layer.id, { fontFamily: e.target.value })}
          className="h-6 bg-muted/60 border border-input hover:border-border rounded-[8px] px-1.5 text-[11px] text-foreground outline-none cursor-pointer"
        >
          {POPULAR_FONTS.map((font) => (
            <option key={font} value={font} className="bg-popover text-popover-foreground">
              {font}
            </option>
          ))}
        </select>

        <select
          value={style.fontWeight || "700"}
          onChange={(e) => updateLayerStyle(layer.id, { fontWeight: e.target.value })}
          className="h-6 bg-muted/60 border border-input hover:border-border rounded-[8px] px-1.5 text-[11px] text-foreground outline-none cursor-pointer"
        >
          {FONT_WEIGHTS.map((w) => (
            <option key={w.value} value={w.value} className="bg-popover text-popover-foreground">
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Size, Leading, Tracking */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <ScrubbableInput
          label="Size"
          value={style.fontSize || 32}
          onChange={(val) => updateLayerStyle(layer.id, { fontSize: val })}
          suffix="px"
          min={8}
          max={400}
        />
        <ScrubbableInput
          label="Lead"
          value={typeof style.leading === "number" ? style.leading : 1.2}
          onChange={(val) => updateLayerStyle(layer.id, { leading: val })}
          step={0.05}
          precision={2}
          min={0.5}
          max={3}
        />
        <ScrubbableInput
          label="Track"
          value={typeof style.tracking === "number" ? style.tracking : 0}
          onChange={(val) => updateLayerStyle(layer.id, { tracking: val })}
          step={0.5}
          min={-10}
          max={50}
        />
      </div>

      {/* 4. Pass Order (Fill over Stroke vs Stroke over Fill) */}
      <div className="pt-2 border-t border-border mb-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium" title="Broadcast subtitle order: Fill over Stroke prevents outline eating glyphs">
          Pass Order:
        </span>
        <div className="w-40">
          <CompactSegmentedControl
            value={passOrder}
            onChange={(val) => updateLayerStyle(layer.id, { passOrder: val as any })}
            options={[
              { value: "fillOverStroke", label: "Fill Over", tooltip: "Heavy outlines expand outward (Subtitles)" },
              { value: "strokeOverFill", label: "Stroke Over", tooltip: "Traditional outline mode" },
            ]}
          />
        </div>
      </div>

      {/* 5. Alignments & Styles */}
      <div className="grid grid-cols-6 gap-0.5 bg-muted/40 p-0.5 rounded-[8px] border border-input">
        <button
          onClick={() => updateLayerStyle(layer.id, { textAlign: "left" })}
          className={cn(
            "h-5 flex items-center justify-center rounded-[6px] transition-colors",
            align === "left" ? "bg-accent text-accent-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Align Left"
        >
          <AlignLeft className="h-3 w-3" />
        </button>
        <button
          onClick={() => updateLayerStyle(layer.id, { textAlign: "center" })}
          className={cn(
            "h-5 flex items-center justify-center rounded-[6px] transition-colors",
            align === "center" ? "bg-accent text-accent-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Align Center"
        >
          <AlignCenter className="h-3 w-3" />
        </button>
        <button
          onClick={() => updateLayerStyle(layer.id, { textAlign: "right" })}
          className={cn(
            "h-5 flex items-center justify-center rounded-[6px] transition-colors",
            align === "right" ? "bg-accent text-accent-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Align Right"
        >
          <AlignRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => updateLayerStyle(layer.id, { textAlign: "justify" })}
          className={cn(
            "h-5 flex items-center justify-center rounded-[6px] transition-colors",
            align === "justify" ? "bg-accent text-accent-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Justify"
        >
          <AlignJustify className="h-3 w-3" />
        </button>
        <button
          onClick={() =>
            updateLayerStyle(layer.id, {
              fontStyle: style.fontStyle === "italic" ? "normal" : "italic",
            })
          }
          className={cn(
            "h-5 flex items-center justify-center rounded-[6px] transition-colors",
            style.fontStyle === "italic" ? "bg-accent text-accent-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Italic"
        >
          <Italic className="h-3 w-3" />
        </button>
        <button
          onClick={() =>
            updateLayerStyle(layer.id, {
              textDecoration:
                style.textDecoration === "underline" ? "none" : "underline",
            })
          }
          className={cn(
            "h-5 flex items-center justify-center rounded-[6px] transition-colors",
            style.textDecoration === "underline" ? "bg-accent text-accent-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Underline"
        >
          <Underline className="h-3 w-3" />
        </button>
      </div>
    </MinimalSection>
  );
};
