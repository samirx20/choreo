import React, { useState } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Link,
  Unlink,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { cn } from "@/lib/utils";

interface TransformSectionProps {
  layer: Layer;
}

const PIVOT_POINTS: [number, number][] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [0, 0.5],
  [0.5, 0.5],
  [1, 0.5],
  [0, 1],
  [0.5, 1],
  [1, 1],
];

export const TransformSection: React.FC<TransformSectionProps> = ({ layer }) => {
  const { updateLayerStyle, alignSelectedLayers } = useProjectStore();
  const [aspectLocked, setAspectLocked] = useState(true);

  const style = layer.style;
  const x = Math.round(style.x || 0);
  const y = Math.round(style.y || 0);
  const width = typeof style.width === "number" ? Math.round(style.width) : 0;
  const height = typeof style.height === "number" ? Math.round(style.height) : 0;
  const rotation = Math.round(style.rotation || 0);
  const pivotX = style.pivotX !== undefined ? style.pivotX : 0.5;
  const pivotY = style.pivotY !== undefined ? style.pivotY : 0.5;
  const scaleX = Math.round((style.scaleX ?? 1) * 100);
  const scaleY = Math.round((style.scaleY ?? 1) * 100);

  const handleWidthChange = (newW: number) => {
    if (aspectLocked && width > 0) {
      const ratio = height / width;
      updateLayerStyle(layer.id, {
        width: Math.max(1, newW),
        height: Math.max(1, Math.round(newW * ratio)),
      });
    } else {
      updateLayerStyle(layer.id, { width: Math.max(1, newW) });
    }
  };

  const handleHeightChange = (newH: number) => {
    if (aspectLocked && height > 0) {
      const ratio = width / height;
      updateLayerStyle(layer.id, {
        height: Math.max(1, newH),
        width: Math.max(1, Math.round(newH * ratio)),
      });
    } else {
      updateLayerStyle(layer.id, { height: Math.max(1, newH) });
    }
  };

  return (
    <MinimalSection title="Transform" defaultOpen={true}>
      {/* 1. Alignment Micro-Bar */}
      <div className="grid grid-cols-6 gap-0.5 bg-muted/40 p-0.5 rounded-[8px] border border-input mb-2">
        <button
          onClick={() => alignSelectedLayers("left")}
          className="h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
          title="Align Left (Alt+A)"
        >
          <AlignLeft className="h-3 w-3" />
        </button>
        <button
          onClick={() => alignSelectedLayers("center")}
          className="h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
          title="Align Center (Alt+H)"
        >
          <AlignCenter className="h-3 w-3" />
        </button>
        <button
          onClick={() => alignSelectedLayers("right")}
          className="h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
          title="Align Right (Alt+D)"
        >
          <AlignRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => alignSelectedLayers("top")}
          className="h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
          title="Align Top (Alt+W)"
        >
          <AlignStartVertical className="h-3 w-3" />
        </button>
        <button
          onClick={() => alignSelectedLayers("middle")}
          className="h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
          title="Align Middle (Alt+V)"
        >
          <AlignCenterVertical className="h-3 w-3" />
        </button>
        <button
          onClick={() => alignSelectedLayers("bottom")}
          className="h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-muted"
          title="Align Bottom (Alt+S)"
        >
          <AlignEndVertical className="h-3 w-3" />
        </button>
      </div>

      {/* 2. Position X & Y */}
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <ScrubbableInput
          label="X"
          value={x}
          onChange={(val) => updateLayerStyle(layer.id, { x: val })}
          suffix="px"
        />
        <ScrubbableInput
          label="Y"
          value={y}
          onChange={(val) => updateLayerStyle(layer.id, { y: val })}
          suffix="px"
        />
      </div>

      {/* 3. Dimensions W & H with Aspect Lock */}
      <div className="flex items-center gap-1 mb-1.5">
        <div className="flex-1">
          <ScrubbableInput
            label="W"
            value={width}
            onChange={handleWidthChange}
            suffix="px"
            min={1}
          />
        </div>

        <button
          onClick={() => setAspectLocked(!aspectLocked)}
          className={cn(
            "h-6 w-6 rounded-[6px] border flex items-center justify-center transition-colors shrink-0",
            aspectLocked
              ? "bg-accent text-accent-foreground border-border shadow-xs"
              : "bg-muted/40 text-muted-foreground border-input hover:text-foreground hover:border-border"
          )}
          title={aspectLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
        >
          {aspectLocked ? <Link className="h-2.5 w-2.5" /> : <Unlink className="h-2.5 w-2.5" />}
        </button>

        <div className="flex-1">
          <ScrubbableInput
            label="H"
            value={height}
            onChange={handleHeightChange}
            suffix="px"
            min={1}
          />
        </div>
      </div>

      {/* 4. Rotation & Flips */}
      <div className="flex items-center gap-1 mb-1.5">
        <div className="flex-1">
          <ScrubbableInput
            label="∠"
            value={rotation}
            onChange={(val) => updateLayerStyle(layer.id, { rotation: val })}
            suffix="°"
            defaultValue={0}
          />
        </div>

        <button
          onClick={() =>
            updateLayerStyle(layer.id, {
              scaleX: (style.scaleX ?? 1) * -1,
            })
          }
          className="h-6 w-6 rounded-[6px] bg-muted/40 border border-input hover:border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
          title="Flip Horizontal"
        >
          <FlipHorizontal className="h-2.5 w-2.5" />
        </button>

        <button
          onClick={() =>
            updateLayerStyle(layer.id, {
              scaleY: (style.scaleY ?? 1) * -1,
            })
          }
          className="h-6 w-6 rounded-[6px] bg-muted/40 border border-input hover:border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
          title="Flip Vertical"
        >
          <FlipVertical className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* 5. 9-Point Spatial Pivot Matrix & Scale */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        {/* 9-Point Pivot Matrix */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-sans font-medium text-muted-foreground">
            Pivot:
          </span>
          <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-muted/60 rounded-[6px] border border-input">
            {PIVOT_POINTS.map(([px, py]) => {
              const isSelected =
                Math.abs(pivotX - px) < 0.05 && Math.abs(pivotY - py) < 0.05;
              return (
                <button
                  key={`${px}-${py}`}
                  onClick={() =>
                    updateLayerStyle(layer.id, { pivotX: px, pivotY: py })
                  }
                  className={cn(
                    "h-2.5 w-2.5 rounded-2xs transition-colors",
                    isSelected
                      ? "bg-primary shadow-xs"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                  title={`Anchor: (${px * 100}%, ${py * 100}%)`}
                />
              );
            })}
          </div>
        </div>

        {/* Scale Scrubbers */}
        <div className="flex items-center gap-1 w-32">
          <div className="flex-1">
            <ScrubbableInput
              label="SX"
              value={scaleX}
              onChange={(val) =>
                updateLayerStyle(layer.id, { scaleX: val / 100 })
              }
              suffix="%"
              defaultValue={100}
            />
          </div>
          <div className="flex-1">
            <ScrubbableInput
              label="SY"
              value={scaleY}
              onChange={(val) =>
                updateLayerStyle(layer.id, { scaleY: val / 100 })
              }
              suffix="%"
              defaultValue={100}
            />
          </div>
        </div>
      </div>
    </MinimalSection>
  );
};
