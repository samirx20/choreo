import React from "react";
import { Paintbrush } from "lucide-react";
import { Layer, ShapeLayer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { PopoverColorPicker } from "@/components/ui/popover-color-picker";
import { cn } from "@/lib/utils";

interface AppearanceSectionProps {
  layer: Layer;
}

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
];

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({ layer }) => {
  const { updateLayer, updateLayerStyle } = useProjectStore();
  const style = layer.style;

  const isText = layer.type === "text" || layer.type === "chunk";
  const isShape = layer.type === "shape";

  const fillColor = isText
    ? style.color || "#0f172a"
    : style.backgroundColor || (isShape ? "#0284c7" : "#0f172a");

  const strokeColor = style.borderColor || "#94a3b8";
  const strokeWidth = style.borderWidth || 0;
  const opacity = style.opacity ?? 1;

  return (
    <MinimalSection title="Appearance" icon={Paintbrush} defaultOpen={true}>
      {/* 1. Opacity & Blend Mode */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex-1">
          <ScrubbableInput
            label="Opacity"
            value={Math.round(opacity * 100)}
            onChange={(val) =>
              updateLayerStyle(layer.id, { opacity: Math.max(0, Math.min(100, val)) / 100 })
            }
            suffix="%"
            min={0}
            max={100}
            defaultValue={100}
          />
        </div>

        <select
          value={style.blendMode || "normal"}
          onChange={(e) =>
            updateLayerStyle(layer.id, { blendMode: e.target.value as any })
          }
          className="h-6 flex-1 bg-muted/60 border border-input hover:border-border rounded-[8px] px-1.5 text-[11px] text-foreground outline-none cursor-pointer capitalize"
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode} value={mode} className="bg-popover text-popover-foreground">
              {mode}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Fill Color */}
      <div className="space-y-1 mb-2">
        <span className="text-[10px] text-muted-foreground font-medium">Fill</span>
        <PopoverColorPicker
          color={fillColor}
          onChangeColor={(c) => {
            if (isText) {
              updateLayerStyle(layer.id, { color: c });
            } else {
              updateLayerStyle(layer.id, { backgroundColor: c });
            }
          }}
          showOpacity={false}
        />
      </div>

      {/* 3. Stroke / Outline */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">Stroke</span>
          <div className="w-16">
            <ScrubbableInput
              label="w"
              value={strokeWidth}
              onChange={(val) =>
                updateLayerStyle(layer.id, { borderWidth: Math.max(0, val) })
              }
              suffix="px"
              min={0}
              max={100}
            />
          </div>
        </div>

        {strokeWidth > 0 && (
          <PopoverColorPicker
            color={strokeColor}
            onChangeColor={(c) => updateLayerStyle(layer.id, { borderColor: c })}
            showOpacity={false}
          />
        )}
      </div>

      {/* 4. Shape Specific: Corner Squircle & Vector Trim Paths */}
      {isShape && (
        <div className="pt-2 border-t border-border space-y-2">
          {/* Corner Radius & Apple G2 Squircle */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <ScrubbableInput
                label="Radius"
                value={
                  typeof style.borderRadius === "number"
                    ? style.borderRadius
                    : 0
                }
                onChange={(val) =>
                  updateLayerStyle(layer.id, { borderRadius: Math.max(0, val) })
                }
                suffix="px"
                min={0}
                max={400}
              />
            </div>

            <button
              onClick={() =>
                updateLayerStyle(layer.id, {
                  squircleFactor: style.squircleFactor ? undefined : 0.6,
                })
              }
              className={cn(
                "h-6 px-2 rounded-[8px] border text-[10px] font-medium transition-colors",
                style.squircleFactor
                  ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                  : "bg-muted/40 border-input text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Apple G2 Continuous Curvature"
            >
              G2 Squircle
            </button>
          </div>

          {/* Vector Trim Paths */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] text-muted-foreground font-medium" title="Animatable vector stroke percentage">
              Trim Paths:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <ScrubbableInput
                label="Start"
                value={(layer as ShapeLayer).trimStart ?? 0}
                onChange={(val) =>
                  updateLayer(layer.id, { trimStart: Math.max(0, Math.min(100, val)) } as any)
                }
                suffix="%"
                min={0}
                max={100}
              />
              <ScrubbableInput
                label="End"
                value={(layer as ShapeLayer).trimEnd ?? 100}
                onChange={(val) =>
                  updateLayer(layer.id, { trimEnd: Math.max(0, Math.min(100, val)) } as any)
                }
                suffix="%"
                min={0}
                max={100}
              />
            </div>
          </div>
        </div>
      )}
    </MinimalSection>
  );
};
