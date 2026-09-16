import React from "react";
import { TextLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface TextRendererProps {
  layer: TextLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(layer.style, isChildInFlex);
  const combinedStyle = { ...baseCss, ...computedStyle };

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none transition-[outline] whitespace-pre-wrap",
        isSelected && "ring-1 ring-violet-500 ring-offset-2 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {layer.content}
    </div>
  );
};
