import React, { useRef } from "react";
import { FrameLayer, Layer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { getSquirclePath } from "@/engine/squircle";
import { cn } from "@/lib/utils";

interface FrameRendererProps {
  layer: FrameLayer;
  selectedLayerIds: string[];
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
  renderChild?: (child: Layer, isChildInFlex: boolean) => React.ReactNode;
}

export const FrameRenderer: React.FC<FrameRendererProps> = ({
  layer,
  selectedLayerIds,
  isChildInFlex = false,
  computedStyle,
  computedLayerStyles = {},
  onSelectLayer,
  renderChild,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedLayerIds.includes(layer.id);

  const isSquircle = Boolean(
    layer.style.squircleFactor && layer.style.squircleFactor > 0
  );
  const strokeWidth = layer.style.borderWidth || 0;
  const strokeColor = layer.style.borderColor || "transparent";

  const baseCss = layerStyleToCss(
    {
      ...layer.style,
      borderWidth: isSquircle ? 0 : layer.style.borderWidth,
    },
    isChildInFlex
  );

  const isFlex = layer.layout?.display === "flex";
  const layout = layer.layout || {
    display: "none",
    flexDirection: "column",
    gap: 0,
    align: "start",
    justify: "start",
  };

  const layoutCss: React.CSSProperties = isFlex
    ? {
        display: "flex",
        flexDirection: layout.flexDirection || "column",
        gap: `${layout.gap ?? 0}px`,
        alignItems:
          layout.align === "center"
            ? "center"
            : layout.align === "end"
            ? "flex-end"
            : layout.align === "stretch"
            ? "stretch"
            : "flex-start",
        justifyContent:
          layout.justify === "center"
            ? "center"
            : layout.justify === "end"
            ? "flex-end"
            : layout.justify === "space-between"
            ? "space-between"
            : layout.justify === "space-around"
            ? "space-around"
            : "flex-start",
      }
    : {
        display: "block",
        position: isChildInFlex ? "relative" : "absolute",
      };

  const combinedStyle: React.CSSProperties = {
    ...baseCss,
    ...layoutCss,
    ...computedStyle,
    // Frame clips content by default unless explicitly disabled
    overflow: layer.clipContent !== false ? "hidden" : "visible",
  };

  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 150;
  const isEmpty = !layer.children || layer.children.length === 0;

  return (
    <div
      ref={containerRef}
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelectLayer(layer.id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (layer.children && layer.children.length > 0) {
          onSelectLayer(layer.children[0].id, e);
        }
      }}
      className={cn(
        "cursor-pointer select-none box-border relative",
        isEmpty &&
          "border border-dashed border-zinc-600/70 bg-zinc-900/20 flex items-center justify-center",
        layer.style.tailwindClasses
      )}
    >
      {/* G2 Continuous Squircle SVG Stroke Overlay */}
      {isSquircle && strokeWidth > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
          viewBox={`0 0 ${widthNum} ${heightNum}`}
        >
          <path
            d={getSquirclePath(
              widthNum,
              heightNum,
              layer.style.borderRadius ?? 0,
              layer.style.squircleFactor
            )}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </svg>
      )}

      {isEmpty ? (
        <div className="text-[10px] text-zinc-500 font-mono pointer-events-none select-none px-3 py-2 text-center">
          Frame (Empty)
        </div>
      ) : (
        layer.children.map((child: Layer) =>
          renderChild ? renderChild(child, isFlex) : null
        )
      )}
    </div>
  );
};
