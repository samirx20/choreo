import React from "react";
import { ChunkLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface ChunkRendererProps {
  layer: ChunkLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const ChunkRenderer: React.FC<ChunkRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex = true,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(layer.style, isChildInFlex);
  const combinedStyle = { ...baseCss, ...computedStyle };

  return (
    <span
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "inline-block cursor-pointer select-none transition-[outline]",
        isSelected && "ring-1 ring-violet-500 ring-offset-1 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {layer.content}
    </span>
  );
};
