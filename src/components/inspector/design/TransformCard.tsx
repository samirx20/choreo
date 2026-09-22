import React, { useState } from "react";
import { Maximize2, RotateCw } from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { cn } from "@/lib/utils";

interface TransformCardProps {
  selectedLayer: Layer;
}

export const TransformCard: React.FC<TransformCardProps> = ({ selectedLayer }) => {
  const { updateLayerStyle } = useProjectStore();
  const [expandedCorners, setExpandedCorners] = useState(false);

  const style = selectedLayer.style;
  const x = Math.round(style.x || 0);
  const y = Math.round(style.y || 0);
  const width = Math.round(typeof style.width === "number" ? style.width : 100);
  const height = Math.round(typeof style.height === "number" ? style.height : 100);
  const rotation = Math.round(style.rotation || 0);
  const opacity = Math.round((style.opacity ?? 1) * 100);
  const cornerRadius = Math.round(typeof style.borderRadius === "number" ? style.borderRadius : 0);

  const isText =
    selectedLayer.type === "text" ||
    selectedLayer.type === "chunk" ||
    selectedLayer.type === "counter";

  return (
    <div className="divide-y divide-border/50">
      {/* Layout Section: Position, Size, Angle */}
      <div className="pb-2.5 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Layout</h4>

        {/* Position X & Y */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Position</span>
          <div className="flex items-center gap-1.5 w-36">
            <ScrubbableInput
              label="X"
              value={x}
              step={1}
              onChange={(val) => updateLayerStyle(selectedLayer.id, { x: val })}
              className="w-full"
            />
            <ScrubbableInput
              label="Y"
              value={y}
              step={1}
              onChange={(val) => updateLayerStyle(selectedLayer.id, { y: val })}
              className="w-full"
            />
          </div>
        </div>

        {/* Size W & H */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Size</span>
          <div className="flex items-center gap-1.5 w-36">
            <ScrubbableInput
              label="W"
              value={width}
              step={1}
              min={1}
              onChange={(val) => updateLayerStyle(selectedLayer.id, { width: val })}
              className="w-full"
            />
            <ScrubbableInput
              label="H"
              value={height}
              step={1}
              min={1}
              onChange={(val) => updateLayerStyle(selectedLayer.id, { height: val })}
              className="w-full"
            />
          </div>
        </div>

        {/* Angle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Angle</span>
          <div className="flex items-center gap-1.5 w-36 justify-end">
            <ScrubbableInput
              value={rotation}
              step={1}
              suffix="°"
              onChange={(val) => updateLayerStyle(selectedLayer.id, { rotation: val })}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Opacity Section */}
      <div className="py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Opacity</span>
        <div className="flex items-center gap-2 w-36 justify-end">
          <ScrubbableInput
            value={opacity}
            step={1}
            min={0}
            max={100}
            suffix="%"
            onChange={(val) => updateLayerStyle(selectedLayer.id, { opacity: val / 100 })}
            className="w-20"
          />
          <button
            onClick={() =>
              updateLayerStyle(selectedLayer.id, {
                rotation: (rotation + 90) % 360,
              })
            }
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Corner Section (for shapes/cards) */}
      {!isText && (
        <div className="pt-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Corner</span>
            <div className="flex items-center gap-1.5 w-36 justify-end">
              <ScrubbableInput
                value={cornerRadius}
                step={1}
                min={0}
                onChange={(val) => updateLayerStyle(selectedLayer.id, { borderRadius: val })}
                className="w-16"
              />
              <button
                onClick={() => setExpandedCorners(!expandedCorners)}
                className={cn(
                  "p-1 rounded transition-colors cursor-pointer",
                  expandedCorners
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title="Individual Corners"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Individual Corner Inputs (TL, TR, BR, BL) */}
          {expandedCorners && (
            <div className="grid grid-cols-4 gap-1.5 pt-1.5 w-full">
              {(["TL", "TR", "BR", "BL"] as const).map((corner, idx) => {
                const currentArr = Array.isArray(style.borderRadius)
                  ? style.borderRadius
                  : [cornerRadius, cornerRadius, cornerRadius, cornerRadius];
                return (
                  <ScrubbableInput
                    key={corner}
                    label={corner}
                    value={currentArr[idx] ?? cornerRadius}
                    step={1}
                    min={0}
                    onChange={(val) => {
                      const next = [...currentArr] as [number, number, number, number];
                      next[idx] = val;
                      updateLayerStyle(selectedLayer.id, { borderRadius: next });
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
