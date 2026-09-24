import React from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Scissors,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TypographyCardProps {
  selectedLayer: Layer;
}

export const TypographyCard: React.FC<TypographyCardProps> = ({ selectedLayer }) => {
  const {
    updateLayerStyle,
    splitTextRange,
    activeTextSelection,
  } = useProjectStore();

  const style = selectedLayer.style;

  const hasHighlightedSpan =
    activeTextSelection &&
    activeTextSelection.layerId === selectedLayer.id &&
    activeTextSelection.text.trim().length > 0;

  return (
    <div className="pt-3 border-t border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Typography</span>
      </div>

      {/* 1. Font Family & Font Weight */}
      <div className="grid grid-cols-2 gap-2">
        {/* Font Family Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-medium">Font</label>
          <Select
            value={style.fontFamily || "Inter"}
            onValueChange={(val) => updateLayerStyle(selectedLayer.id, { fontFamily: val })}
          >
            <SelectTrigger className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "Inter",
                "Roboto",
                "SF Pro Display",
                "Poppins",
                "Montserrat",
                "Playfair Display",
                "Space Grotesk",
                "Plus Jakarta Sans",
                "Fira Code",
                "Georgia",
                "System",
              ].map((f) => (
                <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Weight Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-medium">Weight</label>
          <Select
            value={String(style.fontWeight || 400)}
            onValueChange={(val) =>
              updateLayerStyle(selectedLayer.id, {
                fontWeight: isNaN(Number(val)) ? val : Number(val),
              })
            }
          >
            <SelectTrigger className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300">Light (300)</SelectItem>
              <SelectItem value="400">Regular (400)</SelectItem>
              <SelectItem value="500">Medium (500)</SelectItem>
              <SelectItem value="600">SemiBold (600)</SelectItem>
              <SelectItem value="700">Bold (700)</SelectItem>
              <SelectItem value="800">ExtraBold (800)</SelectItem>
              <SelectItem value="900">Black (900)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Size & Line Height */}
      <div className="grid grid-cols-2 gap-2">
        <ScrubbableInput
          label="Size"
          value={style.fontSize || 54}
          step={1}
          min={8}
          max={500}
          suffix="px"
          onChange={(val) => updateLayerStyle(selectedLayer.id, { fontSize: val })}
          className="w-full"
        />
        <ScrubbableInput
          label="Line H."
          value={style.lineHeight || 1.2}
          step={0.05}
          min={0.5}
          max={3.0}
          decimals={2}
          onChange={(val) => updateLayerStyle(selectedLayer.id, { lineHeight: val })}
          className="w-full"
        />
      </div>

      {/* 3. Letter Spacing */}
      <div>
        <ScrubbableInput
          label="Spacing"
          value={typeof style.letterSpacing === "number" ? style.letterSpacing : 0}
          step={0.5}
          min={-10}
          max={50}
          suffix="px"
          onChange={(val) => updateLayerStyle(selectedLayer.id, { letterSpacing: val })}
          className="w-full"
        />
      </div>

      {/* 4. Text Alignment (Left, Center, Right, Justify) */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground font-medium">Text Align</span>
        <div className="grid grid-cols-4 gap-1 bg-muted p-0.5 rounded border border-border/40">
          {[
            { id: "left", icon: AlignLeft, title: "Align Left" },
            { id: "center", icon: AlignCenter, title: "Align Center" },
            { id: "right", icon: AlignRight, title: "Align Right" },
            { id: "justify", icon: AlignJustify, title: "Justify" },
          ].map((align) => {
            const isCurrent = (style.textAlign || "center") === align.id;
            const Icon = align.icon;
            return (
              <button
                key={align.id}
                type="button"
                onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: align.id as any })}
                className={cn(
                  "py-1 flex items-center justify-center rounded transition-colors cursor-pointer",
                  isCurrent
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={align.title}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Text Transform / Case */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground font-medium">Case</span>
        <div className="grid grid-cols-4 gap-1 bg-muted p-0.5 rounded border border-border/40">
          {[
            { id: "none", label: "None" },
            { id: "uppercase", label: "AA" },
            { id: "lowercase", label: "aa" },
            { id: "capitalize", label: "Aa" },
          ].map((c) => {
            const isCurrent = (style.textTransform || "none") === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => updateLayerStyle(selectedLayer.id, { textTransform: c.id as any })}
                className={cn(
                  "py-1 text-[10px] font-medium rounded transition-colors text-center cursor-pointer",
                  isCurrent
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Split Selection Button (Only when text is selected on canvas!) */}
      {hasHighlightedSpan && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            splitTextRange(
              activeTextSelection.layerId,
              activeTextSelection.start,
              activeTextSelection.end
            );
          }}
          className="w-full h-8 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          title="Split selected text into a separate layer"
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>
            Split &ldquo;
            {activeTextSelection.text.length > 18
              ? activeTextSelection.text.slice(0, 18) + "…"
              : activeTextSelection.text}
            &rdquo;
          </span>
        </button>
      )}
    </div>
  );
};
