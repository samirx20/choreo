import React from "react";
import { Sparkles, SunMedium } from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { PopoverColorPicker } from "@/components/ui/popover-color-picker";

interface EffectsSectionProps {
  layer: Layer;
}

export const EffectsSection: React.FC<EffectsSectionProps> = ({ layer }) => {
  const { updateLayerStyle } = useProjectStore();
  const style = layer.style;

  const shadowAngle = style.shadowAngle ?? 135;
  const shadowDist = style.shadowDistance ?? 0;
  const shadowBlur = style.shadowBlur ?? 0;
  const shadowSpread = style.shadowSpread ?? 0;
  const shadowColor = style.shadowColor ?? "#000000";
  const shadowOpacity = style.shadowOpacity ?? 0.25;

  return (
    <MinimalSection title="Effects & Shadow" icon={Sparkles} defaultOpen={false}>
      {/* 1. Polar Coordinate Directional Drop Shadow */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <SunMedium className="h-3 w-3 text-amber-500" />
            <span>Polar Drop Shadow</span>
          </span>
        </div>

        {/* Angle & Distance */}
        <div className="grid grid-cols-2 gap-1.5">
          <ScrubbableInput
            label="∠"
            value={shadowAngle}
            onChange={(val) => updateLayerStyle(layer.id, { shadowAngle: val })}
            suffix="°"
          />
          <ScrubbableInput
            label="Dist"
            value={shadowDist}
            onChange={(val) =>
              updateLayerStyle(layer.id, { shadowDistance: Math.max(0, val) })
            }
            suffix="px"
            min={0}
          />
        </div>

        {/* Blur & Spread */}
        <div className="grid grid-cols-2 gap-1.5">
          <ScrubbableInput
            label="Blur"
            value={shadowBlur}
            onChange={(val) =>
              updateLayerStyle(layer.id, { shadowBlur: Math.max(0, val) })
            }
            suffix="px"
            min={0}
          />
          <ScrubbableInput
            label="Spread"
            value={shadowSpread}
            onChange={(val) => updateLayerStyle(layer.id, { shadowSpread: val })}
            suffix="px"
          />
        </div>

        {/* Shadow Color & Opacity */}
        {shadowDist > 0 || shadowBlur > 0 ? (
          <PopoverColorPicker
            color={shadowColor}
            opacity={shadowOpacity}
            onChangeColor={(c) => updateLayerStyle(layer.id, { shadowColor: c })}
            onChangeOpacity={(op) => updateLayerStyle(layer.id, { shadowOpacity: op })}
          />
        ) : null}
      </div>

      {/* 2. Filter Blur */}
      <div className="pt-2 border-t border-border">
        <ScrubbableInput
          label="Filter Blur"
          value={style.filterBlur || 0}
          onChange={(val) =>
            updateLayerStyle(layer.id, { filterBlur: Math.max(0, val) })
          }
          suffix="px"
          min={0}
          max={100}
        />
      </div>
    </MinimalSection>
  );
};
